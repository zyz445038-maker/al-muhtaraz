'use client';
import DocumentView from '@/components/DocumentView';

import { use } from 'react';

export default function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <DocumentView documentId={id} />;
}
