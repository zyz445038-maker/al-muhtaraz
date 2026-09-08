'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, File, CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react';

export const UploadContractForm: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('idle');
      setErrorMessage('');
    }
  };

  const handleClearFile = () => {
    setFile(null);
    setStatus('idle');
    setErrorMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setStatus('idle');
    setErrorMessage('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', 'contract');

    try {
      const response = await fetch('/api/document/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus('success');
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setStatus('error');
        setErrorMessage(data.error || 'حدث خطأ أثناء الرفع.');
      }
    } catch (error) {
      setStatus('error');
      setErrorMessage('تعذر الاتصال بالخادم. يرجى المحاولة لاحقاً.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.6)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '14px',
      padding: '24px',
      color: '#e2e8f0',
      marginBottom: '24px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div style={{ background: 'rgba(139, 92, 246, 0.2)', padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <UploadCloud color="#a78bfa" size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>رفع العقود القديمة للأرشيف</h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '4px 0 0 0' }}>سيتم تخزين الملفات على السيرفر المحلي وتحويلها للمعالجة الآلية (AI / OCR)</p>
        </div>
      </div>

      <div style={{
        border: '2px dashed rgba(255, 255, 255, 0.2)',
        borderRadius: '12px',
        padding: '32px 20px',
        textAlign: 'center',
        background: 'rgba(255, 255, 255, 0.02)',
        transition: 'all 0.2s',
        position: 'relative'
      }}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.png,.jpg,.jpeg"
          style={{
            position: 'absolute',
            top: 0, left: 0, width: '100%', height: '100%',
            opacity: 0, cursor: 'pointer'
          }}
          disabled={isUploading}
        />
        
        {!file ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', pointerEvents: 'none' }}>
            <UploadCloud size={36} color="#94a3b8" />
            <span style={{ fontSize: '1rem', fontWeight: 600 }}>اضغط هنا لاختيار ملف أو اسحب الملف وأفلته</span>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>صيغ مدعومة: PDF, JPG, PNG</span>
          </div>
        ) : (
          <div style={{ position: 'relative', zIndex: 10 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', background: 'rgba(15, 23, 42, 0.9)', padding: '12px 20px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <File size={20} color="#a78bfa" />
              <span style={{ fontSize: '0.95rem', fontWeight: 600, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {file.name}
              </span>
              <button 
                onClick={(e) => { e.stopPropagation(); handleClearFile(); }}
                style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '4px' }}
                disabled={isUploading}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          {status === 'success' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontSize: '0.9rem', fontWeight: 600 }}>
              <CheckCircle2 size={18} />
              <span>تم الرفع بنجاح! جاري معالجة المستند.</span>
            </div>
          )}
          {status === 'error' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontSize: '0.9rem', fontWeight: 600 }}>
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
        
        <button
          onClick={handleUpload}
          disabled={!file || isUploading}
          style={{
            background: file && !isUploading ? '#8b5cf6' : 'rgba(139, 92, 246, 0.4)',
            color: '#fff',
            border: 'none',
            padding: '10px 24px',
            borderRadius: '8px',
            fontSize: '0.95rem',
            fontWeight: 700,
            cursor: file && !isUploading ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          {isUploading ? (
            <>
              <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
              <span>جاري الرفع...</span>
            </>
          ) : (
            <>
              <UploadCloud size={18} />
              <span>بدء الرفع للأرشيف</span>
            </>
          )}
        </button>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
};
