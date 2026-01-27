import { parseKindleShareText } from './kindleParser';
import { enrichBookData } from './bookEnrichment';
import { storage } from './storage';
import { Book } from './types';

export type ProcessingStep = 'parsing' | 'checking-duplicate' | 'enriching' | 'saving';

export interface ProcessOptions {
  onProgress?: (step: ProcessingStep) => void;
  forceAdd?: boolean; // Add even if duplicate exists
}

export interface ProcessResult {
  success: boolean;
  book?: Book;
  isDuplicate?: boolean;
  existingBook?: Book;
  error?: 'invalid-share-text' | 'save-failed';
  metadataSynced: boolean;
}

export async function processKindleShare(
  shareText: string,
  options: ProcessOptions
): Promise<ProcessResult> {
  const { onProgress, forceAdd } = options;

  // Step 1: Parse share text
  onProgress?.('parsing');
  const parsed = parseKindleShareText(shareText);

  if (!parsed) {
    return {
      success: false,
      error: 'invalid-share-text',
      metadataSynced: false,
    };
  }

  // Step 2: Check for duplicates
  onProgress?.('checking-duplicate');
  const existingBook = await storage.findDuplicateBook({
    asin: parsed.asin,
    title: parsed.title,
    authors: parsed.authors,
  });

  if (existingBook && !forceAdd) {
    return {
      success: false,
      isDuplicate: true,
      existingBook,
      metadataSynced: false,
    };
  }

  // Step 3: Enrich with metadata
  onProgress?.('enriching');
  const enrichment = await enrichBookData(parsed.title, parsed.authors[0]);

  // Step 4: Create and save book
  onProgress?.('saving');
  const book: Book = {
    id: Date.now().toString(),
    title: parsed.title,
    authors: parsed.authors,
    asin: parsed.asin,
    coverUrl: enrichment.coverUrl,
    synopsis: enrichment.synopsis,
    pageCount: enrichment.pageCount,
    genres: enrichment.genres,
    publisher: enrichment.publisher,
    publishedDate: enrichment.publishedDate,
    sourceUrl: parsed.sourceUrl,
    source: 'kindle-share',
    status: 'to_read',
    totalReadingTime: 0,
    createdAt: Date.now(),
    metadataSynced: enrichment.source !== 'none',
  };

  try {
    await storage.saveBook(book);
    return {
      success: true,
      book,
      metadataSynced: enrichment.source !== 'none',
    };
  } catch {
    return {
      success: false,
      error: 'save-failed',
      metadataSynced: false,
    };
  }
}
