-- Libflow bag-check database schema.
-- Run in the Supabase SQL Editor. Safe to re-run; legacy session columns and
-- staff allowlist rows are copied into the schema used by the FastAPI backend.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- User profiles used by Supabase Auth and the backend staff check.
-- ---------------------------------------------------------------------
create table if not exists public.users (
  user_id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  email text not null unique,
  user_type text not null,
  student_id integer unique,
  staff_id integer unique,
  department text,
  assigned_zone text,
  full_name text,
  created_at timestamptz not null default now(),
  last_login_at timestamptz,
  is_approved boolean not null default false
);

alter table public.users
  add column if not exists user_id uuid,
  add column if not exists email text,
  add column if not exists user_type text,
  add column if not exists auth_user_id uuid,
  add column if not exists student_id integer,
  add column if not exists staff_id integer,
  add column if not exists department text,
  add column if not exists assigned_zone text,
  add column if not exists full_name text,
  add column if not exists created_at timestamptz,
  add column if not exists last_login_at timestamptz,
  add column if not exists is_approved boolean;

alter table public.users
  drop constraint if exists users_user_type_check,
  drop constraint if exists users_email_check,
  drop constraint if exists users_assigned_zone_check;

update public.users
set user_type = case user_type
  when 'HeadLibrarian' then 'Head Librarian'
  when 'LibraryStaff' then 'Library Staff'
  else user_type
end;

update public.users
set user_id = coalesce(user_id, auth_user_id, gen_random_uuid()),
    created_at = coalesce(created_at, now()),
    is_approved = coalesce(is_approved, false);

alter table public.users
  alter column user_id set default gen_random_uuid(),
  alter column user_id set not null,
  alter column email set not null,
  alter column user_type set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column is_approved set default false,
  alter column is_approved set not null;

alter table public.users
  add constraint users_user_type_check
    check (user_type in ('Student', 'Head Librarian', 'Library Staff')),
  add constraint users_email_check
    check (
      (user_type in ('Head Librarian', 'Library Staff') and is_approved)
      or lower(email) like '%@mymona.uwi.edu'
    ),
  add constraint users_assigned_zone_check
    check (assigned_zone is null or assigned_zone in ('Bag Staff', 'Security'));

create unique index if not exists users_auth_user_id_idx
  on public.users (auth_user_id)
  where auth_user_id is not null;
create unique index if not exists users_user_id_idx
  on public.users (user_id);
create unique index if not exists users_email_idx
  on public.users (email);

update public.users u
set auth_user_id = a.id,
    full_name = coalesce(
      u.full_name,
      nullif(a.raw_user_meta_data ->> 'full_name', '')
    )
from auth.users a
where lower(u.email) = lower(a.email)
  and u.auth_user_id is null;

