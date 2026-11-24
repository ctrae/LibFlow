lter table public.library_sessions
  add column if not exists id uuid,
  add column if not exists name text,
  add column if not exists email text,
  add column if not exists baggage_info text,
  add column if not exists expires_at timestamptz,
  add column if not exists status text;

update public.library_sessions
set id = session_id
where id is null;

update public.library_sessions s
set email = u.email
from public.users u
where s.user_id = u.user_id
  and s.email is null;

update public.library_sessions
set name = coalesce(name, 'Unknown'),
    email = coalesce(email, 'unknown@mymona.uwi.edu'),
    baggage_info = coalesce(baggage_info, 'No bag declared'),
    status = coalesce(status, case session_status
      when 'active' then 'active'
      when 'exited' then 'exited'
      when 'expired' then 'expired'
      else 'active'
    end),
    expires_at = coalesce(expires_at, check_out_time, check_in_time + make_interval(mins => duration_minutes));

alter table public.library_sessions
  alter column id set default gen_random_uuid(),
  alter column id set not null,
  alter column name set not null,
  alter column email set not null,
  alter column baggage_info set default 'No bag declared',
  alter column baggage_info set not null,
  alter column status set default 'active',
  alter column status set not null,
  alter column expires_at set not null,
  alter column student_id type text using student_id::text;

create unique index if not exists library_sessions_id_idx on public.library_sessions (id);

alter table public.library_sessions
  drop constraint if exists library_sessions_zone_check,
  drop constraint if exists library_sessions_status_check;

update public.library_sessions
set zone = 'Main section'
where zone = 'Main';

alter table public.library_sessions
  add constraint library_sessions_zone_check
    check (zone in ('Main section', 'Basement')),
  add constraint library_sessions_status_check
    check (status in ('active', 'exited', 'expired'));

create or replace function public.set_library_session_expiry()
returns trigger
language plpgsql
as $$
begin
  new.check_out_time := new.check_in_time + make_interval(mins => new.duration_minutes);
  new.expires_at := new.check_out_time;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists library_session_expiry on public.library_sessions;
create trigger library_session_expiry
before insert or update on public.library_sessions
for each row execute function public.set_library_session_expiry();

create table if not exists public.library_session_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.library_sessions(id) on delete cascade,
  event_type text not null,
  zone text check (zone in ('Main section', 'Basement')),
  created_at timestamptz not null default now()
);

create index if not exists library_session_events_session_id_idx
  on public.library_session_events (session_id, created_at desc);

alter table public.library_session_events enable row level security;

drop policy if exists "public can record library session events" on public.library_session_events;
create policy "public can record library session events"
on public.library_session_events for insert to anon, authenticated
with check (true);
