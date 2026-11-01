import { NextResponse } from 'next/server';
import { getArchiveAuthorizedProfile } from '@/lib/archiveAuthorization';
import { DocumentRepository } from '@/services/archive/documents/documentRepository';
import { DocumentVersionRepository } from '@/services/archive/documents/documentVersionRepository';
import { apiErrorResponse } from '@/lib/apiSafety';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/document/[id]
 * Returns document metadata and its version list.
 * Includes short-lived signed URLs for authorized archive readers.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authorization = await getArchiveAuthorizedProfile();
    if (!authorization.ok) {
      return NextResponse.json(
        { success: false, error: authorization.error },
        { status: authorization.status },
      );
    }

    const docRepo = new DocumentRepository(authorization.supabase);
    const versionRepo = new DocumentVersionRepository(authorization.supabase);
    
    const { id } = await params;

    const [docResult, versionsResult] = await Promise.all([
      docRepo.getById(id),
      versionRepo.listByDocument(id),
    ]);

    if (!docResult.ok) {
      throw new Error(docResult.error || 'Could not load archive document.');
    }
    if (!docResult.data) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    if (!versionsResult.ok) {
      throw new Error(versionsResult.error || 'Could not load archive document versions.');
    }
    const versions = versionsResult.data || [];

    // Generate short-lived URLs only after archive authorization succeeds.
    const versionsWithPreview = await Promise.all(
      versions.map(async (v) => {
        let previewUrl: string | null = null;
        if (v.file_path) {
          if (process.env.ARCHIVE_STORAGE_ROOT) {
            previewUrl = `/api/document/${encodeURIComponent(id)}/version/${encodeURIComponent(v.id)}`;
          } else {
            const { data, error } = await authorization.supabase.storage
              .from('documents')
              .createSignedUrl(v.file_path, 60);
            if (error) throw error;
            previewUrl = data?.signedUrl || null;
          }
        }
        return { ...v, previewUrl };
      })
    );

    return NextResponse.json({
      success: true,
      document: docResult.data,
      versions: versionsWithPreview,
    });
  } catch (error) {
    const resp = apiErrorResponse('document.view', error);
    return NextResponse.json({ ...(await resp.json()), success: false }, { status: resp.status });
  }
}
