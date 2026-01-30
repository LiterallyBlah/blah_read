import { RESEARCH_SCHEMA, type ResearchResponse } from './companionResearch';

// OpenRouter API configuration
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'google/gemini-3-flash-preview';

export interface CompanionData {
  archetype: string;
  creature: string;
  keywords: string[];
}

export interface LLMConfig {
  model?: string;
}

export function buildCompanionPrompt(synopsis: string): string {
  return `Analyze this book synopsis and extract:
1. The main character archetype (e.g., Knight, Cultivator, Wizard, Hacker, Survivor)
2. A companion creature that fits the story (e.g., Dragon, AI Bot, Wolf, Phoenix)
3. Three visual keywords to describe the companion

Synopsis: "${synopsis}"

Respond in exactly this format:
Archetype: [archetype]
Creature: [creature]
Keywords: [keyword1], [keyword2], [keyword3]`;
}

export function parseCompanionResponse(response: string): CompanionData {
  const archetypeMatch = response.match(/Archetype:\s*(.+)/i);
  const creatureMatch = response.match(/Creature:\s*(.+)/i);
  const keywordsMatch = response.match(/Keywords:\s*(.+)/i);

  return {
    archetype: archetypeMatch?.[1]?.trim() || 'Adventurer',
    creature: creatureMatch?.[1]?.trim() || 'Spirit',
    keywords: keywordsMatch?.[1]?.split(',').map(k => k.trim()) || ['mystical', 'glowing', 'small'],
  };
}

export async function generateCompanionData(
  synopsis: string,
  apiKey: string,
  config: LLMConfig = {}
): Promise<CompanionData> {
  const model = config.model || DEFAULT_MODEL;

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://blahread.app',
      'X-Title': 'Blah Read',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: buildCompanionPrompt(synopsis) }],
      max_tokens: 150,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LLM request failed: ${error}`);
  }

  const data = await response.json();
  return parseCompanionResponse(data.choices[0].message.content);
}

/**
 * Build the request object for companion research with online model
 */
export function buildResearchRequest(
  apiKey: string,
  prompt: string,
  baseModel: string
) {
  // Append :online suffix for web-access models
  const onlineModel = baseModel.includes(':online') ? baseModel : `${baseModel}:online`;

  return {
    url: OPENROUTER_API_URL,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://blahread.app',
      'X-Title': 'Blah Read',
    },
    body: {
      model: onlineModel,
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'companion_research',
          strict: true,
          schema: RESEARCH_SCHEMA,
        },
      },
    },
  };
}

/**
 * Execute companion research via OpenRouter online model
 */
export async function executeCompanionResearch(
  apiKey: string,
  prompt: string,
  model: string
): Promise<ResearchResponse> {
  const request = buildResearchRequest(apiKey, prompt, model);

  const response = await fetch(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify(request.body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Research API failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No content in research response');
  }

  return JSON.parse(content) as ResearchResponse;
}
