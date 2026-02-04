# lib/ Directory Restructure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reorganize 51 flat files in lib/ into 7 feature-based directories with barrel exports.

**Architecture:** Move files into domain directories (companion, rewards, books, consumables, storage, ui, shared), create index.ts barrel exports for each, and update all imports across the codebase.

**Tech Stack:** TypeScript, Expo Router, Jest

---

## Task 0: Remove Deprecated Files

**Files:**
- Delete: `lib/loot.ts`
- Delete: `__tests__/lib/loot.test.ts`
- Delete: `lib/companionGenerator.ts`
- Modify: `app/manual-entry.tsx:6` (inline loot functions)

**Step 1: Inline loot functions into manual-entry.tsx**

Replace the import at line 6:
```typescript
import { shouldTriggerLoot, rollLoot } from '@/lib/loot';
```

With the inlined functions (add after existing imports):
```typescript
import { LootItem } from '@/lib/types';

// Inlined from deprecated lib/loot.ts
const LOOT_INTERVAL = 3600;
const LOOT_TABLE: Omit<LootItem, 'id' | 'earnedAt'>[] = [
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

function shouldTriggerLoot(previousTime: number, newTime: number): boolean {
  const previousMilestones = Math.floor(previousTime / LOOT_INTERVAL);
  const newMilestones = Math.floor(newTime / LOOT_INTERVAL);
  return newMilestones > previousMilestones;
}

function rollLoot(): LootItem {
  const roll = Math.random() * 100;
  let rarity: LootItem['rarity'];
  if (roll < RARITY_WEIGHTS.legendary) rarity = 'legendary';
  else if (roll < RARITY_WEIGHTS.legendary + RARITY_WEIGHTS.epic) rarity = 'epic';
  else if (roll < RARITY_WEIGHTS.legendary + RARITY_WEIGHTS.epic + RARITY_WEIGHTS.rare) rarity = 'rare';
  else rarity = 'common';
  let pool = LOOT_TABLE.filter(item => item.rarity === rarity);
  if (pool.length === 0) pool = LOOT_TABLE.filter(item => item.rarity === 'common');
  if (pool.length === 0) throw new Error(`[loot] No items available for rarity: ${rarity}`);
  const item = pool[Math.floor(Math.random() * pool.length)];
  return { ...item, id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, earnedAt: Date.now() };
}
```

**Step 2: Delete deprecated files**

```bash
rm lib/loot.ts
rm __tests__/lib/loot.test.ts
rm lib/companionGenerator.ts
```

**Step 3: Run tests to verify nothing breaks**

```bash
npm test -- --testPathIgnorePatterns="loot.test"
```

**Step 4: Commit**

```bash
git add -A && git commit -m "chore: remove deprecated loot.ts and companionGenerator.ts

- Inline loot functions into manual-entry.tsx (only consumer)
- Delete lib/loot.ts and its test
- Delete lib/companionGenerator.ts (zero imports, marked @deprecated)"
```

---

## Task 1: Create shared/ Directory

**Files:**
- Create: `lib/shared/index.ts`
- Move: `lib/types.ts` → `lib/shared/types.ts`
- Move: `lib/genres.ts` → `lib/shared/genres.ts`
- Move: `lib/genreDetection.ts` → `lib/shared/genreDetection.ts`
- Move: `lib/debug.ts` → `lib/shared/debug.ts`
- Move: `lib/idGenerator.ts` → `lib/shared/idGenerator.ts`
- Move: `lib/streak.ts` → `lib/shared/streak.ts`
- Move: `lib/slotProgress.ts` → `lib/shared/slotProgress.ts`
- Move: `lib/nextMilestone.ts` → `lib/shared/nextMilestone.ts`
- Move: `lib/loadout.ts` → `lib/shared/loadout.ts`
- Move: `lib/imageGen.ts` → `lib/shared/imageGen.ts`
- Move: `lib/imageStorage.ts` → `lib/shared/imageStorage.ts`
- Move: `lib/imagePromptBuilder.ts` → `lib/shared/imagePromptBuilder.ts`
- Move: `lib/llm.ts` → `lib/shared/llm.ts`
- Move: `lib/openrouter.ts` → `lib/shared/openrouter.ts`
- Move: `lib/backgroundService.ts` → `lib/shared/backgroundService.ts`
- Move: `__tests__/lib/*.test.ts` → `__tests__/lib/shared/*.test.ts` (corresponding tests)

