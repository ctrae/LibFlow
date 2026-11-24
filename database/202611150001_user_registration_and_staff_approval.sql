alter table public.users
  add column if not exists auth_user_id uuid,
  add column if not exists full_name text,
  add column if not exists last_login_at timestamptz,
  add column if not exists is_approved boolean not null default false;

alter table public.users
  drop constraint if exists users_user_type_check;
alter table public.users
  add constraint users_user_type_check
  check (
    user_type in (
      'Student',
      'HeadLibrarian',
      'Head Librarian',
      'LibraryStaff',
      'Library Staff'
    )
  );

alter table public.users drop constraint if exists users_email_check;
alter table public.users
  add constraint users_email_check
  check (lower(email) like '%@mymona.uwi.edu' or user_type = 'Head Librarian');

create unique index if not exists users_auth_user_id_idx
  on public.users (auth_user_id)
  where auth_user_id is not null;

update public.users u
set auth_user_id = a.id,
    full_name = coalesce(u.full_name, nullif(a.raw_user_meta_data ->> 'full_name', ''))
from auth.users a
where lower(u.email) = lower(a.email)
  and u.auth_user_id is null;

alter table public.library_sessions
  drop constraint if exists library_sessions_status_check;

update public.library_sessions
set status = case
  when status = 'exited' then 'exited'
  when status = 'expired' then 'expired'
  else 'active'
end;

alter table public.library_sessions
  add constraint library_sessions_status_check
    check (status in ('active', 'exited', 'expired'));

update public.library_sessions
set session_status = status;

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

create or replace function public.is_head_librarian()
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
      and user_type = 'Head Librarian'
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
  v_email text := lower(new.email);
  v_staff_id integer;
