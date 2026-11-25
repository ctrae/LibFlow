-- =====================================================================
-- LIBFLOW migration 001: make the live database work for every branch
-- =====================================================================
-- The live project has two schemas merged into one `library_sessions`
-- table:
--   * backend columns  (database/schema.sql, FastAPI backend):
--       student_email, check_in, check_out, allotted_minutes, bag_number
--   * legacy columns   (root schemas.sql, feature/bag-management):
--       user_id, name, email, short_code, check_in_time, check_out_time,
--       duration_minutes, allotted_time, session_status, expires_at
--
-- The legacy columns were NOT NULL and nothing filled them for backend
-- inserts, so every check-in failed with:
--   null value in column "user_id" of relation "library_sessions"
--
-- This script keeps BOTH column sets working instead of picking one:
--   1. a sync trigger fills each column set from the other on every
--      insert/update (so either kind of code can write, and both can read)
--   2. zone accepts 'Main', 'Main section' and 'Basement'
--   3. the audit trigger is the feature/usage-reports-refactor version
--      (event_status + event_type + zone); a second trigger fills
--      event_status for legacy writers that only set event_type
--   4. report_hourly_occupancy is the feature/usage-reports-refactor
--      version (hour_label, students_present, check_ins, check_outs)
--   5. the uniqueness rules (one active session per student / bag)
--   6. approved staff in public.users are copied to the public.staff
--      allowlist used by the backend
-- Legacy functions (update_library_session_status, checkout_library_session,
-- is_approved_library_staff, ...) and the public.users table are untouched.
--
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Single transaction, safe to re-run.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Legacy columns: optional at the database level (the sync trigger
--    below fills them; this only stops a check-in from failing if it
--    can't)
-- ---------------------------------------------------------------------
do $$
declare
  c text;
begin
  foreach c in array array[
    'session_id', 'user_id', 'name', 'email', 'short_code',
    'check_in_time', 'check_out_time', 'duration_minutes', 'allotted_time',
    'bag_amount', 'baggage_info', 'session_status', 'created_at',
    'expires_at', 'updated_at'
  ] loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'library_sessions'
        and column_name = c
    ) then
      execute format('alter table public.library_sessions alter column %I drop not null', c);
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Zone: accept both spellings
-- ---------------------------------------------------------------------
do $$
declare
  con record;
begin
  for con in
    select conname from pg_constraint
    where conrelid = 'public.library_sessions'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%zone%'
  loop
    execute format('alter table public.library_sessions drop constraint %I', con.conname);
  end loop;
end;
$$;

alter table public.library_sessions
  add constraint library_sessions_zone_check
  check (zone is null or zone in ('Main', 'Main section', 'Basement'));

-- ---------------------------------------------------------------------
-- 3. Session triggers: replace all of them with
--      library_session_sync (BEFORE)  - keeps both column sets filled
--      session_event_log    (AFTER)   - audit log
-- ---------------------------------------------------------------------
do $$
declare
  t record;
begin
  for t in
    select tgname from pg_trigger
    where tgrelid = 'public.library_sessions'::regclass
      and not tgisinternal
  loop
    execute format('drop trigger if exists %I on public.library_sessions', t.tgname);
  end loop;
end;
$$;

