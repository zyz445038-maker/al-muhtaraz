import { NextResponse } from 'next/server';
import { createHash, randomUUID } from 'crypto';
import { getArchiveAuthorizedProfile } from '@/lib/archiveAuthorization';
import { DocumentRepository } from '@/services/archive/documents/documentRepository';
import { DocumentVersionRepository } from '@/services/archive/documents/documentVersionRepository';
import { LocalArchiveStorageService } from '@/services/archive/storage/localStorageService';
import { buildArchiveDocumentPath } from '@/services/archive/storage/storagePath';
import { ArchiveDocumentType } from '@/services/archive/types';
import { apiErrorResponse } from '@/lib/apiSafety';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STORAGE_BUCKET = 'documents';
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const DOCUMENT_TYPES: readonly ArchiveDocumentType[] = ['contract', 'receipt', 'attachment', 'customer_document'];
const localStorage = new LocalArchiveStorageService();

function getFileKind(buffer: Buffer, mimeType: string): { mimeType: string; contentType: 'pdf_text' | 'image'; extension: 'pdf' | 'bin' } | null {
  if (buffer.subarray(0, 5).toString('ascii') === '%PDF-' && mimeType === 'application/pdf') {
    return { mimeType, contentType: 'pdf_text', extension: 'pdf' };
  }
  if (
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    && mimeType === 'image/png'
  ) {
    return { mimeType, contentType: 'image', extension: 'bin' };
  }
  if (
    buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
    && mimeType === 'image/jpeg'
  ) {
    return { mimeType, contentType: 'image', extension: 'bin' };
  }
  return null;
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
    const { supabase, user } = authorization;

    const formData = await request.formData();
    const file = formData.get('file');
    const requestedType = formData.get('document_type');
    const documentType = typeof requestedType === 'string' && DOCUMENT_TYPES.includes(requestedType as ArchiveDocumentType)
      ? requestedType as ArchiveDocumentType
      : 'contract';
    const customerId = formData.get('customer_id') as string | null;
    const contractId = formData.get('contract_id') as string | null;

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: 'File must be between 1 byte and 50 MB.' },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const kind = getFileKind(buffer, file.type);
    if (!kind) {
      return NextResponse.json(
        { success: false, error: 'Only valid PDF, PNG, and JPEG files are supported.' },
        { status: 415 }
      );
    }
    const sha256 = createHash('sha256').update(buffer).digest('hex');
    const repo = new DocumentRepository(supabase);
    const versionRepo = new DocumentVersionRepository(supabase);
    const duplicateResult = await repo.findVersionBySha256(sha256);
    if (!duplicateResult.ok) {
      throw new Error(duplicateResult.error || 'Could not check for duplicate archive files.');
    }
    if (duplicateResult.data) {
      return NextResponse.json({
        success: true,
        duplicate: true,
        document_id: duplicateResult.data.document_id
      });
    }

    const docResult = await repo.create({
      document_type: documentType,
      customer_id: customerId || undefined,
      contract_id: contractId || undefined,
      source_type: 'upload',
      original_filename: file.name,
      created_by: user.id,
      status: 'active'
    });
    if (!docResult.ok || !docResult.data) {
      throw new Error(`Failed to create document record: ${docResult.error}`);
    }

    const documentId = docResult.data.id;
    const filePath = buildArchiveDocumentPath(
      documentType === 'customer_document' ? 'customer' : documentType,
      documentId,
      'v1',
      kind.extension
    );
    const jsonPath = buildArchiveDocumentPath(
      documentType === 'customer_document' ? 'customer' : documentType,
      documentId,
      'v1',
      'json'
    );
    const isLocalStorage = Boolean(process.env.ARCHIVE_STORAGE_ROOT);
    let fileUploaded = false;

    try {
      if (isLocalStorage) {
        await localStorage.ensureDirectories();
        await localStorage.writeAtomically(filePath, buffer);
      } else {
        const { error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(filePath, buffer, { contentType: kind.mimeType, upsert: false });
        if (error) throw error;
      }
      fileUploaded = true;

      const versionResult = await versionRepo.create({
        document_id: documentId,
        version_number: 1,
        file_path: filePath,
        json_path: jsonPath,
        original_filename: file.name,
        mime_type: kind.mimeType,
        file_size: buffer.byteLength,
        sha256,
        content_type: kind.contentType,
        extraction_status: kind.contentType === 'pdf_text' ? 'pending' : 'failed',
        ocr_status: kind.contentType === 'image' ? 'pending' : 'not_required'
      });
      if (!versionResult.ok || !versionResult.data) {
        throw new Error(versionResult.error || 'Failed to create archive document version.');
      }

      const currentVersion = await repo.setCurrentVersion(documentId, versionResult.data.id);
      if (!currentVersion.ok) {
        throw new Error(currentVersion.error || 'Failed to set the current archive version.');
      }

      let jobId: string | null = null;
      if (kind.contentType === 'pdf_text') {
        const jobResult = await repo.registerImportJob({
          document_id: documentId,
          source_type: 'upload',
          source_path: filePath,
          priority: 10,
          metadata: { mime_type: kind.mimeType }
        });
        if (!jobResult.ok || !jobResult.data) {
          throw new Error(jobResult.error || 'Failed to register the archive import job.');
        }
        jobId = jobResult.data.id;
      }

      return NextResponse.json({
        success: true,
        message: jobId
          ? 'File uploaded and import job registered successfully.'
          : 'Image uploaded successfully; OCR processing is pending.',
        document_id: documentId,
        job_id: jobId,
        storage: isLocalStorage ? 'local' : 'supabase'
      });
    } catch (error) {
      if (fileUploaded) {
        if (isLocalStorage) {
          await localStorage.removeTemporary(filePath);
        } else {
          const { error: storageError } = await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
          if (storageError) console.error('Could not remove an incomplete archive upload:', storageError);
        }
      }
      const { error: statusError } = await supabase
        .from('documents')
        .update({ status: 'failed' })
        .eq('id', documentId);
      if (statusError) console.error('Could not mark incomplete archive document as failed:', statusError);
      throw error;
    }
  } catch (error) {
    console.error('Upload Error:', error);
    const resp = apiErrorResponse('document.upload', error);
    return NextResponse.json({ ...(await resp.json()), success: false }, { status: resp.status });
  }
}
