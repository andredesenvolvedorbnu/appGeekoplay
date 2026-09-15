insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('communities','communities',true,10485760,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "public read communities" on storage.objects;
create policy "public read communities" on storage.objects for select using (bucket_id='communities');

drop policy if exists "authenticated upload communities" on storage.objects;
create policy "authenticated upload communities" on storage.objects for insert to authenticated with check (bucket_id='communities' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists "owner update communities" on storage.objects;
create policy "owner update communities" on storage.objects for update to authenticated using (bucket_id='communities' and owner_id=auth.uid()::text) with check (bucket_id='communities' and owner_id=auth.uid()::text);

drop policy if exists "owner delete communities" on storage.objects;
create policy "owner delete communities" on storage.objects for delete to authenticated using (bucket_id='communities' and owner_id=auth.uid()::text);
