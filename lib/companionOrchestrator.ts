import type { Book, BookCompanions, Companion } from './types';
import { settings } from './settings';
import { executeCompanionResearch } from './llm';
import {
  buildResearchPrompt,
  parseResearchResponse,
  assignCompanionQueues,
} from './companionResearch';
import { generateInspiredCompanions } from './inspiredCompanions';
import { debug, setDebugEnabled } from './debug';

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
  setDebugEnabled(currentSettings.debugMode);

  debug.log('research', 'Starting companion research', {
    title: input.title,
    author: input.author,
    hasSynopsis: !!input.synopsis,
  });

  if (!currentSettings.apiKey) {
    debug.warn('research', 'No API key - using inspired companions only');
    return createInspiredOnlyResult(input);
  }

  try {
    const prompt = buildResearchPrompt(input.title, input.author);
    debug.log('research', 'Built research prompt', { promptLength: prompt.length });
    debug.log('research', 'Calling LLM API...', { model: currentSettings.llmModel });
    debug.time('research', 'llm-call');

    const response = await executeCompanionResearch(
      currentSettings.apiKey,
      prompt,
      currentSettings.llmModel
    );
    debug.timeEnd('research', 'llm-call');
    debug.log('research', 'LLM response received', {
      companionCount: response.companions.length,
      confidence: response.researchConfidence,
    });

    const parsed = parseResearchResponse(response, input.bookId);
    debug.log('research', 'Parsed companions from response', {
      count: parsed.companions.length,
      confidence: parsed.confidence,
      types: {
        characters: parsed.companions.filter(c => c.type === 'character').length,
        creatures: parsed.companions.filter(c => c.type === 'creature').length,
        objects: parsed.companions.filter(c => c.type === 'object').length,
      },
    });

    let allCompanions = parsed.companions;
    let confidence = parsed.confidence;

    // Supplement with inspired companions if needed
    if (allCompanions.length < TARGET_COMPANION_COUNT) {
      const needed = TARGET_COMPANION_COUNT - allCompanions.length;
      debug.log('research', `Supplementing with ${needed} inspired companions`);
      const inspired = generateInspiredCompanions(
        input.bookId,
        input.synopsis || null,
        needed
      );
      allCompanions = [...allCompanions, ...inspired];

      // Downgrade confidence based on how many discovered companions we got
      if (parsed.companions.length < MIN_DISCOVERED_FOR_HIGH_CONFIDENCE) {
        const oldConfidence = confidence;
        confidence = parsed.companions.length < 5 ? 'low' : 'medium';
        debug.log('research', `Downgraded confidence: ${oldConfidence} -> ${confidence}`);
      }
    }

    const { readingTimeQueue, poolQueue, completionLegendary, poolLegendary } =
      assignCompanionQueues(allCompanions);

    debug.log('research', 'Assigned companion queues', {
      readingTimeQueue: readingTimeQueue.companions.length,
      poolQueue: poolQueue.companions.length,
      hasCompletionLegendary: !!completionLegendary,
      hasPoolLegendary: !!poolLegendary,
    });

    // Ensure pool legendary is in pool queue if not already
    if (poolLegendary && !poolQueue.companions.includes(poolLegendary)) {
      poolQueue.companions.push(poolLegendary);
    }

    debug.log('research', 'Research complete', { confidence });

    return {
      researchComplete: true,
      researchConfidence: confidence,
      readingTimeQueue,
      poolQueue,
      unlockedCompanions: [],
      completionLegendary,
      poolLegendary,
    };
  } catch (error) {
    debug.error('research', 'Companion research failed', error);
    debug.log('research', 'Falling back to inspired companions');
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

  const { readingTimeQueue, poolQueue, completionLegendary, poolLegendary } =
    assignCompanionQueues(inspired);

  return {
    researchComplete: true,
    researchConfidence: 'low',
    readingTimeQueue,
    poolQueue,
    unlockedCompanions: [],
    completionLegendary,
    poolLegendary,
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
