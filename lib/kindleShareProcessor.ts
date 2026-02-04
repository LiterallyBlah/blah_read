import { parseKindleShareText } from './kindleParser';
import { enrichBookData } from './bookEnrichment';
import { storage } from './storage';
import { settings } from './settings';
import { Book, debug, setDebugEnabled, generateId } from './shared';

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

  // Load debug setting at start of processing
  const config = await settings.get();
  setDebugEnabled(config.debugMode);

  debug.log('kindle', 'Processing Kindle share text', { length: shareText.length });

  // Step 1: Parse share text
  onProgress?.('parsing');
  const parsed = parseKindleShareText(shareText);

  if (!parsed) {
    debug.warn('kindle', 'Failed to parse share text');
    return {
      success: false,
      error: 'invalid-share-text',
      metadataSynced: false,
    };
  }

  debug.log('kindle', 'Parsed book info', {
    title: parsed.title,
    authors: parsed.authors,
    asin: parsed.asin,
  });

  // Step 2: Check for duplicates
  onProgress?.('checking-duplicate');
  debug.log('kindle', 'Checking for duplicate books...');
  const existingBook = await storage.findDuplicateBook({
    asin: parsed.asin,
    title: parsed.title,
    authors: parsed.authors,
  });

  if (existingBook && !forceAdd) {
    debug.log('kindle', 'Duplicate found', { existingId: existingBook.id });
    return {
      success: false,
      isDuplicate: true,
      existingBook,
      metadataSynced: false,
    };
  }

  // Step 3: Enrich with metadata
  onProgress?.('enriching');
  debug.log('kindle', 'Enriching book metadata...');
  const enrichment = await enrichBookData(parsed.title, parsed.authors[0], {
    googleBooksApiKey: config.googleBooksApiKey,
    asin: parsed.asin,
  });
  debug.log('kindle', 'Enrichment result', {
    source: enrichment.source,
    hasCover: !!enrichment.coverUrl,
    hasSynopsis: !!enrichment.synopsis,
  });

  // Step 4: Create book object
  const defaultLoadout = await storage.getDefaultLoadoutForNewBook();
  const book: Book = {
    id: generateId('book'),
    title: parsed.title,
    authors: parsed.authors,
    asin: parsed.asin,
    coverUrl: enrichment.coverUrl,
    synopsis: enrichment.synopsis,
    pageCount: enrichment.pageCount,
    genres: enrichment.genres,
    normalizedGenres: enrichment.normalizedGenres,
    publisher: enrichment.publisher,
    publishedDate: enrichment.publishedDate,
    sourceUrl: parsed.sourceUrl,
    source: 'kindle-share',
    status: 'to_read',
    totalReadingTime: 0,
    createdAt: Date.now(),
    metadataSynced: enrichment.source !== 'none',
    companionsPending: !!config.apiKey,
    loadout: defaultLoadout,
  };
  debug.log('kindle', 'Book object created', { id: book.id });

  // Step 5: Save book
  onProgress?.('saving');
  debug.log('kindle', 'Saving book to storage...');
  try {
    await storage.saveBook(book);
    debug.log('kindle', 'Book saved successfully');
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
