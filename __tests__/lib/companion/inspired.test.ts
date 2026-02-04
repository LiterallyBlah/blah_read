import { generateInspiredCompanions, INSPIRED_TEMPLATES } from '@/lib/companion';

describe('INSPIRED_TEMPLATES', () => {
  it('all templates have physicalDescription', () => {
    for (const template of INSPIRED_TEMPLATES) {
      expect(template).toHaveProperty('physicalDescription');
      expect(template.physicalDescription).toBeTruthy();
    }
  });
});

describe('inspiredCompanions', () => {
  describe('generateInspiredCompanions', () => {
    it('generates companions from synopsis', () => {
      const result = generateInspiredCompanions(
        'book-123',
        'A young wizard discovers he has magical powers and must defeat an evil sorcerer.',
        5
      );

      expect(result).toHaveLength(5);
      expect(result[0].source).toBe('inspired');
      expect(result[0].bookId).toBe('book-123');
    });

    it('generates requested count', () => {
      const result = generateInspiredCompanions(
        'book-123',
        'A story about adventure.',
        10
      );

      expect(result).toHaveLength(10);
    });

    it('assigns appropriate rarity distribution', () => {
      const result = generateInspiredCompanions('book-123', 'A fantasy tale.', 15);

      const legendaries = result.filter(c => c.rarity === 'legendary');
      const rares = result.filter(c => c.rarity === 'rare');
      const commons = result.filter(c => c.rarity === 'common');

      expect(legendaries.length).toBeGreaterThanOrEqual(1);
      expect(legendaries.length).toBeLessThanOrEqual(3);
      expect(rares.length).toBeGreaterThanOrEqual(1);
      expect(commons.length).toBeGreaterThanOrEqual(1);
    });

    it('handles empty synopsis', () => {
      const result = generateInspiredCompanions('book-123', '', 5);

      expect(result).toHaveLength(5);
      expect(result[0].name).toBeDefined();
    });

    it('handles null synopsis', () => {
      const result = generateInspiredCompanions('book-123', null as any, 5);

      expect(result).toHaveLength(5);
    });

    it('generates companions with physicalDescription', () => {
      const companions = generateInspiredCompanions('book-1', 'A story about magic', 3);
      for (const companion of companions) {
        expect(companion.physicalDescription).toBeTruthy();
      }
    });
  });
});
