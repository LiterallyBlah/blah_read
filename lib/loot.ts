import { LootItem } from './types';

const LOOT_INTERVAL = 3600; // 60 minutes in seconds

export const LOOT_TABLE: Omit<LootItem, 'id' | 'earnedAt'>[] = [
  { name: 'Hourglass', icon: 'hourglass', rarity: 'common' },
  { name: 'Scroll', icon: 'scroll', rarity: 'common' },
  { name: 'Quill', icon: 'quill', rarity: 'common' },
  { name: 'Bookmark', icon: 'bookmark', rarity: 'rare' },
  { name: 'Tome', icon: 'book', rarity: 'rare' },
  { name: 'Crystal', icon: 'crystal', rarity: 'epic' },
  { name: 'Crown', icon: 'crown', rarity: 'epic' },
  { name: 'Dragon Scale', icon: 'dragon', rarity: 'legendary' },
];

const RARITY_WEIGHTS = { common: 60, rare: 25, epic: 12, legendary: 3 };

export function shouldTriggerLoot(previousTime: number, newTime: number): boolean {
  const previousMilestones = Math.floor(previousTime / LOOT_INTERVAL);
  const newMilestones = Math.floor(newTime / LOOT_INTERVAL);
  return newMilestones > previousMilestones;
}

export function rollLoot(): LootItem {
  const roll = Math.random() * 100;
  let rarity: LootItem['rarity'];

  if (roll < RARITY_WEIGHTS.legendary) rarity = 'legendary';
  else if (roll < RARITY_WEIGHTS.legendary + RARITY_WEIGHTS.epic) rarity = 'epic';
  else if (roll < RARITY_WEIGHTS.legendary + RARITY_WEIGHTS.epic + RARITY_WEIGHTS.rare) rarity = 'rare';
  else rarity = 'common';

  const pool = LOOT_TABLE.filter(item => item.rarity === rarity);
  const item = pool[Math.floor(Math.random() * pool.length)];

  return { ...item, id: Date.now().toString(), earnedAt: Date.now() };
}
