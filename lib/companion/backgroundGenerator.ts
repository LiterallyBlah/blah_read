import { Book, Companion, debug, generateImageForCompanion, detectBookGenres } from '../shared';
import { orchestrateCompanionResearch } from './orchestrator';
import { generateBufferedImages } from './imageQueue';
import { settings } from '../storage';

/**
 * Generate companions for a book in the background.
 * This is called from the book detail page when companionsPending is true.
 *
 * @param book - The book to generate companions for
 * @param onComplete - Callback with the updated book when generation finishes
 */
export async function generateCompanionsInBackground(
  book: Book,
  onComplete: (updatedBook: Book) => void
): Promise<void> {
  debug.log('background', `Starting companion generation for "${book.title}"`);

  const config = await settings.get();

  if (!config.apiKey) {
    debug.log('background', 'No API key, skipping generation');
    onComplete({ ...book, companionsPending: false });
    return;
  }

  try {
    // Step 1: Research companions
    debug.time('background', 'companion-research');
    const companions = await orchestrateCompanionResearch({
      bookId: book.id,
      title: book.title,
      author: book.authors?.[0],
      synopsis: book.synopsis,
      genres: book.normalizedGenres,
    });
    debug.timeEnd('background', 'companion-research');

    // Step 2: Genre detection if book has no genres
    let detectedGenres = book.normalizedGenres || [];
    if (detectedGenres.length === 0) {
      debug.log('background', 'Book has no genres, running LLM detection');
      debug.time('background', 'genre-detection');
      try {
        const detected = await detectBookGenres(
          {
            title: book.title,
            author: book.authors?.[0],
            synopsis: book.synopsis,
          },
          config.apiKey!,
          config.llmModel
        );
        if (detected.length) {
          detectedGenres = detected;
          debug.log('background', 'LLM detected genres:', detected);
        }
      } catch (error) {
        debug.warn('background', 'Genre detection failed', error);
        // Continue without genres - non-blocking
      }
      debug.timeEnd('background', 'genre-detection');
    }

    // Step 3: Generate images
    debug.time('background', 'image-generation');
    const generateImage = async (companion: Companion) => {
      try {
        return await generateImageForCompanion(companion, config.apiKey!, {
          model: config.imageModel,
          imageSize: config.imageSize,
          llmModel: config.llmModel,
        });
      } catch (error) {
        debug.error('background', `Image generation failed for "${companion.name}"`, error);
        return null;
      }
    };

    // Generate ALL companion images upfront to avoid reserve/buffer edge cases
    const companionsWithImages = await generateBufferedImages(companions, generateImage, {
      generateAll: true,
    });
    debug.timeEnd('background', 'image-generation');

    // Step 4: Return updated book with companions and detected genres
    const updatedBook: Book = {
      ...book,
      companions: companionsWithImages,
      companionsPending: false,
      // Include detected genres if we found any (and book didn't already have them)
      ...(detectedGenres.length > 0 && !book.normalizedGenres?.length
        ? { normalizedGenres: detectedGenres }
        : {}),
    };

    debug.log('background', `Companion generation complete for "${book.title}"`);
    onComplete(updatedBook);
  } catch (error) {
    debug.error('background', `Companion generation failed for "${book.title}"`, error);
    // Leave companionsPending: true so it retries on next visit
    // Don't call onComplete - the book state remains unchanged
  }
}
