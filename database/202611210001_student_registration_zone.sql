drop function if exists public.register_library_visit(text, text, integer, integer, text, text);

create or replace function public.register_library_visit(
  p_name text,
  p_email text,
  p_student_id integer,
  p_duration_minutes integer,
  p_baggage_info text,
  p_short_code text,
  p_zone text
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
  if p_duration_minutes is null or p_duration_minutes not in (15, 30, 45, 60) then
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
  if p_zone is null or p_zone not in ('Main section', 'Basement') then
    raise exception 'Choose a valid library zone.';
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
    v_user_id, p_student_id::text, p_short_code, p_duration_minutes, p_zone, 'active',
    trim(p_name), v_email, coalesce(nullif(trim(p_baggage_info), ''), 'No bag declared'), 'active'
  )
  returning * into v_session;

  insert into public.library_session_events (session_id, event_type, zone)
  values (v_session.id, 'registered', p_zone);

  return v_session;
end;
$$;

revoke all on function public.register_library_visit(text, text, integer, integer, text, text, text) from public;
grant execute on function public.register_library_visit(text, text, integer, integer, text, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
