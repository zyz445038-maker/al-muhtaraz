import { getLocalArchiveDatabase, normalizeArchiveSearchText } from '@/services/archive/storage/localArchiveDatabase';
import { LocalArchiveStorageService } from '@/services/archive/storage/localStorageService';
import type { ArchiveIndexData } from '@/services/archive/types';

const MAX_RESULTS = 3;
const MAX_MEMORY_AGE_MS = 24 * 60 * 60 * 1000;
const FOLLOW_UP_PATTERN = /^(متى|كم|من|ما|وش|اذكر|وضح|تفاصيل|هل|وكان|وكانت|وين|اين)(?:$|\s)/;

export interface LocalArchiveAssistantResult {
  toolExecuted: 'searchArchivedContracts';
  speechResponse: string;
  displayMarkdown: string;
  toolParameters: {
    count: number;
    fromMemory: boolean;
    documentIds: string[];
  };
}

function getRelevantExcerpt(text: string, query: string): string {
  const normalizedQuery = normalizeArchiveSearchText(query);
  const terms = normalizedQuery.split(/\s+/).filter(term => term.length > 1);
  const paragraphs = text
    .split(/\r?\n|(?<=[.!؟?])\s+/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean);

  const ranked = paragraphs
    .map((paragraph, index) => {
      const normalizedParagraph = normalizeArchiveSearchText(paragraph);
      const score = terms.reduce((total, term) => total + Number(normalizedParagraph.includes(term)), 0);
      return { paragraph, index, score };
    })
    .filter(item => item.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, 3)
    .sort((left, right) => left.index - right.index);

  const excerpt = (ranked.length ? ranked.map(item => item.paragraph) : paragraphs.slice(0, 3))
    .join('\n')
    .slice(0, 1800);
  return excerpt || text.slice(0, 1800);
}

async function loadIndex(jsonPath: string, documentId: string): Promise<ArchiveIndexData> {
  const content = await new LocalArchiveStorageService().read(jsonPath);
  const parsed: unknown = JSON.parse(content.toString('utf8'));
  if (
    typeof parsed !== 'object'
    || parsed === null
    || !('document_id' in parsed)
    || parsed.document_id !== documentId
    || !('extracted_text' in parsed)
    || typeof parsed.extracted_text !== 'string'
  ) {
    throw new Error('The local archive index file is invalid or does not match its document.');
  }
  return parsed as ArchiveIndexData;
}

export async function searchLocalArchiveForAssistant(
  userId: string,
  query: string,
): Promise<LocalArchiveAssistantResult> {
  const database = getLocalArchiveDatabase();
  const normalizedQuery = normalizeArchiveSearchText(query);
  const now = Date.now();
  const memoryResult = database.getArchiveMemory(userId);
  if (!memoryResult.ok) throw new Error(memoryResult.error || 'Could not load local assistant archive memory.');

  const memory = memoryResult.data;
  const memoryIsRecent = memory
    && memory.document_ids.length > 0
    && now - new Date(memory.updated_at).getTime() <= MAX_MEMORY_AGE_MS;
  const exactRepeat = memoryIsRecent && memory.query_key === normalizedQuery;
  const shortFollowUp = memoryIsRecent
    && normalizedQuery.split(/\s+/).filter(Boolean).length <= 5
    && FOLLOW_UP_PATTERN.test(normalizedQuery);
  let fromMemory = Boolean(exactRepeat || shortFollowUp);

  let candidates;
  if (fromMemory && memory) {
    const cached = database.getIndexedDocumentsByIds(memory.document_ids, MAX_RESULTS);
    if (!cached.ok) throw new Error(cached.error || 'Could not load locally remembered archive results.');
    candidates = cached.data || [];
    if (candidates.length === 0) {
      const searched = database.searchIndexedDocuments(query, MAX_RESULTS);
      if (!searched.ok) throw new Error(searched.error || 'Could not search the local archive index.');
      candidates = searched.data || [];
      fromMemory = false;
    }
  } else {
    const searched = database.searchIndexedDocuments(query, MAX_RESULTS);
    if (!searched.ok) throw new Error(searched.error || 'Could not search the local archive index.');
    candidates = searched.data || [];
  }

  const results: Array<{ documentId: string; filename: string; excerpt: string }> = [];
  for (const candidate of candidates) {
    const index = await loadIndex(candidate.version.json_path, candidate.document.id);
    if (!index.extracted_text.trim()) continue;
    results.push({
      documentId: candidate.document.id,
      filename: candidate.document.original_filename || 'مستند مؤرشف',
      excerpt: getRelevantExcerpt(index.extracted_text, fromMemory && memory ? memory.query_text : query),
    });
  }

  if (!fromMemory) {
    const saved = database.saveArchiveMemory(
      userId,
      query,
      normalizedQuery,
      results.map(result => result.documentId),
    );
    if (!saved.ok) throw new Error(saved.error || 'Could not save local assistant archive memory.');
  }

  if (results.length === 0) {
    return {
      toolExecuted: 'searchArchivedContracts',
      speechResponse: fromMemory
        ? 'لم أجد العقد المحفوظ في ذاكرة البحث المحلية؛ قد يكون تغيّر أو أُرشف من جديد.'
        : 'لم أجد نصاً مطابقاً في فهرس العقود المحلية. إذا كان الملف مصوراً فقد يحتاج إلى معالجة OCR.',
      displayMarkdown: fromMemory
        ? 'لم أجد نتائج صالحة في ذاكرة البحث المحلية. أعد صياغة السؤال للبحث من جديد.'
        : 'لم أجد نصاً مطابقاً في فهرس الأرشيف المحلي. قد يكون الملف لم يكتمل فهرسته أو يحتاج إلى OCR إذا كان ممسوحاً ضوئياً.',
      toolParameters: { count: 0, fromMemory, documentIds: [] },
    };
  }

  const excerpts = results.map((result, index) =>
    `### ${index + 1}. ${result.filename}\n\n${result.excerpt}\n\n[فتح المستند](/document/${encodeURIComponent(result.documentId)})`
  );
  return {
    toolExecuted: 'searchArchivedContracts',
    speechResponse: `وجدت ${results.length} ${results.length === 1 ? 'مستنداً' : 'مستندات'} في الأرشيف المحلي. أظهرت لك المقاطع المطابقة.`,
    displayMarkdown: `## نتائج البحث في الأرشيف المحلي\n\n${excerpts.join('\n\n---\n\n')}`,
    toolParameters: {
      count: results.length,
      fromMemory,
      documentIds: results.map(result => result.documentId),
    },
  };
}
