-- =====================================================================
--  روايات صمت — Silence Novels
--  Migration 0003: Storage Buckets & Policies
--  المسار الموصى به: {user_id}/{novel_id}/filename
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('covers', 'covers', true, 10485760,
    array['image/jpeg','image/png','image/webp','image/gif']),
  ('chapter-media', 'chapter-media', true, 26214400,
    array['image/jpeg','image/png','image/webp','image/gif']),
  ('audio', 'audio', true, 52428800,
    array['audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/mp4','audio/m4a','audio/x-m4a','audio/ogg','audio/webm'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- قراءة عامة لكل الحاويات
drop policy if exists "public read covers" on storage.objects;
create policy "public read covers" on storage.objects
  for select using (bucket_id = 'covers');

drop policy if exists "public read chapter-media" on storage.objects;
create policy "public read chapter-media" on storage.objects
  for select using (bucket_id = 'chapter-media');

drop policy if exists "public read audio" on storage.objects;
create policy "public read audio" on storage.objects
  for select using (bucket_id = 'audio');

drop policy if exists "public read avatars" on storage.objects;
create policy "public read avatars" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "write own avatars" on storage.objects;
create policy "write own avatars" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "update own avatars" on storage.objects;
create policy "update own avatars" on storage.objects
  for update using (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "delete own avatars" on storage.objects;
create policy "delete own avatars" on storage.objects
  for delete using (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );

-- الكتابة: المستخدم يرفع داخل مجلده الخاص {user_id}/... أو الموظف/المالك
drop policy if exists "write own covers" on storage.objects;
create policy "write own covers" on storage.objects
  for insert with check (
    bucket_id = 'covers'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_staff())
  );

drop policy if exists "write own chapter-media" on storage.objects;
create policy "write own chapter-media" on storage.objects
  for insert with check (
    bucket_id = 'chapter-media'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_staff())
  );

drop policy if exists "write own audio" on storage.objects;
create policy "write own audio" on storage.objects
  for insert with check (
    bucket_id = 'audio'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_staff())
  );

-- التعديل والحذف
drop policy if exists "update own objects" on storage.objects;
create policy "update own objects" on storage.objects
  for update using (
    bucket_id in ('covers','chapter-media','audio')
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_staff())
  );

drop policy if exists "delete own objects" on storage.objects;
create policy "delete own objects" on storage.objects
  for delete using (
    bucket_id in ('covers','chapter-media','audio')
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_staff())
  );
