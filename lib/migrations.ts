import type { Book, UserProgress, Companion } from './types';

export const CURRENT_VERSION = 2;

export async function migrateData(
  books: Book[],
  progress: UserProgress & { version?: number }
): Promise<{ books: Book[]; progress: UserProgress & { version: number } }> {
  let version = progress.version || 1;
  let migratedBooks = books;
  let migratedProgress = progress;

  // Migration v1 -> v2: Add companion collection fields
  if (version < 2) {
    migratedBooks = books.map(book => {
      // @ts-ignore - accessing legacy companion field
      if (book.companion && !book.companions) {
        // @ts-ignore - legacy companion structure
        const legacy = book.companion;

        const legacyCompanion: Companion = {
          id: legacy.id || `${book.id}-legacy-companion`,
          bookId: book.id,
          name: legacy.creature || 'Companion',
          type: 'creature',
          rarity: 'legendary',
          description: `A ${legacy.archetype || 'mysterious'} companion`,
          traits: legacy.keywords?.join(', ') || '',
          visualDescription: legacy.keywords?.join(', ') || '',
          imageUrl: legacy.imageUrl || null,
          source: 'inspired',
          unlockMethod: 'reading_time',
          unlockedAt: legacy.generatedAt || Date.now(),
        };

        return {
          ...book,
          companions: {
            researchComplete: true,
            researchConfidence: 'low' as const,
            readingTimeQueue: { companions: [], nextGenerateIndex: 0 },
            poolQueue: { companions: [], nextGenerateIndex: 0 },
            unlockedCompanions: [legacyCompanion],
          },
        };
      }
      return book;
    });

    // Add loot box state to progress if missing
    migratedProgress = {
      ...migratedProgress,
      lootBoxes: migratedProgress.lootBoxes || { availableBoxes: [], openHistory: [] },
      booksFinished: migratedProgress.booksFinished ?? 0,
      booksAdded: migratedProgress.booksAdded ?? migratedBooks.length,
      totalHoursRead: migratedProgress.totalHoursRead ?? 0,
    };

    version = 2;
  }

  return {
    books: migratedBooks,
    progress: { ...migratedProgress, version },
  };
}