create or replace function public.sync_library_session_columns()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Copy legacy -> backend columns where the legacy side was the one written.
  if tg_op = 'INSERT' then
    new.id := coalesce(new.id, new.session_id, gen_random_uuid());
    if new.allotted_minutes is null then          -- legacy-style insert
      new.allotted_minutes := coalesce(new.duration_minutes, new.allotted_time);
      new.check_in := coalesce(new.check_in_time, new.check_in, now());
      new.check_out := coalesce(new.check_out, new.check_out_time);
    end if;
    new.student_email := coalesce(new.student_email, lower(new.email));
    new.status := coalesce(new.status, new.session_status, 'active');
  else
    if new.check_in is not distinct from old.check_in
       and new.check_in_time is distinct from old.check_in_time then
      new.check_in := new.check_in_time;
    end if;
    if new.allotted_minutes is not distinct from old.allotted_minutes
       and new.duration_minutes is distinct from old.duration_minutes then
      new.allotted_minutes := new.duration_minutes;
    end if;
    if new.check_out is not distinct from old.check_out
       and new.check_out_time is distinct from old.check_out_time then
      new.check_out := new.check_out_time;
    end if;
    if new.status is not distinct from old.status
       and new.session_status is distinct from old.session_status then
      new.status := new.session_status;
    end if;
    if new.student_email is not distinct from old.student_email
       and new.email is distinct from old.email then
      new.student_email := lower(new.email);
    end if;
  end if;

  if new.status = 'exited' and new.check_out is null then
    new.check_out := now();
  end if;

  -- Backend columns are now authoritative: mirror them to the legacy ones.
  new.session_id       := new.id;
  new.session_status   := new.status;
  new.check_in_time    := new.check_in;
  new.check_out_time   := new.check_out;
  new.duration_minutes := new.allotted_minutes;
  new.allotted_time    := coalesce(new.allotted_time, new.allotted_minutes);
  new.email            := coalesce(new.email, new.student_email);
  new.expires_at       := new.check_in + make_interval(mins => new.allotted_minutes);
  new.short_code       := coalesce(new.short_code, upper(substr(md5(new.id::text), 1, 8)));
  new.bag_amount       := coalesce(new.bag_amount, case when new.bag_number is null then 0 else 1 end);
  new.baggage_info     := coalesce(new.baggage_info,
                            case when new.bag_number is null then 'No bag declared'
                                 else 'Bag ' || new.bag_number end);
  new.created_at       := coalesce(new.created_at, now());
  new.updated_at       := now();

  -- Legacy code expects every session to belong to a public.users row.
  if new.user_id is null and to_regclass('public.users') is not null then
    select u.user_id into new.user_id
    from public.users u
    where u.student_id::text = new.student_id
    limit 1;

    if new.user_id is null then
      select u.user_id into new.user_id
      from public.users u
      where lower(u.email) = lower(new.student_email)
      limit 1;
    end if;

    if new.user_id is null then
      insert into public.users (email, user_type, student_id)
      values (lower(new.student_email), 'Student', new.student_id::integer)
      on conflict do nothing
      returning user_id into new.user_id;
    end if;
  end if;

  if new.name is null then
    select u.full_name into new.name from public.users u where u.user_id = new.user_id;
    new.name := coalesce(new.name, split_part(new.student_email, '@', 1));
  end if;

  return new;
end;
$$;

create trigger library_session_sync
  before insert or update on public.library_sessions
  for each row execute function public.sync_library_session_columns();

-- Audit trigger (same as feature/usage-reports-refactor database/schema.sql)
create or replace function public.log_session_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.library_session_events (session_id, event_status, event_type, zone)
    values (new.id, new.status, 'session_created', new.zone);
  elsif new.status is distinct from old.status then
    insert into public.library_session_events (session_id, event_status, event_type, zone)
    values (new.id, new.status, 'status_changed', new.zone);
  end if;
  return new;
end;
$$;

create trigger session_event_log
  after insert or update on public.library_sessions
  for each row execute function public.log_session_event();

-- Fill the legacy columns on rows created while no sync trigger existed.
-- The status does not change, so no audit events are written.
update public.library_sessions
set updated_at = now()
where session_id is null or user_id is null or name is null or email is null
   or session_status is null or duration_minutes is null or allotted_time is null
   or expires_at is null or check_in_time is null;

-- ---------------------------------------------------------------------
-- 4. Audit events: legacy writers (update_library_session_status,
--    checkout_library_session) only set event_type. Fill event_status so
--    the backend's /library/events can return every row.
-- ---------------------------------------------------------------------
create or replace function public.normalize_session_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.event_status is null then
    new.event_status := case
      when new.event_type in ('active', 'exited', 'expired') then new.event_type
      when new.event_type in ('registered', 'session_created') then 'active'
      when new.event_type = 'student_checkout' then 'exited'
      else (select s.status from public.library_sessions s where s.id = new.session_id)
    end;
  end if;
  new.event_type := coalesce(new.event_type, 'status_changed');
  return new;
