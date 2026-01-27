import { enrichBookData, EnrichmentResult } from '@/lib/bookEnrichment';

// Mock the API modules
jest.mock('@/lib/googleBooks', () => ({
  searchGoogleBooks: jest.fn(),
}));

jest.mock('@/lib/openLibrary', () => ({
  searchOpenLibrary: jest.fn(),
  buildOpenLibraryCoverUrl: jest.fn((id, size) =>
    id ? `https://covers.openlibrary.org/b/id/${id}-${size}.jpg` : null
  ),
}));

import { searchGoogleBooks } from '@/lib/googleBooks';
import { searchOpenLibrary } from '@/lib/openLibrary';

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
});
