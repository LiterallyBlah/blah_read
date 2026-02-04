# lib/ Directory Restructure Design

## Problem

The `lib/` directory has grown to 51 flat files, making code discoverability difficult. Related files are scattered (e.g., 8 companion files, 4 loot files), and it's unclear which files are current vs deprecated.

## Solution

Restructure `lib/` into feature-based directories with barrel exports, and remove deprecated code.

## Directory Structure

```
lib/
├── companion/           # 7 files - companion lifecycle
│   ├── index.ts         # barrel export (public API)
│   ├── orchestrator.ts  # was companionOrchestrator.ts
│   ├── research.ts      # was companionResearch.ts
│   ├── effects.ts       # was companionEffects.ts
│   ├── unlock.ts        # was companionUnlock.ts
│   ├── imageQueue.ts    # was companionImageQueue.ts
│   ├── backgroundGenerator.ts  # was companionBackgroundGenerator.ts
│   └── inspired.ts      # was inspiredCompanions.ts
│
├── rewards/             # 7 files - loot, XP, session processing
│   ├── index.ts
│   ├── sessionRewards.ts
│   ├── sessionResultsData.ts
│   ├── lootV3.ts
│   ├── lootBox.ts
│   ├── lootBoxV3.ts
│   └── xp.ts
│
├── books/               # 10 files - metadata, progression, external APIs
│   ├── index.ts
│   ├── enrichment.ts    # was bookEnrichment.ts
│   ├── leveling.ts      # was bookLeveling.ts
│   ├── tiers.ts         # was bookTier.ts
│   ├── kindleParser.ts
│   ├── kindleShareProcessor.ts
│   ├── googleBooks.ts
│   ├── openLibrary.ts
│   ├── isbn.ts
│   └── ogScraper.ts
│
├── consumables/         # 3 files
│   ├── index.ts
│   ├── definitions.ts   # was consumables.ts
│   ├── manager.ts       # was consumableManager.ts
│   └── instant.ts       # was instantConsumables.ts
│
├── storage/             # 5 files
│   ├── index.ts
│   ├── storage.ts
│   ├── migrations.ts
│   ├── settings.ts
│   └── timerPersistence.ts
│
├── ui/                  # 5 files - theme & display helpers
│   ├── index.ts
│   ├── theme.ts
│   ├── ThemeContext.tsx
│   ├── dungeonAssets.ts
│   └── heroEvents.ts
│
└── shared/              # 11 files - truly cross-cutting utilities
    ├── index.ts
    ├── types.ts
    ├── genres.ts
    ├── genreDetection.ts
    ├── debug.ts
    ├── idGenerator.ts
    ├── streak.ts
    ├── slotProgress.ts
    ├── nextMilestone.ts
    ├── loadout.ts
    ├── imageGen.ts
    ├── imageStorage.ts
    ├── imagePromptBuilder.ts
    ├── llm.ts
    └── backgroundService.ts
```

## Files to Remove

| File | Lines | Reason |
|------|-------|--------|
| `companionGenerator.ts` | 45 | Marked `@deprecated`, zero imports |
| `loot.ts` | 49 | Superseded by lootV3, inline functions into manual-entry.tsx |

Associated test files will also be removed.

## Barrel Export Pattern

Each directory gets an `index.ts` that exports the public API:

```typescript
// lib/companion/index.ts
export { orchestrateCompanionResearch, shouldRunCompanionResearch } from './orchestrator';
export { calculateActiveEffects, canEquipCompanion, GLOBAL_EFFECT_MAGNITUDES } from './effects';
export { unlockCompanion, selectUnlockRarity } from './unlock';
export { queueCompanionImage, processImageQueue } from './imageQueue';
export { generateCompanionInBackground } from './backgroundGenerator';
export { generateInspiredCompanions } from './inspired';
```

## Import Changes

Before:
```typescript
import { calculateActiveEffects } from '../lib/companionEffects';
import { unlockCompanion } from '../lib/companionUnlock';
import { orchestrateCompanionResearch } from '../lib/companionOrchestrator';
```

After:
```typescript
import { calculateActiveEffects, unlockCompanion, orchestrateCompanionResearch } from '../lib/companion';
```

Cross-domain imports remain explicit:
```typescript
// In rewards/sessionRewards.ts
import { calculateActiveEffects } from '../companion';
import { getActiveEffects, tickConsumables } from '../consumables';
import { processReadingTime } from '../books';
```

## Migration Order

Migrate in dependency order to minimize broken imports:

1. `shared/` - no dependencies on other domains
2. `storage/` - depends only on shared
3. `consumables/` - depends on shared
4. `books/` - depends on shared
5. `ui/` - depends on shared
6. `companion/` - depends on shared, storage, books
7. `rewards/` - depends on all (move last)

## Implementation Steps

### Step 0: Remove Dead Code
1. Inline `shouldTriggerLoot` and `rollLoot` from `loot.ts` into `app/manual-entry.tsx`
2. Delete `lib/loot.ts` and `__tests__/lib/loot.test.ts`
3. Delete `lib/companionGenerator.ts` (and test if exists)
4. Commit: "chore: remove deprecated loot.ts and companionGenerator.ts"

### Step 1-7: Migrate Each Domain
For each domain in order:
1. Create directory with `index.ts`
2. Move files into directory (with renames as noted)
3. Update internal imports within the domain
4. Create barrel exports in `index.ts`
5. Update imports in other lib/ files
6. Update imports in app/ and components/
7. Update imports in __tests__/
8. Run tests
9. Commit: "refactor: move X domain to lib/X/"

### Step 8: Final Cleanup
1. Verify no orphaned files in lib/
2. Run full test suite
3. Final commit: "refactor: complete lib/ restructure"

## What This Does NOT Include

- No logic changes to any file
- No refactoring of sessionRewards.ts (separate effort)
- No consolidation of loot systems (separate effort)
- No backward compatibility stubs

## Risk Mitigation

- TypeScript will catch broken imports at compile time
- Run tests after each domain migration
- Commit after each domain for easy bisect if needed
- No logic changes = no behavioral regressions

## Success Criteria

- All 51 files organized into 7 feature directories
- All tests pass
- No runtime errors
- Imports use barrel exports where appropriate
- Zero deprecated files remain
