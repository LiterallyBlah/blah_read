# Async Companion Generation Design

## Overview

Decouple companion generation from book addition so users see the book page immediately. Google Books lookup happens first (fast), then companion research and image generation run in the background.

## Problem

Currently when a user adds a book via Kindle share link, they wait for the entire pipeline: parsing, Google Books lookup, companion research, and image generation. This can take 30+ seconds, during which the user sees only a loading spinner.

## Solution

### Flow Change

**Current (blocking):**
```
Kindle link → Parse → Google Books → Companion Research → Image Gen → Save → Show page
             └──────────────── User waits for all of this ────────────────┘
```

**New (async):**
```
Kindle link → Parse → Google Books → Save → Show page immediately
                                       └──→ Background: Research → Images → Update book
```

### User Experience

1. Book page loads in ~1-2 seconds (just Google Books lookup)
2. Companions section shows spinner: "Generating companions..."
3. Spinner disappears and companions appear when ready (typically 10-30 seconds)
4. If user navigates away and back, they see current state (spinner or completed)

## Data Model

**New field on `Book` type:**

```typescript
interface Book {
  // ... existing fields
  companions: BookCompanions | null;
  companionsPending?: boolean;  // NEW - true when background gen needed
}
```

**State transitions:**

| State | `companions` | `companionsPending` | UI Shows |
|-------|-------------|---------------------|----------|
| Just added | `null` | `true` | Spinner |
| Generating | `null` | `true` | Spinner |
| Complete | `{...}` | `false`/undefined | Companions |
| Failed (retry later) | `null` | `true` | Spinner (retries) |
| No API key | `null` | `false` | "Configure API key" |

## Implementation

### Files to Modify

| File | Change |
|------|--------|
| `lib/types.ts` | Add `companionsPending?: boolean` to Book |
| `lib/kindleShareProcessor.ts` | Remove companion/image steps, set `companionsPending` |
| `app/book/[id].tsx` | Detect pending state, trigger background generation, show spinner |

### New File

| `lib/companionBackgroundGenerator.ts` | Orchestrate background research + image generation |

### `lib/kindleShareProcessor.ts` Changes

- Remove companion research step
- Remove image generation step
- After Google Books enrichment, set `companionsPending: true` if API key exists
- Return immediately after saving book

### `app/book/[id].tsx` Changes

- On mount, check if `book.companionsPending === true`
- If pending, start generation in background (don't await in render)
- Track local state: `isGeneratingCompanions: boolean`
- When generation completes, update book in storage and refresh local state
- If fails, leave `companionsPending: true` (silent retry next visit)

### `lib/companionBackgroundGenerator.ts` (New)

```typescript
async function generateCompanionsInBackground(
  book: Book,
  settings: Settings,
  onComplete: (updatedBook: Book) => void
): Promise<void>
```

- Orchestrates research → image generation
- Calls `onComplete` with updated book when done
- Catches errors silently (leaves pending state for retry)

## Error Handling

**Network failure during generation:**
- Catch error, log via `debug.error()`
- Leave `companionsPending: true`
- Next time user opens book page, generation retries automatically

**User opens book while already generating:**
- Track in-progress state in memory/ref
- If already running, show spinner - don't start duplicate

**No API key configured:**
- Set `companionsPending: false` in processor (can't generate)
- Companions section shows nothing or prompt to configure

**User navigates away mid-generation:**
- Generation continues (promise keeps running)
- Book updated in storage when complete
- Next visit shows completed companions

**App killed mid-generation:**
- `companionsPending` still `true` in storage
- Next app launch and book visit retries generation

**Partial failure (research succeeds, images fail):**
- Save companions with `imageUrl: null`
- Image buffer system handles regeneration on next interaction

## UI States

**Companions section in book detail:**

```
isGeneratingCompanions = true:
┌─────────────────────────────┐
│  ◌ Generating companions... │
└─────────────────────────────┘

isGeneratingCompanions = false, companions exist:
┌─────────────────────────────┐
│ [img] [img] [img] [img]     │
│ [img] [img] [img] ...       │
└─────────────────────────────┘
```

## Testing

### Unit Tests

**`__tests__/lib/companionBackgroundGenerator.test.ts`:**
- Calls research and image generation in correct order
- Updates book with companions when successful
- Calls `onComplete` callback with updated book
- Catches errors and doesn't throw (silent failure)
- Leaves `companionsPending: true` on failure

**`__tests__/lib/kindleShareProcessor.test.ts` (update):**
- No longer calls companion research
- No longer calls image generation
- Sets `companionsPending: true` when API key exists
- Sets `companionsPending: false` when no API key

### Manual Testing Checklist

- [ ] Add book → page loads immediately with spinner in companions section
- [ ] Wait → spinner disappears, companions appear
- [ ] Navigate away during generation → generation continues
- [ ] Return to book → see completed companions
- [ ] Kill app during generation → reopen book → generation retries
- [ ] No API key → no spinner, no generation attempted
