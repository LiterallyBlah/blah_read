import { GENRES, Genre, isValidGenre, mapToCanonicalGenres } from '../../lib/genres';

describe('genres', () => {
  it('should have exactly 12 genres', () => {
    expect(GENRES.length).toBe(12);
  });

  it('should validate known genres', () => {
    expect(isValidGenre('fantasy')).toBe(true);
    expect(isValidGenre('sci-fi')).toBe(true);
    expect(isValidGenre('invalid-genre')).toBe(false);
  });
});

describe('mapToCanonicalGenres', () => {
  it('should map Google Books categories to canonical genres', () => {
    const categories = ['Fiction / Science Fiction / Space Opera'];
    const genres = mapToCanonicalGenres(categories);
    expect(genres).toContain('sci-fi');
  });

  it('should handle multiple categories', () => {
    const categories = ['Fiction / Fantasy / Epic', 'Fiction / Romance'];
    const genres = mapToCanonicalGenres(categories);
    expect(genres).toContain('fantasy');
    expect(genres).toContain('romance');
  });

  it('should deduplicate genres', () => {
    const categories = ['Fiction / Fantasy', 'Fantasy Fiction'];
    const genres = mapToCanonicalGenres(categories);
    const fantasyCount = genres.filter(g => g === 'fantasy').length;
    expect(fantasyCount).toBe(1);
  });

  it('should return empty array for unmappable categories', () => {
    const categories = ['Completely Unknown Category'];
    const genres = mapToCanonicalGenres(categories);
    expect(genres.length).toBe(0);
  });
});
