INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documents',
    'documents',
    false,
    52428800,
    ARRAY['application/pdf', 'image/png', 'image/jpeg']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Archive managers read document objects" ON storage.objects;
CREATE POLICY "Archive managers read document objects" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'documents'
        AND public.has_archive_access()
    );

DROP POLICY IF EXISTS "Archive managers upload document objects" ON storage.objects;
CREATE POLICY "Archive managers upload document objects" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'documents'
        AND public.has_archive_access()
    );

DROP POLICY IF EXISTS "Archive managers delete document objects" ON storage.objects;
CREATE POLICY "Archive managers delete document objects" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'documents'
        AND public.has_archive_access()
    );
