create or replace function public.set_library_session_expiry()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT'
     or new.duration_minutes is distinct from old.duration_minutes
     or new.check_in_time is distinct from old.check_in_time then
    new.expires_at := new.check_in_time + make_interval(mins => new.duration_minutes);
    if new.status <> 'exited' then
      new.check_out_time := null;
    end if;
  end if;
  new.session_status := new.status;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists library_session_expiry on public.library_sessions;
create trigger library_session_expiry
before insert or update on public.library_sessions
for each row execute function public.set_library_session_expiry();

update public.library_sessions
set check_out_time = case
  when status = 'exited' then least(check_out_time, updated_at)
  else null
end;

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
      check_out_time = case p_status
        when 'exited' then now()
        else null
      end,
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
        check_out_time = now(),
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

notify pgrst, 'reload schema';
