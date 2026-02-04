import type { Book, BookCompanions, Companion } from './shared';
import { debug } from './shared';

/**
 * Buffer sizes for pre-generated images
 */
export const READING_TIME_BUFFER = 2;
export const POOL_BUFFER = 3;

export interface GetCompanionsNeedingImagesOptions {
  /** If true, return ALL companions without images (ignore buffer limits) */
  generateAll?: boolean;
}

/**
 * Get companions that need image generation to maintain buffers.
 * Only counts LOCKED companions (those without unlockedAt) for buffer calculation.
 * Unlocked companions have already been "consumed" from the queue.
 *
 * @param companions - The book's companion data
 * @param options.generateAll - If true, returns all companions without images (for initial generation)
 */
export function getCompanionsNeedingImages(
  companions: BookCompanions,
  options?: GetCompanionsNeedingImagesOptions
): {
  readingTime: Companion[];
  pool: Companion[];
  legendaries: Companion[];
} {
  const generateAll = options?.generateAll ?? false;
  const readingTime: Companion[] = [];
  const pool: Companion[] = [];
  const legendaries: Companion[] = [];

  // Check reading time queue - only count LOCKED companions with images
  let readingTimeWithImages = 0;
  for (const companion of companions.readingTimeQueue.companions) {
    // Skip unlocked companions - they've been "consumed" from the buffer
    if (companion.unlockedAt) {
      continue;
    }
    if (companion.imageUrl) {
      readingTimeWithImages++;
    } else if (generateAll || (readingTimeWithImages < READING_TIME_BUFFER && readingTime.length < READING_TIME_BUFFER)) {
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
    } else if (generateAll || (poolWithImages < POOL_BUFFER && pool.length < POOL_BUFFER)) {
      pool.push(companion);
    }
  }

  // Check legendaries (completion and pool legendaries)
  if (generateAll) {
    if (companions.completionLegendary && !companions.completionLegendary.imageUrl && !companions.completionLegendary.unlockedAt) {
      legendaries.push(companions.completionLegendary);
    }
    if (companions.poolLegendary && !companions.poolLegendary.imageUrl && !companions.poolLegendary.unlockedAt) {
      legendaries.push(companions.poolLegendary);
    }
  }

  debug.log('imageQueue', 'getCompanionsNeedingImages result', {
    generateAll,
    readingTimeWithImages,
    readingTimeNeeded: readingTime.map(c => c.name),
    poolWithImages,
    poolNeeded: pool.map(c => c.name),
    legendariesNeeded: legendaries.map(c => c.name),
  });

  return { readingTime, pool, legendaries };
}

/**
 * Check if more images should be generated for a book
 */
export function shouldGenerateMoreImages(companions: BookCompanions): boolean {
  const needed = getCompanionsNeedingImages(companions);
  return needed.readingTime.length > 0 || needed.pool.length > 0;
}

export interface GenerateBufferedImagesOptions {
  /** If true, generate ALL images (ignore buffer limits) */
  generateAll?: boolean;
  /** Progress callback */
  onProgress?: (completed: number, total: number) => void;
}

/**
 * Generate images for companions that need them
 * Returns updated companions with image URLs
 *
 * Note: This function is async and depends on imageGen module.
 * The actual image generation implementation will be wired up
 * when integrating with the existing imageGen module.
 *
 * @param companions - The book's companion data
 * @param generateImage - Function to generate an image for a companion
 * @param options.generateAll - If true, generates all images upfront (for initial book setup)
 * @param options.onProgress - Progress callback
 */
export async function generateBufferedImages(
  companions: BookCompanions,
  generateImage: (companion: Companion) => Promise<string | null>,
  options?: GenerateBufferedImagesOptions
): Promise<BookCompanions> {
  const generateAll = options?.generateAll ?? false;
  const onProgress = options?.onProgress;

  debug.log('imageQueue', 'generateBufferedImages starting', {
    generateAll,
    readingTimeCount: companions.readingTimeQueue.companions.length,
    poolCount: companions.poolQueue.companions.length,
    unlockedCount: companions.unlockedCompanions.length,
  });

  const needed = getCompanionsNeedingImages(companions, { generateAll });
  const allNeeded = [...needed.readingTime, ...needed.pool, ...needed.legendaries];

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

        // Check if this is a legendary (completionLegendary or poolLegendary)
        if (updated.completionLegendary?.id === companion.id) {
          debug.log('imageQueue', 'Updating completionLegendary with image');
          updated.completionLegendary = {
            ...updated.completionLegendary,
            imageUrl,
          };
        }
        if (updated.poolLegendary?.id === companion.id) {
          debug.log('imageQueue', 'Updating poolLegendary with image');
          updated.poolLegendary = {
            ...updated.poolLegendary,
            imageUrl,
          };
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
