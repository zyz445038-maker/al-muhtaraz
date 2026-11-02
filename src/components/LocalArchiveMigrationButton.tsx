'use client';

import { useState } from 'react';

interface MigrationResponse {
  success: boolean;
  error?: string;
  processedDocuments: number;
  processedVersions: number;
  indexedVersions: number;
  totalDocuments: number;
  nextOffset: number;
  hasMore: boolean;
}

interface MigrationProgress {
  offset: number;
  total: number;
  versions: number;
  indexed: number;
}

export function LocalArchiveMigrationButton() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function downloadArchive() {
    setRunning(true);
    setProgress({ offset: 0, total: 0, versions: 0, indexed: 0 });
    setMessage('جارٍ الاتصال بالأرشيف السحابي...');
    setError('');

    let offset = 0;
    let total = 0;
    let versions = 0;
    let indexed = 0;
    try {
      let hasMore = true;
      while (hasMore) {
        const response = await fetch('/api/archive/local-migration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ offset, batchSize: 3 }),
        });
        const result = await response.json() as MigrationResponse;
        if (!response.ok || !result.success) {
          throw new Error(result.error || `تعذر تنزيل الأرشيف (HTTP ${response.status}).`);
        }

        offset = result.nextOffset;
        total = result.totalDocuments;
        versions += result.processedVersions;
        indexed += result.indexedVersions;
        hasMore = result.hasMore;
        setProgress({ offset, total, versions, indexed });
        setMessage(hasMore ? 'جارٍ تنزيل المستندات وفحص سلامة الملفات...' : 'اكتمل تنزيل الأرشيف.');
      }
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : String(downloadError));
      setMessage(`توقف التنزيل عند ${offset.toLocaleString('ar-EG')} من ${total.toLocaleString('ar-EG')} مستند.`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div dir="rtl" style={{ marginBlock: '1.25rem', padding: '1rem', border: '1px solid #444', borderRadius: 8 }}>
      <h3 style={{ marginTop: 0 }}>تنزيل الأرشيف إلى هذا الجهاز</h3>
      <p>يتطلب اتصالًا بالإنترنت ومساحة كافية. تُفحص سلامة كل ملف قبل حفظه محليًا، ويمكن إعادة المحاولة بأمان إذا توقف التنزيل.</p>
      <button
        type="button"
        onClick={() => void downloadArchive()}
        disabled={running}
        style={{ padding: '0.65rem 1rem', cursor: running ? 'wait' : 'pointer' }}
      >
        {running ? 'جارٍ التنزيل...' : 'تنزيل كل الأرشيف النشط'}
      </button>
      {progress && (
        <div aria-live="polite" style={{ marginTop: '0.75rem' }}>
          <progress
            max={Math.max(progress.total, 1)}
            value={Math.min(progress.offset, progress.total)}
            style={{ width: '100%' }}
          />
          <p>{message}</p>
          <p>
            المستندات: {progress.offset.toLocaleString('ar-EG')} / {progress.total.toLocaleString('ar-EG')}
            {' — '}الإصدارات: {progress.versions.toLocaleString('ar-EG')}
            {' — '}الإصدارات المفهرسة: {progress.indexed.toLocaleString('ar-EG')}
          </p>
        </div>
      )}
      {error && <p role="alert" style={{ color: '#ff8b8b' }}>{error}</p>}
    </div>
  );
}
