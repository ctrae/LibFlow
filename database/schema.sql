-- =====================================================================
-- LibFlow database: COMPLETE SETUP (one paste, safe to re-run)
--
-- Does, in order:
--   1. Tables: library_sessions, library_session_events,
--              staff (allowlist), daily_visit_totals
--   2. Constraints and in
--   3. Audit trigger (every status change is logged)
--   4. Staff helpers: is_staff(), is_head_librarian()
--   5. Row Level Security (RLS) policies
--   6. Table privileges (least privilege)
--   7. Functions: student check-out, expiry, reports, daily totals
--   8. Realtime for the live occupancy page
--
-- Session statuses : active, exited, expired
-- Audit log column : event_status
-- Reports use Jamaica time (America/Jamaica, UTC-5, no daylight saving)
--
-- Existing rows are kept. Tables are only created if missing.
-- Run it in Supabase: SQL Editor -> New query -> paste -> Run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TABLES
-- ---------------------------------------------------------------------
create table if not exists public.library_sessions (
  id               uuid primary key default gen_random_uuid(),
  student_id       text not null
                     check (student_id ~ '^[0-9]{9}$'),
  student_email    text not null
                     check (student_email ~* '^[^@\s]+@mymona\.uwi\.edu$'),
  check_in         timestamptz not null default now(),
  check_out        timestamptz,
  allotted_minutes int not null
                     check (allotted_minutes between 15 and 480),
  zone             text check (zone in ('Main', 'Basement')),
  bag_number       text,                    -- optional; bag number only
  status           text not null default 'active'
);

-- Reason for visit (SR-01.3). Added separately so it also works on an
-- existing table.
alter table public.library_sessions
  add column if not exists visit_reason text;

-- Append-only audit log (FR-06).
-- Rows are written only by the trigger.
create table if not exists public.library_session_events (
  id            bigint generated always as identity primary key,
  session_id    uuid not null references public.library_sessions(id),
  event_status  text not null,
  created_at    timestamptz not null default now(),
  event_type    text not null,
  zone          text
);

-- Keep existing databases compatible with the current event schema.
alter table public.library_session_events
  add column if not exists event_type text;

alter table public.library_session_events
  add column if not exists zone text;

-- Give any older event records a value before enforcing NOT NULL.
update public.library_session_events
set event_type = 'legacy'
where event_type is null;

alter table public.library_session_events
  alter column event_type set not null;

-- Staff allowlist. Only people listed here can read or change data, so
-- it does not matter if someone signs up for an account.
create table if not exists public.staff (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  role        text not null default 'library_staff'
                check (role in ('library_staff', 'head_librarian')),
  created_at  timestamptz not null default now()
);

-- Saved daily visit totals (FR-06 Database Management)
create table if not exists public.daily_visit_totals (
  day              date primary key,
  total_visits     int not null check (total_visits >= 0),
  unique_students  int not null check (unique_students >= 0),
  saved_at         timestamptz not null default now(),
  saved_by         uuid default auth.uid()
);


-- ---------------------------------------------------------------------
-- 2. CONSTRAINTS AND INDEXES
-- ---------------------------------------------------------------------
alter table public.library_sessions
  drop constraint if exists library_sessions_status_check;
alter table public.library_sessions
  add constraint library_sessions_status_check
  check (status in ('active', 'exited', 'expired'));

alter table public.library_session_events
  drop constraint if exists library_session_events_event_status_check;
alter table public.library_session_events
  add constraint library_session_events_event_status_check
  check (event_status in ('active', 'exited', 'expired'));

alter table public.library_sessions
  drop constraint if exists library_sessions_checkout_after_checkin;
alter table public.library_sessions
  add constraint library_sessions_checkout_after_checkin
  check (check_out is null or check_out >= check_in);

alter table public.library_sessions
  drop constraint if exists library_sessions_visit_reason_length;
alter table public.library_sessions
  add constraint library_sessions_visit_reason_length
  check (visit_reason is null or char_length(visit_reason) <= 100);

-- One active session per student
drop index if exists public.one_active_session_per_student;
create unique index one_active_session_per_student
  on public.library_sessions (student_id)
  where status = 'active';

-- One active session per bag number (only when a bag is registered)
drop index if exists public.one_active_bag_number;
create unique index one_active_bag_number
  on public.library_sessions (bag_number)
  where status = 'active' and bag_number is not null;

-- Speeds up report queries
create index if not exists library_sessions_check_in_idx
  on public.library_sessions (check_in);


-- ---------------------------------------------------------------------
-- 3. AUDIT TRIGGER
-- ---------------------------------------------------------------------
create or replace function public.log_session_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then

    insert into public.library_session_events (
      session_id,
      event_status,
      event_type,
      zone
    )
    values (
      new.id,
      new.status,
      'session_created',
      new.zone
    );

  elsif new.status is distinct from old.status then

    insert into public.library_session_events (
      session_id,
      event_status,
      event_type,
      zone
    )
    values (
      new.id,
      new.status,
      'status_changed',
      new.zone
    );

  end if;

  return new;
