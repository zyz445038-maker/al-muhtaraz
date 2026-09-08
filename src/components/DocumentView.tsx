// src/components/DocumentView.tsx
'use client';
import React, { useEffect, useState } from 'react';

interface DocumentVersion {
  id: string;
  version_number: number;
  file_path: string;
  previewUrl?: string | null;
  created_at: string;
}

interface Document {
  id: string;
  document_type: string;
  original_filename: string | null;
  created_at: string;
  updated_at: string;
  status: string;
  source_type: string;
  customer_id: string | null;
  contract_id: string | null;
}

interface ApiResponse {
  success: boolean;
  document: Document;
  versions: DocumentVersion[];
  error?: string;
}

export default function DocumentView({ documentId }: { documentId: string }) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDocument() {
      try {
        const res = await fetch(`/api/document/${documentId}`);
        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error || 'Failed to fetch document');
        }
        setData(json);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchDocument();
  }, [documentId]);

  if (loading) {
    return <div className="p-8 text-center">⏳ جاري تحميل الوثيقة...</div>;
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-600">
        ⚠️ حدث خطأ: {error}
      </div>
    );
  }

  if (!data) return null;

  const { document, versions } = data;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4" dir="rtl">
        تفاصيل الوثيقة
      </h2>
      <ul className="list-disc space-y-2 mb-6" dir="rtl">
        <li>معرّف: {document.id}</li>
        <li>النوع: {document.document_type}</li>
        <li>اسم الملف الأصلي: {document.original_filename || '-'} </li>
        <li>الحالة: {document.status}</li>
        <li>مصدر: {document.source_type}</li>
        <li>أنشئت في: {new Date(document.created_at).toLocaleString('ar-EG')}</li>
        <li>محدّثة في: {new Date(document.updated_at).toLocaleString('ar-EG')}</li>
      </ul>

      <h3 className="text-xl font-semibold mb-3" dir="rtl">
        الإصدارات ({versions.length})
      </h3>
      <table className="w-full text-right" dir="rtl">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">رقم الإصدار</th>
            <th className="p-2 border">تاريخ الإنشاء</th>
            <th className="p-2 border">معاينة</th>
          </tr>
        </thead>
        <tbody>
          {versions.map((v) => (
            <tr key={v.id}>
              <td className="p-2 border text-center">{v.version_number}</td>
              <td className="p-2 border text-center">
                {new Date(v.created_at).toLocaleString('ar-EG')}
              </td>
              <td className="p-2 border text-center">
                {v.previewUrl ? (
                  <a
                    href={v.previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    عرض
                  </a>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