**Step 1: Create directory and move files**

```bash
mkdir -p lib/shared
mkdir -p __tests__/lib/shared

mv lib/types.ts lib/shared/
mv lib/genres.ts lib/shared/
mv lib/genreDetection.ts lib/shared/
mv lib/debug.ts lib/shared/
mv lib/idGenerator.ts lib/shared/
mv lib/streak.ts lib/shared/
mv lib/slotProgress.ts lib/shared/
mv lib/nextMilestone.ts lib/shared/
mv lib/loadout.ts lib/shared/
mv lib/imageGen.ts lib/shared/
mv lib/imageStorage.ts lib/shared/
mv lib/imagePromptBuilder.ts lib/shared/
mv lib/llm.ts lib/shared/
mv lib/openrouter.ts lib/shared/
mv lib/backgroundService.ts lib/shared/

mv __tests__/lib/types.test.ts __tests__/lib/shared/
mv __tests__/lib/genres.test.ts __tests__/lib/shared/
mv __tests__/lib/streak.test.ts __tests__/lib/shared/
mv __tests__/lib/slotProgress.test.ts __tests__/lib/shared/
mv __tests__/lib/nextMilestone.test.ts __tests__/lib/shared/
mv __tests__/lib/loadout.test.ts __tests__/lib/shared/
mv __tests__/lib/imageGen.test.ts __tests__/lib/shared/
mv __tests__/lib/imagePromptBuilder.test.ts __tests__/lib/shared/
mv __tests__/lib/llm.test.ts __tests__/lib/shared/
mv __tests__/lib/openrouter.test.ts __tests__/lib/shared/
mv __tests__/lib/backgroundService.test.ts __tests__/lib/shared/
```

**Step 2: Create barrel export**

Create `lib/shared/index.ts`:
```typescript
// Types
export * from './types';

// Utilities
export * from './genres';
export * from './genreDetection';
export * from './debug';
export * from './idGenerator';
export * from './streak';
export * from './slotProgress';
export * from './nextMilestone';
export * from './loadout';

// Image generation
export * from './imageGen';
export * from './imageStorage';
export * from './imagePromptBuilder';

// LLM
export * from './llm';
export * from './openrouter';

// Background
export * from './backgroundService';
```

