import { Book, ReadingSession, UserProgress, BookStatus } from '@/lib/types';

describe('types', () => {
  it('Book type has required fields', () => {
    const book: Book = {
      id: '1',
      title: 'Test Book',
      coverUrl: 'https://example.com/cover.jpg',
      synopsis: 'A test book',
      sourceUrl: 'https://amazon.com/book',
      status: 'reading',
      totalReadingTime: 0,
      createdAt: Date.now(),
    };
    expect(book.status).toBe('reading');
  });

  it('ReadingSession type has required fields', () => {
    const session: ReadingSession = {
      id: '1',
      bookId: 'book-1',
      startTime: Date.now() - 3600000,
      endTime: Date.now(),
      duration: 3600,
      xpEarned: 600,
    };
    expect(session.duration).toBe(3600);
  });

  it('UserProgress type has required fields', () => {
    const progress: UserProgress = {
      totalXp: 1000,
      level: 2,
      currentStreak: 5,
      longestStreak: 10,
      lastReadDate: '2026-01-27',
      lootItems: [],
      lootBoxes: { availableBoxes: [], openHistory: [] },
      booksFinished: 0,
      booksAdded: 0,
      totalHoursRead: 0,
    };
    expect(progress.level).toBe(2);
  });

  it('BookStatus is a valid union type', () => {
    const statuses: BookStatus[] = ['to_read', 'reading', 'finished'];
    expect(statuses).toHaveLength(3);
  });
});
