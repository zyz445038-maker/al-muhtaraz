import { NextResponse } from 'next/server';
import { getArchiveAuthorizedProfile } from '@/lib/archiveAuthorization';
import { DocumentVersionRepository } from '@/services/archive/documents/documentVersionRepository';
import { LocalArchiveStorageService } from '@/services/archive/storage/localStorageService';
import { apiErrorResponse } from '@/lib/apiSafety';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const authorization = await getArchiveAuthorizedProfile();
    if (!authorization.ok) {
      return NextResponse.json(
        { success: false, error: authorization.error },
        { status: authorization.status }
      );
    }
    if (!process.env.ARCHIVE_STORAGE_ROOT) {
      return NextResponse.json({ success: false, error: 'Local archive storage is not configured.' }, { status: 404 });
    }

    const { id, versionId } = await params;
    const repository = new DocumentVersionRepository(authorization.supabase);
    const result = await repository.getById(versionId);
    if (!result.ok) throw new Error(result.error || 'Could not load archive document version.');
    if (!result.data || result.data.document_id !== id) {
      return NextResponse.json({ success: false, error: 'Document version not found.' }, { status: 404 });
    }

    const storage = new LocalArchiveStorageService();
    const file = await storage.read(result.data.file_path);
    const filename = result.data.original_filename || 'document';
    const safeFilename = filename.replace(/[^A-Za-z0-9._ -]/g, '_');
    const encodedFilename = encodeURIComponent(filename).replace(/['()*]/g, (character) =>
      `%${character.charCodeAt(0).toString(16).toUpperCase()}`
    );
    return new NextResponse(new Uint8Array(file), {
      headers: {
        'Content-Type': result.data.mime_type,
        'Content-Disposition': `inline; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch (error) {
    const response = apiErrorResponse('document.version.read', error);
    return NextResponse.json(
      { ...(await response.json()), success: false },
      { status: response.status }
    );
  }
}
