import { openLootBoxV3 } from '@/lib/lootBoxV3';
import { LootBoxV3, UserProgress, Genre } from '@/lib/shared';

describe('openLootBoxV3', () => {
  const createBlankBox = (): LootBoxV3 => ({
    id: 'test-box',
    earnedAt: Date.now(),
    source: 'level_up',
    bookId: 'book-1',
  });

  const createLegacyBox = (tier: 'wood' | 'silver' | 'gold'): LootBoxV3 => ({
    id: 'test-box',
    tier,
    earnedAt: Date.now(),
    source: 'level_up',
    bookId: 'book-1',
  });

  const createProgress = (pityCounter: number = 0): UserProgress => ({
    totalXp: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    lastReadDate: null,
    lootItems: [],
    lootBoxes: { availableBoxes: [], openHistory: [] },
    booksFinished: 0,
    booksAdded: 0,
    totalHoursRead: 0,
    goldPityCounter: pityCounter,
  });

  it('should roll tier at open time for blank boxes', () => {
    const box = createBlankBox();
    const progress = createProgress(0);

    const result = openLootBoxV3(box, progress, [], []);

    expect(result.rolledTier).toBeDefined();
    expect(['wood', 'silver', 'gold']).toContain(result.rolledTier);
  });

  it('should use existing tier for legacy boxes', () => {
    const box = createLegacyBox('gold');
    const progress = createProgress(0);

    const result = openLootBoxV3(box, progress, [], []);

    expect(result.rolledTier).toBe('gold');
  });

  it('should update pity counter in returned progress', () => {
    const box = createBlankBox();
    const progress = createProgress(5);

    const result = openLootBoxV3(box, progress, [], []);

    if (result.rolledTier === 'gold') {
      expect(result.updatedProgress.goldPityCounter).toBe(0);
    } else {
      expect(result.updatedProgress.goldPityCounter).toBe(6);
    }
  });

  it('should guarantee gold at pity cap', () => {
    const box = createBlankBox();
    const progress = createProgress(25);

    const result = openLootBoxV3(box, progress, [], []);

    expect(result.rolledTier).toBe('gold');
    expect(result.updatedProgress.goldPityCounter).toBe(0);
  });
});

function createMinimalProgress(): UserProgress {
  return {
    totalXp: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    lastReadDate: null,
    lootItems: [],
    lootBoxes: { availableBoxes: [], openHistory: [] },
    booksFinished: 0,
    booksAdded: 0,
    totalHoursRead: 0,
    goldPityCounter: 0,
    pendingBoxUpgrade: false,
    pendingGuaranteedCompanion: false,
  };
}

describe('openLootBoxV3 with pending effects', () => {
  it('should upgrade box tier when pendingBoxUpgrade is true', () => {
    const box: LootBoxV3 = {
      id: 'test-box',
      tier: 'wood',
      earnedAt: Date.now(),
      source: 'level_up',
    };
    const progress: UserProgress = {
      ...createMinimalProgress(),
      pendingBoxUpgrade: true,
    };

    const result = openLootBoxV3(box, progress, [], []);

    expect(result.rolledTier).toBe('silver');
    expect(result.updatedProgress.pendingBoxUpgrade).toBe(false);
  });

  it('should upgrade silver to gold when pendingBoxUpgrade is true', () => {
    const box: LootBoxV3 = {
      id: 'test-box',
      tier: 'silver',
      earnedAt: Date.now(),
      source: 'level_up',
    };
    const progress: UserProgress = {
      ...createMinimalProgress(),
      pendingBoxUpgrade: true,
    };

    const result = openLootBoxV3(box, progress, [], []);

    expect(result.rolledTier).toBe('gold');
    expect(result.updatedProgress.pendingBoxUpgrade).toBe(false);
  });

  it('should keep gold as gold when pendingBoxUpgrade is true', () => {
    const box: LootBoxV3 = {
      id: 'test-box',
      tier: 'gold',
      earnedAt: Date.now(),
      source: 'level_up',
    };
    const progress: UserProgress = {
      ...createMinimalProgress(),
      pendingBoxUpgrade: true,
    };

    const result = openLootBoxV3(box, progress, [], []);

    expect(result.rolledTier).toBe('gold');
    expect(result.updatedProgress.pendingBoxUpgrade).toBe(false);
  });

  it('should force companion when pendingGuaranteedCompanion is true', () => {
    const box: LootBoxV3 = {
      id: 'test-box',
      tier: 'wood',
      earnedAt: Date.now(),
      source: 'level_up',
    };
    const progress: UserProgress = {
      ...createMinimalProgress(),
      pendingGuaranteedCompanion: true,
    };

    const originalRandom = Math.random;
    Math.random = () => 0.01;

    const result = openLootBoxV3(box, progress, [], [], { companionPoolSize: 5 });

    Math.random = originalRandom;

    expect(result.lootResult.category).toBe('companion');
    expect(result.updatedProgress.pendingGuaranteedCompanion).toBe(false);
  });

  it('should give consumable fallback when pool empty even with guaranteed companion', () => {
    const box: LootBoxV3 = {
      id: 'test-box',
      tier: 'wood',
      earnedAt: Date.now(),
      source: 'level_up',
    };
    const progress: UserProgress = {
      ...createMinimalProgress(),
      pendingGuaranteedCompanion: true,
    };

    const result = openLootBoxV3(box, progress, [], [], { companionPoolSize: 0 });

    expect(result.lootResult.category).toBe('consumable');
    expect(result.updatedProgress.pendingGuaranteedCompanion).toBe(true);
  });
});
