import type { Book, BookCompanions, Companion } from './types';
import { settings } from './settings';
import { executeCompanionResearch } from './llm';
import {
  buildResearchPrompt,
  parseResearchResponse,
  assignCompanionQueues,
} from './companionResearch';
import { generateInspiredCompanions } from './inspiredCompanions';

const TARGET_COMPANION_COUNT = 15;
const MIN_DISCOVERED_FOR_HIGH_CONFIDENCE = 10;

interface ResearchInput {
  bookId: string;
  title: string;
  author?: string;
  synopsis?: string | null;
}

/**
 * Main orchestrator for companion research
 * Handles API calls, fallbacks, and queue assignment
 */
export async function orchestrateCompanionResearch(
  input: ResearchInput
): Promise<BookCompanions> {
  const currentSettings = await settings.get();

  if (!currentSettings.apiKey) {
    return createInspiredOnlyResult(input);
  }

  try {
    const prompt = buildResearchPrompt(input.title, input.author);
    const response = await executeCompanionResearch(
      currentSettings.apiKey,
      prompt,
      currentSettings.llmModel
    );

    const parsed = parseResearchResponse(response, input.bookId);

    let allCompanions = parsed.companions;
    let confidence = parsed.confidence;

    // Supplement with inspired companions if needed
    if (allCompanions.length < TARGET_COMPANION_COUNT) {
      const needed = TARGET_COMPANION_COUNT - allCompanions.length;
      const inspired = generateInspiredCompanions(
        input.bookId,
        input.synopsis || null,
        needed
      );
      allCompanions = [...allCompanions, ...inspired];

      // Downgrade confidence based on how many discovered companions we got
      if (parsed.companions.length < MIN_DISCOVERED_FOR_HIGH_CONFIDENCE) {
        confidence = parsed.companions.length < 5 ? 'low' : 'medium';
      }
    }

    const { readingTimeQueue, poolQueue, completionLegendary } =
      assignCompanionQueues(allCompanions);

    // Ensure completion legendary is in pool queue if not already
    if (completionLegendary && !poolQueue.companions.includes(completionLegendary)) {
      poolQueue.companions.push(completionLegendary);
    }

    return {
      researchComplete: true,
      researchConfidence: confidence,
      readingTimeQueue,
      poolQueue,
      unlockedCompanions: [],
    };
  } catch (error) {
    console.error('Companion research failed:', error);
    return createInspiredOnlyResult(input);
  }
}

/**
 * Create a result using only inspired companions (fallback)
 */
function createInspiredOnlyResult(input: ResearchInput): BookCompanions {
  const inspired = generateInspiredCompanions(
    input.bookId,
    input.synopsis || null,
    TARGET_COMPANION_COUNT
  );

  const { readingTimeQueue, poolQueue } = assignCompanionQueues(inspired);

  return {
    researchComplete: true,
    researchConfidence: 'low',
    readingTimeQueue,
    poolQueue,
    unlockedCompanions: [],
  };
}

/**
 * Check if companion research should run for a book
 */
export function shouldRunCompanionResearch(book: Book): boolean {
  // Don't run if research is already complete
  if (book.companions?.researchComplete) {
    return false;
  }

  // Don't run if book has no title
  if (!book.title) {
    return false;
  }

  return true;
}