-- Preserve staff approvals if the earlier standalone schema was installed.
do $$
begin
  if to_regclass('public.staff') is not null then
    execute $migration$
      insert into public.users (
        user_id, auth_user_id, email, user_type, full_name, is_approved
      )
      select s.user_id, a.id, lower(a.email),
             case s.role
               when 'head_librarian' then 'Head Librarian'
               else 'Library Staff'
             end,
             coalesce(nullif(a.raw_user_meta_data ->> 'full_name', ''), 'Library Staff'),
             true
      from public.staff s
      join auth.users a on a.id = s.user_id
      on conflict do nothing
    $migration$;

    execute $migration$
      update public.users u
      set auth_user_id = a.id,
          user_type = case s.role
            when 'head_librarian' then 'Head Librarian'
            else 'Library Staff'
          end,
          is_approved = true,
          full_name = coalesce(
            u.full_name,
            nullif(a.raw_user_meta_data ->> 'full_name', ''),
            'Library Staff'
          )
      from public.staff s
      join auth.users a on a.id = s.user_id
      where u.user_id = s.user_id
         or lower(u.email) = lower(a.email)
    $migration$;
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Library sessions returned by the backend's bag-check endpoints.
-- ---------------------------------------------------------------------
create table if not exists public.library_sessions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid unique,
  user_id uuid not null references public.users(user_id),
  student_id text not null,
  name text not null,
  email text not null,
  short_code text not null,
  check_in_time timestamptz not null default now(),
  check_out_time timestamptz,
  duration_minutes integer not null check (duration_minutes > 0),
  allotted_time integer not null check (allotted_time > 0),
  bag_amount integer not null default 0 check (bag_amount >= 0),
  baggage_info text not null default 'No bag declared',
  zone text check (zone in ('Main section', 'Basement')),
  status text not null default 'active'
    check (status in ('active', 'exited', 'expired')),
  session_status text not null default 'active'
    check (session_status in ('active', 'exited', 'expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.library_sessions
  add column if not exists id uuid,
  add column if not exists session_id uuid,
  add column if not exists user_id uuid,
  add column if not exists student_id text,
  add column if not exists name text,
  add column if not exists email text,
  add column if not exists short_code text,
  add column if not exists check_in_time timestamptz,
  add column if not exists check_out_time timestamptz,
  add column if not exists duration_minutes integer,
  add column if not exists allotted_time integer,
  add column if not exists bag_amount integer,
  add column if not exists baggage_info text,
  add column if not exists session_status text,
  add column if not exists created_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists updated_at timestamptz;

-- Disable earlier trigger behavior while converting data; old triggers treated
-- check_out_time as the planned deadline and could overwrite historical exits.
drop trigger if exists library_session_expiry on public.library_sessions;
drop trigger if exists session_event_log on public.library_sessions;

alter table public.library_sessions
  drop constraint if exists library_sessions_status_check,
  drop constraint if exists library_sessions_session_status_check,
  drop constraint if exists library_sessions_zone_check,
  drop constraint if exists library_sessions_student_id_check,
  drop constraint if exists library_sessions_short_code_check,
  drop constraint if exists library_sessions_bag_amount_check,
  drop constraint if exists library_sessions_checkout_after_checkin,
  drop constraint if exists library_sessions_duration_minutes_check,
  drop constraint if exists library_sessions_allotted_time_check;

-- Copy values from the previous schema's field names when upgrading it.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'library_sessions'
      and column_name = 'student_email'
  ) then
    execute 'update public.library_sessions set email = coalesce(email, student_email)';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'library_sessions'
      and column_name = 'check_in'
  ) then
    execute 'update public.library_sessions set check_in_time = coalesce(check_in_time, check_in)';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'library_sessions'
      and column_name = 'check_out'
  ) then
    execute 'update public.library_sessions set check_out_time = coalesce(check_out_time, check_out)';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'library_sessions'
      and column_name = 'allotted_minutes'
  ) then
    execute 'update public.library_sessions
      set duration_minutes = coalesce(duration_minutes, allotted_minutes),
          allotted_time = coalesce(allotted_time, allotted_minutes)';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'library_sessions'
      and column_name = 'bag_number'
  ) then
    execute $copy$
      update public.library_sessions
      set baggage_info = coalesce(
            baggage_info,
            nullif(trim(bag_number), ''),
            'No bag declared'
          ),
          bag_amount = coalesce(
            bag_amount,
            case when nullif(trim(bag_number), '') is null then 0 else 1 end
          )
    $copy$;
  end if;
end;
$$;

alter table public.library_sessions
  alter column student_id type text using student_id::text;

update public.library_sessions
set id = coalesce(id, session_id, gen_random_uuid());

update public.library_sessions
set session_id = id
where session_id is distinct from id;

update public.library_sessions
set status = case
      when status in ('active', 'exited', 'expired') then status
      when session_status in ('active', 'exited', 'expired') then session_status
      else 'active'
    end,
    student_id = nullif(trim(student_id), ''),
    name = coalesce(nullif(trim(name), ''), 'Unknown'),
    email = coalesce(nullif(lower(trim(email)), ''), 'unknown@mymona.uwi.edu'),
    short_code = coalesce(
      nullif(upper(trim(short_code)), ''),
      upper(substr(replace(id::text, '-', ''), 1, 8))
    ),
    check_in_time = coalesce(check_in_time, created_at, now()),
    duration_minutes = coalesce(duration_minutes, allotted_time, 30),
    allotted_time = coalesce(allotted_time, duration_minutes, 30),
    bag_amount = coalesce(bag_amount, 0),
    baggage_info = coalesce(nullif(trim(baggage_info), ''), 'No bag declared'),
    zone = case when zone = 'Main' then 'Main section' else zone end,
    created_at = coalesce(created_at, check_in_time, now()),
    expires_at = coalesce(
      expires_at,
      check_in_time + make_interval(mins => coalesce(duration_minutes, allotted_time, 30))
    ),
    updated_at = coalesce(updated_at, created_at, now());

