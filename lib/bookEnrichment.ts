import { searchGoogleBooks, searchGoogleBooksByIsbn } from './googleBooks';
import { searchOpenLibrary, buildOpenLibraryCoverUrl } from './openLibrary';
import { asinToIsbn13 } from './isbn';

/**
 * Clean up book title for better search results
 * - Removes series info in parentheses like "(Book 1)" or "(The Stormlight Archive 1)"
 * - Removes subtitle after colon
 * - Trims whitespace
 */
function cleanTitleForSearch(title: string): string {
  let cleaned = title
    // Remove parenthetical series info at the end
    .replace(/\s*\([^)]*(?:book|volume|series|#)\s*\d*[^)]*\)\s*$/i, '')
    // Remove subtitle after colon (but keep the main title)
    .replace(/:\s*.+$/, '')
    // Clean up any double spaces
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned || title; // Fall back to original if cleaning removes everything
}

export interface EnrichmentResult {
  coverUrl: string | null;
  synopsis: string | null;
  pageCount: number | null;
  genres: string[];
  publisher: string | null;
  publishedDate: string | null;
  source: 'google' | 'openlibrary' | 'none';
}

export interface EnrichmentOptions {
  googleBooksApiKey?: string | null;
  asin?: string | null;
}

export async function enrichBookData(
  title: string,
  author?: string,
  options?: EnrichmentOptions
): Promise<EnrichmentResult> {
  let googleResult = null;

  console.log('[enrichBookData] Starting enrichment:', { title, author, asin: options?.asin });

  // Try ISBN search first if ASIN can be converted
  const isbn13 = options?.asin ? asinToIsbn13(options.asin) : null;
  console.log('[enrichBookData] ASIN to ISBN conversion:', { asin: options?.asin, isbn13 });

  if (isbn13) {
    try {
      console.log('[enrichBookData] Searching Google Books by ISBN:', isbn13);
      googleResult = await searchGoogleBooksByIsbn(isbn13, options?.googleBooksApiKey);
      console.log('[enrichBookData] ISBN search result:', googleResult ? 'found' : 'not found', googleResult?.coverUrl ? 'with cover' : 'no cover');
    } catch (error) {
      console.log('[enrichBookData] ISBN search failed:', error);
    }
  }

  // Fall back to title/author search
  if (!googleResult?.coverUrl) {
    const cleanedTitle = cleanTitleForSearch(title);
    console.log('[enrichBookData] Cleaned title:', { original: title, cleaned: cleanedTitle });

    // Try with cleaned title + author first
    const query = author ? `intitle:"${cleanedTitle}" inauthor:"${author}"` : cleanedTitle;
    try {
      console.log('[enrichBookData] Trying title/author search:', query);
      googleResult = await searchGoogleBooks(query, options?.googleBooksApiKey);
      console.log('[enrichBookData] Title/author search result:', googleResult ? 'found' : 'not found', googleResult?.coverUrl ? 'with cover' : 'no cover');
    } catch (error) {
      console.log('[enrichBookData] Title/author search failed:', error);
    }

    // If still no result, try just the title without author constraint
    if (!googleResult?.coverUrl && author) {
      try {
        console.log('[enrichBookData] Trying title-only search:', cleanedTitle);
        googleResult = await searchGoogleBooks(cleanedTitle, options?.googleBooksApiKey);
        console.log('[enrichBookData] Title-only search result:', googleResult ? 'found' : 'not found', googleResult?.coverUrl ? 'with cover' : 'no cover');
      } catch (error) {
        console.log('[enrichBookData] Title-only search failed:', error);
      }
    }
  }

  if (googleResult?.coverUrl) {
    console.log('[enrichBookData] Returning Google Books result');
    return {
      coverUrl: googleResult.coverUrl,
      synopsis: googleResult.description,
      pageCount: googleResult.pageCount || null,
      genres: googleResult.categories || [],
      publisher: googleResult.publisher || null,
      publishedDate: googleResult.publishedDate || null,
      source: 'google',
    };
  }

  // Fallback to OpenLibrary
  console.log('[enrichBookData] Trying OpenLibrary fallback');
  let openLibResult = null;
  try {
    openLibResult = await searchOpenLibrary(title, author);
    console.log('[enrichBookData] OpenLibrary result:', openLibResult ? 'found' : 'not found');
  } catch (error) {
    console.log('[enrichBookData] OpenLibrary failed:', error);
  }

  if (openLibResult) {
    console.log('[enrichBookData] Returning OpenLibrary result');
    return {
      coverUrl: buildOpenLibraryCoverUrl(openLibResult.coverId, 'L'),
      synopsis: null,
      pageCount: openLibResult.pageCount,
      genres: openLibResult.genres,
      publisher: openLibResult.publisher,
      publishedDate: openLibResult.publishedYear?.toString() || null,
      source: 'openlibrary',
    };
  }

  // No data found
  console.log('[enrichBookData] No data found from any source');
  return {
    coverUrl: null,
    synopsis: null,
    pageCount: null,
    genres: [],
    publisher: null,
    publishedDate: null,
    source: 'none',
  };
}
