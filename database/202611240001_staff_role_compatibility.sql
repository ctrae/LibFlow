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
      and user_type in ('Head Librarian', 'HeadLibrarian', 'Library Staff', 'LibraryStaff')
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
      and user_type in ('Head Librarian', 'HeadLibrarian')
      and is_approved
  );
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
    and user_type in ('Head Librarian', 'HeadLibrarian', 'Library Staff', 'LibraryStaff');

  if not found then
    raise exception 'No staff profile is linked to this account.';
  end if;
end;
$$;

notify pgrst, 'reload schema';
