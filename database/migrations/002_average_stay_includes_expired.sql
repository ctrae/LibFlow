-- Average stay now counts expired sessions as well as exited ones.
-- Exited visits end at check-out. Expired visits (students who overstayed)
-- end when their time ran out (expires_at), or now if staff expired them early.
-- Run once in the Supabase SQL editor. Safe to re-run.

create or replace function public.report_average_stay(p_start date, p_end date)
returns table (avg_stay_minutes numeric, completed_visits bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(round((avg(extract(epoch from (
           least(coalesce(check_out, expires_at), now()) - check_in
         )) / 60.0))::numeric, 1), 0),
         count(*)
  from public.library_sessions
  where (
      (status = 'exited' and check_out is not null)
      or (status = 'expired' and coalesce(check_out, expires_at) is not null)
    )
    and check_in >= (p_start::timestamp at time zone 'America/Jamaica')
    and check_in <  ((p_end + 1)::timestamp at time zone 'America/Jamaica');
$$;
