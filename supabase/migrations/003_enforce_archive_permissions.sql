ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.profiles
    DROP COLUMN IF EXISTS password_pin;

DROP POLICY IF EXISTS "Staff can update own profile" ON public.profiles;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, phone, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.email,
        NEW.raw_user_meta_data->>'phone',
        'employee'
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.has_archive_access()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND is_active = true
          AND (
              role = 'admin'
              OR permissions ->> 'can_manage_archive' = 'true'
          )
    );
$$;

DROP POLICY IF EXISTS "Staff can view archive documents" ON public.documents;
CREATE POLICY "Archive managers can view documents" ON public.documents
    FOR SELECT USING (public.has_archive_access());

DROP POLICY IF EXISTS "Staff can view archive versions" ON public.document_versions;
CREATE POLICY "Archive managers can view versions" ON public.document_versions
    FOR SELECT USING (public.has_archive_access());

DROP POLICY IF EXISTS "Staff can view archive snapshots" ON public.customer_archive_snapshot;
CREATE POLICY "Archive managers can view snapshots" ON public.customer_archive_snapshot
    FOR SELECT USING (public.has_archive_access());

DROP POLICY IF EXISTS "Staff can view archive jobs" ON public.document_import_jobs;
CREATE POLICY "Archive managers can view jobs" ON public.document_import_jobs
    FOR SELECT USING (public.has_archive_access());

DROP POLICY IF EXISTS "Archive managers insert metadata" ON public.documents;
CREATE POLICY "Archive managers insert metadata" ON public.documents
    FOR INSERT WITH CHECK (public.has_archive_access());

DROP POLICY IF EXISTS "Archive managers insert versions" ON public.document_versions;
CREATE POLICY "Archive managers insert versions" ON public.document_versions
    FOR INSERT WITH CHECK (public.has_archive_access());

DROP POLICY IF EXISTS "Archive managers insert snapshots" ON public.customer_archive_snapshot;
CREATE POLICY "Archive managers insert snapshots" ON public.customer_archive_snapshot
    FOR INSERT WITH CHECK (public.has_archive_access());

DROP POLICY IF EXISTS "Archive managers insert jobs" ON public.document_import_jobs;
CREATE POLICY "Archive managers insert jobs" ON public.document_import_jobs
    FOR INSERT WITH CHECK (public.has_archive_access());

DROP POLICY IF EXISTS "Archive managers update documents" ON public.documents;
CREATE POLICY "Archive managers update documents" ON public.documents
    FOR UPDATE USING (public.has_archive_access())
    WITH CHECK (public.has_archive_access());

DROP POLICY IF EXISTS "Archive managers update versions" ON public.document_versions;
CREATE POLICY "Archive managers update versions" ON public.document_versions
    FOR UPDATE USING (public.has_archive_access())
    WITH CHECK (public.has_archive_access());

DROP POLICY IF EXISTS "Archive managers update jobs" ON public.document_import_jobs;
CREATE POLICY "Archive managers update jobs" ON public.document_import_jobs
    FOR UPDATE USING (public.has_archive_access())
    WITH CHECK (public.has_archive_access());
