-- Phase 6: private bucket for freshly-built download ZIPs. Each invitation
-- gets one object at "<user_id>/<invitation_id>.zip", overwritten on every
-- (re)download so storage doesn't grow unbounded and re-downloads always
-- reflect the latest edited config. Written only via the service-role
-- client, which bypasses these policies; they exist as defense-in-depth in
-- case a signed URL's scope is ever reasoned about differently later.
insert into storage.buckets (id, name, public)
values ('invitation-downloads', 'invitation-downloads', false)
on conflict (id) do nothing;

create policy "Users can read their own invitation downloads"
on storage.objects for select
to authenticated
using (
  bucket_id = 'invitation-downloads'
  and (storage.foldername(name))[1] = auth.uid()::text
);
