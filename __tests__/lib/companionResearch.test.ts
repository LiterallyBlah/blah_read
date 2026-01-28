import {
  buildResearchPrompt,
  parseResearchResponse,
  assignCompanionQueues,
} from '@/lib/companionResearch';
import type { Companion } from '@/lib/types';

describe('companionResearch', () => {
  describe('buildResearchPrompt', () => {
    it('builds prompt with title and author', () => {
      const prompt = buildResearchPrompt('The Hobbit', 'J.R.R. Tolkien');
      expect(prompt).toContain('The Hobbit');
      expect(prompt).toContain('J.R.R. Tolkien');
      expect(prompt).toContain('characters');
      expect(prompt).toContain('creatures');
      expect(prompt).toContain('objects');
    });

    it('handles missing author', () => {
      const prompt = buildResearchPrompt('Unknown Book', undefined);
      expect(prompt).toContain('Unknown Book');
      expect(prompt).not.toContain('undefined');
    });

    it('asks for physicalDescription not visualDescription', () => {
      const prompt = buildResearchPrompt('Test Book', 'Author');
      expect(prompt).toContain('physicalDescription');
      expect(prompt).not.toContain('visualDescription');
      expect(prompt).toContain('Do NOT include');
      expect(prompt).toContain('borders');
    });

    it('includes effect generation instructions', () => {
      const prompt = buildResearchPrompt('Test Book', 'Author');
      expect(prompt).toContain('effects');
      expect(prompt).toContain('xp_boost');
      expect(prompt).toContain('luck_boost');
      expect(prompt).toContain('drop_rate_boost');
      expect(prompt).toContain('completion_bonus');
      expect(prompt).toContain('targetGenre');
    });

    it('lists valid genres for effect targeting', () => {
      const prompt = buildResearchPrompt('Test Book', 'Author');
      expect(prompt).toContain('fantasy');
      expect(prompt).toContain('sci-fi');
      expect(prompt).toContain('mystery-thriller');
    });
  });

  describe('parseResearchResponse', () => {
    it('parses valid structured response', () => {
      const response = {
        companions: [
          {
            name: 'Bilbo Baggins',
            type: 'character' as const,
            rarity: 'legendary' as const,
            description: 'A hobbit who goes on an adventure',
            role: 'Protagonist',
            traits: 'Brave, curious, resourceful',
            physicalDescription: 'Small hobbit with curly hair and bare feet',
            effects: [{ type: 'xp_boost', targetGenre: 'fantasy' }],
          },
          {
            name: 'Smaug',
            type: 'creature' as const,
            rarity: 'legendary' as const,
            description: 'A fearsome dragon',
            role: 'Antagonist',
            traits: 'Greedy, cunning, powerful',
            physicalDescription: 'Large red dragon with golden eyes',
            effects: [{ type: 'luck_boost' }, { type: 'drop_rate_boost' }],
          },
        ],
        researchConfidence: 'high' as const,
      };

      const result = parseResearchResponse(response, 'book-123');
      expect(result.companions).toHaveLength(2);
      expect(result.confidence).toBe('high');
      expect(result.companions[0].name).toBe('Bilbo Baggins');
      expect(result.companions[0].bookId).toBe('book-123');
      expect(result.companions[0].source).toBe('discovered');
    });

    it('handles empty response', () => {
      const result = parseResearchResponse({ companions: [], researchConfidence: 'low' }, 'book-123');
      expect(result.companions).toHaveLength(0);
      expect(result.confidence).toBe('low');
    });

    it('maps physicalDescription to companion', () => {
      const response = {
        companions: [{
          name: 'Hero',
          type: 'character' as const,
          rarity: 'legendary' as const,
          description: 'The protagonist',
          role: 'Main character',
          traits: 'Brave',
          physicalDescription: 'Tall warrior with silver armor',
          effects: [{ type: 'xp_boost' }],
        }],
        researchConfidence: 'high' as const,
      };

      const result = parseResearchResponse(response, 'book-123');
      expect(result.companions[0].physicalDescription).toBe('Tall warrior with silver armor');
    });

    it('parses effects and calculates magnitude', () => {
      const response = {
        companions: [{
          name: 'Wizard',
          type: 'character' as const,
          rarity: 'rare' as const,
          description: 'A wise wizard',
          role: 'Mentor',
          traits: 'Wise, magical',
          physicalDescription: 'Elderly man with long beard and robes',
          effects: [
            { type: 'xp_boost', targetGenre: 'fantasy' },
            { type: 'luck_boost' },
          ],
        }],
        researchConfidence: 'high' as const,
      };

      const result = parseResearchResponse(response, 'book-123');
      expect(result.companions[0].effects).toHaveLength(2);
      expect(result.companions[0].effects![0].type).toBe('xp_boost');
      expect(result.companions[0].effects![0].targetGenre).toBe('fantasy');
      expect(result.companions[0].effects![0].magnitude).toBeGreaterThan(0);
      expect(result.companions[0].effects![1].type).toBe('luck_boost');
      expect(result.companions[0].effects![1].magnitude).toBeGreaterThan(0);
    });

    it('filters out invalid effect types', () => {
      const response = {
        companions: [{
          name: 'Test',
          type: 'character' as const,
          rarity: 'common' as const,
          description: 'Test character',
          role: 'Test',
          traits: 'Test',
          physicalDescription: 'Test appearance',
          effects: [
            { type: 'xp_boost' },
            { type: 'invalid_effect' }, // Invalid
          ],
        }],
        researchConfidence: 'high' as const,
      };

      const result = parseResearchResponse(response, 'book-123');
      expect(result.companions[0].effects).toHaveLength(1);
      expect(result.companions[0].effects![0].type).toBe('xp_boost');
    });

    it('filters out completion_bonus for non-legendary companions', () => {
      const response = {
        companions: [{
          name: 'Test',
          type: 'character' as const,
          rarity: 'rare' as const,
          description: 'Test character',
          role: 'Test',
          traits: 'Test',
          physicalDescription: 'Test appearance',
          effects: [
            { type: 'xp_boost' },
            { type: 'completion_bonus' }, // Should be filtered for non-legendary
          ],
        }],
        researchConfidence: 'high' as const,
      };

      const result = parseResearchResponse(response, 'book-123');
      expect(result.companions[0].effects).toHaveLength(1);
      expect(result.companions[0].effects![0].type).toBe('xp_boost');
    });

    it('allows completion_bonus for legendary companions', () => {
      const response = {
        companions: [{
          name: 'Hero',
          type: 'character' as const,
          rarity: 'legendary' as const,
          description: 'The legendary hero',
          role: 'Protagonist',
          traits: 'Heroic',
          physicalDescription: 'Heroic appearance',
          effects: [
            { type: 'xp_boost' },
            { type: 'completion_bonus' },
          ],
        }],
        researchConfidence: 'high' as const,
      };

      const result = parseResearchResponse(response, 'book-123');
      expect(result.companions[0].effects).toHaveLength(2);
      expect(result.companions[0].effects!.some(e => e.type === 'completion_bonus')).toBe(true);
    });

    it('handles invalid genre by making effect global', () => {
      const response = {
        companions: [{
          name: 'Test',
          type: 'character' as const,
          rarity: 'common' as const,
          description: 'Test character',
          role: 'Test',
          traits: 'Test',
          physicalDescription: 'Test appearance',
          effects: [
            { type: 'xp_boost', targetGenre: 'invalid-genre' },
          ],
        }],
        researchConfidence: 'high' as const,
      };

      const result = parseResearchResponse(response, 'book-123');
      expect(result.companions[0].effects).toHaveLength(1);
      expect(result.companions[0].effects![0].targetGenre).toBeUndefined();
    });

    it('handles empty effects array', () => {
      const response = {
        companions: [{
          name: 'Test',
          type: 'character' as const,
          rarity: 'common' as const,
          description: 'Test character',
          role: 'Test',
          traits: 'Test',
          physicalDescription: 'Test appearance',
          effects: [],
        }],
        researchConfidence: 'high' as const,
      };

      const result = parseResearchResponse(response, 'book-123');
      expect(result.companions[0].effects).toBeUndefined();
    });
  });

  describe('assignCompanionQueues', () => {
    const mockCompanions: Companion[] = [
      { id: '1', bookId: 'b1', name: 'Hero', type: 'character', rarity: 'legendary', description: '', traits: '', visualDescription: '', imageUrl: null, source: 'discovered', unlockMethod: null, unlockedAt: null },
      { id: '2', bookId: 'b1', name: 'Villain', type: 'character', rarity: 'legendary', description: '', traits: '', visualDescription: '', imageUrl: null, source: 'discovered', unlockMethod: null, unlockedAt: null },
      { id: '3', bookId: 'b1', name: 'Sidekick', type: 'character', rarity: 'rare', description: '', traits: '', visualDescription: '', imageUrl: null, source: 'discovered', unlockMethod: null, unlockedAt: null },
      { id: '4', bookId: 'b1', name: 'Beast', type: 'creature', rarity: 'rare', description: '', traits: '', visualDescription: '', imageUrl: null, source: 'discovered', unlockMethod: null, unlockedAt: null },
      { id: '5', bookId: 'b1', name: 'Sword', type: 'object', rarity: 'rare', description: '', traits: '', visualDescription: '', imageUrl: null, source: 'discovered', unlockMethod: null, unlockedAt: null },
      { id: '6', bookId: 'b1', name: 'Guard1', type: 'character', rarity: 'common', description: '', traits: '', visualDescription: '', imageUrl: null, source: 'discovered', unlockMethod: null, unlockedAt: null },
      { id: '7', bookId: 'b1', name: 'Guard2', type: 'character', rarity: 'common', description: '', traits: '', visualDescription: '', imageUrl: null, source: 'discovered', unlockMethod: null, unlockedAt: null },
      { id: '8', bookId: 'b1', name: 'Guard3', type: 'character', rarity: 'common', description: '', traits: '', visualDescription: '', imageUrl: null, source: 'discovered', unlockMethod: null, unlockedAt: null },
    ];

    it('splits companions into reading-time and pool queues', () => {
      const result = assignCompanionQueues(mockCompanions);

      // Should have companions in both queues
      expect(result.readingTimeQueue.companions.length).toBeGreaterThan(0);
      expect(result.poolQueue.companions.length).toBeGreaterThan(0);

      // Total should equal input
      const total = result.readingTimeQueue.companions.length + result.poolQueue.companions.length;
      expect(total).toBe(mockCompanions.length);
    });

    it('ensures one legendary in reading-time queue', () => {
      const result = assignCompanionQueues(mockCompanions);
      const legendariesInReadingTime = result.readingTimeQueue.companions.filter(c => c.rarity === 'legendary');
      expect(legendariesInReadingTime.length).toBeGreaterThanOrEqual(1);
    });

    it('reserves one legendary for book completion', () => {
      const result = assignCompanionQueues(mockCompanions);
      const legendariesInPool = result.poolQueue.companions.filter(c => c.rarity === 'legendary');
      // At least one legendary should be in pool (for potential book completion)
      expect(legendariesInPool.length).toBeGreaterThanOrEqual(1);
    });

    it('randomizes order within queues', () => {
      // Run multiple times to verify randomization
      const results = Array.from({ length: 10 }, () => assignCompanionQueues(mockCompanions));
      const firstNames = results.map(r => r.readingTimeQueue.companions[0]?.name);
      // Not all first items should be the same (probabilistic but very likely)
      const uniqueFirstNames = new Set(firstNames);
      expect(uniqueFirstNames.size).toBeGreaterThan(1);
    });

    it('initializes nextGenerateIndex to 0', () => {
      const result = assignCompanionQueues(mockCompanions);
      expect(result.readingTimeQueue.nextGenerateIndex).toBe(0);
      expect(result.poolQueue.nextGenerateIndex).toBe(0);
    });

    describe('legendary designation', () => {
      it('designates completion and pool legendaries when 2+ legendaries exist', () => {
        const result = assignCompanionQueues(mockCompanions);

        // With 2 legendaries, both should be designated
        expect(result.completionLegendary).not.toBeNull();
        expect(result.poolLegendary).not.toBeNull();
        expect(result.completionLegendary?.rarity).toBe('legendary');
        expect(result.poolLegendary?.rarity).toBe('legendary');
        // They should be different companions
        expect(result.completionLegendary?.id).not.toBe(result.poolLegendary?.id);
      });

      it('only designates completionLegendary when exactly 1 legendary exists', () => {
        const singleLegendaryCompanions: Companion[] = [
          { id: '1', bookId: 'b1', name: 'Hero', type: 'character', rarity: 'legendary', description: '', traits: '', visualDescription: '', imageUrl: null, source: 'discovered', unlockMethod: null, unlockedAt: null },
          { id: '2', bookId: 'b1', name: 'Sidekick', type: 'character', rarity: 'rare', description: '', traits: '', visualDescription: '', imageUrl: null, source: 'discovered', unlockMethod: null, unlockedAt: null },
          { id: '3', bookId: 'b1', name: 'Guard', type: 'character', rarity: 'common', description: '', traits: '', visualDescription: '', imageUrl: null, source: 'discovered', unlockMethod: null, unlockedAt: null },
        ];

        const result = assignCompanionQueues(singleLegendaryCompanions);

        // Only completion legendary should be set
        expect(result.completionLegendary).not.toBeNull();
        expect(result.completionLegendary?.name).toBe('Hero');
        // No pool legendary when only 1 legendary exists
        expect(result.poolLegendary).toBeNull();
      });

      it('returns null for both when no legendaries exist', () => {
        const noLegendaryCompanions: Companion[] = [
          { id: '1', bookId: 'b1', name: 'Sidekick', type: 'character', rarity: 'rare', description: '', traits: '', visualDescription: '', imageUrl: null, source: 'discovered', unlockMethod: null, unlockedAt: null },
          { id: '2', bookId: 'b1', name: 'Guard', type: 'character', rarity: 'common', description: '', traits: '', visualDescription: '', imageUrl: null, source: 'discovered', unlockMethod: null, unlockedAt: null },
        ];

        const result = assignCompanionQueues(noLegendaryCompanions);

        expect(result.completionLegendary).toBeNull();
        expect(result.poolLegendary).toBeNull();
      });

      it('includes poolLegendary in poolQueue companions', () => {
        const result = assignCompanionQueues(mockCompanions);

        if (result.poolLegendary) {
          const poolLegendaryInQueue = result.poolQueue.companions.some(
            c => c.id === result.poolLegendary?.id
          );
          expect(poolLegendaryInQueue).toBe(true);
        }
      });
    });
  });
});