end;
$$;

drop trigger if exists session_event_normalize on public.library_session_events;
create trigger session_event_normalize
  before insert on public.library_session_events
  for each row execute function public.normalize_session_event();

update public.library_session_events e
set event_status = case
      when e.event_type in ('active', 'exited', 'expired') then e.event_type
      when e.event_type in ('registered', 'session_created') then 'active'
      when e.event_type = 'student_checkout' then 'exited'
      else (select s.status from public.library_sessions s where s.id = e.session_id)
    end
where e.event_status is null;

-- Events written with no event_type (first event of a session = created)
update public.library_session_events e
set event_type = case
      when e.id = (select min(x.id) from public.library_session_events x
                   where x.session_id = e.session_id)
        then 'session_created'
      else 'status_changed'
    end
where e.event_type is null;

alter table public.library_session_events
  drop constraint if exists library_session_events_event_status_check;
alter table public.library_session_events
  add constraint library_session_events_event_status_check
  check (event_status in ('active', 'exited', 'expired'));

-- ---------------------------------------------------------------------
-- 5. Uniqueness rules
-- ---------------------------------------------------------------------
create unique index if not exists one_active_session_per_student
  on public.library_sessions (student_id)
  where status = 'active';

create unique index if not exists one_active_bag_number
  on public.library_sessions (bag_number)
  where status = 'active' and bag_number is not null;

create index if not exists library_sessions_check_in_idx
  on public.library_sessions (check_in);

