import { buildCompanionPrompt, parseCompanionResponse, buildResearchRequest } from '@/lib/shared/llm';
import { RESEARCH_SCHEMA } from '@/lib/companion';

describe('llm', () => {
  it('builds prompt with synopsis', () => {
    const prompt = buildCompanionPrompt('A young cultivator rises to power...');
    expect(prompt).toContain('cultivator');
    expect(prompt).toContain('archetype');
    expect(prompt).toContain('creature');
    expect(prompt).toContain('keywords');
  });

  it('parses LLM response into companion data', () => {
    const response = `Archetype: Cultivator
Creature: Dragon
Keywords: mystical, scaled, ancient`;

    const result = parseCompanionResponse(response);
    expect(result.archetype).toBe('Cultivator');
    expect(result.creature).toBe('Dragon');
    expect(result.keywords).toEqual(['mystical', 'scaled', 'ancient']);
  });

  it('handles response with extra whitespace', () => {
    const response = `  Archetype:   Knight
  Creature:  Phoenix
  Keywords:  fiery,   noble,   radiant  `;

    const result = parseCompanionResponse(response);
    expect(result.archetype).toBe('Knight');
    expect(result.creature).toBe('Phoenix');
    expect(result.keywords).toEqual(['fiery', 'noble', 'radiant']);
  });

  it('provides defaults for malformed response', () => {
    const response = 'This is not a valid response';
    const result = parseCompanionResponse(response);
    expect(result.archetype).toBe('Adventurer');
    expect(result.creature).toBe('Spirit');
    expect(result.keywords).toEqual(['mystical', 'glowing', 'small']);
  });

  describe('buildResearchRequest', () => {
    it('builds request with online model suffix', () => {
      const request = buildResearchRequest(
        'test-api-key',
        'Research this book',
        'google/gemini-2.5-flash-preview-05-20'
      );

      expect(request.headers['Authorization']).toBe('Bearer test-api-key');
      expect(request.body.model).toContain(':online');
    });

    it('includes structured output schema', () => {
      const request = buildResearchRequest(
        'test-api-key',
        'Research this book',
        'google/gemini-2.5-flash-preview-05-20'
      );

      expect(request.body.response_format).toBeDefined();
      expect(request.body.response_format.type).toBe('json_schema');
      expect(request.body.response_format.json_schema.schema).toEqual(RESEARCH_SCHEMA);
    });

    it('sets appropriate max_tokens for research', () => {
      const request = buildResearchRequest(
        'test-api-key',
        'Research this book',
        'google/gemini-2.5-flash-preview-05-20'
      );

      expect(request.body.max_tokens).toBeGreaterThanOrEqual(2000);
    });

    it('does not double-add :online suffix if already present', () => {
      const request = buildResearchRequest(
        'test-api-key',
        'Research this book',
        'google/gemini-2.5-flash-preview-05-20:online'
      );

      expect(request.body.model).toBe('google/gemini-2.5-flash-preview-05-20:online');
      expect(request.body.model).not.toContain(':online:online');
    });
  });
});
