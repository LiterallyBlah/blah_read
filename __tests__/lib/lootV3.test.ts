import {
  rollBoxTier,
  rollCategory,
  rollConsumableTier,
  rollCompanionRarity,
  rollConsumable,
  rollLoot,
  rollLootForTier,
  rollBonusDrop,
  rollBoxTierWithPity,
  PityState,
  PITY_BONUS_PER_MISS,
  PITY_HARD_CAP,
  BASE_CHECKPOINT_DROP_CHANCE,
  CHECKPOINT_INTERVAL_MINUTES,
  MINIMUM_SESSION_MINUTES,
  BOX_TIER_ODDS,
  CATEGORY_ODDS,
  CONSUMABLE_TIER_ODDS,
  COMPANION_RARITY_ODDS,
  LootResult,
} from '@/lib/lootV3';
import { LootBoxTier, CompanionRarity } from '@/lib/types';
import { ConsumableTier, getConsumablesByTier } from '@/lib/consumables';

describe('lootV3', () => {
  describe('odds tables', () => {
    it('should have box tier odds summing to 1', () => {
      const sum = BOX_TIER_ODDS.wood + BOX_TIER_ODDS.silver + BOX_TIER_ODDS.gold;
      expect(sum).toBeCloseTo(1.0);
    });

    it('should have category odds summing to 1 for each tier', () => {
      const tiers: LootBoxTier[] = ['wood', 'silver', 'gold'];
      tiers.forEach(tier => {
        const sum = CATEGORY_ODDS[tier].consumable + CATEGORY_ODDS[tier].companion;
        expect(sum).toBeCloseTo(1.0);
      });
    });

    it('should have consumable tier odds summing to 1 for each box tier', () => {
      const tiers: LootBoxTier[] = ['wood', 'silver', 'gold'];
      tiers.forEach(tier => {
        const sum =
          CONSUMABLE_TIER_ODDS[tier].weak +
          CONSUMABLE_TIER_ODDS[tier].medium +
          CONSUMABLE_TIER_ODDS[tier].strong;
        expect(sum).toBeCloseTo(1.0);
      });
    });

    it('should have companion rarity odds summing to 1 for each box tier', () => {
      const tiers: LootBoxTier[] = ['wood', 'silver', 'gold'];
      tiers.forEach(tier => {
        const sum =
          COMPANION_RARITY_ODDS[tier].common +
          COMPANION_RARITY_ODDS[tier].rare +
          COMPANION_RARITY_ODDS[tier].legendary;
        expect(sum).toBeCloseTo(1.0);
      });
    });
  });

  describe('rollBoxTier', () => {
    it('should return valid tier', () => {
      const tier = rollBoxTier(0);
      expect(['wood', 'silver', 'gold']).toContain(tier);
    });

    it('should bias toward better tiers with luck boost', () => {
      const trials = 1000;
      let goldCount0 = 0;
      let goldCount50 = 0;
      for (let i = 0; i < trials; i++) {
        if (rollBoxTier(0) === 'gold') goldCount0++;
        if (rollBoxTier(0.50) === 'gold') goldCount50++;
      }
      expect(goldCount50).toBeGreaterThan(goldCount0);
    });

    it('should return mostly wood boxes without luck boost', () => {
      const trials = 1000;
      let woodCount = 0;
      for (let i = 0; i < trials; i++) {
        if (rollBoxTier(0) === 'wood') woodCount++;
      }
      // With 70% odds, expect at least 60% wood
      expect(woodCount / trials).toBeGreaterThan(0.6);
    });

    it('should handle luck boost of 1 (max)', () => {
      const trials = 1000;
      let goldCount = 0;
      let woodCount = 0;
      for (let i = 0; i < trials; i++) {
        const tier = rollBoxTier(1.0);
        if (tier === 'gold') goldCount++;
        if (tier === 'wood') woodCount++;
      }
      // With max luck, wood should be nearly 0, gold should be ~16.7%
      // (redistributed proportionally from wood's 70%)
      expect(woodCount / trials).toBeLessThan(0.05);
      expect(goldCount / trials).toBeGreaterThan(0.12);
    });
  });

  describe('rollCategory', () => {
    it('should return consumable or companion', () => {
      const category = rollCategory('wood');
      expect(['consumable', 'companion']).toContain(category);
    });

    it('should favor companions more in gold boxes', () => {
      const trials = 1000;
      let companionWood = 0;
      let companionGold = 0;
      for (let i = 0; i < trials; i++) {
        if (rollCategory('wood') === 'companion') companionWood++;
        if (rollCategory('gold') === 'companion') companionGold++;
      }
      expect(companionGold / trials).toBeGreaterThan(companionWood / trials);
    });

    it('should favor consumables in wood boxes', () => {
      const trials = 1000;
      let consumableCount = 0;
      for (let i = 0; i < trials; i++) {
        if (rollCategory('wood') === 'consumable') consumableCount++;
      }
      // With 90% odds, expect at least 80% consumables
      expect(consumableCount / trials).toBeGreaterThan(0.8);
    });
  });

  describe('rollConsumableTier', () => {
    it('should return valid consumable tier', () => {
      const tier = rollConsumableTier('wood');
      expect(['weak', 'medium', 'strong']).toContain(tier);
    });

    it('should never return strong from wood box', () => {
      const trials = 100;
      for (let i = 0; i < trials; i++) {
        expect(rollConsumableTier('wood')).not.toBe('strong');
      }
    });

    it('should never return weak from gold box', () => {
      const trials = 100;
      for (let i = 0; i < trials; i++) {
        expect(rollConsumableTier('gold')).not.toBe('weak');
      }
    });

    it('should favor better tiers in better boxes', () => {
      const trials = 1000;
      let strongSilver = 0;
      let strongGold = 0;
      for (let i = 0; i < trials; i++) {
        if (rollConsumableTier('silver') === 'strong') strongSilver++;
        if (rollConsumableTier('gold') === 'strong') strongGold++;
      }
      expect(strongGold / trials).toBeGreaterThan(strongSilver / trials);
    });
  });

  describe('rollCompanionRarity', () => {
    it('should return valid companion rarity', () => {
      const rarity = rollCompanionRarity('wood');
      expect(['common', 'rare', 'legendary']).toContain(rarity);
    });

    it('should only return common from wood box', () => {
      const trials = 100;
      for (let i = 0; i < trials; i++) {
        expect(rollCompanionRarity('wood')).toBe('common');
      }
    });

    it('should never return legendary from silver box', () => {
      const trials = 100;
      for (let i = 0; i < trials; i++) {
        expect(rollCompanionRarity('silver')).not.toBe('legendary');
      }
    });

    it('should favor better rarities in better boxes', () => {
      const trials = 1000;
      let legendarySilver = 0;
      let legendaryGold = 0;
      for (let i = 0; i < trials; i++) {
        if (rollCompanionRarity('silver') === 'legendary') legendarySilver++;
        if (rollCompanionRarity('gold') === 'legendary') legendaryGold++;
      }
      // Silver should never get legendary, gold should sometimes
      expect(legendarySilver).toBe(0);
      expect(legendaryGold).toBeGreaterThan(0);
    });
  });

  describe('rollConsumable', () => {
    it('should return a valid consumable definition', () => {
      const consumable = rollConsumable('wood');
      expect(consumable).toBeDefined();
      expect(consumable.id).toBeDefined();
      expect(consumable.name).toBeDefined();
      expect(consumable.tier).toBeDefined();
    });

    it('should only return weak or medium consumables from wood box', () => {
      const trials = 100;
      for (let i = 0; i < trials; i++) {
        const consumable = rollConsumable('wood');
        expect(['weak', 'medium']).toContain(consumable.tier);
      }
    });

    it('should only return medium or strong consumables from gold box', () => {
      const trials = 100;
      for (let i = 0; i < trials; i++) {
        const consumable = rollConsumable('gold');
        expect(['medium', 'strong']).toContain(consumable.tier);
      }
    });
  });

  describe('rollLoot', () => {
    it('should return a valid LootResult', () => {
      const result = rollLoot(0);
      expect(result).toBeDefined();
      expect(['wood', 'silver', 'gold']).toContain(result.boxTier);
      expect(['consumable', 'companion']).toContain(result.category);
    });

    it('should include consumable for consumable category', () => {
      // Run until we get a consumable
      let result: LootResult;
      let attempts = 0;
      do {
        result = rollLoot(0);
        attempts++;
      } while (result.category !== 'consumable' && attempts < 100);

      expect(result.category).toBe('consumable');
      expect(result.consumable).toBeDefined();
      expect(result.companionRarity).toBeUndefined();
    });

    it('should include companionRarity for companion category', () => {
      // Run until we get a companion
      let result: LootResult;
      let attempts = 0;
      do {
        result = rollLoot(0);
        attempts++;
      } while (result.category !== 'companion' && attempts < 100);

      expect(result.category).toBe('companion');
      expect(result.companionRarity).toBeDefined();
      expect(result.consumable).toBeUndefined();
    });

    it('should accept luck boost parameter', () => {
      const trials = 1000;
      let goldCount0 = 0;
      let goldCount50 = 0;
      for (let i = 0; i < trials; i++) {
        if (rollLoot(0).boxTier === 'gold') goldCount0++;
        if (rollLoot(0.50).boxTier === 'gold') goldCount50++;
      }
      expect(goldCount50).toBeGreaterThan(goldCount0);
    });
  });

  describe('rollLootForTier', () => {
    it('should always return the specified tier', () => {
      const tiers: LootBoxTier[] = ['wood', 'silver', 'gold'];
      for (const tier of tiers) {
        for (let i = 0; i < 10; i++) {
          const result = rollLootForTier(tier);
          expect(result.boxTier).toBe(tier);
        }
      }
    });

    it('should respect tier-based loot rules for gold box', () => {
      // Gold boxes should never give weak consumables
      const trials = 50;
      for (let i = 0; i < trials; i++) {
        const result = rollLootForTier('gold');
        expect(result.boxTier).toBe('gold');
        if (result.consumable) {
          expect(result.consumable.tier).not.toBe('weak');
        }
      }
    });

    it('should respect tier-based loot rules for wood box', () => {
      // Wood boxes should only give common companions
      const trials = 50;
      for (let i = 0; i < trials; i++) {
        const result = rollLootForTier('wood');
        expect(result.boxTier).toBe('wood');
        if (result.companionRarity) {
          expect(result.companionRarity).toBe('common');
        }
      }
    });
  });

  describe('weightedRandom helper', () => {
    it('should produce statistically valid distributions', () => {
      // This tests the overall distribution across many rolls
      const trials = 10000;
      const results = { wood: 0, silver: 0, gold: 0 };

      for (let i = 0; i < trials; i++) {
        results[rollBoxTier(0)]++;
      }

      // With 70/25/5 odds, check distributions are within reasonable bounds
      // Allow 5% variance from expected
      expect(results.wood / trials).toBeGreaterThan(0.65);
      expect(results.wood / trials).toBeLessThan(0.75);
      expect(results.silver / trials).toBeGreaterThan(0.20);
      expect(results.silver / trials).toBeLessThan(0.30);
      expect(results.gold / trials).toBeGreaterThan(0.02);
      expect(results.gold / trials).toBeLessThan(0.08);
    });
  });

  describe('rollBonusDrop', () => {
    it('should return false with 0 drop rate', () => {
      let gotBonus = false;
      for (let i = 0; i < 100; i++) {
        if (rollBonusDrop(0)) gotBonus = true;
      }
      expect(gotBonus).toBe(false);
    });

    it('should sometimes return true with positive drop rate', () => {
      let bonusCount = 0;
      for (let i = 0; i < 100; i++) {
        if (rollBonusDrop(0.50)) bonusCount++;
      }
      expect(bonusCount).toBeGreaterThan(0);
      expect(bonusCount).toBeLessThan(100);
    });
  });

  describe('rollBoxTierWithPity', () => {
    it('should export pity constants', () => {
      expect(PITY_BONUS_PER_MISS).toBe(0.03);
      expect(PITY_HARD_CAP).toBe(25);
    });

    describe('checkpoint drop constants', () => {
      it('should export checkpoint constants', () => {
        expect(BASE_CHECKPOINT_DROP_CHANCE).toBe(0.01);
        expect(CHECKPOINT_INTERVAL_MINUTES).toBe(10);
        expect(MINIMUM_SESSION_MINUTES).toBe(5);
      });
    });

    it('should return gold at hard cap', () => {
      const pityState: PityState = { goldPityCounter: 25 };
      const result = rollBoxTierWithPity(0, 0, 0, pityState);
      expect(result.tier).toBe('gold');
      expect(result.newPityCounter).toBe(0); // Reset after gold
    });

    it('should reset pity counter on gold', () => {
      // With high pity, we have good gold chance
      let gotGold = false;
      for (let i = 0; i < 100; i++) {
        const result = rollBoxTierWithPity(0.5, 0, 0.5, { goldPityCounter: 24 });
        if (result.tier === 'gold') {
          expect(result.newPityCounter).toBe(0);
          gotGold = true;
          break;
        }
      }
      expect(gotGold).toBe(true);
    });

    it('should increment pity counter on non-gold', () => {
      // With 0 luck, mostly wood/silver
      let gotNonGold = false;
      for (let i = 0; i < 100; i++) {
        const result = rollBoxTierWithPity(0, 0, 0, { goldPityCounter: 5 });
        if (result.tier !== 'gold') {
          expect(result.newPityCounter).toBe(6);
          gotNonGold = true;
          break;
        }
      }
      expect(gotNonGold).toBe(true);
    });

    it('should apply legendary_luck to gold share', () => {
      const trials = 1000;
      let goldCount0 = 0;
      let goldCountHigh = 0;

      for (let i = 0; i < trials; i++) {
        if (rollBoxTierWithPity(0.3, 0, 0, { goldPityCounter: 0 }).tier === 'gold') goldCount0++;
        if (rollBoxTierWithPity(0.3, 0, 0.3, { goldPityCounter: 0 }).tier === 'gold') goldCountHigh++;
      }

      expect(goldCountHigh).toBeGreaterThan(goldCount0);
    });
  });
});
