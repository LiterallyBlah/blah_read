import { shouldTriggerLoot, rollLoot, LOOT_TABLE } from '@/lib/loot';

describe('loot', () => {
  it('triggers loot every 60 minutes of reading', () => {
    expect(shouldTriggerLoot(0, 3600)).toBe(true); // 0 -> 60 min
    expect(shouldTriggerLoot(3000, 3600)).toBe(true); // 50 -> 60 min
    expect(shouldTriggerLoot(3600, 7200)).toBe(true); // 60 -> 120 min
    expect(shouldTriggerLoot(0, 1800)).toBe(false); // 0 -> 30 min
  });

  it('does not trigger for same milestone', () => {
    expect(shouldTriggerLoot(3600, 3600)).toBe(false);
    expect(shouldTriggerLoot(3600, 4000)).toBe(false); // 60 -> 66 min, same milestone
  });

  it('triggers for multiple milestones crossed', () => {
    expect(shouldTriggerLoot(0, 7200)).toBe(true); // Crosses both 60 and 120
  });

  it('rollLoot returns a valid loot item', () => {
    const loot = rollLoot();
    expect(loot).toHaveProperty('id');
    expect(loot).toHaveProperty('name');
    expect(loot).toHaveProperty('icon');
    expect(loot).toHaveProperty('rarity');
    expect(loot).toHaveProperty('earnedAt');
    expect(['common', 'rare', 'epic', 'legendary']).toContain(loot.rarity);
  });

  it('LOOT_TABLE contains items for each rarity', () => {
    const rarities = LOOT_TABLE.map(item => item.rarity);
    expect(rarities).toContain('common');
    expect(rarities).toContain('rare');
    expect(rarities).toContain('epic');
    expect(rarities).toContain('legendary');
  });
});