end;
$$;

drop trigger if exists session_event_log on public.library_sessions;
create trigger session_event_log
  after insert or update on public.library_sessions
  for each row execute function public.log_session_event();


-- ---------------------------------------------------------------------
-- 4. STAFF HELPERS
-- ---------------------------------------------------------------------
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.staff where user_id = auth.uid());
$$;

create or replace function public.is_head_librarian()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff
    where user_id = auth.uid() and role = 'head_librarian'
  );
$$;

revoke all on function public.is_staff() from public, anon;
revoke all on function public.is_head_librarian() from public, anon;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_head_librarian() to authenticated;


-- ---------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
--    Students (not logged in) may only create active sessions.
--    Staff (logged in AND listed in public.staff) may read and update.
--    The audit log is read-only; nobody edits or deletes it.
-- ---------------------------------------------------------------------
alter table public.library_sessions       enable row level security;
alter table public.library_session_events enable row level security;
alter table public.staff                  enable row level security;
alter table public.daily_visit_totals     enable row level security;

drop policy if exists "check in" on public.library_sessions;
create policy "check in" on public.library_sessions
  for insert to anon, authenticated
  with check (status = 'active' and check_out is null);

drop policy if exists "staff read sessions" on public.library_sessions;
create policy "staff read sessions" on public.library_sessions
  for select to authenticated
  using (public.is_staff());

drop policy if exists "staff update sessions" on public.library_sessions;
create policy "staff update sessions" on public.library_sessions
  for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists "staff read events" on public.library_session_events;
create policy "staff read events" on public.library_session_events
  for select to authenticated
  using (public.is_staff());

drop policy if exists "read own staff row" on public.staff;
create policy "read own staff row" on public.staff
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "staff read totals" on public.daily_visit_totals;
create policy "staff read totals" on public.daily_visit_totals
  for select to authenticated
  using (public.is_staff());

drop policy if exists "staff insert totals" on public.daily_visit_totals;
create policy "staff insert totals" on public.daily_visit_totals
  for insert to authenticated
  with check (public.is_staff());

drop policy if exists "staff update totals" on public.daily_visit_totals;
create policy "staff update totals" on public.daily_visit_totals
  for update to authenticated
  using (public.is_staff()) with check (public.is_staff());


-- ---------------------------------------------------------------------
-- 6. TABLE PRIVILEGES (least privilege, on top of RLS)
-- ---------------------------------------------------------------------
revoke all on table
  public.library_sessions,
  public.library_session_events,
  public.staff,
  public.daily_visit_totals
from anon, authenticated;

grant insert                 on public.library_sessions       to anon;
grant select, insert, update on public.library_sessions       to authenticated;
grant select                 on public.library_session_events to authenticated;
grant select                 on public.staff                  to authenticated;
grant select, insert, update on public.daily_visit_totals     to authenticated;


-- ---------------------------------------------------------------------
-- 7. FUNCTIONS
-- ---------------------------------------------------------------------

-- 7a. Student check-out (issue #5). Closes the student's active session
--     only if student ID and email both match. Returns true if closed.
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

revoke all on function public.student_check_out(text, text) from public;
grant execute on function public.student_check_out(text, text) to anon, authenticated;

-- 7b. Expire overdue sessions. Not callable from the app (run it from the
--     SQL Editor or schedule it with pg_cron). Returns how many expired.
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

revoke all on function public.expire_overdue_sessions() from public, anon, authenticated;

-- OPTIONAL: run the expiry every minute. First enable the pg_cron
-- extension (Dashboard -> Database -> Extensions), then uncomment:
-- select cron.schedule('expire-overdue-sessions', '* * * * *', 'select public.expire_overdue_sessions()');

-- 7c. Report: hourly library activity for one day (FR-03).
--     Uses the library's operating hours and reports occupancy,
--     check-ins, and check-outs for each hourly interval.

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
            least(
                h.start_local + interval '1 hour',
                o.closing_time
            ) as end_local,

            h.start_local at time zone 'America/Jamaica'
                as hour_start,

            least(
                h.start_local + interval '1 hour',
                o.closing_time
            ) at time zone 'America/Jamaica'
                as hour_end

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

            coalesce(
                check_out,
                check_in + make_interval(mins => allotted_minutes)
            ) as ended_at

        from public.library_sessions

        where check_in < (
            p_date::timestamp +
            case
                when extract(isodow from p_date) = 7
                    then time '20:00'
                else time '18:00'
            end
        ) at time zone 'America/Jamaica'

        and coalesce(
            check_out,
            check_in + make_interval(mins => allotted_minutes)
        ) > (
            p_date::timestamp +
            case
                when extract(isodow from p_date) = 7
                    then time '12:00'
                else time '08:30'
            end
        ) at time zone 'America/Jamaica'
    )

    select
        to_char(h.start_local, 'FMHH12:MI AM') as hour_label,

        count(*) filter (
            where s.check_in < h.hour_end
              and s.ended_at > h.hour_start
        ) as students_present,

        count(*) filter (
            where s.check_in >= h.hour_start
              and s.check_in < h.hour_end
        ) as check_ins,

        count(*) filter (
            where s.check_out >= h.hour_start
              and s.check_out < h.hour_end
        ) as check_outs

    from hours h
    left join sessions s on true

    group by h.start_local, h.end_local, h.hour_start, h.hour_end

    order by h.hour_start;
