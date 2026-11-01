import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { getArchiveAuthorizedProfile } from '@/lib/archiveAuthorization';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { apiErrorResponse } from '@/lib/apiSafety';
import { DocumentRepository } from '@/services/archive/documents/documentRepository';
import { DocumentVersionRepository } from '@/services/archive/documents/documentVersionRepository';
import { ArchiveDocumentIndexer } from '@/services/archive/indexing/documentIndexer';
import { DocumentImportService } from '@/services/archive/import/documentImportService';
import { DocumentWorker } from '@/services/archive/queue/documentWorker';
import { DocumentJobQueue } from '@/services/archive/queue/documentJobQueue';
import { LocalArchiveStorageService } from '@/services/archive/storage/localStorageService';
import { SupabaseArchiveStorageService } from '@/services/archive/storage/supabaseArchiveStorageService';
import { BasicPdfTextExtractor } from '@/services/archive/indexing/textExtractor';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

function isValidCronAuthorization(request: Request, secret: string): boolean {
  const authorization = request.headers.get('authorization') || '';
  const expected = Buffer.from(['Bear', 'er ', secret].join(''));
  const received = Buffer.from(authorization);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

async function processArchiveImports(request: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    const hasBearer = /^Bearer\s+/i.test(request.headers.get('authorization') || '');
    let supabase;

    if (hasBearer) {
      if (!secret) {
        return NextResponse.json({ success: false, error: 'Archive worker authentication is not configured.' }, { status: 503 });
      }
      if (!isValidCronAuthorization(request, secret)) {
        return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
      }
      supabase = getSupabaseAdminClient();
    } else {
      const authorization = await getArchiveAuthorizedProfile();
      if (!authorization.ok) {
        return NextResponse.json(
          { success: false, error: authorization.error },
          { status: authorization.status }
        );
      }
      supabase = authorization.supabase;
    }

    const storageBackend = process.env.ARCHIVE_STORAGE_ROOT ? 'local' : 'supabase';
    const storage = storageBackend === 'local'
      ? new LocalArchiveStorageService()
      : new SupabaseArchiveStorageService(supabase);
    const documents = new DocumentRepository(supabase);
    const versions = new DocumentVersionRepository(supabase);
    const importer = new DocumentImportService(
      documents,
      versions,
      storage,
      new BasicPdfTextExtractor(),
      new ArchiveDocumentIndexer(storage)
    );
    const queue = new DocumentJobQueue(documents, { storageBackend });
    const worker = new DocumentWorker(queue, importer);
    const result = await worker.processBatch(storageBackend === 'local' ? 1 : 5);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Archive import worker failed:', error);
    const response = apiErrorResponse('archive.import.worker', error);
    return NextResponse.json({ ...(await response.json()), success: false }, { status: response.status });
  }
}

export async function GET(request: Request) {
  return processArchiveImports(request);
}

export async function POST(request: Request) {
  return processArchiveImports(request);
}
