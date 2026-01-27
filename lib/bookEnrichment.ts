import { searchGoogleBooks } from './googleBooks';
import { searchOpenLibrary, buildOpenLibraryCoverUrl } from './openLibrary';

export interface EnrichmentResult {
  coverUrl: string | null;
  synopsis: string | null;
  pageCount: number | null;
  genres: string[];
  publisher: string | null;
  publishedDate: string | null;
  source: 'google' | 'openlibrary' | 'none';
}

export async function enrichBookData(
  title: string,
  author?: string
): Promise<EnrichmentResult> {
  // Try Google Books first
  const query = author ? `intitle:"${title}" inauthor:"${author}"` : title;
  let googleResult = null;
  try {
    googleResult = await searchGoogleBooks(query);
  } catch {
    // Google Books failed, will try OpenLibrary
  }

  if (googleResult?.coverUrl) {
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
  let openLibResult = null;
  try {
    openLibResult = await searchOpenLibrary(title, author);
  } catch {
    // OpenLibrary also failed
  }

  if (openLibResult) {
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