$function$;

-- 7d. Report: total visits and unique students for each day in a range
--     (SR-03.4). Days with no visits show 0.
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

-- 7e. Report: average stay in minutes for completed visits in a range
--     (SR-03.5). Returns 0 when there are none.
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


-- 7g. Report: total completed checkouts in a date range.
create or replace function public.report_total_checkouts(
    p_start date,
    p_end date
)
returns table (total_checkouts bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select count(*)::bigint
  from public.library_sessions
  where status = 'exited'
    and check_out is not null
    and check_out >= (p_start::timestamp at time zone 'America/Jamaica')
    and check_out < ((p_end + 1)::timestamp at time zone 'America/Jamaica');
$$;
revoke all on function public.report_total_checkouts(date, date) from public, anon;
grant execute on function public.report_total_checkouts(date, date) to authenticated;

-- 7f. Save the visit total for one day (FR-06). Saving the same day again
--     updates it.
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
-- 7g. Automatically save daily visit totals after closing.
-- Times below use UTC because pg_cron uses the database timezone.
-- Jamaica is UTC-5.

create extension if not exists pg_cron;

-- Weekdays: 6:05 PM Jamaica time (11:05 PM UTC).
select cron.schedule(
    'save-weekday-daily-total',
    '5 23 * * 1-5',
    $cron$
        select public.save_daily_total(
            (now() at time zone 'America/Jamaica')::date
        );
    $cron$
);

-- Saturday: 6:05 PM Jamaica time.
select cron.schedule(
    'save-saturday-daily-total',
    '5 23 * * 6',
    $cron$
        select public.save_daily_total(
            (now() at time zone 'America/Jamaica')::date
        );
    $cron$
);

-- Sunday: 8:05 PM Jamaica time (1:05 AM UTC Monday).
select cron.schedule(
    'save-sunday-daily-total',
    '5 1 * * 1',
    $cron$
        select public.save_daily_total(
            ((now() at time zone 'America/Jamaica')::date - 1)
        );
    $cron$
);

-- Reports and totals: logged-in users only (RLS limits the data to staff)
revoke all on function public.report_hourly_occupancy(date)       from public, anon;
revoke all on function public.report_daily_totals(date, date)     from public, anon;
revoke all on function public.report_average_stay(date, date)     from public, anon;
revoke all on function public.save_daily_total(date)              from public, anon;
grant execute on function public.report_hourly_occupancy(date)    to authenticated;
grant execute on function public.report_daily_totals(date, date)  to authenticated;
grant execute on function public.report_average_stay(date, date)  to authenticated;
grant execute on function public.save_daily_total(date)           to authenticated;


-- ---------------------------------------------------------------------
-- 8. REALTIME (live occupancy page, FR-04)
-- ---------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.library_sessions;
exception
  when duplicate_object then null;   -- already added
end;
$$;


-- ---------------------------------------------------------------------
-- AFTER RUNNING: make your staff accounts real staff
-- ---------------------------------------------------------------------
-- 1. Create the user in Authentication -> Users -> Add user.
-- 2. Run this (separately, once per person), with their email:
--
--   insert into public.staff (user_id, role)
--   select id, 'head_librarian' from auth.users where email = 'person@example.com';
--
--   Use 'library_staff' instead of 'head_librarian' for desk staff.
-- Until a user is listed in public.staff they can log in but see no data.


-- ---------------------------------------------------------------------
-- CHECKS (run separately after the script; results should match)
-- ---------------------------------------------------------------------
-- Tables (4 rows):
--   select table_name from information_schema.tables
--   where table_schema = 'public' order by 1;
--
-- RLS on all four (all true):
--   select relname, relrowsecurity from pg_class
--   where relname in ('library_sessions','library_session_events',
--                     'staff','daily_visit_totals');
--
-- Functions (exactly 9: the three below plus is_staff, is_head_librarian,
-- report_hourly_occupancy, report_daily_totals, report_average_stay,
-- save_daily_total):
--   select p.proname, pg_get_function_identity_arguments(p.oid)
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public'
--     and not exists (select 1 from pg_depend d
--                     where d.objid = p.oid and d.deptype = 'e')
--   order by 1;
--
-- Triggers (only session_event_log, twice, and nothing on auth):
--   select trigger_name, event_object_schema || '.' || event_object_table
--   from information_schema.triggers
--   where event_object_schema in ('auth', 'public');
--
-- Quick function tests (as the SQL Editor owner):
--   select * from public.report_daily_totals(current_date - 6, current_date);
--   select * from public.report_average_stay(current_date - 6, current_date);
--   select * from public.report_hourly_occupancy(current_date);
