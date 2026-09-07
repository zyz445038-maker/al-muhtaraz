import { ArchiveDocument, ArchiveDocumentVersion, ArchiveIndexData } from '@/services/archive/types';
import { LocalArchiveStorageService } from '@/services/archive/storage/localStorageService';

export interface DocumentIndexer {
  writeIndex(input: {
    document: ArchiveDocument;
    version: ArchiveDocumentVersion;
    extractedText: string;
    documentNumber?: string | null;
    customerName?: string | null;
    customerPhone?: string | null;
    contractNumber?: string | null;
    containerNumber?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<ArchiveIndexData>;
}

export class LocalDocumentIndexer implements DocumentIndexer {
  constructor(private readonly storage = new LocalArchiveStorageService()) {}

  async writeIndex(input: Parameters<DocumentIndexer['writeIndex']>[0]): Promise<ArchiveIndexData> {
    const index: ArchiveIndexData = {
      document_id: input.document.id,
      document_number: input.documentNumber || null,
      customer_name: input.customerName || null,
      customer_phone: input.customerPhone || null,
      contract_number: input.contractNumber || null,
      container_number: input.containerNumber || null,
      extracted_text: input.extractedText,
      metadata: input.metadata || {},
      indexed_at: new Date().toISOString()
    };

    await this.storage.writeAtomically(input.version.json_path, JSON.stringify(index, null, 2));
    return index;
  }
}