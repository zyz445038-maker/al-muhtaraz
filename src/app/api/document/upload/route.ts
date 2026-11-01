import { NextResponse } from 'next/server';
import { getArchiveAuthorizedProfile } from '@/lib/archiveAuthorization';
import { apiErrorResponse } from '@/lib/apiSafety';
import { DocumentRepository } from '@/services/archive/documents/documentRepository';
import { DocumentVersionRepository } from '@/services/archive/documents/documentVersionRepository';
import { DocumentImportService } from '@/services/archive/import/documentImportService';
import { LocalArchiveStorageService } from '@/services/archive/storage/localStorageService';
import { SupabaseArchiveStorageService } from '@/services/archive/storage/supabaseArchiveStorageService';
import { ArchiveDocumentType } from '@/services/archive/types';
import { BasicPdfTextExtractor } from '@/services/archive/indexing/textExtractor';
import { ArchiveDocumentIndexer } from '@/services/archive/indexing/documentIndexer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;
const DOCUMENT_TYPES: readonly ArchiveDocumentType[] = ['contract', 'receipt', 'attachment', 'customer_document'];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function optionalFormString(value: FormDataEntryValue | null, label: string): string | null {
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new Error(`${label} must be a valid identifier.`);
  }
  return value;
}

export async function POST(request: Request) {
  try {
    const authorization = await getArchiveAuthorizedProfile();
    if (!authorization.ok) {
      return NextResponse.json(
        { success: false, error: authorization.error },
        { status: authorization.status },
      );
    }

    const contentLength = Number(request.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > MAX_FILE_SIZE_BYTES + 64 * 1024) {
      return NextResponse.json({ success: false, error: 'Request exceeds the 4 MB file limit.' }, { status: 413 });
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid multipart upload request.' }, { status: 400 });
    }

    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'A PDF file is required.' }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: 'File must be between 1 byte and 4 MB.' },
        { status: 413 }
      );
    }
    if (
      file.type !== 'application/pdf'
      || !file.name.toLowerCase().endsWith('.pdf')
      || file.name.length > 255
      || /[\u0000-\u001f\u007f]/.test(file.name)
    ) {
      return NextResponse.json(
        { success: false, error: 'Only PDF files with a valid filename are supported.' },
        { status: 415 }
      );
    }

    const requestedType = formData.get('document_type');
    const documentType = typeof requestedType === 'string' && DOCUMENT_TYPES.includes(requestedType as ArchiveDocumentType)
      ? requestedType as ArchiveDocumentType
      : requestedType === null
        ? 'contract'
        : null;
    if (!documentType) {
      return NextResponse.json({ success: false, error: 'Invalid archive document type.' }, { status: 400 });
    }

    let customerId: string | null;
    let contractId: string | null;
    try {
      customerId = optionalFormString(formData.get('customer_id'), 'Customer ID');
      contractId = optionalFormString(formData.get('contract_id'), 'Contract ID');
    } catch (error) {
      return NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : 'Invalid document relationship.' },
        { status: 400 }
      );
    }

    const isLocalStorage = Boolean(process.env.ARCHIVE_STORAGE_ROOT);
    const storage = isLocalStorage
      ? new LocalArchiveStorageService()
      : new SupabaseArchiveStorageService(authorization.supabase);
    const documents = new DocumentRepository(authorization.supabase);
    const versions = new DocumentVersionRepository(authorization.supabase);
    const importer = new DocumentImportService(
      documents,
      versions,
      storage,
      new BasicPdfTextExtractor(),
      new ArchiveDocumentIndexer(storage)
    );
    const result = await importer.importPdf({
      document_type: documentType,
      customer_id: customerId,
      contract_id: contractId,
      source_type: 'upload',
      source_filename: file.name,
      mime_type: file.type,
      file: new Uint8Array(await file.arrayBuffer()),
      created_by: authorization.user.id,
      metadata: { storage_backend: isLocalStorage ? 'local' : 'supabase' }
    });

    return NextResponse.json({
      success: true,
      duplicate: result.duplicate,
      document_id: result.documentId,
      version_id: result.versionId || null,
      job_id: result.jobId || null,
      storage: isLocalStorage ? 'local' : 'supabase',
      message: result.duplicate
        ? 'This file is already in the archive.'
        : 'File saved and queued for processing.'
    }, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    console.error('Upload Error:', error);
    const response = apiErrorResponse('document.upload', error);
    return NextResponse.json({ ...(await response.json()), success: false }, { status: response.status });
  }
}
