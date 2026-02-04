import { enrichBookData, EnrichmentResult } from '@/lib/books';

// Mock the API modules
jest.mock('@/lib/books/googleBooks', () => ({
  searchGoogleBooks: jest.fn(),
  searchGoogleBooksByIsbn: jest.fn(),
}));

jest.mock('@/lib/books/openLibrary', () => ({
  searchOpenLibrary: jest.fn(),
  buildOpenLibraryCoverUrl: jest.fn((id, size) =>
    id ? `https://covers.openlibrary.org/b/id/${id}-${size}.jpg` : null
  ),
}));

import { searchGoogleBooks, searchGoogleBooksByIsbn } from '@/lib/books/googleBooks';
import { searchOpenLibrary } from '@/lib/books/openLibrary';

describe('bookEnrichment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns Google Books data when available', async () => {
    (searchGoogleBooks as jest.Mock).mockResolvedValue({
      title: 'Power',
      authors: ['Aaron Oster'],
      coverUrl: 'https://books.google.com/cover.jpg',
      description: 'A cultivation story',
      pageCount: 400,
      categories: ['Fantasy'],
    });

    const result = await enrichBookData('Power', 'Aaron Oster');

    expect(result.coverUrl).toBe('https://books.google.com/cover.jpg');
    expect(result.synopsis).toBe('A cultivation story');
    expect(result.pageCount).toBe(400);
    expect(result.source).toBe('google');
  });

  it('falls back to OpenLibrary when Google Books fails', async () => {
    (searchGoogleBooks as jest.Mock).mockResolvedValue(null);
    (searchOpenLibrary as jest.Mock).mockResolvedValue({
      title: 'Power',
      authors: ['Aaron Oster'],
      coverId: 12345,
      pageCount: 380,
      genres: ['Fantasy'],
    });

    const result = await enrichBookData('Power', 'Aaron Oster');

    expect(result.coverUrl).toBe('https://covers.openlibrary.org/b/id/12345-L.jpg');
    expect(result.source).toBe('openlibrary');
  });

  it('returns partial data when both APIs fail', async () => {
    (searchGoogleBooks as jest.Mock).mockResolvedValue(null);
    (searchOpenLibrary as jest.Mock).mockResolvedValue(null);

    const result = await enrichBookData('Unknown Book', 'Unknown Author');

    expect(result.coverUrl).toBeNull();
    expect(result.synopsis).toBeNull();
    expect(result.source).toBe('none');
  });

  it('falls back to OpenLibrary when Google Books throws', async () => {
    (searchGoogleBooks as jest.Mock).mockRejectedValue(new Error('Network error'));
    (searchOpenLibrary as jest.Mock).mockResolvedValue({
      title: 'Power',
      authors: ['Aaron Oster'],
      coverId: 12345,
      pageCount: 380,
      genres: ['Fantasy'],
    });

    const result = await enrichBookData('Power', 'Aaron Oster');

    expect(result.coverUrl).toBe('https://covers.openlibrary.org/b/id/12345-L.jpg');
    expect(result.source).toBe('openlibrary');
  });

  it('passes Google Books API key when provided', async () => {
    (searchGoogleBooks as jest.Mock).mockResolvedValue({
      title: 'Power',
      coverUrl: 'https://books.google.com/cover.jpg',
      description: 'A cultivation story',
    });

    await enrichBookData('Power', 'Aaron Oster', {
      googleBooksApiKey: 'test-api-key',
    });

    expect(searchGoogleBooks).toHaveBeenCalledWith(
      'intitle:"Power" inauthor:"Aaron Oster"',
      'test-api-key'
    );
  });

  it('tries ISBN search first when ASIN can be converted', async () => {
    (searchGoogleBooksByIsbn as jest.Mock).mockResolvedValue({
      title: 'The Pragmatic Programmer',
      coverUrl: 'https://books.google.com/cover.jpg',
      description: 'From journeyman to master',
    });

    const result = await enrichBookData('The Pragmatic Programmer', 'Hunt', {
      asin: '020161622X', // Valid ISBN-10
    });

    expect(searchGoogleBooksByIsbn).toHaveBeenCalledWith('9780201616224', undefined);
    expect(result.coverUrl).toBe('https://books.google.com/cover.jpg');
    expect(result.source).toBe('google');
  });

  it('falls back to title/author search when ISBN search fails', async () => {
    (searchGoogleBooksByIsbn as jest.Mock).mockResolvedValue(null);
    (searchGoogleBooks as jest.Mock).mockResolvedValue({
      title: 'The Pragmatic Programmer',
      coverUrl: 'https://books.google.com/cover.jpg',
      description: 'From journeyman to master',
    });

    const result = await enrichBookData('The Pragmatic Programmer', 'Hunt', {
      asin: '020161622X',
    });

    expect(searchGoogleBooksByIsbn).toHaveBeenCalled();
    expect(searchGoogleBooks).toHaveBeenCalled();
    expect(result.source).toBe('google');
  });

  it('skips ISBN search for Kindle ASIN (starts with B)', async () => {
    (searchGoogleBooks as jest.Mock).mockResolvedValue({
      title: 'Power',
      coverUrl: 'https://books.google.com/cover.jpg',
      description: 'A cultivation story',
    });

    await enrichBookData('Power', 'Aaron Oster', {
      asin: 'B07WNJ7FTQ', // Kindle ASIN
    });

    expect(searchGoogleBooksByIsbn).not.toHaveBeenCalled();
    expect(searchGoogleBooks).toHaveBeenCalled();
  });
});
