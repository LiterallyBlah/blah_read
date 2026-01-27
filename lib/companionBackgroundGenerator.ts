import { Book, Companion } from './types';
import { orchestrateCompanionResearch } from './companionOrchestrator';
import { generateBufferedImages } from './companionImageQueue';
import { generateImageForCompanion } from './imageGen';
import { settings } from './settings';
import { debug } from './debug';

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
    });
    debug.timeEnd('background', 'companion-research');

    // Step 2: Generate images
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

    const companionsWithImages = await generateBufferedImages(companions, generateImage);
    debug.timeEnd('background', 'image-generation');

    // Step 3: Return updated book
    const updatedBook: Book = {
      ...book,
      companions: companionsWithImages,
      companionsPending: false,
    };

    debug.log('background', `Companion generation complete for "${book.title}"`);
    onComplete(updatedBook);
  } catch (error) {
    debug.error('background', `Companion generation failed for "${book.title}"`, error);
    // Leave companionsPending: true so it retries on next visit
    // Don't call onComplete - the book state remains unchanged
  }
}
