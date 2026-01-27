import { getBorderInstruction } from '@/lib/imagePromptBuilder';

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
});
