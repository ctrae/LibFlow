create table if not exists public.library_sessions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (lower(email) like '%@mymona.uwi.edu'),
  student_id text not null,
  short_code text not null unique check (short_code ~ '^[A-Z0-9]{4}$'),
  duration_minutes integer not null check (duration_minutes in (15, 30, 45, 60)),
  baggage_info text not null default 'No bag declared',
  zone text check (zone in ('Main section', 'Basement')),
  status text not null default 'waiting' check (status in ('waiting', 'inside', 'exited', 'expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  updated_at timestamptz not null default now()
);

create index if not exists library_sessions_short_code_idx on public.library_sessions (short_code);
create index if not exists library_sessions_created_at_idx on public.library_sessions (created_at desc);
create index if not exists library_sessions_status_zone_idx on public.library_sessions (status, zone);

create table if not exists public.library_session_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.library_sessions(id) on delete cascade,
  event_type text not null,
  zone text check (zone in ('Main section', 'Basement')),
  created_at timestamptz not null default now()
);

create index if not exists library_session_events_session_idx on public.library_session_events (session_id, created_at desc);

create or replace function public.set_library_session_expiry()
returns trigger
language plpgsql
as $$
begin
  new.expires_at := new.created_at + make_interval(mins => new.duration_minutes);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists library_session_expiry on public.library_sessions;
create trigger library_session_expiry
before insert or update of duration_minutes, created_at on public.library_sessions
for each row execute function public.set_library_session_expiry();

alter table public.library_sessions enable row level security;
alter table public.library_session_events enable row level security;

drop policy if exists "public can register library sessions" on public.library_sessions;
create policy "public can register library sessions"
on public.library_sessions for insert to anon, authenticated
with check (true);

drop policy if exists "public can read library sessions during pilot" on public.library_sessions;
create policy "public can read library sessions during pilot"
on public.library_sessions for select to anon, authenticated
using (true);

drop policy if exists "public can update library sessions during pilot" on public.library_sessions;
create policy "public can update library sessions during pilot"
on public.library_sessions for update to anon, authenticated
using (true)
with check (true);

drop policy if exists "public can log library session events during pilot" on public.library_session_events;
create policy "public can log library session events during pilot"
on public.library_session_events for insert to anon, authenticated
with check (true);

comment on table public.library_sessions is 'Pilot library visits. Replace open pilot policies with staff/student access controls before production.';
comment on table public.library_session_events is 'Append-only movement and status history for library visits.';