-- ---------------------------------------------------------------------
-- 6. Backend functions (same as database/schema.sql)
-- ---------------------------------------------------------------------
create or replace function public.student_check_out(p_student_id text, p_email text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  update public.library_sessions
  set status = 'exited', check_out = now()
  where student_id = p_student_id
    and lower(student_email) = lower(p_email)
    and status = 'active';
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

create or replace function public.expire_overdue_sessions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  update public.library_sessions
  set status = 'expired'
  where status = 'active'
    and now() > check_in + make_interval(mins => allotted_minutes);
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Hourly report: feature/usage-reports-refactor version
drop function if exists public.report_hourly_occupancy(date);

create function public.report_hourly_occupancy(p_date date)
returns table (
    hour_label text,
    students_present bigint,
    check_ins bigint,
    check_outs bigint
)
language sql
stable
set search_path to 'public'
as $function$
    with operating_hours as (
        select
            case
                when extract(isodow from p_date) = 7
                    then p_date::timestamp + time '12:00'
                else p_date::timestamp + time '08:30'
            end as opening_time,
            case
                when extract(isodow from p_date) = 7
                    then p_date::timestamp + time '20:00'
                else p_date::timestamp + time '18:00'
            end as closing_time
    ),
    hours as (
        select
            h.start_local,
            least(h.start_local + interval '1 hour', o.closing_time) as end_local,
            h.start_local at time zone 'America/Jamaica' as hour_start,
            least(h.start_local + interval '1 hour', o.closing_time)
                at time zone 'America/Jamaica' as hour_end
        from operating_hours o
        cross join lateral generate_series(
            o.opening_time,
            o.closing_time - interval '1 minute',
            interval '1 hour'
        ) as h(start_local)
    ),
    sessions as (
        select
            check_in,
            check_out,
            coalesce(check_out, check_in + make_interval(mins => allotted_minutes)) as ended_at
        from public.library_sessions
        where check_in < (
            p_date::timestamp +
            case when extract(isodow from p_date) = 7 then time '20:00' else time '18:00' end
        ) at time zone 'America/Jamaica'
        and coalesce(check_out, check_in + make_interval(mins => allotted_minutes)) > (
            p_date::timestamp +
            case when extract(isodow from p_date) = 7 then time '12:00' else time '08:30' end
        ) at time zone 'America/Jamaica'
    )
    select
        to_char(h.start_local, 'FMHH12:MI AM') as hour_label,
        count(*) filter (where s.check_in < h.hour_end and s.ended_at > h.hour_start) as students_present,
        count(*) filter (where s.check_in >= h.hour_start and s.check_in < h.hour_end) as check_ins,
        count(*) filter (where s.check_out >= h.hour_start and s.check_out < h.hour_end) as check_outs
    from hours h
    left join sessions s on true
    group by h.start_local, h.end_local, h.hour_start, h.hour_end
    order by h.hour_start;
$function$;

create or replace function public.report_daily_totals(p_start date, p_end date)
returns table (visit_date date, total_visits bigint, unique_students bigint)
language sql
stable
security invoker
set search_path = public
as $$
  with days as (
    select d::date as visit_date
    from generate_series(p_start::timestamp, p_end::timestamp, interval '1 day') as d
  )
  select days.visit_date,
         count(s.id),
         count(distinct s.student_id)
  from days
  left join public.library_sessions s
    on (s.check_in at time zone 'America/Jamaica')::date = days.visit_date
  group by days.visit_date
  order by days.visit_date;
$$;

create or replace function public.report_average_stay(p_start date, p_end date)
returns table (avg_stay_minutes numeric, completed_visits bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(round((avg(extract(epoch from (check_out - check_in)) / 60.0))::numeric, 1), 0),
         count(*)
  from public.library_sessions
  where status = 'exited'
    and check_out is not null
    and check_in >= (p_start::timestamp at time zone 'America/Jamaica')
    and check_in <  ((p_end + 1)::timestamp at time zone 'America/Jamaica');
$$;

create or replace function public.save_daily_total(p_day date)
returns public.daily_visit_totals
language plpgsql
security invoker
set search_path = public
as $$
declare
  r public.daily_visit_totals;
begin
  insert into public.daily_visit_totals (day, total_visits, unique_students)
  select p_day, count(*), count(distinct student_id)
  from public.library_sessions
  where check_in >= (p_day::timestamp at time zone 'America/Jamaica')
    and check_in <  ((p_day + 1)::timestamp at time zone 'America/Jamaica')
  on conflict (day) do update
    set total_visits    = excluded.total_visits,
        unique_students = excluded.unique_students,
        saved_at        = now(),
        saved_by        = auth.uid()
  returning * into r;
  return r;
end;
$$;

revoke all on function public.student_check_out(text, text)       from public;
grant execute on function public.student_check_out(text, text)    to anon, authenticated;
revoke all on function public.expire_overdue_sessions()           from public, anon, authenticated;
revoke all on function public.report_hourly_occupancy(date)       from public, anon;
revoke all on function public.report_daily_totals(date, date)     from public, anon;
revoke all on function public.report_average_stay(date, date)     from public, anon;
revoke all on function public.save_daily_total(date)              from public, anon;
grant execute on function public.report_hourly_occupancy(date)    to authenticated;
grant execute on function public.report_daily_totals(date, date)  to authenticated;
grant execute on function public.report_average_stay(date, date)  to authenticated;
grant execute on function public.save_daily_total(date)           to authenticated;

-- ---------------------------------------------------------------------
-- 7. Staff allowlist: approved staff in public.users -> public.staff
-- ---------------------------------------------------------------------
do $$
begin
  if to_regclass('public.users') is not null then
    insert into public.staff (user_id, role)
    select u.auth_user_id,
           case when u.user_type = 'Head Librarian' then 'head_librarian'
                else 'library_staff' end
    from public.users u
    join auth.users a on a.id = u.auth_user_id
    where u.is_approved
      and u.user_type in ('Head Librarian', 'Library Staff')
    on conflict (user_id) do nothing;
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;

-- ---------------------------------------------------------------------
-- CHECKS (run separately afterwards)
-- ---------------------------------------------------------------------
-- Triggers (expect library_session_sync, session_event_log on
-- library_sessions and session_event_normalize on library_session_events):
--   select event_object_table, trigger_name, event_manipulation
--   from information_schema.triggers
--   where event_object_table in ('library_sessions', 'library_session_events')
--   order by 1, 2;
--
-- Hourly report (expect hour_label, students_present, check_ins, check_outs):
--   select * from public.report_hourly_occupancy(current_date) limit 1;
--
-- Staff allowlist:
--   select s.role, a.email from public.staff s join auth.users a on a.id = s.user_id;