**Step 3: Update internal imports within shared/**

Update imports in shared/ files that reference other shared/ files. Change:
- `from './types'` stays as is (already relative)
- `from '@/lib/types'` → `from './types'`
- `from '@/lib/genres'` → `from './genres'`
- etc.

**Step 4: Update all external imports**

Find and replace across codebase:
- `from '@/lib/types'` → `from '@/lib/shared'`
- `from '@/lib/genres'` → `from '@/lib/shared'`
- `from '@/lib/debug'` → `from '@/lib/shared'`
- `from '@/lib/idGenerator'` → `from '@/lib/shared'`
- `from '@/lib/streak'` → `from '@/lib/shared'`
- `from '@/lib/slotProgress'` → `from '@/lib/shared'`
- `from '@/lib/nextMilestone'` → `from '@/lib/shared'`
- `from '@/lib/loadout'` → `from '@/lib/shared'`
- `from '@/lib/imageGen'` → `from '@/lib/shared'`
- `from '@/lib/imageStorage'` → `from '@/lib/shared'`
- `from '@/lib/imagePromptBuilder'` → `from '@/lib/shared'`
- `from '@/lib/llm'` → `from '@/lib/shared'`
- `from '@/lib/openrouter'` → `from '@/lib/shared'`
- `from '@/lib/backgroundService'` → `from '@/lib/shared'`
- `from '@/lib/genreDetection'` → `from '@/lib/shared'`

For relative imports in other lib/ files:
- `from './types'` → `from './shared'`
- etc.

**Step 5: Update test imports**

Update `__tests__/lib/shared/*.test.ts` files:
- `from '@/lib/types'` → `from '@/lib/shared'`
- etc.

**Step 6: Run TypeScript check**

```bash
npx tsc --noEmit
```

**Step 7: Run tests**

```bash
npm test -- --testPathPattern="shared"
```

**Step 8: Commit**

```bash
git add -A && git commit -m "refactor: move shared utilities to lib/shared/"
```

---

## Task 2: Create storage/ Directory

**Files:**
- Create: `lib/storage/index.ts`
- Move: `lib/storage.ts` → `lib/storage/storage.ts`
- Move: `lib/migrations.ts` → `lib/storage/migrations.ts`
- Move: `lib/settings.ts` → `lib/storage/settings.ts`
- Move: `lib/timerPersistence.ts` → `lib/storage/timerPersistence.ts`
- Move: `lib/sessionRecovery.ts` → `lib/storage/sessionRecovery.ts`
- Move corresponding tests to `__tests__/lib/storage/`

**Step 1: Create directory and move files**

```bash
mkdir -p lib/storage
mkdir -p __tests__/lib/storage

mv lib/storage.ts lib/storage/
mv lib/migrations.ts lib/storage/
mv lib/settings.ts lib/storage/
mv lib/timerPersistence.ts lib/storage/
mv lib/sessionRecovery.ts lib/storage/

mv __tests__/lib/storage.test.ts __tests__/lib/storage/
mv __tests__/lib/migrations.test.ts __tests__/lib/storage/
mv __tests__/lib/settings.test.ts __tests__/lib/storage/
mv __tests__/lib/timerPersistence.test.ts __tests__/lib/storage/
mv __tests__/lib/sessionRecovery.test.ts __tests__/lib/storage/
```

**Step 2: Create barrel export**

Create `lib/storage/index.ts`:
```typescript
export * from './storage';
export * from './migrations';
export * from './settings';
export * from './timerPersistence';
export * from './sessionRecovery';
```

**Step 3: Update internal imports within storage/**

Files in storage/ that import from shared/ need updating:
- `from './types'` → `from '../shared'`
- `from '@/lib/types'` → `from '../shared'`

Files in storage/ that import from each other stay relative:
- `from './storage'` stays as is

**Step 4: Update all external imports**

Find and replace:
- `from '@/lib/storage'` → `from '@/lib/storage'` (no change needed, barrel handles it)
- `from '@/lib/migrations'` → `from '@/lib/storage'`
- `from '@/lib/settings'` → `from '@/lib/storage'`
- `from '@/lib/timerPersistence'` → `from '@/lib/storage'`
- `from '@/lib/sessionRecovery'` → `from '@/lib/storage'`

For relative imports in other lib/ files:
- `from './storage'` → `from './storage'` (barrel handles it)
- `from './migrations'` → `from './storage'`
- `from './settings'` → `from './storage'`
- etc.

**Step 5: Run TypeScript check**

```bash
npx tsc --noEmit
```

**Step 6: Run tests**

```bash
npm test -- --testPathPattern="storage"
```

**Step 7: Commit**

```bash
git add -A && git commit -m "refactor: move storage layer to lib/storage/"
```

---

## Task 3: Create consumables/ Directory

**Files:**
- Create: `lib/consumables/index.ts`
- Move: `lib/consumables.ts` → `lib/consumables/definitions.ts`
- Move: `lib/consumableManager.ts` → `lib/consumables/manager.ts`
- Move: `lib/instantConsumables.ts` → `lib/consumables/instant.ts`
- Move corresponding tests to `__tests__/lib/consumables/`

**Step 1: Create directory and move files**

```bash
mkdir -p lib/consumables
mkdir -p __tests__/lib/consumables

mv lib/consumables.ts lib/consumables/definitions.ts
mv lib/consumableManager.ts lib/consumables/manager.ts
mv lib/instantConsumables.ts lib/consumables/instant.ts

mv __tests__/lib/consumables.test.ts __tests__/lib/consumables/definitions.test.ts
mv __tests__/lib/consumableManager.test.ts __tests__/lib/consumables/manager.test.ts
mv __tests__/lib/instantConsumables.test.ts __tests__/lib/consumables/instant.test.ts
```

**Step 2: Create barrel export**

Create `lib/consumables/index.ts`:
```typescript
export * from './definitions';
export * from './manager';
export * from './instant';
```

**Step 3: Update internal imports within consumables/**

- `from './consumables'` → `from './definitions'`
- `from '@/lib/consumables'` → `from './definitions'`
- `from '@/lib/types'` → `from '../shared'`

**Step 4: Update all external imports**

Find and replace:
- `from '@/lib/consumables'` → `from '@/lib/consumables'` (barrel handles it)
- `from '@/lib/consumableManager'` → `from '@/lib/consumables'`
- `from '@/lib/instantConsumables'` → `from '@/lib/consumables'`

For relative imports:
- `from './consumables'` → `from './consumables'` (barrel)
- `from './consumableManager'` → `from './consumables'`
- `from './instantConsumables'` → `from './consumables'`

**Step 5: Run TypeScript check**

```bash
npx tsc --noEmit
```

**Step 6: Run tests**

```bash
npm test -- --testPathPattern="consumables"
```

**Step 7: Commit**

```bash
git add -A && git commit -m "refactor: move consumables to lib/consumables/"
```

---

## Task 4: Create books/ Directory

**Files:**
- Create: `lib/books/index.ts`
- Move: `lib/bookEnrichment.ts` → `lib/books/enrichment.ts`
- Move: `lib/bookLeveling.ts` → `lib/books/leveling.ts`
- Move: `lib/bookTier.ts` → `lib/books/tiers.ts`
- Move: `lib/kindleParser.ts` → `lib/books/kindleParser.ts`
- Move: `lib/kindleShareProcessor.ts` → `lib/books/kindleShareProcessor.ts`
- Move: `lib/googleBooks.ts` → `lib/books/googleBooks.ts`
- Move: `lib/openLibrary.ts` → `lib/books/openLibrary.ts`
- Move: `lib/isbn.ts` → `lib/books/isbn.ts`
- Move: `lib/ogScraper.ts` → `lib/books/ogScraper.ts`
- Move corresponding tests to `__tests__/lib/books/`

**Step 1: Create directory and move files**

```bash
mkdir -p lib/books
mkdir -p __tests__/lib/books

mv lib/bookEnrichment.ts lib/books/enrichment.ts
mv lib/bookLeveling.ts lib/books/leveling.ts
mv lib/bookTier.ts lib/books/tiers.ts
mv lib/kindleParser.ts lib/books/kindleParser.ts
mv lib/kindleShareProcessor.ts lib/books/kindleShareProcessor.ts
mv lib/googleBooks.ts lib/books/googleBooks.ts
mv lib/openLibrary.ts lib/books/openLibrary.ts
mv lib/isbn.ts lib/books/isbn.ts
mv lib/ogScraper.ts lib/books/ogScraper.ts

mv __tests__/lib/bookEnrichment.test.ts __tests__/lib/books/enrichment.test.ts
mv __tests__/lib/bookLeveling.test.ts __tests__/lib/books/leveling.test.ts
mv __tests__/lib/bookTier.test.ts __tests__/lib/books/tiers.test.ts
mv __tests__/lib/kindleParser.test.ts __tests__/lib/books/kindleParser.test.ts
mv __tests__/lib/kindleShareProcessor.test.ts __tests__/lib/books/kindleShareProcessor.test.ts
mv __tests__/lib/googleBooks.test.ts __tests__/lib/books/googleBooks.test.ts
mv __tests__/lib/openLibrary.test.ts __tests__/lib/books/openLibrary.test.ts
mv __tests__/lib/isbn.test.ts __tests__/lib/books/isbn.test.ts
mv __tests__/lib/ogScraper.test.ts __tests__/lib/books/ogScraper.test.ts
```

**Step 2: Create barrel export**

Create `lib/books/index.ts`:
```typescript
// Book data
export * from './enrichment';
export * from './leveling';
export * from './tiers';

// Parsers
export * from './kindleParser';
export * from './kindleShareProcessor';

// External APIs
export * from './googleBooks';
export * from './openLibrary';
export * from './isbn';
export * from './ogScraper';
```

**Step 3: Update internal imports within books/**

- `from '@/lib/types'` → `from '../shared'`
- `from '@/lib/genres'` → `from '../shared'`
- `from './googleBooks'` stays as is
- etc.

**Step 4: Update all external imports**

Find and replace:
- `from '@/lib/bookEnrichment'` → `from '@/lib/books'`
- `from '@/lib/bookLeveling'` → `from '@/lib/books'`
- `from '@/lib/bookTier'` → `from '@/lib/books'`
- `from '@/lib/kindleParser'` → `from '@/lib/books'`
- `from '@/lib/kindleShareProcessor'` → `from '@/lib/books'`
- `from '@/lib/googleBooks'` → `from '@/lib/books'`
- `from '@/lib/openLibrary'` → `from '@/lib/books'`
- `from '@/lib/isbn'` → `from '@/lib/books'`
- `from '@/lib/ogScraper'` → `from '@/lib/books'`

**Step 5: Run TypeScript check**

```bash
npx tsc --noEmit
```

**Step 6: Run tests**

```bash
npm test -- --testPathPattern="books"
```

**Step 7: Commit**

```bash
git add -A && git commit -m "refactor: move book-related files to lib/books/"
```

---

## Task 5: Create ui/ Directory

**Files:**
- Create: `lib/ui/index.ts`
- Move: `lib/theme.ts` → `lib/ui/theme.ts`
- Move: `lib/ThemeContext.tsx` → `lib/ui/ThemeContext.tsx`
- Move: `lib/dungeonAssets.ts` → `lib/ui/dungeonAssets.ts`
- Move: `lib/heroEvents.ts` → `lib/ui/heroEvents.ts`
- Move corresponding tests to `__tests__/lib/ui/`

**Step 1: Create directory and move files**

```bash
mkdir -p lib/ui
mkdir -p __tests__/lib/ui

mv lib/theme.ts lib/ui/
mv lib/ThemeContext.tsx lib/ui/
mv lib/dungeonAssets.ts lib/ui/
mv lib/heroEvents.ts lib/ui/

mv __tests__/lib/theme.test.ts __tests__/lib/ui/
mv __tests__/lib/dungeonAssets.test.ts __tests__/lib/ui/
mv __tests__/lib/heroEvents.test.ts __tests__/lib/ui/
```

Note: Also move `__tests__/lib/themes/` directory if it exists:
```bash
mv __tests__/lib/themes __tests__/lib/ui/
```

**Step 2: Create barrel export**

Create `lib/ui/index.ts`:
```typescript
export * from './theme';
export { ThemeProvider, useTheme } from './ThemeContext';
export * from './dungeonAssets';
export * from './heroEvents';
```

**Step 3: Update internal imports within ui/**

- `from '@/lib/types'` → `from '../shared'`
- `from './theme'` stays as is

**Step 4: Update all external imports**

Find and replace:
- `from '@/lib/theme'` → `from '@/lib/ui'`
- `from '@/lib/ThemeContext'` → `from '@/lib/ui'`
- `from '@/lib/dungeonAssets'` → `from '@/lib/ui'`
- `from '@/lib/heroEvents'` → `from '@/lib/ui'`

**Step 5: Run TypeScript check**

```bash
npx tsc --noEmit
```

**Step 6: Run tests**

```bash
npm test -- --testPathPattern="ui"
```

**Step 7: Commit**

```bash
git add -A && git commit -m "refactor: move UI utilities to lib/ui/"
```

---

## Task 6: Create companion/ Directory

**Files:**
- Create: `lib/companion/index.ts`
- Move: `lib/companionOrchestrator.ts` → `lib/companion/orchestrator.ts`
- Move: `lib/companionResearch.ts` → `lib/companion/research.ts`
- Move: `lib/companionEffects.ts` → `lib/companion/effects.ts`
- Move: `lib/companionUnlock.ts` → `lib/companion/unlock.ts`
- Move: `lib/companionImageQueue.ts` → `lib/companion/imageQueue.ts`
- Move: `lib/companionBackgroundGenerator.ts` → `lib/companion/backgroundGenerator.ts`
- Move: `lib/inspiredCompanions.ts` → `lib/companion/inspired.ts`
- Move corresponding tests to `__tests__/lib/companion/`

**Step 1: Create directory and move files**

```bash
mkdir -p lib/companion
mkdir -p __tests__/lib/companion

mv lib/companionOrchestrator.ts lib/companion/orchestrator.ts
mv lib/companionResearch.ts lib/companion/research.ts
mv lib/companionEffects.ts lib/companion/effects.ts
mv lib/companionUnlock.ts lib/companion/unlock.ts
mv lib/companionImageQueue.ts lib/companion/imageQueue.ts
mv lib/companionBackgroundGenerator.ts lib/companion/backgroundGenerator.ts
mv lib/inspiredCompanions.ts lib/companion/inspired.ts

mv __tests__/lib/companionOrchestrator.test.ts __tests__/lib/companion/orchestrator.test.ts
mv __tests__/lib/companionResearch.test.ts __tests__/lib/companion/research.test.ts
mv __tests__/lib/companionEffects.test.ts __tests__/lib/companion/effects.test.ts
mv __tests__/lib/companionUnlock.test.ts __tests__/lib/companion/unlock.test.ts
mv __tests__/lib/companionImageQueue.test.ts __tests__/lib/companion/imageQueue.test.ts
mv __tests__/lib/companionBackgroundGenerator.test.ts __tests__/lib/companion/backgroundGenerator.test.ts
mv __tests__/lib/inspiredCompanions.test.ts __tests__/lib/companion/inspired.test.ts
```

**Step 2: Create barrel export**

Create `lib/companion/index.ts`:
```typescript
export * from './orchestrator';
export * from './research';
export * from './effects';
export * from './unlock';
export * from './imageQueue';
export * from './backgroundGenerator';
export * from './inspired';
```

**Step 3: Update internal imports within companion/**

- `from '@/lib/types'` → `from '../shared'`
- `from '@/lib/settings'` → `from '../storage'`
- `from '@/lib/genres'` → `from '../shared'`
- `from '@/lib/companionEffects'` → `from './effects'`
- `from '@/lib/companionResearch'` → `from './research'`
- `from '@/lib/inspiredCompanions'` → `from './inspired'`
- etc.

**Step 4: Update all external imports**

Find and replace:
- `from '@/lib/companionOrchestrator'` → `from '@/lib/companion'`
- `from '@/lib/companionResearch'` → `from '@/lib/companion'`
- `from '@/lib/companionEffects'` → `from '@/lib/companion'`
- `from '@/lib/companionUnlock'` → `from '@/lib/companion'`
- `from '@/lib/companionImageQueue'` → `from '@/lib/companion'`
- `from '@/lib/companionBackgroundGenerator'` → `from '@/lib/companion'`
- `from '@/lib/inspiredCompanions'` → `from '@/lib/companion'`

**Step 5: Run TypeScript check**

```bash
npx tsc --noEmit
```

**Step 6: Run tests**

```bash
npm test -- --testPathPattern="companion"
```

**Step 7: Commit**

```bash
git add -A && git commit -m "refactor: move companion system to lib/companion/"
```

---

## Task 7: Create rewards/ Directory

**Files:**
- Create: `lib/rewards/index.ts`
- Move: `lib/sessionRewards.ts` → `lib/rewards/sessionRewards.ts`
- Move: `lib/sessionResultsData.ts` → `lib/rewards/sessionResultsData.ts`
- Move: `lib/lootV3.ts` → `lib/rewards/lootV3.ts`
- Move: `lib/lootBox.ts` → `lib/rewards/lootBox.ts`
- Move: `lib/lootBoxV3.ts` → `lib/rewards/lootBoxV3.ts`
- Move: `lib/xp.ts` → `lib/rewards/xp.ts`
- Move corresponding tests to `__tests__/lib/rewards/`

**Step 1: Create directory and move files**

```bash
mkdir -p lib/rewards
mkdir -p __tests__/lib/rewards

mv lib/sessionRewards.ts lib/rewards/
mv lib/sessionResultsData.ts lib/rewards/
mv lib/lootV3.ts lib/rewards/
mv lib/lootBox.ts lib/rewards/
mv lib/lootBoxV3.ts lib/rewards/
mv lib/xp.ts lib/rewards/

mv __tests__/lib/sessionRewards.test.ts __tests__/lib/rewards/
mv __tests__/lib/sessionResultsData.test.ts __tests__/lib/rewards/
mv __tests__/lib/lootV3.test.ts __tests__/lib/rewards/
mv __tests__/lib/lootBox.test.ts __tests__/lib/rewards/
mv __tests__/lib/lootBoxV3.test.ts __tests__/lib/rewards/
mv __tests__/lib/xp.test.ts __tests__/lib/rewards/
```

**Step 2: Create barrel export**

Create `lib/rewards/index.ts`:
```typescript
export * from './sessionRewards';
export * from './sessionResultsData';
export * from './lootV3';
export * from './lootBox';
export * from './lootBoxV3';
export * from './xp';
```

**Step 3: Update internal imports within rewards/**

- `from '@/lib/types'` → `from '../shared'`
- `from '@/lib/companionEffects'` → `from '../companion'`
- `from '@/lib/consumableManager'` → `from '../consumables'`
- `from '@/lib/bookLeveling'` → `from '../books'`
- `from '@/lib/genres'` → `from '../shared'`
- `from './lootV3'` stays as is
- etc.

**Step 4: Update all external imports**

Find and replace:
- `from '@/lib/sessionRewards'` → `from '@/lib/rewards'`
- `from '@/lib/sessionResultsData'` → `from '@/lib/rewards'`
- `from '@/lib/lootV3'` → `from '@/lib/rewards'`
- `from '@/lib/lootBox'` → `from '@/lib/rewards'`
- `from '@/lib/lootBoxV3'` → `from '@/lib/rewards'`
- `from '@/lib/xp'` → `from '@/lib/rewards'`

**Step 5: Run TypeScript check**

```bash
npx tsc --noEmit
```

**Step 6: Run tests**

```bash
npm test -- --testPathPattern="rewards"
```

**Step 7: Commit**

```bash
git add -A && git commit -m "refactor: move rewards system to lib/rewards/"
```

---

## Task 8: Final Cleanup & Verification

**Step 1: Verify lib/ is clean**

```bash
ls lib/
```

Expected output:
```
books/
companion/
consumables/
rewards/
shared/
storage/
ui/
```

**Step 2: Check for orphaned files**

```bash
ls lib/*.ts lib/*.tsx 2>/dev/null
```

Expected: No output (all files moved)

**Step 3: Run full test suite**

```bash
npm test
```

Expected: All tests pass

**Step 4: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors

**Step 5: Start the app**

```bash
npm start
```

Verify app launches without runtime errors.

**Step 6: Final commit**

```bash
git add -A && git commit -m "refactor: complete lib/ directory restructure

Reorganized 51 flat files into 7 feature directories:
- shared/ (15 files) - types, utilities, image gen, LLM
- storage/ (5 files) - persistence layer
- consumables/ (3 files) - consumable system
- books/ (9 files) - book data, enrichment, APIs
- ui/ (4 files) - theme, assets, events
- companion/ (7 files) - companion lifecycle
- rewards/ (6 files) - loot, XP, session processing

Each directory has a barrel export (index.ts) for clean imports."
```

---

## Summary

| Task | Domain | Files Moved | Tests Moved |
|------|--------|-------------|-------------|
| 0 | Cleanup | -2 deleted | -1 deleted |
| 1 | shared/ | 15 | 11 |
| 2 | storage/ | 5 | 5 |
| 3 | consumables/ | 3 | 3 |
| 4 | books/ | 9 | 9 |
| 5 | ui/ | 4 | 3+ |
| 6 | companion/ | 7 | 7 |
| 7 | rewards/ | 6 | 6 |

**Total: 49 files reorganized into 7 directories**
