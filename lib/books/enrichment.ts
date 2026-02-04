import { searchGoogleBooks, searchGoogleBooksByIsbn } from './googleBooks';
import { searchOpenLibrary, buildOpenLibraryCoverUrl } from './openLibrary';
import { asinToIsbn13 } from './isbn';
import { mapToCanonicalGenres, Genre } from '../shared';

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

/**
 * Extract series name from parentheses in title
 * e.g., "Power (Buryoku Book 1)" -> "Buryoku"
 */
function extractSeriesName(title: string): string | null {
  const match = title.match(/\(([^)]+)\)/);
  if (match) {
    // Remove "Book X", "Volume X", "#X" from series name
    const seriesName = match[1]
      .replace(/\s*(book|volume|#)\s*\d+/gi, '')
      .trim();
    return seriesName || null;
  }
  return null;
}

/**
 * Check if a title is too generic for reliable search
 * (single word or <= 6 characters)
 */
function isTitleTooGeneric(title: string): boolean {
  const words = title.trim().split(/\s+/);
  return words.length === 1 || title.length <= 6;
}

export interface EnrichmentResult {
  coverUrl: string | null;
  synopsis: string | null;
  pageCount: number | null;
  genres: string[];
  normalizedGenres: Genre[];
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
    const seriesName = extractSeriesName(title);
    console.log('[enrichBookData] Cleaned title:', { original: title, cleaned: cleanedTitle, seriesName });

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

    // If cleaned title is too generic and we have a series name, try with series name
    if (!googleResult?.coverUrl && seriesName && isTitleTooGeneric(cleanedTitle)) {
      console.log('[enrichBookData] Title too generic, trying series name searches');

      // Try: "Title SeriesName" (e.g., "Power Buryoku")
      try {
        const combinedQuery = `${cleanedTitle} ${seriesName}`;
        console.log('[enrichBookData] Trying combined title+series search:', combinedQuery);
        googleResult = await searchGoogleBooks(combinedQuery, options?.googleBooksApiKey);
        console.log('[enrichBookData] Combined search result:', googleResult ? 'found' : 'not found', googleResult?.coverUrl ? 'with cover' : 'no cover');
      } catch (error) {
        console.log('[enrichBookData] Combined search failed:', error);
      }

      // Try: just series name (e.g., "Buryoku")
      if (!googleResult?.coverUrl) {
        try {
          console.log('[enrichBookData] Trying series-only search:', seriesName);
          googleResult = await searchGoogleBooks(seriesName, options?.googleBooksApiKey);
          console.log('[enrichBookData] Series-only search result:', googleResult ? 'found' : 'not found', googleResult?.coverUrl ? 'with cover' : 'no cover');
        } catch (error) {
          console.log('[enrichBookData] Series-only search failed:', error);
        }
      }
    }
  }

  if (googleResult?.coverUrl) {
    console.log('[enrichBookData] Got Google Books result with cover');
    console.log('[enrichBookData] Categories from API:', googleResult.categories);

    // If Google has cover but no categories, try OpenLibrary just for genres
    let genres = googleResult.categories || [];
    if (genres.length === 0) {
      console.log('[enrichBookData] No categories from Google, trying OpenLibrary for genres');
      try {
        const openLibGenreResult = await searchOpenLibrary(title, author);
        if (openLibGenreResult?.genres?.length) {
          genres = openLibGenreResult.genres;
          console.log('[enrichBookData] Got genres from OpenLibrary:', genres);
        }
      } catch (error) {
        console.log('[enrichBookData] OpenLibrary genre fetch failed:', error);
      }
    }

    const normalizedGenres = mapToCanonicalGenres(genres);
    console.log('[enrichBookData] Normalized genres:', normalizedGenres);
    return {
      coverUrl: googleResult.coverUrl,
      synopsis: googleResult.description,
      pageCount: googleResult.pageCount || null,
      genres,
      normalizedGenres,
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
    const normalizedGenres = mapToCanonicalGenres(openLibResult.genres);
    return {
      coverUrl: buildOpenLibraryCoverUrl(openLibResult.coverId, 'L'),
      synopsis: null,
      pageCount: openLibResult.pageCount,
      genres: openLibResult.genres,
      normalizedGenres,
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
    normalizedGenres: [],
    publisher: null,
    publishedDate: null,
    source: 'none',
  };
}
