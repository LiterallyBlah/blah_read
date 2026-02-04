import { GENRES, Genre, isValidGenre } from './genres';
import { debug } from './debug';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface GenreDetectionInput {
  title: string;
  author?: string;
  synopsis?: string | null;
}

export interface GenreDetectionResult {
  genres: Genre[];
  confidence: 'high' | 'medium' | 'low';
}

/**
 * JSON schema for LLM genre detection response
 */
const GENRE_DETECTION_SCHEMA = {
  type: 'object',
  properties: {
    genres: {
      type: 'array',
      items: {
        type: 'string',
        enum: [...GENRES],
      },
      minItems: 1,
      maxItems: 3,
    },
    confidence: {
      type: 'string',
      enum: ['high', 'medium', 'low'],
    },
  },
  required: ['genres', 'confidence'],
  additionalProperties: false,
};

/**
 * Build the prompt for genre detection
 */
function buildGenreDetectionPrompt(input: GenreDetectionInput): string {
  const parts = [`You are categorizing a book into genres.`];

  parts.push(`\nBook Title: ${input.title}`);
  if (input.author) {
    parts.push(`Author: ${input.author}`);
  }
  if (input.synopsis) {
    parts.push(`Synopsis: ${input.synopsis}`);
  }

  parts.push(`\nAvailable genres:`);
  parts.push(`- fantasy, sci-fi, mystery-thriller, horror, romance`);
  parts.push(`- literary-fiction, history, biography-memoir, science-nature`);
  parts.push(`- self-improvement, business-finance, philosophy-religion`);

  parts.push(`\nBased on the book information, select 1-3 genres that best fit this book.`);
  parts.push(`Return ONLY genres from the list above, exactly as written.`);
  parts.push(`Set confidence to "high" if you're certain, "medium" if reasonably sure, "low" if guessing.`);

  return parts.join('\n');
}

/**
 * Detect book genres using LLM
 * Returns empty array on failure (graceful degradation)
 */
export async function detectBookGenres(
  input: GenreDetectionInput,
  apiKey: string,
  model: string
): Promise<Genre[]> {
  debug.log('genre-detection', 'Starting genre detection', {
    title: input.title,
    author: input.author,
    hasSynopsis: !!input.synopsis,
  });

  try {
    const prompt = buildGenreDetectionPrompt(input);
    debug.log('genre-detection', 'Built prompt', { promptLength: prompt.length });

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://blahread.app',
        'X-Title': 'Blah Read',
      },
      body: JSON.stringify({
        model, // No :online suffix needed - we don't need web search
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'genre_detection',
            strict: true,
            schema: GENRE_DETECTION_SCHEMA,
          },
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Genre detection API failed: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in genre detection response');
    }

    const result: GenreDetectionResult = JSON.parse(content);
    debug.log('genre-detection', 'Received result', result);

    // Validate that all genres are valid
    const validGenres = result.genres.filter(isValidGenre);
    if (validGenres.length !== result.genres.length) {
      debug.warn('genre-detection', 'Some genres were invalid', {
        received: result.genres,
        valid: validGenres,
      });
    }

    debug.log('genre-detection', 'Genre detection complete', {
      genres: validGenres,
      confidence: result.confidence,
    });

    return validGenres;
  } catch (error) {
    debug.error('genre-detection', 'Genre detection failed', error);
    return [];
  }
}
