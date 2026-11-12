-- ============================================================================
-- ColoursFlux — storage bucket + policies
-- ----------------------------------------------------------------------------
-- Run AFTER policies.sql. Creates the single public bucket used for event
-- artwork, vendor logos, sponsor logos and the optional festival logo.
--
-- Safety limits:
--   * 2 MB per file (the client checks the same limit before uploading)
--   * PNG, JPEG and WebP only
--   * Only signed-in editors/admins may write
--   * Anyone may read (public site + offline image cache)
--
-- Deleting objects is admin-only. The public app never deletes media, so an
-- editor replacing a logo simply uploads a new file.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'festival-media',
  'festival-media',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ----------------------------------------------------------------------------
-- Read: public
-- ----------------------------------------------------------------------------

drop policy if exists "festival media public read" on storage.objects;
create policy "festival media public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'festival-media');

-- ----------------------------------------------------------------------------
-- Write: editors and admins
-- ----------------------------------------------------------------------------

drop policy if exists "festival media editor upload" on storage.objects;
create policy "festival media editor upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'festival-media'
    and public.is_editor()
  );

drop policy if exists "festival media editor update" on storage.objects;
create policy "festival media editor update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'festival-media'
    and public.is_editor()
  )
  with check (
    bucket_id = 'festival-media'
    and public.is_editor()
  );

drop policy if exists "festival media admin delete" on storage.objects;
create policy "festival media admin delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'festival-media'
    and public.is_admin()
  );
