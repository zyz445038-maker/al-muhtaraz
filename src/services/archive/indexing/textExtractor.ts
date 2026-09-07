import { ExtractedPdfText } from '@/services/archive/types';

export interface TextExtractor {
  extractPdf(buffer: Uint8Array): Promise<ExtractedPdfText>;
}

function decodePdfLiteral(value: string): string {
  return value
    .replace(/\\([\\()])/g, '$1')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t');
}

export class BasicPdfTextExtractor implements TextExtractor {
  async extractPdf(buffer: Uint8Array): Promise<ExtractedPdfText> {
    const header = Buffer.from(buffer.subarray(0, 5)).toString('ascii');
    if (header !== '%PDF-') {
      return {
        text: '',
        content_type: 'pdf_text',
        extraction_status: 'failed',
        ocr_status: 'not_required',
        error: 'Unsupported or invalid PDF signature'
      };
    }

    const source = Buffer.from(buffer).toString('latin1');
    const textFragments = Array.from(source.matchAll(/\(([^()]*)\)\s*T[Jj]/g))
      .map(match => decodePdfLiteral(match[1]))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!textFragments) {
      return {
        text: '',
        content_type: 'pdf_scan',
        extraction_status: 'completed',
        ocr_status: 'pending'
      };
    }

    return {
      text: textFragments,
      content_type: 'pdf_text',
      extraction_status: 'completed',
      ocr_status: 'not_required'
    };
  }
}