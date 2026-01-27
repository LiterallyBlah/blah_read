const API_URL = 'https://www.googleapis.com/books/v1/volumes';

export interface GoogleBookResult {
  title: string;
  coverUrl: string | null;
  description: string | null;
}

export function parseGoogleBooksResponse(response: any): GoogleBookResult | null {
  if (!response.items?.length) return null;

  const book = response.items[0].volumeInfo;
  return {
    title: book.title || 'Unknown Title',
    coverUrl: book.imageLinks?.thumbnail || book.imageLinks?.smallThumbnail || null,
    description: book.description || null,
  };
}

export async function searchGoogleBooks(query: string): Promise<GoogleBookResult | null> {
  const url = `${API_URL}?q=${encodeURIComponent(query)}&maxResults=1`;
  const response = await fetch(url);
  const data = await response.json();
  return parseGoogleBooksResponse(data);
}
