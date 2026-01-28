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

// Keyword mappings for each genre
const GENRE_KEYWORDS: Record<Genre, string[]> = {
  'fantasy': ['fantasy', 'magic', 'wizard', 'dragon', 'mythical'],
  'sci-fi': ['science fiction', 'sci-fi', 'scifi', 'space', 'cyberpunk', 'dystopia', 'futuristic'],
  'mystery-thriller': ['mystery', 'thriller', 'suspense', 'detective', 'crime', 'noir'],
  'horror': ['horror', 'scary', 'supernatural horror', 'gothic'],
  'romance': ['romance', 'love story', 'romantic'],
  'literary-fiction': ['literary fiction', 'literary', 'contemporary fiction', 'general fiction'],
  'history': ['history', 'historical', 'ancient', 'medieval', 'world war'],
  'biography-memoir': ['biography', 'memoir', 'autobiography', 'life story'],
  'science-nature': ['science', 'nature', 'biology', 'physics', 'chemistry', 'environment', 'popular science'],
  'self-improvement': ['self-help', 'self-improvement', 'personal development', 'productivity', 'psychology', 'motivation'],
  'business-finance': ['business', 'finance', 'economics', 'entrepreneurship', 'management', 'investing'],
  'philosophy-religion': ['philosophy', 'religion', 'spirituality', 'ethics', 'theology'],
};

export function mapToCanonicalGenres(categories: string[]): Genre[] {
  const matchedGenres = new Set<Genre>();

  for (const category of categories) {
    const lowerCategory = category.toLowerCase();

    for (const [genre, keywords] of Object.entries(GENRE_KEYWORDS)) {
      if (keywords.some(keyword => lowerCategory.includes(keyword))) {
        matchedGenres.add(genre as Genre);
      }
    }
  }

  return Array.from(matchedGenres);
}
