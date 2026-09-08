// src/app/dashboard/page.tsx

import React from 'react';
import styles from './dashboard.module.css';
// import Link from 'next/link'; // Unused
import Image from 'next/image';

/**
 * Dashboard page – read‑only UI that consumes the summary API
 * (GET /api/dashboard/summary) and presents the data in a premium, modern layout.
 *
 * The implementation respects the existing project stack (Next.js app router,
 * vanilla CSS, no new dependencies).  Styling is performed via a CSS module
 * located at `src/app/dashboard/dashboard.module.css` which is created alongside
 * this file.
 */
export default async function DashboardPage() {
  // Server‑side fetch – no‑store ensures we always get the latest data.
  const res = await fetch('/api/dashboard/summary', { cache: 'no-store' });
  if (!res.ok) {
    // Simple error UI – the rest of the app already has a global error page.
    return (
      <div className="error">
        <h1>فشل في تحميل البيانات</h1>
        <p>الرجاء المحاولة لاحقًا.</p>
      </div>
    );
  }
  const data = await res.json();

  // Helper to format numbers with Arabic locale
  const fmt = (n: number) => n.toLocaleString('ar-EG');

  return (
    <main className={styles.dashboard}>
      <section className={styles.summary}>
        <h1 className="title">ملخص لوحة التحكم</h1>
        <div className={styles.grid}>
          <div className={styles.card}>
            <h2 className={styles.title}>المستندات</h2>
            <p>{fmt(data.total_documents)} إجمالي المستندات</p>
            <p>{fmt(data.total_versions)} إجمالي الإصدارات</p>
          </div>
          <div className={styles.card}>
            <h2 className={styles.title}>وظائف الاستيراد</h2>
            <ul>
              <li>قيد الانتظار: {fmt(data.import_jobs.queued)}</li>
              <li>قيد المعالجة: {fmt(data.import_jobs.processing)}</li>
              <li>فاشل: {fmt(data.import_jobs.failed)}</li>
              <li>مؤشر: {fmt(data.import_jobs.indexed)}</li>
              <li>بحاجة إلى OCR: {fmt(data.import_jobs.needs_ocr)}</li>
              <li>ملغى: {fmt(data.import_jobs.cancelled)}</li>
            </ul>
          </div>
          <div className="card">
            <h2 className={styles.title}>صحة المعالجة</h2>
            <ul>
              <li>قيد المعالجة: {fmt(data.processingHealth.total_processing)}</li>
              <li>متأخر (5 دق): {fmt(data.processingHealth.stale_processing)}</li>
              <li>صحي: {fmt(data.processingHealth.healthy)}</li>
            </ul>
          </div>
        </div>
      </section>

      <section className={styles['latest-docs']}>
        <h2 className={styles.title}>آخر المستندات (5)</h2>
        <ul className={styles['documents-list']}>
          {data.latest_documents.map((doc: any) => (
            <li key={doc.id} className="doc-item">
              <a href={`/document/${doc.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                <strong>{doc.title ?? 'بدون عنوان'}</strong>
              </a>
              <span className={styles.date}>{new Date(doc.created_at).toLocaleDateString('ar-EG')}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles['stale-jobs']}>
        <h2 className={styles.title}>وظائف معالجة متأخرة (أكثر من 5 دقائق)</h2>
        {data.staleProcessingJobs.length === 0 ? (
          <p className={styles['no-stale']}>لا توجد وظائف متأخرة.</p>
        ) : (
          <ul className={styles['jobs-list']}>
            {data.staleProcessingJobs.map((job: any) => (
              <li key={job.id} className="job-item">
                <span>معرّف: {job.id}</span>
                <span>الحالة: {job.status}</span>
                <span>تم القفل: {new Date(job.locked_at).toLocaleString('ar-EG')}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
