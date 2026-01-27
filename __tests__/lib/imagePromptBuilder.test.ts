import { getBorderInstruction, buildPromptTemplate } from '@/lib/imagePromptBuilder';
import type { Companion } from '@/lib/types';

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
});
