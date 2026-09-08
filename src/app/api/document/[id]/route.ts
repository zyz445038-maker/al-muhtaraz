import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { DocumentRepository } from '@/services/archive/documents/documentRepository';
import { DocumentVersionRepository } from '@/services/archive/documents/documentVersionRepository';
import { apiErrorResponse } from '@/lib/apiSafety';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/document/[id]
 * Returns document metadata and its version list.
 * Includes preview URLs for versions when the file is publicly accessible.
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const docRepo = new DocumentRepository();
    const versionRepo = new DocumentVersionRepository();

    const [docResult, versionsResult] = await Promise.all([
      docRepo.getById(params.id),
      versionRepo.listByDocument(params.id),
    ]);

    if (!docResult.ok || !docResult.data) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    const versions = versionsResult.ok && versionsResult.data ? versionsResult.data : [];

    // Build preview URLs (public) for each version if possible
    const versionsWithPreview = await Promise.all(
      versions.map(async (v) => {
        let previewUrl: string | null = null;
        if (v.file_path) {
          const { data, error } = await supabase.storage.from('documents').createSignedUrl(v.file_path, 60);
          if (!error && data && data.signedUrl) {
            previewUrl = data.signedUrl;
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
