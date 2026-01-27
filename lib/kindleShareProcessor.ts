import { parseKindleShareText } from './kindleParser';
import { enrichBookData } from './bookEnrichment';
import { storage } from './storage';
import { settings } from './settings';
import { Book } from './types';
import { orchestrateCompanionResearch, shouldRunCompanionResearch } from './companionOrchestrator';
import { generateBufferedImages } from './companionImageQueue';

export type ProcessingStep = 'parsing' | 'checking-duplicate' | 'enriching' | 'researching' | 'generating-images' | 'saving';

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
  const config = await settings.get();
  const enrichment = await enrichBookData(parsed.title, parsed.authors[0], {
    googleBooksApiKey: config.googleBooksApiKey,
    asin: parsed.asin,
  });

  // Step 4: Create book object
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

  // Step 5: Research companions (if API key available)
  if (shouldRunCompanionResearch(book)) {
    onProgress?.('researching');
    const companions = await orchestrateCompanionResearch({
      bookId: book.id,
      title: book.title,
      author: book.authors?.[0],
      synopsis: book.synopsis,
    });
    book.companions = companions;

    // Step 6: Generate initial image buffer
    onProgress?.('generating-images');
    const generateImage = async () => null; // Placeholder - will be wired to imageGen
    book.companions = await generateBufferedImages(book.companions, generateImage);
  }

  // Step 7: Save book
  onProgress?.('saving');
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
