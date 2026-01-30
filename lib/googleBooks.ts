import { debug } from './debug';

const API_URL = 'https://www.googleapis.com/books/v1/volumes';

export interface GoogleBookResult {
  title: string;
  authors?: string[];
  coverUrl: string | null;
  description: string | null;
  pageCount?: number | null;
  categories?: string[];
  publisher?: string | null;
  publishedDate?: string | null;
}

export function parseGoogleBooksResponse(response: any): GoogleBookResult | null {
  if (!response.items?.length) {
    debug.log('googleBooks', 'No items in response');
    return null;
  }

  const book = response.items[0].volumeInfo;

  debug.log('googleBooks', 'Raw volumeInfo', {
    title: book.title,
    authors: book.authors,
    categories: book.categories,
    hasImageLinks: !!book.imageLinks,
    allKeys: Object.keys(book),
  });

  const result = {
    title: book.title || 'Unknown Title',
    authors: book.authors || undefined,
    coverUrl: book.imageLinks?.thumbnail || book.imageLinks?.smallThumbnail || null,
    description: book.description || null,
    pageCount: book.pageCount ?? null,
    categories: book.categories || undefined,
    publisher: book.publisher ?? null,
    publishedDate: book.publishedDate ?? null,
  };

  debug.log('googleBooks', 'Parsed result', {
    title: result.title,
    categories: result.categories,
    hasCover: !!result.coverUrl,
  });

  return result;
}

export async function searchGoogleBooks(
  query: string,
  apiKey?: string | null
): Promise<GoogleBookResult | null> {
  let url = `${API_URL}?q=${encodeURIComponent(query)}&maxResults=1`;
  if (apiKey) {
    url += `&key=${encodeURIComponent(apiKey)}`;
  }
  const response = await fetch(url);
  const data = await response.json();
  return parseGoogleBooksResponse(data);
}

/**
 * Search Google Books by ISBN (more reliable than title/author search)
 */
export async function searchGoogleBooksByIsbn(
  isbn: string,
  apiKey?: string | null
): Promise<GoogleBookResult | null> {
  let url = `${API_URL}?q=isbn:${encodeURIComponent(isbn)}&maxResults=1`;
  if (apiKey) {
    url += `&key=${encodeURIComponent(apiKey)}`;
  }
  const response = await fetch(url);
  const data = await response.json();
  return parseGoogleBooksResponse(data);
}
