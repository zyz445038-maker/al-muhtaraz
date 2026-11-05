/**
 * Receipt and Contract QR URL Payload Encoder / Decoder
 * Supports UTF-8 Arabic characters safely without garbled text or length corruption
 */

export interface PublicReceiptPayload {
  type?: 'receipt';
  receiptNumber: string;
  contractNumber: string;
  customerName: string;
  customerVatNumber?: string;
  publicVerificationToken?: string;
  customerPhone: string;
  containerNumber: string;
  contractType: string;
  paidAmount: number;
  totalCost: number;
  contractPaidAmount?: number;
  nonTaxableAmount?: number;
  subtotalAmount?: number;
  vatAmount?: number;
  receiptNonTaxableAmount?: number;
  receiptSubtotalAmount?: number;
  receiptVatAmount?: number;
  paymentMethod: string;
  startDate: string;
  endDate: string;
  locationAddress: string;
  issueDate: string;
  notes?: string;
}

export interface PublicOfficialContractPayload {
  type: 'official_contract';
  approvalNumber: string;
  serialNumber: string;
  contractDate: string;
  secondPartyName: string;
  containerCount: number;
  containerType: string;
  phoneNumber: string;
  plotNumber: string;
  planNumber: string;
  locationDescription: string;
  renovationLicenseYears: number;
  buildingLicenseYears: number;
  isSealed: boolean;
  sealedBy?: string;
  sealedAt?: string;
  sealImageUrl?: string;
  notes?: string;
  timestamp?: string;
}

export type PublicVerificationPayload = PublicReceiptPayload | PublicOfficialContractPayload;

export async function encodeCompactReceiptPayload(payload: PublicReceiptPayload): Promise<string> {
  const compact = [
    3,
    payload.receiptNumber,
    payload.contractNumber,
    payload.customerName,
    payload.customerPhone,
    payload.containerNumber,
    payload.contractType,
    payload.paidAmount,
    payload.totalCost,
    payload.paymentMethod,
    payload.startDate,
    payload.endDate,
    payload.locationAddress,
    payload.issueDate,
    payload.customerVatNumber || '',
    payload.contractPaidAmount ?? payload.paidAmount,
    payload.nonTaxableAmount ?? 0,
    payload.subtotalAmount ?? payload.totalCost,
    payload.vatAmount ?? 0,
    payload.receiptNonTaxableAmount ?? 0,
    payload.receiptSubtotalAmount ?? payload.paidAmount,
    payload.receiptVatAmount ?? 0
  ];
  const json = JSON.stringify(compact);
  const plainBytes = new TextEncoder().encode(json);

  if (typeof CompressionStream !== 'undefined') {
    try {
      const compressed = await new Response(
        new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'))
      ).arrayBuffer();
      return `z1.${encodeBase64Url(new Uint8Array(compressed))}`;
    } catch (error) {
      console.warn('Could not compress receipt verification data; using compact uncompressed data:', error);
    }
  }

  return `j1.${encodeBase64Url(plainBytes)}`;
}

export async function decodeReceiptVerificationPayload(encoded: string): Promise<PublicVerificationPayload | null> {
  if (!encoded.startsWith('z1.') && !encoded.startsWith('j1.')) {
    return decodeUtf8Base64(encoded);
  }

  try {
    let bytes = decodeBase64Url(encoded.slice(3));
    if (encoded.startsWith('z1.')) {
      if (typeof DecompressionStream === 'undefined') return null;
      bytes = new Uint8Array(await new Response(
        new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer])
          .stream()
          .pipeThrough(new DecompressionStream('gzip'))
      ).arrayBuffer());
    }

    const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (
      !Array.isArray(value)
      || (value[0] === 1 && value.length !== 14)
      || (value[0] === 2 && value.length !== 16)
      || (value[0] === 3 && value.length !== 22)
      || (value[0] !== 1 && value[0] !== 2 && value[0] !== 3)
    ) return null;
    if (
      !value.slice(1, 7).every(item => typeof item === 'string')
      || !value.slice(7, 9).every(item => typeof item === 'number' && Number.isFinite(item))
      || !value.slice(9, 14).every(item => typeof item === 'string')
    ) {
      return null;
    }

    if (
      value[0] >= 2
      && (typeof value[14] !== 'string' || typeof value[15] !== 'number' || !Number.isFinite(value[15]))
    ) return null;
    if (
      value[0] === 3
      && !value.slice(16, 22).every(item => typeof item === 'number' && Number.isFinite(item))
    ) return null;

    return {
      type: 'receipt',
      receiptNumber: value[1],
      contractNumber: value[2],
      customerName: value[3],
      customerPhone: value[4],
      containerNumber: value[5],
      contractType: value[6],
      paidAmount: value[7],
      totalCost: value[8],
      ...(value[0] >= 2 ? { contractPaidAmount: value[15] } : {}),
      paymentMethod: value[9],
      startDate: value[10],
      endDate: value[11],
      locationAddress: value[12],
      issueDate: value[13],
      ...(value[0] >= 2 && value[14] ? { customerVatNumber: value[14] } : {}),
      ...(value[0] === 3 ? {
        nonTaxableAmount: value[16],
        subtotalAmount: value[17],
        vatAmount: value[18],
        receiptNonTaxableAmount: value[19],
        receiptSubtotalAmount: value[20],
        receiptVatAmount: value[21]
      } : {})
    };
  } catch (error) {
    console.error('Could not decode compact receipt verification data:', error);
    return null;
  }
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

/**
 * Safely encode object into UTF-8 Base64 string for URL parameters
 */
export function encodeUtf8Base64(data: unknown): string {
  try {
    const jsonStr = JSON.stringify(data);
    const bytes = new TextEncoder().encode(jsonStr);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return encodeURIComponent(btoa(binary));
  } catch (e) {
    console.error('Error encoding payload to UTF-8 base64:', e);
    return '';
  }
}

/**
 * Safely decode UTF-8 Base64 string into typed object
 */
export function decodeUtf8Base64(encodedStr: string): PublicVerificationPayload | null {
  if (!encodedStr) return null;
  try {
    const raw = decodeURIComponent(encodedStr);

    // Method 1: Modern TextDecoder
    try {
      const binaryString = atob(raw);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const text = new TextDecoder('utf-8').decode(bytes);
      return JSON.parse(text);
    } catch {
      // Method 2: URI component unescape
      try {
        const text = decodeURIComponent(escape(atob(raw)));
        return JSON.parse(text);
      } catch {
        // Method 3: Standard direct JSON parse
        try {
          return JSON.parse(atob(raw));
        } catch {
          // Method 4: Direct raw JSON parse if not base64
          return JSON.parse(raw);
        }
      }
    }
  } catch (err) {
    console.error('UTF-8 Safe Decoder Error:', err);
    return null;
  }
}
