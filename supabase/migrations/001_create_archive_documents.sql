-- Phase 3 archive foundation migration.
-- This migration stores metadata only. Files remain on the local archive server.

CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type TEXT NOT NULL CHECK (document_type IN ('contract', 'receipt', 'attachment', 'customer_document')),
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
    current_version_id UUID,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'legal_hold', 'quarantined', 'failed')),
    source_type TEXT NOT NULL CHECK (source_type IN ('upload', 'zip_import', 'legacy_import', 'generated')),
    original_filename TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE RESTRICT,
    version_number INTEGER NOT NULL CHECK (version_number > 0),
    file_path TEXT NOT NULL,
    json_path TEXT NOT NULL,
    original_filename TEXT,
    mime_type TEXT NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size >= 0),
    sha256 TEXT NOT NULL CHECK (sha256 ~ '^[0-9a-fA-F]{64}$'),
    content_type TEXT NOT NULL CHECK (content_type IN ('pdf_text', 'pdf_scan', 'image')),
    extraction_status TEXT NOT NULL DEFAULT 'pending' CHECK (extraction_status IN ('pending', 'completed', 'failed')),
    ocr_status TEXT NOT NULL DEFAULT 'not_required' CHECK (ocr_status IN ('not_required', 'pending', 'completed', 'failed')),
    extraction_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT document_versions_document_version_unique UNIQUE (document_id, version_number),
    CONSTRAINT document_versions_document_sha_unique UNIQUE (document_id, sha256)
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'documents_current_version_fk'
          AND conrelid = 'public.documents'::regclass
    ) THEN
        ALTER TABLE public.documents
            ADD CONSTRAINT documents_current_version_fk
            FOREIGN KEY (current_version_id) REFERENCES public.document_versions(id) ON DELETE RESTRICT;
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.customer_archive_snapshot (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    alt_phone TEXT,
    customer_type TEXT,
    address TEXT,
    notes TEXT,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT customer_archive_snapshot_document_unique UNIQUE (document_id)
);

CREATE TABLE IF NOT EXISTS public.document_import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE RESTRICT,
    source_type TEXT NOT NULL CHECK (source_type IN ('upload', 'zip_import', 'legacy_import', 'generated')),
    source_path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'indexed', 'failed', 'needs_ocr', 'cancelled')),
    priority INTEGER NOT NULL DEFAULT 0 CHECK (priority >= 0),
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts > 0),
    last_error TEXT,
    locked_at TIMESTAMPTZ,
    worker_id TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_type_status ON public.documents(document_type, status);
CREATE INDEX IF NOT EXISTS idx_documents_customer ON public.documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_documents_contract ON public.documents(contract_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_document_version ON public.document_versions(document_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_document_versions_sha256 ON public.document_versions(sha256);
CREATE INDEX IF NOT EXISTS idx_customer_archive_snapshot_phone ON public.customer_archive_snapshot(phone);
CREATE INDEX IF NOT EXISTS idx_customer_archive_snapshot_name ON public.customer_archive_snapshot(name);
CREATE INDEX IF NOT EXISTS idx_document_import_jobs_queue ON public.document_import_jobs(status, priority DESC, created_at);
CREATE INDEX IF NOT EXISTS idx_document_import_jobs_locked ON public.document_import_jobs(locked_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_document_import_jobs_active_document
    ON public.document_import_jobs(document_id)
    WHERE status IN ('queued', 'processing');

DROP TRIGGER IF EXISTS tr_documents_updated_at ON public.documents;
CREATE TRIGGER tr_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_document_import_jobs_updated_at ON public.document_import_jobs;
CREATE TRIGGER tr_document_import_jobs_updated_at
    BEFORE UPDATE ON public.document_import_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_archive_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_import_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view archive documents" ON public.documents;
CREATE POLICY "Staff can view archive documents" ON public.documents
    FOR SELECT USING (public.is_active_staff());

DROP POLICY IF EXISTS "Staff can view archive versions" ON public.document_versions;
CREATE POLICY "Staff can view archive versions" ON public.document_versions
    FOR SELECT USING (public.is_active_staff());

DROP POLICY IF EXISTS "Staff can view archive snapshots" ON public.customer_archive_snapshot;
CREATE POLICY "Staff can view archive snapshots" ON public.customer_archive_snapshot
    FOR SELECT USING (public.is_active_staff());

DROP POLICY IF EXISTS "Staff can view archive jobs" ON public.document_import_jobs;
CREATE POLICY "Staff can view archive jobs" ON public.document_import_jobs
    FOR SELECT USING (public.is_active_staff());

DROP POLICY IF EXISTS "Admins manage archive metadata" ON public.documents;
CREATE POLICY "Admins manage archive metadata" ON public.documents
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Archive managers insert metadata" ON public.documents;
CREATE POLICY "Archive managers insert metadata" ON public.documents
    FOR INSERT WITH CHECK (public.is_active_staff());

DROP POLICY IF EXISTS "Admins manage archive versions" ON public.document_versions;
CREATE POLICY "Admins manage archive versions" ON public.document_versions
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Archive managers insert versions" ON public.document_versions;
CREATE POLICY "Archive managers insert versions" ON public.document_versions
    FOR INSERT WITH CHECK (public.is_active_staff());

DROP POLICY IF EXISTS "Admins manage archive snapshots" ON public.customer_archive_snapshot;
CREATE POLICY "Admins manage archive snapshots" ON public.customer_archive_snapshot
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Archive managers insert snapshots" ON public.customer_archive_snapshot;
CREATE POLICY "Archive managers insert snapshots" ON public.customer_archive_snapshot
    FOR INSERT WITH CHECK (public.is_active_staff());

DROP POLICY IF EXISTS "Admins manage archive jobs" ON public.document_import_jobs;
CREATE POLICY "Admins manage archive jobs" ON public.document_import_jobs
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Archive managers insert jobs" ON public.document_import_jobs;
CREATE POLICY "Archive managers insert jobs" ON public.document_import_jobs
    FOR INSERT WITH CHECK (public.is_active_staff());
