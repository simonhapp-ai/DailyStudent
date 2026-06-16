-- 007_note_attachments_storage.sql
-- Private bucket for Smart Note attachments (photos, drawing pages) that a user
-- explicitly chooses to transfer to another device. Attachments are local-only
-- (IndexedDB) by default — nothing here is uploaded automatically.
-- Paths are namespaced "{auth.uid()}/{noteId}/{attachmentId}" so the RLS check
-- can scope access to the owning user via the first path segment.

insert into storage.buckets (id, name, public, file_size_limit)
values ('note-attachments', 'note-attachments', false, 15728640) -- 15 MB
on conflict (id) do nothing;

create policy "Users can read own note attachments"
on storage.objects for select
using (bucket_id = 'note-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can upload own note attachments"
on storage.objects for insert
with check (bucket_id = 'note-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update own note attachments"
on storage.objects for update
using (bucket_id = 'note-attachments' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'note-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete own note attachments"
on storage.objects for delete
using (bucket_id = 'note-attachments' and (storage.foldername(name))[1] = auth.uid()::text);
