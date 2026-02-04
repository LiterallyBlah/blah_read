// Mock needs to be at top level for Jest hoisting
const mockExecuteCompanionResearch = jest.fn();

jest.mock('@/lib/shared', () => {
  const actual = jest.requireActual('@/lib/shared');
  return {
    __esModule: true,
    ...actual,
    executeCompanionResearch: mockExecuteCompanionResearch,
  };
});

jest.mock('@/lib/settings', () => ({
  settings: {
    get: jest.fn().mockResolvedValue({
      apiKey: 'test-key',
      llmModel: 'google/gemini-2.5-flash-preview-05-20',
    }),
  },
}));

import { orchestrateCompanionResearch, shouldRunCompanionResearch } from '@/lib/companionOrchestrator';
import { settings } from '@/lib/settings';

// Re-assign for convenience in tests
const executeCompanionResearch = mockExecuteCompanionResearch;

describe('companionOrchestrator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('orchestrateCompanionResearch', () => {
    it('returns BookCompanions structure on successful research', async () => {
      // Generate 12 companions to maintain 'high' confidence
      // 2 legendaries, 3 rares, 7 commons
      const companions = Array.from({ length: 12 }, (_, i) => ({
        name: `Character ${i}`,
        type: 'character' as const,
        rarity: i < 2 ? 'legendary' as const : i < 5 ? 'rare' as const : 'common' as const,
        description: `Description ${i}`,
        role: i === 0 ? 'Protagonist' : 'Supporting',
        traits: 'Various',
        visualDescription: `Visual ${i}`,
      }));

      (executeCompanionResearch as jest.Mock).mockResolvedValue({
        companions,
        researchConfidence: 'high',
      });

      const result = await orchestrateCompanionResearch({
        bookId: 'book-123',
        title: 'Test Book',
        author: 'Test Author',
        synopsis: 'A test synopsis',
      });

      expect(result.researchComplete).toBe(true);
      expect(result.researchConfidence).toBe('high');
      expect(result.readingTimeQueue.companions.length).toBeGreaterThanOrEqual(0);
      expect(result.poolQueue.companions.length).toBeGreaterThanOrEqual(0);

      // With 2 legendaries, both completion and pool legendaries should be set
      expect(result.completionLegendary).not.toBeNull();
      expect(result.poolLegendary).not.toBeNull();
      expect(result.completionLegendary?.rarity).toBe('legendary');
      expect(result.poolLegendary?.rarity).toBe('legendary');
      // They should be different companions
      expect(result.completionLegendary?.id).not.toBe(result.poolLegendary?.id);
    });

    it('falls back to inspired companions on API failure', async () => {
      (executeCompanionResearch as jest.Mock).mockRejectedValue(new Error('API Error'));

      const result = await orchestrateCompanionResearch({
        bookId: 'book-123',
        title: 'Test Book',
        author: 'Test Author',
        synopsis: 'A fantasy adventure',
      });

      expect(result.researchComplete).toBe(true);
      expect(result.researchConfidence).toBe('low');
      const allCompanions = [
        ...result.readingTimeQueue.companions,
        ...result.poolQueue.companions,
      ];
      expect(allCompanions.every(c => c.source === 'inspired')).toBe(true);
    });

    it('supplements with inspired companions when research returns few results', async () => {
      const mockResponse = {
        companions: [
          {
            name: 'Hero',
            type: 'character' as const,
            rarity: 'legendary' as const,
            description: 'The only known character',
            role: 'Protagonist',
            traits: 'Brave',
            physicalDescription: 'Warrior appearance',
            effects: [{ type: 'xp_boost' }],
          },
        ],
        researchConfidence: 'medium' as const,
      };

      (executeCompanionResearch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await orchestrateCompanionResearch({
        bookId: 'book-123',
        title: 'Obscure Book',
        author: 'Unknown Author',
        synopsis: 'A mysterious tale',
      });

      // Collect all companions including book-specific legendaries
      // Use a Map to deduplicate (poolLegendary is also in poolQueue)
      const companionMap = new Map<string, typeof result.readingTimeQueue.companions[0]>();
      for (const c of result.readingTimeQueue.companions) {
        companionMap.set(c.id, c);
      }
      for (const c of result.poolQueue.companions) {
        companionMap.set(c.id, c);
      }
      if (result.completionLegendary) {
        companionMap.set(result.completionLegendary.id, result.completionLegendary);
      }
      if (result.poolLegendary) {
        companionMap.set(result.poolLegendary.id, result.poolLegendary);
      }
      const allCompanions = Array.from(companionMap.values());

      // Should have padded to ~15 companions
      expect(allCompanions.length).toBeGreaterThanOrEqual(10);

      // Should have mix of discovered and inspired
      const discovered = allCompanions.filter(c => c.source === 'discovered');
      const inspired = allCompanions.filter(c => c.source === 'inspired');

      expect(discovered.length).toBe(1);
      expect(inspired.length).toBeGreaterThan(0);

      // The discovered legendary should be somewhere in the pool
      const heroCompanion = allCompanions.find(c => c.name === 'Hero');
      expect(heroCompanion).toBeDefined();
      expect(heroCompanion?.source).toBe('discovered');

      // With multiple legendaries (1 discovered + inspired legendaries),
      // both completion and pool legendaries should be set
      expect(result.completionLegendary).not.toBeNull();
      expect(result.completionLegendary?.rarity).toBe('legendary');
      // Since inspired companions also include legendaries, poolLegendary should be set
      expect(result.poolLegendary).not.toBeNull();
      expect(result.poolLegendary?.rarity).toBe('legendary');
    });

    it('falls back to inspired when no API key is configured', async () => {
      (settings.get as jest.Mock).mockResolvedValue({
        apiKey: null,
        llmModel: 'google/gemini-2.5-flash-preview-05-20',
      });

      const result = await orchestrateCompanionResearch({
        bookId: 'book-123',
        title: 'Test Book',
        author: 'Test Author',
        synopsis: 'A story about adventure',
      });

      expect(result.researchComplete).toBe(true);
      expect(result.researchConfidence).toBe('low');
      expect(executeCompanionResearch).not.toHaveBeenCalled();
      const allCompanions = [
        ...result.readingTimeQueue.companions,
        ...result.poolQueue.companions,
      ];
      expect(allCompanions.every(c => c.source === 'inspired')).toBe(true);
    });

    it('calls executeCompanionResearch with correct parameters', async () => {
      (settings.get as jest.Mock).mockResolvedValue({
        apiKey: 'my-api-key',
        llmModel: 'custom/model',
      });
      (executeCompanionResearch as jest.Mock).mockResolvedValue({
        companions: [],
        researchConfidence: 'low',
      });

      await orchestrateCompanionResearch({
        bookId: 'book-123',
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        synopsis: null,
      });

      expect(executeCompanionResearch).toHaveBeenCalledWith(
        'my-api-key',
        expect.stringContaining('The Great Gatsby'),
        'custom/model'
      );
      expect(executeCompanionResearch).toHaveBeenCalledWith(
        'my-api-key',
        expect.stringContaining('F. Scott Fitzgerald'),
        'custom/model'
      );
    });

    it('downgrades confidence when fewer than 5 discovered companions', async () => {
      (settings.get as jest.Mock).mockResolvedValue({
        apiKey: 'test-key',
        llmModel: 'google/gemini-2.5-flash-preview-05-20',
      });
      (executeCompanionResearch as jest.Mock).mockResolvedValue({
        companions: [
          {
            name: 'Solo Character',
            type: 'character',
            rarity: 'legendary',
            description: 'Only one',
            role: 'Protagonist',
            traits: 'Lonely',
            visualDescription: 'Alone',
          },
        ],
        researchConfidence: 'high',
      });

      const result = await orchestrateCompanionResearch({
        bookId: 'book-123',
        title: 'Obscure Book',
        author: 'Unknown',
        synopsis: null,
      });

      // Confidence should be downgraded because only 1 discovered companion
      expect(result.researchConfidence).toBe('low');
    });

    it('maintains medium confidence when 5-9 discovered companions', async () => {
      (settings.get as jest.Mock).mockResolvedValue({
        apiKey: 'test-key',
        llmModel: 'google/gemini-2.5-flash-preview-05-20',
      });
      const companions = Array.from({ length: 7 }, (_, i) => ({
        name: `Character ${i}`,
        type: 'character' as const,
        rarity: 'common' as const,
        description: `Description ${i}`,
        role: 'Supporting',
        traits: 'Various',
        visualDescription: 'Generic',
      }));
      (executeCompanionResearch as jest.Mock).mockResolvedValue({
        companions,
        researchConfidence: 'high',
      });

      const result = await orchestrateCompanionResearch({
        bookId: 'book-123',
        title: 'Semi-Known Book',
        author: 'Author',
        synopsis: null,
      });

      // Confidence should be downgraded to medium (7 is < 10)
      expect(result.researchConfidence).toBe('medium');
    });

    it('maintains high confidence when 10+ discovered companions', async () => {
      (settings.get as jest.Mock).mockResolvedValue({
        apiKey: 'test-key',
        llmModel: 'google/gemini-2.5-flash-preview-05-20',
      });
      const companions = Array.from({ length: 12 }, (_, i) => ({
        name: `Character ${i}`,
        type: 'character' as const,
        rarity: 'common' as const,
        description: `Description ${i}`,
        role: 'Supporting',
        traits: 'Various',
        visualDescription: 'Generic',
      }));
      (executeCompanionResearch as jest.Mock).mockResolvedValue({
        companions,
        researchConfidence: 'high',
      });

      const result = await orchestrateCompanionResearch({
        bookId: 'book-123',
        title: 'Well-Known Book',
        author: 'Famous Author',
        synopsis: null,
      });

      expect(result.researchConfidence).toBe('high');
    });
  });

  describe('shouldRunCompanionResearch', () => {
    it('returns true for book without companions', () => {
      const book = {
        id: 'book-123',
        title: 'Test Book',
        coverUrl: null,
        synopsis: null,
        sourceUrl: null,
        status: 'reading' as const,
        totalReadingTime: 0,
        createdAt: Date.now(),
      };

      expect(shouldRunCompanionResearch(book)).toBe(true);
    });

    it('returns false for book with completed research', () => {
      const book = {
        id: 'book-123',
        title: 'Test Book',
        coverUrl: null,
        synopsis: null,
        sourceUrl: null,
        status: 'reading' as const,
        totalReadingTime: 0,
        createdAt: Date.now(),
        companions: {
          researchComplete: true,
          researchConfidence: 'high' as const,
          readingTimeQueue: { companions: [], nextGenerateIndex: 0 },
          poolQueue: { companions: [], nextGenerateIndex: 0 },
          unlockedCompanions: [],
        },
      };

      expect(shouldRunCompanionResearch(book)).toBe(false);
    });

    it('returns false for book without title', () => {
      const book = {
        id: 'book-123',
        title: '',
        coverUrl: null,
        synopsis: null,
        sourceUrl: null,
        status: 'reading' as const,
        totalReadingTime: 0,
        createdAt: Date.now(),
      };

      expect(shouldRunCompanionResearch(book)).toBe(false);
    });
  });
});