update public.library_sessions
set expires_at = coalesce(
      expires_at,
      check_in_time + make_interval(mins => duration_minutes)
    );

-- Create a student profile for legacy sessions that did not have user_id.
insert into public.users (
  email, user_type, student_id, full_name, is_approved
)
select distinct on (lower(s.email))
       lower(s.email),
       'Student',
       case when s.student_id ~ '^[0-9]+$' then s.student_id::integer else null end,
       s.name,
       false
from public.library_sessions s
where s.user_id is null
order by lower(s.email), s.created_at
on conflict (email) do nothing;

update public.library_sessions s
set user_id = u.user_id
from public.users u
where s.user_id is null
  and lower(s.email) = lower(u.email);

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'library_sessions'
      and column_name = 'check_out'
  ) then
    execute $copy$
      update public.library_sessions
      set check_out_time = case
            when status = 'exited' then coalesce(check_out_time, updated_at, check_in_time)
            else null
          end,
          session_status = status
    $copy$;
  else
    execute $copy$
      update public.library_sessions
      set check_out_time = case
            when status = 'exited' then
              coalesce(least(check_out_time, coalesce(updated_at, check_out_time)),
                       updated_at, check_in_time)
            else null
          end,
          session_status = status
    $copy$;
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1 from public.library_sessions
    where user_id is null or student_id is null or student_id !~ '^[0-9]+$'
  ) then
    raise exception 'Cannot upgrade library_sessions: each row needs a user profile and numeric student_id.';
  end if;
end;
$$;

alter table public.library_sessions
  alter column id set default gen_random_uuid(),
  alter column id set not null,
  alter column session_id set not null,
  alter column user_id set not null,
  alter column student_id set not null,
  alter column name set not null,
  alter column email set not null,
  alter column short_code set default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  alter column short_code set not null,
  alter column check_in_time set default now(),
  alter column check_in_time set not null,
  alter column duration_minutes set not null,
  alter column allotted_time set not null,
  alter column bag_amount set default 0,
  alter column bag_amount set not null,
  alter column baggage_info set default 'No bag declared',
  alter column baggage_info set not null,
  alter column status set default 'active',
  alter column status set not null,
  alter column session_status set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column expires_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.library_sessions
  add constraint library_sessions_status_check
    check (status in ('active', 'exited', 'expired')),
  add constraint library_sessions_session_status_check
    check (session_status in ('active', 'exited', 'expired')),
  add constraint library_sessions_zone_check
    check (zone is null or zone in ('Main section', 'Basement')),
  add constraint library_sessions_student_id_check
    check (student_id ~ '^[0-9]+$'),
  add constraint library_sessions_short_code_check
    check (short_code ~ '^[A-Z0-9]{4,8}$'),
  add constraint library_sessions_bag_amount_check
    check (bag_amount >= 0),
  add constraint library_sessions_checkout_after_checkin
    check (check_out_time is null or check_out_time >= check_in_time),
  add constraint library_sessions_duration_minutes_check
    check (duration_minutes > 0),
  add constraint library_sessions_allotted_time_check
    check (allotted_time > 0);

create unique index if not exists library_sessions_id_idx
  on public.library_sessions (id);
create unique index if not exists library_sessions_session_id_idx
  on public.library_sessions (session_id);
create unique index if not exists library_sessions_short_code_idx
  on public.library_sessions (short_code);
create index if not exists library_sessions_status_zone_idx
  on public.library_sessions (status, zone);
create index if not exists library_sessions_created_at_idx
  on public.library_sessions (created_at desc);

