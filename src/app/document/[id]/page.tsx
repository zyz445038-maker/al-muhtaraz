'use client';
import DocumentView from '@/components/DocumentView';

export default function DocumentPage({ params }: { params: { id: string } }) {
  return <DocumentView documentId={params.id} />;
}
