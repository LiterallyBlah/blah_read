import { getBorderInstruction, buildPromptTemplate, generateImagePrompt, Companion } from '@/lib/shared';

// Mock fetch globally at the top of the file
global.fetch = jest.fn();

describe('imagePromptBuilder', () => {
  describe('getBorderInstruction', () => {
    it('returns no border instruction for common rarity', () => {
      const instruction = getBorderInstruction('common');
      expect(instruction).toContain('NO border');
      expect(instruction).toContain('Clean edges');
    });

    it('returns blue border instruction for rare rarity', () => {
      const instruction = getBorderInstruction('rare');
      expect(instruction).toContain('#4A90D9');
      expect(instruction).toContain('2-3 pixels');
      expect(instruction).toContain('creative freedom');
    });

    it('returns gold border instruction for legendary rarity', () => {
      const instruction = getBorderInstruction('legendary');
      expect(instruction).toContain('#F1C40F');
      expect(instruction).toContain('2-3 pixels');
      expect(instruction).toContain('prestigious');
    });
  });

  describe('buildPromptTemplate', () => {
    const mockCompanion: Companion = {
      id: 'test-1',
      bookId: 'book-1',
      name: 'Fire Dragon',
      type: 'creature',
      rarity: 'legendary',
      description: 'A mighty dragon',
      traits: 'fierce, ancient',
      visualDescription: '',
      physicalDescription: 'Large red dragon with golden scales, fiery eyes, massive wings',
      imageUrl: null,
      source: 'discovered',
      unlockMethod: null,
      unlockedAt: null,
    };

    it('builds prompt with companion details', () => {
      const prompt = buildPromptTemplate(mockCompanion);
      expect(prompt).toContain('Fire Dragon');
      expect(prompt).toContain('creature');
      expect(prompt).toContain('Large red dragon with golden scales');
    });

    it('includes style requirements', () => {
      const prompt = buildPromptTemplate(mockCompanion);
      expect(prompt).toContain('32x32 pixel art');
      expect(prompt).toContain('White background');
      expect(prompt).toContain('retro color palette');
    });

    it('includes correct border instruction for rarity', () => {
      const prompt = buildPromptTemplate(mockCompanion);
      expect(prompt).toContain('#F1C40F'); // legendary gold
      expect(prompt).not.toContain('#4A90D9'); // should not include rare blue
    });

    it('instructs LLM to output only the prompt', () => {
      const prompt = buildPromptTemplate(mockCompanion);
      expect(prompt).toContain('Output ONLY the image prompt');
    });

    it('falls back to visualDescription if physicalDescription missing', () => {
      const oldCompanion: Companion = {
        ...mockCompanion,
        physicalDescription: undefined,
        visualDescription: 'Old visual description here',
      };
      const prompt = buildPromptTemplate(oldCompanion);
      expect(prompt).toContain('Old visual description here');
    });
  });

  describe('generateImagePrompt', () => {
    const mockCompanion: Companion = {
      id: 'test-1',
      bookId: 'book-1',
      name: 'Fire Dragon',
      type: 'creature',
      rarity: 'legendary',
      description: 'A mighty dragon',
      traits: 'fierce, ancient',
      visualDescription: '',
      physicalDescription: 'Large red dragon with golden scales',
      imageUrl: null,
      source: 'discovered',
      unlockMethod: null,
      unlockedAt: null,
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('calls OpenRouter API with correct parameters', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: '32x32 pixel art dragon with gold border' } }],
        }),
      });

      await generateImagePrompt(mockCompanion, 'test-api-key', { model: 'test-model' });

      expect(fetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
          }),
        })
      );

      const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.model).toBe('test-model');
      expect(body.messages[0].content).toContain('Fire Dragon');
    });

    it('returns the generated prompt from LLM response', async () => {
      const expectedPrompt = '32x32 pixel art dragon with gold ornate border';
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: expectedPrompt } }],
        }),
      });

      const result = await generateImagePrompt(mockCompanion, 'test-api-key', {});
      expect(result).toBe(expectedPrompt);
    });

    it('throws error on API failure', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        text: () => Promise.resolve('API error'),
      });

      await expect(generateImagePrompt(mockCompanion, 'test-api-key', {}))
        .rejects.toThrow('Image prompt generation failed');
    });

    it('throws error when no content in response', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ choices: [] }),
      });

      await expect(generateImagePrompt(mockCompanion, 'test-api-key', {}))
        .rejects.toThrow('No content in image prompt response');
    });
  });
});
