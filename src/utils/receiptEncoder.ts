/**
 * Receipt and Contract QR URL Payload Encoder / Decoder
 * Supports UTF-8 Arabic characters safely without garbled text or length corruption
 */

export interface PublicReceiptPayload {
  type?: 'receipt';
  receiptNumber: string;
  contractNumber: string;
  customerName: string;
  customerPhone: string;
  containerNumber: string;
  contractType: string;
  paidAmount: number;
  totalCost: number;
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