comment on column public.library_sessions.check_out_time
  is 'Actual checkout time; remains null for active and expired sessions.';
comment on column public.library_sessions.expires_at
  is 'Planned session deadline, separate from actual checkout time.';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'library_sessions_user_id_fkey'
      and conrelid = 'public.library_sessions'::regclass
  ) then
    alter table public.library_sessions
      add constraint library_sessions_user_id_fkey
      foreign key (user_id) references public.users(user_id);
  end if;
end;
$$;

-- Event records support auditability without adding a separate bag table:
-- the bag-check page verifies a bag by changing its library session status.
create table if not exists public.library_session_events (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.library_sessions(id) on delete cascade,
  event_type text not null,
  zone text check (zone in ('Main section', 'Basement')),
  created_at timestamptz not null default now()
);

alter table public.library_session_events
  add column if not exists event_type text,
  add column if not exists zone text,
  add column if not exists created_at timestamptz;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'library_session_events'
      and column_name = 'event_status'
  ) then
    execute 'update public.library_session_events
      set event_type = coalesce(event_type, event_status)';
    execute 'alter table public.library_session_events
      alter column event_status drop not null';
  end if;
end;
$$;

update public.library_session_events
set event_type = coalesce(event_type, 'status_updated'),
    created_at = coalesce(created_at, now());

alter table public.library_session_events
  alter column event_type set not null,
  alter column created_at set default now(),
  alter column created_at set not null;

create index if not exists library_session_events_session_id_idx
  on public.library_session_events (session_id, created_at desc);

-- ---------------------------------------------------------------------
-- Auth profile creation and approved-staff authorization.
-- ---------------------------------------------------------------------
create or replace function public.is_approved_library_staff()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.users
    where auth_user_id = auth.uid()
      and user_type in ('Head Librarian', 'Library Staff')
      and is_approved
  );
$$;

create or replace function public.create_library_user_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_staff_id integer;
begin
  if coalesce(new.raw_user_meta_data ->> 'staff_id', '') ~ '^[0-9]{1,9}$' then
    v_staff_id := (new.raw_user_meta_data ->> 'staff_id')::integer;
  end if;

  if v_staff_id is null
     or nullif(trim(new.raw_user_meta_data ->> 'full_name'), '') is null
     or nullif(trim(new.raw_user_meta_data ->> 'department'), '') is null
     or coalesce(new.raw_user_meta_data ->> 'assigned_zone', '')
          not in ('Bag Staff', 'Security') then
    raise exception 'Provide a name, staff ID, department, and valid assigned zone.';
  end if;

  insert into public.users (
    user_id, auth_user_id, email, user_type, staff_id, department,
    assigned_zone, full_name, is_approved
  )
  values (
    new.id, new.id, lower(new.email), 'Library Staff', v_staff_id,
    nullif(trim(new.raw_user_meta_data ->> 'department'), ''),
    new.raw_user_meta_data ->> 'assigned_zone',
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    false
  )
  on conflict (email) do update
  set auth_user_id = excluded.auth_user_id,
      staff_id = excluded.staff_id,
      department = excluded.department,
      assigned_zone = excluded.assigned_zone,
      full_name = excluded.full_name,
      is_approved = false
  where public.users.user_type = 'Library Staff';

  if not found then
    raise exception 'Unable to create the staff profile for this email.';
  end if;
  return new;
end;
$$;

drop trigger if exists create_library_user_after_auth_signup on auth.users;
create trigger create_library_user_after_auth_signup
after insert on auth.users
for each row execute function public.create_library_user_from_auth();

