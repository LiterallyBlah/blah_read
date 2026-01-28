export const GENRES = [
  'fantasy',
  'sci-fi',
  'mystery-thriller',
  'horror',
  'romance',
  'literary-fiction',
  'history',
  'biography-memoir',
  'science-nature',
  'self-improvement',
  'business-finance',
  'philosophy-religion',
] as const;

export type Genre = typeof GENRES[number];

export function isValidGenre(genre: string): genre is Genre {
  return GENRES.includes(genre as Genre);
}

export const GENRE_DISPLAY_NAMES: Record<Genre, string> = {
  'fantasy': 'Fantasy',
  'sci-fi': 'Sci-Fi',
  'mystery-thriller': 'Mystery & Thriller',
  'horror': 'Horror',
  'romance': 'Romance',
  'literary-fiction': 'Literary Fiction',
  'history': 'History',
  'biography-memoir': 'Biography & Memoir',
  'science-nature': 'Science & Nature',
  'self-improvement': 'Self-Improvement',
  'business-finance': 'Business & Finance',
  'philosophy-religion': 'Philosophy & Religion',
};