begin
  if coalesce(new.raw_user_meta_data ->> 'staff_id', '') ~ '^[0-9]{1,9}$' then
    v_staff_id := (new.raw_user_meta_data ->> 'staff_id')::integer;
  end if;
  if v_staff_id is null
     or nullif(trim(new.raw_user_meta_data ->> 'full_name'), '') is null
     or nullif(trim(new.raw_user_meta_data ->> 'department'), '') is null
     or coalesce(new.raw_user_meta_data ->> 'assigned_zone', '') not in ('Bag Staff', 'Security') then
    raise exception 'Provide a name, staff ID, department, and valid assigned zone.';
  end if;

  if exists (
    select 1 from public.users
    where email = v_email and user_type <> 'LibraryStaff'
  ) then
    raise exception 'This email is already registered as a student.';
  end if;

  insert into public.users (
    user_id, auth_user_id, email, user_type, staff_id, department,
    assigned_zone, full_name, is_approved
  )
  values (
    new.id, new.id, v_email, 'LibraryStaff', v_staff_id,
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
  where public.users.user_type = 'LibraryStaff';

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

do $$
declare
  v_admin_id uuid;
  v_admin_email constant text := 'libflowadmin@gmail.com';
begin
  select id into v_admin_id
  from auth.users
  where lower(email) = v_admin_email;

  if v_admin_id is null then
    raise exception 'Create or confirm the Supabase Auth account for % before running this migration.', v_admin_email;
  end if;

  insert into public.users (
    user_id, auth_user_id, email, user_type, full_name, is_approved
  )
  values (
    v_admin_id, v_admin_id, v_admin_email,
    'Head Librarian', 'Head Librarian', true
  )
  on conflict (email) do update
  set auth_user_id = excluded.auth_user_id,
      user_type = 'Head Librarian',
      is_approved = true,
      full_name = coalesce(public.users.full_name, excluded.full_name);
end;
$$;

create or replace function public.sync_library_session_status()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT'
     or new.duration_minutes is distinct from old.duration_minutes
     or new.check_in_time is distinct from old.check_in_time then
    new.check_out_time := new.check_in_time + make_interval(mins => new.duration_minutes);
    new.expires_at := new.check_out_time;
  end if;
  new.session_status := new.status;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists library_session_expiry on public.library_sessions;
create trigger library_session_expiry
before insert or update on public.library_sessions
for each row execute function public.sync_library_session_status();

create or replace function public.register_library_visit(
  p_name text,
  p_email text,
  p_student_id integer,
  p_duration_minutes integer,
  p_baggage_info text,
  p_short_code text
)
returns public.library_sessions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_session public.library_sessions;
  v_email text := lower(trim(p_email));
begin
  if v_email not like '%@mymona.uwi.edu' then
    raise exception 'Use your @mymona.uwi.edu email address.';
  end if;
  if p_duration_minutes not in (15, 30, 45, 60) then
    raise exception 'Choose a stay between 15 and 60 minutes.';
  end if;
  if p_student_id is null or p_student_id < 0 then
    raise exception 'Enter a valid student ID.';
  end if;
  if nullif(trim(p_name), '') is null then
    raise exception 'Enter the student name.';
  end if;
  if p_short_code !~ '^[A-Z0-9]{4}$' then
    raise exception 'The access code is invalid.';
  end if;

  insert into public.users (email, user_type, student_id, full_name, is_approved)
  values (v_email, 'Student', p_student_id, trim(p_name), false)
  on conflict (email) do update
  set student_id = excluded.student_id,
      full_name = excluded.full_name
  where public.users.user_type = 'Student'
  returning user_id into v_user_id;

  if v_user_id is null then
    raise exception 'This email is already registered as a staff account.';
  end if;

  insert into public.library_sessions (
    user_id, student_id, short_code, duration_minutes, zone, session_status,
    name, email, baggage_info, status
  )
  values (
    v_user_id, p_student_id::text, p_short_code, p_duration_minutes, null, 'active',
    trim(p_name), v_email, coalesce(nullif(trim(p_baggage_info), ''), 'No bag declared'), 'active'
  )
  returning * into v_session;

  insert into public.library_session_events (session_id, event_type, zone)
  values (v_session.id, 'registered', null);

  return v_session;
end;
$$;

create or replace function public.get_library_session_by_code(p_short_code text)
returns table (
  id uuid,
  name text,
  email text,
  student_id text,
  short_code text,
  duration_minutes integer,
  baggage_info text,
  zone text,
  status text,
  created_at timestamptz,
  expires_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select s.id, s.name, s.email, s.student_id, s.short_code,
         s.duration_minutes, s.baggage_info, s.zone, s.status,
         s.created_at, s.expires_at, s.updated_at
  from public.library_sessions s
  where s.short_code = upper(trim(p_short_code));
$$;

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
  if p_zone not in ('Main section', 'Basement')
     or p_status not in ('active', 'exited', 'expired') then
    raise exception 'The requested session status or zone is invalid.';
  end if;

  update public.library_sessions
  set zone = p_zone, status = p_status
  where id = p_session_id
  returning * into v_session;

  if not found then
    raise exception 'Library session not found.';
  end if;

  insert into public.library_session_events (session_id, event_type, zone)
  values (v_session.id, p_status, p_zone);
  return v_session;
end;
$$;

create or replace function public.get_pending_library_staff()
returns table (
  user_id uuid,
  email text,
  full_name text,
  staff_id integer,
  department text,
  assigned_zone text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_head_librarian() then
    raise exception 'Only the Head Librarian can review staff accounts.';
  end if;
  return query
  select u.user_id, u.email, u.full_name, u.staff_id, u.department,
         u.assigned_zone, a.created_at
  from public.users u
  join auth.users a on a.id = u.auth_user_id
  where u.user_type = 'LibraryStaff' and not u.is_approved
  order by a.created_at;
end;
$$;

create or replace function public.approve_library_staff(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_head_librarian() then
    raise exception 'Only the Head Librarian can approve staff accounts.';
  end if;

  update public.users
  set is_approved = true
  where user_id = p_user_id
    and user_type = 'LibraryStaff'
    and not is_approved;

  if not found then
    raise exception 'Pending staff account not found.';
  end if;
end;
$$;

create or replace function public.record_library_staff_login()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.users
  set last_login_at = now()
  where auth_user_id = auth.uid()
    and user_type in ('Head Librarian', 'LibraryStaff');

  if not found then
    raise exception 'No staff profile is linked to this account.';
  end if;
end;
$$;

alter table public.users enable row level security;
drop policy if exists "users can view own account" on public.users;
drop policy if exists "head librarian can view all users" on public.users;
create policy "users can view own account"
on public.users for select to authenticated
using (auth_user_id = auth.uid());
create policy "head librarian can view all users"
on public.users for select to authenticated
using (public.is_head_librarian());

alter table public.library_sessions enable row level security;
drop policy if exists "public can register library sessions" on public.library_sessions;
drop policy if exists "public can read library sessions during pilot" on public.library_sessions;
drop policy if exists "public can update library sessions during pilot" on public.library_sessions;
create policy "approved staff can read library sessions"
on public.library_sessions for select to authenticated
using (public.is_approved_library_staff());
create policy "approved staff can update library sessions"
on public.library_sessions for update to authenticated
using (public.is_approved_library_staff())
with check (public.is_approved_library_staff());

alter table public.library_session_events enable row level security;
drop policy if exists "public can record library session events" on public.library_session_events;
create policy "approved staff can read library session events"
on public.library_session_events for select to authenticated
using (public.is_approved_library_staff());
create policy "approved staff can record library session events"
on public.library_session_events for insert to authenticated
with check (public.is_approved_library_staff());

revoke all on public.users from anon, authenticated;
grant select on public.users to authenticated;
revoke all on public.library_sessions from anon, authenticated;
grant select, update on public.library_sessions to authenticated;
revoke all on public.library_session_events from anon, authenticated;
grant select, insert on public.library_session_events to authenticated;

revoke all on function public.is_approved_library_staff() from public, anon;
revoke all on function public.is_head_librarian() from public, anon;
revoke all on function public.create_library_user_from_auth() from public, anon, authenticated;
revoke all on function public.register_library_visit(text, text, integer, integer, text, text) from public;
revoke all on function public.get_library_session_by_code(text) from public;
revoke all on function public.update_library_session_status(uuid, text, text) from public, anon;
revoke all on function public.get_pending_library_staff() from public, anon;
revoke all on function public.approve_library_staff(uuid) from public, anon;
revoke all on function public.record_library_staff_login() from public, anon;
grant execute on function public.is_approved_library_staff() to authenticated;
grant execute on function public.is_head_librarian() to authenticated;
grant execute on function public.register_library_visit(text, text, integer, integer, text, text) to anon, authenticated;
grant execute on function public.get_library_session_by_code(text) to anon, authenticated;
grant execute on function public.update_library_session_status(uuid, text, text) to authenticated;
grant execute on function public.get_pending_library_staff() to authenticated;
grant execute on function public.approve_library_staff(uuid) to authenticated;
grant execute on function public.record_library_staff_login() to authenticated;

notify pgrst, 'reload schema';
