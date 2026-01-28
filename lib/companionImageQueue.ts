import type { Book, BookCompanions, Companion } from './types';
import { debug } from './debug';

/**
 * Buffer sizes for pre-generated images
 */
export const READING_TIME_BUFFER = 2;
export const POOL_BUFFER = 3;

/**
 * Get companions that need image generation to maintain buffers.
 * Only counts LOCKED companions (those without unlockedAt) for buffer calculation.
 * Unlocked companions have already been "consumed" from the queue.
 */
export function getCompanionsNeedingImages(companions: BookCompanions): {
  readingTime: Companion[];
  pool: Companion[];
} {
  const readingTime: Companion[] = [];
  const pool: Companion[] = [];

  // Check reading time queue - only count LOCKED companions with images
  let readingTimeWithImages = 0;
  for (const companion of companions.readingTimeQueue.companions) {
    // Skip unlocked companions - they've been "consumed" from the buffer
    if (companion.unlockedAt) {
      continue;
    }
    if (companion.imageUrl) {
      readingTimeWithImages++;
    } else if (readingTimeWithImages < READING_TIME_BUFFER && readingTime.length < READING_TIME_BUFFER) {
      readingTime.push(companion);
    }
  }

  // Check pool queue - only count LOCKED companions with images
  let poolWithImages = 0;
  for (const companion of companions.poolQueue.companions) {
    // Skip unlocked companions - they've been "consumed" from the buffer
    if (companion.unlockedAt) {
      continue;
    }
    if (companion.imageUrl) {
      poolWithImages++;
    } else if (poolWithImages < POOL_BUFFER && pool.length < POOL_BUFFER) {
      pool.push(companion);
    }
  }

  debug.log('imageQueue', 'getCompanionsNeedingImages result', {
    readingTimeWithImages,
    readingTimeNeeded: readingTime.map(c => c.name),
    poolWithImages,
    poolNeeded: pool.map(c => c.name),
  });

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
  debug.log('imageQueue', 'generateBufferedImages starting', {
    readingTimeCount: companions.readingTimeQueue.companions.length,
    poolCount: companions.poolQueue.companions.length,
    unlockedCount: companions.unlockedCompanions.length,
  });

  const needed = getCompanionsNeedingImages(companions);
  const allNeeded = [...needed.readingTime, ...needed.pool];

  if (allNeeded.length === 0) {
    debug.log('imageQueue', 'No companions need images, returning unchanged');
    return companions;
  }

  debug.log('imageQueue', `Starting image generation for ${allNeeded.length} companions`, {
    companions: allNeeded.map(c => ({ id: c.id, name: c.name, rarity: c.rarity })),
  });

  const updated = { ...companions };
  updated.readingTimeQueue = { ...updated.readingTimeQueue };
  updated.poolQueue = { ...updated.poolQueue };
  updated.readingTimeQueue.companions = [...updated.readingTimeQueue.companions];
  updated.poolQueue.companions = [...updated.poolQueue.companions];

  let completed = 0;

  for (const companion of allNeeded) {
    debug.log('imageQueue', `Generating image ${completed + 1}/${allNeeded.length}: "${companion.name}"`);
    try {
      const imageUrl = await generateImage(companion);

      if (imageUrl) {
        debug.log('imageQueue', `Image generated for "${companion.name}"`, {
          urlPreview: imageUrl.substring(0, 60) + '...',
        });

        // Find and update the companion in the appropriate queue
        const readingIndex = updated.readingTimeQueue.companions.findIndex(
          c => c.id === companion.id
        );
        if (readingIndex !== -1) {
          debug.log('imageQueue', `Updating readingTimeQueue[${readingIndex}] with image`);
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
          debug.log('imageQueue', `Updating poolQueue[${poolIndex}] with image`);
          updated.poolQueue.companions[poolIndex] = {
            ...updated.poolQueue.companions[poolIndex],
            imageUrl,
          };
          updated.poolQueue.nextGenerateIndex = Math.max(
            updated.poolQueue.nextGenerateIndex,
            poolIndex + 1
          );
        }
      } else {
        debug.warn('imageQueue', `No image URL returned for "${companion.name}"`);
      }

      completed++;
      onProgress?.(completed, allNeeded.length);
    } catch (error) {
      debug.error('imageQueue', `Failed to generate image for "${companion.name}"`, error);
      // Continue with other companions
      completed++;
      onProgress?.(completed, allNeeded.length);
    }
  }

  debug.log('imageQueue', 'generateBufferedImages complete', {
    generated: completed,
    readingTimeWithImages: updated.readingTimeQueue.companions.filter(c => c.imageUrl).length,
    poolWithImages: updated.poolQueue.companions.filter(c => c.imageUrl).length,
  });

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
