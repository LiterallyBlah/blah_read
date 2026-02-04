import { parseGoogleBooksResponse } from '@/lib/books';

describe('parseGoogleBooksResponse', () => {
  it('extracts title, cover, and description from API response', () => {
    const response = {
      items: [{
        volumeInfo: {
          title: 'Test Book',
          description: 'A test description',
          imageLinks: { thumbnail: 'https://books.google.com/cover.jpg' },
        },
      }],
    };
    const result = parseGoogleBooksResponse(response);
    expect(result?.title).toBe('Test Book');
    expect(result?.coverUrl).toBe('https://books.google.com/cover.jpg');
    expect(result?.description).toBe('A test description');
  });

  it('returns null for empty results', () => {
    const result = parseGoogleBooksResponse({ items: [] });
    expect(result).toBeNull();
  });

  it('returns null for missing items', () => {
    const result = parseGoogleBooksResponse({});
    expect(result).toBeNull();
  });

  it('handles missing imageLinks', () => {
    const response = {
      items: [{
        volumeInfo: {
          title: 'No Cover Book',
          description: 'A book without a cover',
        },
      }],
    };
    const result = parseGoogleBooksResponse(response);
    expect(result?.title).toBe('No Cover Book');
    expect(result?.coverUrl).toBeNull();
  });

  it('falls back to smallThumbnail if thumbnail missing', () => {
    const response = {
      items: [{
        volumeInfo: {
          title: 'Small Thumbnail Book',
          imageLinks: { smallThumbnail: 'https://books.google.com/small.jpg' },
        },
      }],
    };
    const result = parseGoogleBooksResponse(response);
    expect(result?.coverUrl).toBe('https://books.google.com/small.jpg');
  });
});
