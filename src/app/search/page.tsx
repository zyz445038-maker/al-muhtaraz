/* src/app/search/page.tsx */
'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import styles from './search.module.css';
import { Search as SearchIcon } from 'lucide-react';

interface SearchResult {
  id: string;
  title: string | null;
  type: string | null;
  created_at: string;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10; // API limit max 50, choose 10 for UI
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = async (q: string, p: number) => {
    if (!q) {
      setResults([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&page=${p}&limit=${limit}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.message ?? 'Error fetching search results');
      }
      const data = await res.json();
      setResults(data.results ?? []);
      setTotal(data.total ?? 0);
    } catch (e: any) {
      setError(e.message);
      setResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchResults(query.trim(), 1);
  };

  // Update results when page changes (but same query)
  useEffect(() => {
    if (query.trim()) {
      fetchResults(query.trim(), page);
    }
  }, [page]);

  const totalPages = Math.ceil(total / limit);

  return (
    <main className={`${styles.searchRoot} ${styles.container}`}>
      <section className={styles.searchSection}>
        <h1 className={styles.title}>بحث المستندات</h1>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputWrapper}>
            <SearchIcon size={20} className={styles.searchIcon} />
            <input
              id="search-input"
              type="text"
              placeholder="اكتب اسم الملف أو جزء منه…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={styles.input}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className={styles.clearBtn}
                aria-label="مسح البحث"
              >
                ✕
              </button>
            )}
          </div>
          <button type="submit" className={styles.searchBtn} disabled={loading}>
            بحث
          </button>
        </form>
      </section>

      <section className={styles.resultsSection}>
        {loading && <p className={styles.feedback}>جاري التحميل…</p>}
        {error && <p className={styles.error}>خطأ: {error}</p>}
        {!loading && !error && results.length === 0 && query && (
          <p className={styles.feedback}>لا توجد مستندات مطابقة.</p>
        )}
        {!loading && !error && results.length > 0 && (
          <>
            <ul className={styles.resultsList}>
              {results.map((r) => (
                <li key={r.id} className={styles.resultItem}>
                  <strong className={styles.fileName}>{r.title ?? '(بدون عنوان)'}</strong>
                  <span className={styles.meta}>
                    النوع: {r.type ?? 'غير معروف'} –
                    تاريخ الإنشاء: {new Date(r.created_at).toLocaleDateString('ar-EG')}
                  </span>
                </li>
              ))}
            </ul>
            <div className={styles.pagination}>
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className={styles.pageBtn}
              >
                ← السابق
              </button>
              <span className={styles.pageInfo}>
                الصفحة {page} من {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages}
                className={styles.pageBtn}
              >
                التالي →
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
