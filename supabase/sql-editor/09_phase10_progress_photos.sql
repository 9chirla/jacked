-- 09 Phase 10 progress photos
-- Paste into Supabase SQL Editor if CLI migrate is unavailable.

create table if not exists public.progress_photo (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  taken_date date not null,
  storage_path text not null,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, storage_path)
);

create index if not exists progress_photo_user_date_idx
  on public.progress_photo (user_id, taken_date desc);

alter table public.progress_photo enable row level security;
revoke all on table public.progress_photo from anon, authenticated;
grant select, insert, delete on table public.progress_photo to authenticated;

drop policy if exists progress_photo_select_own on public.progress_photo;
drop policy if exists progress_photo_insert_own on public.progress_photo;
drop policy if exists progress_photo_delete_own on public.progress_photo;

create policy progress_photo_select_own on public.progress_photo
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy progress_photo_insert_own on public.progress_photo
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy progress_photo_delete_own on public.progress_photo
  for delete to authenticated
  using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'progress-photos',
  'progress-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists progress_photos_select_own on storage.objects;
drop policy if exists progress_photos_insert_own on storage.objects;
drop policy if exists progress_photos_delete_own on storage.objects;

create policy progress_photos_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy progress_photos_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy progress_photos_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
