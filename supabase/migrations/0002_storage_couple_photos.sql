-- Phase 5: private bucket for uploaded couple photos. Objects are stored at
-- "<user_id>/<invitation_id>/<field_key>.jpg" so the folder-name policy below
-- scopes every operation to the owning user.
insert into storage.buckets (id, name, public)
values ('couple-photos', 'couple-photos', false)
on conflict (id) do nothing;

create policy "Users can read their own couple photos"
on storage.objects for select
to authenticated
using (
  bucket_id = 'couple-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can upload their own couple photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'couple-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can update their own couple photos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'couple-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'couple-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete their own couple photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'couple-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
