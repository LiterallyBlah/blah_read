const SEARCH_URL = 'https://openlibrary.org/search.json';

export interface OpenLibraryResult {
  title: string;
  authors: string[];
  coverId: number | null;
  pageCount: number | null;
  genres: string[];
  publisher: string | null;
  publishedYear: number | null;
}

export function parseOpenLibraryResponse(response: any): OpenLibraryResult | null {
  if (!response.docs?.length) {
    return null;
  }

  const doc = response.docs[0];
  return {
    title: doc.title || 'Unknown Title',
    authors: doc.author_name || [],
    coverId: doc.cover_i || null,
    pageCount: doc.number_of_pages_median || null,
    genres: doc.subject?.slice(0, 5) || [],
    publisher: doc.publisher?.[0] || null,
    publishedYear: doc.first_publish_year || null,
  };
}

export function buildOpenLibraryCoverUrl(
  coverId: number | null,
  size: 'S' | 'M' | 'L' = 'L'
): string | null {
  if (!coverId) {
    return null;
  }
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
}

export async function searchOpenLibrary(
  title: string,
  author?: string
): Promise<OpenLibraryResult | null> {
  const params = new URLSearchParams({ title, limit: '1' });
  if (author) {
    params.set('author', author);
  }

  const response = await fetch(`${SEARCH_URL}?${params}`);
  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return parseOpenLibraryResponse(data);
}
