ALTER TABLE public.document_import_jobs
    ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ;

UPDATE storage.buckets
SET file_size_limit = 4194304,
    allowed_mime_types = ARRAY['application/pdf']
WHERE id = 'documents';

CREATE INDEX IF NOT EXISTS idx_document_import_jobs_retry
    ON public.document_import_jobs(status, next_attempt_at, priority DESC, created_at);

CREATE INDEX IF NOT EXISTS idx_document_import_jobs_metadata
    ON public.document_import_jobs USING GIN (metadata jsonb_path_ops);
