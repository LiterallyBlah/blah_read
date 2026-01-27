import {
  getCompanionsNeedingImages,
  shouldGenerateMoreImages,
  READING_TIME_BUFFER,
  POOL_BUFFER,
} from '@/lib/companionImageQueue';
import type { BookCompanions, Companion } from '@/lib/types';

const createCompanion = (
  id: string,
  imageUrl: string | null
): Companion => ({
  id,
  bookId: 'book-1',
  name: `Companion ${id}`,
  type: 'character',
  rarity: 'common',
  description: '',
  traits: '',
  visualDescription: 'A pixel character',
  imageUrl,
  source: 'discovered',
  unlockMethod: null,
  unlockedAt: null,
});

describe('companionImageQueue', () => {
  describe('getCompanionsNeedingImages', () => {
    it('returns companions without images up to buffer limit', () => {
      const companions: BookCompanions = {
        researchComplete: true,
        researchConfidence: 'high',
        readingTimeQueue: {
          companions: [
            createCompanion('1', null),
            createCompanion('2', null),
            createCompanion('3', null),
          ],
          nextGenerateIndex: 0,
        },
        poolQueue: {
          companions: [
            createCompanion('4', null),
            createCompanion('5', null),
            createCompanion('6', null),
            createCompanion('7', null),
          ],
          nextGenerateIndex: 0,
        },
        unlockedCompanions: [],
      };

      const result = getCompanionsNeedingImages(companions);

      // Should get READING_TIME_BUFFER from reading queue
      expect(result.readingTime.length).toBe(READING_TIME_BUFFER);
      // Should get POOL_BUFFER from pool queue
      expect(result.pool.length).toBe(POOL_BUFFER);
    });

    it('skips companions that already have images', () => {
      const companions: BookCompanions = {
        researchComplete: true,
        researchConfidence: 'high',
        readingTimeQueue: {
          companions: [
            createCompanion('1', 'http://example.com/1.png'),
            createCompanion('2', null),
          ],
          nextGenerateIndex: 1,
        },
        poolQueue: {
          companions: [],
          nextGenerateIndex: 0,
        },
        unlockedCompanions: [],
      };

      const result = getCompanionsNeedingImages(companions);
      expect(result.readingTime.length).toBe(1);
      expect(result.readingTime[0].id).toBe('2');
    });
  });

  describe('shouldGenerateMoreImages', () => {
    it('returns true when buffer is depleted', () => {
      const companions: BookCompanions = {
        researchComplete: true,
        researchConfidence: 'high',
        readingTimeQueue: {
          companions: [
            createCompanion('1', null),
            createCompanion('2', null),
          ],
          nextGenerateIndex: 0,
        },
        poolQueue: {
          companions: [
            createCompanion('3', null),
          ],
          nextGenerateIndex: 0,
        },
        unlockedCompanions: [],
      };

      expect(shouldGenerateMoreImages(companions)).toBe(true);
    });

    it('returns false when buffers are full', () => {
      const companions: BookCompanions = {
        researchComplete: true,
        researchConfidence: 'high',
        readingTimeQueue: {
          companions: [
            createCompanion('1', 'http://example.com/1.png'),
            createCompanion('2', 'http://example.com/2.png'),
          ],
          nextGenerateIndex: 2,
        },
        poolQueue: {
          companions: [
            createCompanion('3', 'http://example.com/3.png'),
            createCompanion('4', 'http://example.com/4.png'),
            createCompanion('5', 'http://example.com/5.png'),
          ],
          nextGenerateIndex: 3,
        },
        unlockedCompanions: [],
      };

      expect(shouldGenerateMoreImages(companions)).toBe(false);
    });
  });
});
