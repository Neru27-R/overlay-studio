-- Run this file in Supabase SQL Editor.
-- After creating your admin user in Authentication > Users, copy that user's ID
-- and run the admin_profiles insert near the bottom of this file.

create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.templates (
  id text primary key,
  name text not null,
  data jsonb not null,
  published boolean not null default true,
  owner_id uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles
    where user_id = auth.uid()
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_templates_updated_at on public.templates;
create trigger set_templates_updated_at
before update on public.templates
for each row
execute function public.set_updated_at();

alter table public.admin_profiles enable row level security;
alter table public.templates enable row level security;

drop policy if exists "Admin profiles are readable by their owner" on public.admin_profiles;
create policy "Admin profiles are readable by their owner"
on public.admin_profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Published templates are readable" on public.templates;
create policy "Published templates are readable"
on public.templates
for select
to anon, authenticated
using (published = true or public.is_admin());

drop policy if exists "Admins can insert templates" on public.templates;
create policy "Admins can insert templates"
on public.templates
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update templates" on public.templates;
create policy "Admins can update templates"
on public.templates
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete templates" on public.templates;
create policy "Admins can delete templates"
on public.templates
for delete
to authenticated
using (public.is_admin());

insert into storage.buckets (id, name, public)
values
  ('template-assets', 'template-assets', true),
  ('template-downloads', 'template-downloads', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Template files are publicly readable" on storage.objects;
create policy "Template files are publicly readable"
on storage.objects
for select
to anon, authenticated
using (bucket_id in ('template-assets', 'template-downloads'));

drop policy if exists "Admins can upload template files" on storage.objects;
create policy "Admins can upload template files"
on storage.objects
for insert
to authenticated
with check (bucket_id in ('template-assets', 'template-downloads') and public.is_admin());

drop policy if exists "Admins can update template files" on storage.objects;
create policy "Admins can update template files"
on storage.objects
for update
to authenticated
using (bucket_id in ('template-assets', 'template-downloads') and public.is_admin())
with check (bucket_id in ('template-assets', 'template-downloads') and public.is_admin());

drop policy if exists "Admins can delete template files" on storage.objects;
create policy "Admins can delete template files"
on storage.objects
for delete
to authenticated
using (bucket_id in ('template-assets', 'template-downloads') and public.is_admin());

-- After creating your Supabase Auth user, replace the UUID below and run it once:
-- insert into public.admin_profiles (user_id)
-- values ('00000000-0000-0000-0000-000000000000')
-- on conflict (user_id) do nothing;
