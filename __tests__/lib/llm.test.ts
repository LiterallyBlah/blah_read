import { buildCompanionPrompt, parseCompanionResponse } from '@/lib/llm';

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
});
