alter table public.library_sessions
  add column if not exists extension_requested_minutes integer,
  add column if not exists extension_request_status text,
  add column if not exists extension_requested_at timestamptz,
  add column if not exists extension_request_resolved_at timestamptz;

alter table public.library_sessions
  drop constraint if exists library_sessions_duration_minutes_check,
  add constraint library_sessions_duration_minutes_check
    check (duration_minutes > 0);

alter table public.library_sessions
  drop constraint if exists library_sessions_extension_request_check;

alter table public.library_sessions
  add constraint library_sessions_extension_request_check
    check (
      (extension_request_status is null and extension_requested_minutes is null)
      or (
        extension_request_status is not null
        and extension_request_status in ('pending', 'approved', 'denied', 'cancelled')
        and extension_requested_minutes is not null
        and extension_requested_minutes between 1 and 60
      )
    );

create or replace function public.request_library_session_extension(
  p_short_code text,
  p_requested_minutes integer
)
returns public.library_sessions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_session public.library_sessions;
begin
  if p_requested_minutes is null or p_requested_minutes not between 1 and 60 then
    raise exception 'Request between 1 and 60 additional minutes.';
  end if;

  select * into v_session
  from public.library_sessions
  where short_code = upper(trim(p_short_code))
  for update;

  if not found then
    raise exception 'Library session not found.';
  end if;
  if v_session.status = 'exited' then
    raise exception 'This visit has already been checked out.';
  end if;
  if v_session.extension_request_status = 'pending' then
    raise exception 'An extension request is already awaiting staff approval.';
  end if;

  update public.library_sessions
  set extension_requested_minutes = p_requested_minutes,
      extension_request_status = 'pending',
      extension_requested_at = now(),
      extension_request_resolved_at = null
  where id = v_session.id
  returning * into v_session;

  insert into public.library_session_events (session_id, event_type, zone)
  values (v_session.id, 'extension_requested', v_session.zone);

  return v_session;
end;
$$;

create or replace function public.checkout_library_session(p_short_code text)
returns public.library_sessions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_session public.library_sessions;
begin
  select * into v_session
  from public.library_sessions
  where short_code = upper(trim(p_short_code))
  for update;

  if not found then
    raise exception 'Library session not found.';
  end if;

  if v_session.status <> 'exited' then
    update public.library_sessions
    set status = 'exited',
        extension_request_status = case
          when extension_request_status = 'pending' then 'cancelled'
          else extension_request_status
        end,
        extension_request_resolved_at = case
          when extension_request_status = 'pending' then now()
          else extension_request_resolved_at
        end
    where id = v_session.id
    returning * into v_session;

    insert into public.library_session_events (session_id, event_type, zone)
    values (v_session.id, 'student_checkout', v_session.zone);
  end if;

  return v_session;
end;
$$;

create or replace function public.resolve_library_session_extension(
  p_session_id uuid,
  p_approve boolean
)
returns public.library_sessions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_session public.library_sessions;
  v_new_expiry timestamptz;
  v_new_duration integer;
begin
  if not public.is_approved_library_staff() then
    raise exception 'An approved library staff account is required.';
  end if;
  if p_approve is null then
    raise exception 'Choose whether to approve or deny the extension request.';
  end if;

  select * into v_session
  from public.library_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'Library session not found.';
  end if;
  if v_session.extension_request_status is distinct from 'pending' then
    raise exception 'There is no pending extension request for this session.';
  end if;

  if p_approve then
    v_new_expiry := greatest(v_session.expires_at, now())
      + make_interval(mins => v_session.extension_requested_minutes);
    v_new_duration := ceil(
      extract(epoch from (v_new_expiry - v_session.check_in_time)) / 60
    )::integer;

    update public.library_sessions
    set duration_minutes = v_new_duration,
        status = 'active',
        extension_request_status = 'approved',
        extension_request_resolved_at = now()
    where id = v_session.id
    returning * into v_session;
  else
    update public.library_sessions
    set extension_request_status = 'denied',
        extension_request_resolved_at = now()
    where id = v_session.id
    returning * into v_session;
  end if;

  insert into public.library_session_events (session_id, event_type, zone)
  values (
    v_session.id,
    case when p_approve then 'extension_approved' else 'extension_denied' end,
    v_session.zone
  );

  return v_session;
end;
$$;

drop function public.get_library_session_by_code(text);

create function public.get_library_session_by_code(p_short_code text)
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
  updated_at timestamptz,
  extension_requested_minutes integer,
  extension_request_status text,
  extension_requested_at timestamptz,
  extension_request_resolved_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select s.id, s.name, s.email, s.student_id, s.short_code,
         s.duration_minutes, s.baggage_info, s.zone, s.status,
         s.created_at, s.expires_at, s.updated_at,
         s.extension_requested_minutes, s.extension_request_status,
         s.extension_requested_at, s.extension_request_resolved_at
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
  set zone = p_zone,
      status = p_status,
      extension_request_status = case
        when p_status = 'exited' and extension_request_status = 'pending' then 'cancelled'
        else extension_request_status
      end,
      extension_request_resolved_at = case
        when p_status = 'exited' and extension_request_status = 'pending' then now()
        else extension_request_resolved_at
      end
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

revoke all on function public.request_library_session_extension(text, integer) from public;
revoke all on function public.checkout_library_session(text) from public;
revoke all on function public.resolve_library_session_extension(uuid, boolean) from public, anon;
revoke all on function public.get_library_session_by_code(text) from public;

grant execute on function public.request_library_session_extension(text, integer) to anon, authenticated;
grant execute on function public.checkout_library_session(text) to anon, authenticated;
grant execute on function public.resolve_library_session_extension(uuid, boolean) to authenticated;
grant execute on function public.get_library_session_by_code(text) to anon, authenticated;

notify pgrst, 'reload schema';