-- ---------------------------------------------------------------------
-- Keep session fields synchronized and record status changes.
-- ---------------------------------------------------------------------
create or replace function public.set_library_session_expiry()
returns trigger
language plpgsql
as $$
begin
  if new.id is null then
    new.id := coalesce(new.session_id, gen_random_uuid());
  end if;
  new.session_id := new.id;
  new.status := coalesce(new.status, new.session_status, 'active');
  new.session_status := new.status;

  if tg_op = 'INSERT'
     or new.duration_minutes is distinct from old.duration_minutes
     or new.check_in_time is distinct from old.check_in_time then
    new.expires_at := new.check_in_time + make_interval(mins => new.duration_minutes);
  end if;

  if new.status = 'exited' then
    if tg_op = 'INSERT' or new.status is distinct from old.status then
      new.check_out_time := coalesce(new.check_out_time, now());
    else
      new.check_out_time := coalesce(new.check_out_time, old.check_out_time, now());
    end if;
  else
    new.check_out_time := null;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.log_library_session_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.library_session_events (session_id, event_type, zone)
    values (new.id, 'registered', new.zone);
  elsif new.status is distinct from old.status then
    insert into public.library_session_events (session_id, event_type, zone)
    values (new.id, new.status, new.zone);
  end if;
  return new;
end;
$$;

drop trigger if exists library_session_expiry on public.library_sessions;
create trigger library_session_expiry
before insert or update on public.library_sessions
for each row execute function public.set_library_session_expiry();

drop trigger if exists session_event_log on public.library_sessions;
create trigger session_event_log
after insert or update on public.library_sessions
for each row execute function public.log_library_session_event();

-- ---------------------------------------------------------------------
-- The only backend write operation: approved staff verifying a handoff.
-- ---------------------------------------------------------------------
create or replace function public.update_library_session_status(
  p_session_id uuid,
  p_zone text,
  p_status text
)
returns public.library_sessions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_session public.library_sessions;
begin
  if not public.is_approved_library_staff() then
    raise exception 'An approved library staff account is required.';
  end if;

  if p_session_id is null
     or p_zone is null
     or p_zone not in ('Main section', 'Basement')
     or p_status is null
     or p_status not in ('active', 'exited', 'expired') then
    raise exception 'The requested session status or zone is invalid.';
  end if;

  update public.library_sessions
  set zone = p_zone,
      status = p_status,
      check_out_time = case
        when p_status = 'exited' then
          case when status = 'exited' then check_out_time else now() end
        else null
      end
  where id = p_session_id
  returning * into v_session;

  if not found then
    raise exception 'Library session not found.';
  end if;

  return v_session;
end;
$$;

-- ---------------------------------------------------------------------
-- Row-level security and privileges.
-- ---------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.library_sessions enable row level security;
alter table public.library_session_events enable row level security;

do $$
declare
  v_policy record;
begin
  for v_policy in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('users', 'library_sessions', 'library_session_events')
  loop
    execute format(
      'drop policy %I on %I.%I',
      v_policy.policyname, v_policy.schemaname, v_policy.tablename
    );
  end loop;
end;
$$;

create policy "users read own profile"
on public.users for select to authenticated
using (auth_user_id = auth.uid());

create policy "approved staff read sessions"
on public.library_sessions for select to authenticated
using (public.is_approved_library_staff());

create policy "approved staff read session events"
on public.library_session_events for select to authenticated
using (public.is_approved_library_staff());

revoke all on table
  public.users,
  public.library_sessions,
  public.library_session_events
from public, anon, authenticated;

grant select on public.users to authenticated;
grant select on public.library_sessions to authenticated;
grant select on public.library_session_events to authenticated;

revoke all on function public.is_approved_library_staff() from public, anon;
revoke all on function public.create_library_user_from_auth() from public, anon, authenticated;
revoke all on function public.log_library_session_event() from public, anon, authenticated;
revoke all on function public.update_library_session_status(uuid, text, text)
  from public, anon, authenticated;

grant execute on function public.is_approved_library_staff() to authenticated;
grant execute on function public.update_library_session_status(uuid, text, text)
  to authenticated;

notify pgrst, 'reload schema';

-- To provision the initial Head Librarian, create their Supabase Auth account,
-- then run this once as the database owner, replacing the email:
-- insert into public.users (
--   user_id, auth_user_id, email, user_type, full_name, is_approved
-- )
-- select id, id, lower(email), 'Head Librarian', 'Head Librarian', true
-- from auth.users
-- where lower(email) = lower('admin@mymona.uwi.edu')
-- on conflict (email) do update
-- set auth_user_id = excluded.auth_user_id,
--     user_type = excluded.user_type,
--     full_name = excluded.full_name,
--     is_approved = true;
