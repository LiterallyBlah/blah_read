import type { Book, BookCompanions, Companion } from './types';

/**
 * Buffer sizes for pre-generated images
 */
export const READING_TIME_BUFFER = 2;
export const POOL_BUFFER = 3;

/**
 * Get companions that need image generation to maintain buffers
 */
export function getCompanionsNeedingImages(companions: BookCompanions): {
  readingTime: Companion[];
  pool: Companion[];
} {
  const readingTime: Companion[] = [];
  const pool: Companion[] = [];

  // Check reading time queue - count images and collect needed
  let readingTimeWithImages = 0;
  for (const companion of companions.readingTimeQueue.companions) {
    if (companion.imageUrl) {
      readingTimeWithImages++;
    } else if (readingTimeWithImages < READING_TIME_BUFFER && readingTime.length < READING_TIME_BUFFER) {
      readingTime.push(companion);
    }
  }

  // Check pool queue - count images and collect needed
  let poolWithImages = 0;
  for (const companion of companions.poolQueue.companions) {
    if (companion.imageUrl) {
      poolWithImages++;
    } else if (poolWithImages < POOL_BUFFER && pool.length < POOL_BUFFER) {
      pool.push(companion);
    }
  }

  return { readingTime, pool };
}

/**
 * Check if more images should be generated for a book
 */
export function shouldGenerateMoreImages(companions: BookCompanions): boolean {
  const needed = getCompanionsNeedingImages(companions);
  return needed.readingTime.length > 0 || needed.pool.length > 0;
}

/**
 * Generate images for companions that need them
 * Returns updated companions with image URLs
 *
 * Note: This function is async and depends on imageGen module.
 * The actual image generation implementation will be wired up
 * when integrating with the existing imageGen module.
 */
export async function generateBufferedImages(
  companions: BookCompanions,
  generateImage: (companion: Companion) => Promise<string | null>,
  onProgress?: (completed: number, total: number) => void
): Promise<BookCompanions> {
  const needed = getCompanionsNeedingImages(companions);
  const allNeeded = [...needed.readingTime, ...needed.pool];

  if (allNeeded.length === 0) {
    return companions;
  }

  const updated = { ...companions };
  updated.readingTimeQueue = { ...updated.readingTimeQueue };
  updated.poolQueue = { ...updated.poolQueue };
  updated.readingTimeQueue.companions = [...updated.readingTimeQueue.companions];
  updated.poolQueue.companions = [...updated.poolQueue.companions];

  let completed = 0;

  for (const companion of allNeeded) {
    try {
      const imageUrl = await generateImage(companion);

      if (imageUrl) {
        // Find and update the companion in the appropriate queue
        const readingIndex = updated.readingTimeQueue.companions.findIndex(
          c => c.id === companion.id
        );
        if (readingIndex !== -1) {
          updated.readingTimeQueue.companions[readingIndex] = {
            ...updated.readingTimeQueue.companions[readingIndex],
            imageUrl,
          };
          updated.readingTimeQueue.nextGenerateIndex = Math.max(
            updated.readingTimeQueue.nextGenerateIndex,
            readingIndex + 1
          );
        }

        const poolIndex = updated.poolQueue.companions.findIndex(
          c => c.id === companion.id
        );
        if (poolIndex !== -1) {
          updated.poolQueue.companions[poolIndex] = {
            ...updated.poolQueue.companions[poolIndex],
            imageUrl,
          };
          updated.poolQueue.nextGenerateIndex = Math.max(
            updated.poolQueue.nextGenerateIndex,
            poolIndex + 1
          );
        }
      }

      completed++;
      onProgress?.(completed, allNeeded.length);
    } catch (error) {
      console.error(`Failed to generate image for ${companion.name}:`, error);
      // Continue with other companions
      completed++;
      onProgress?.(completed, allNeeded.length);
    }
  }

  return updated;
}

/**
 * Trigger background image generation for a book if needed
 */
export async function maybeGenerateImages(
  book: Book,
  generateImage: (companion: Companion) => Promise<string | null>
): Promise<Book> {
  if (!book.companions || !shouldGenerateMoreImages(book.companions)) {
    return book;
  }

  const updatedCompanions = await generateBufferedImages(book.companions, generateImage);

  return {
    ...book,
    companions: updatedCompanions,
  };
}
