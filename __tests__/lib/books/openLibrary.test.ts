import { parseOpenLibraryResponse, buildOpenLibraryCoverUrl } from '@/lib/books';

describe('openLibrary', () => {
  describe('parseOpenLibraryResponse', () => {
    it('extracts book data from search response', () => {
      const response = {
        docs: [{
          title: 'Test Book',
          author_name: ['Test Author'],
          cover_i: 12345,
          number_of_pages_median: 300,
          subject: ['Fiction', 'Fantasy'],
          publisher: ['Test Publisher'],
          first_publish_year: 2020,
        }],
      };
      const result = parseOpenLibraryResponse(response);
      expect(result?.title).toBe('Test Book');
      expect(result?.authors).toEqual(['Test Author']);
      expect(result?.coverId).toBe(12345);
      expect(result?.pageCount).toBe(300);
    });

    it('returns null for empty results', () => {
      expect(parseOpenLibraryResponse({ docs: [] })).toBeNull();
    });

    it('handles missing optional fields', () => {
      const response = {
        docs: [{
          title: 'Minimal Book',
        }],
      };
      const result = parseOpenLibraryResponse(response);
      expect(result?.title).toBe('Minimal Book');
      expect(result?.authors).toEqual([]);
      expect(result?.coverId).toBeNull();
    });
  });

  describe('buildOpenLibraryCoverUrl', () => {
    it('builds cover URL from cover ID', () => {
      const url = buildOpenLibraryCoverUrl(12345, 'L');
      expect(url).toBe('https://covers.openlibrary.org/b/id/12345-L.jpg');
    });

    it('returns null for null cover ID', () => {
      expect(buildOpenLibraryCoverUrl(null, 'L')).toBeNull();
    });
  });
});
