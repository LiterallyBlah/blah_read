import { GENRES, Genre, isValidGenre } from '../../lib/genres';

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
