# Async Companion Generation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Decouple companion generation from book addition so users see the book page immediately after Google Books lookup.

**Architecture:** Book is saved with `companionsPending: true` after enrichment. Book detail page detects this flag, shows spinner, and triggers background generation. When complete, book is updated and UI refreshes silently.

**Tech Stack:** React Native/Expo, TypeScript, Jest, AsyncStorage

---

### Task 1: Add companionsPending field to Book type

**Files:**
- Modify: `lib/types.ts:8-30`
- Test: `__tests__/lib/kindleShareProcessor.test.ts` (existing tests will validate)

**Step 1: Add the field to Book interface**

In `lib/types.ts`, add `companionsPending?: boolean` to the Book interface after the `companions` field:

```typescript
export interface Book {
  id: string;
  title: string;
  coverUrl: string | null;
  synopsis: string | null;
  sourceUrl: string | null;
  status: BookStatus;
  totalReadingTime: number;
  createdAt: number;
  finishedAt?: number;
  companions?: BookCompanions;
  companionsPending?: boolean;  // ADD THIS LINE
  // Legacy field for migration
  companion?: Companion;
  // ... rest of fields
}
```

**Step 2: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: No errors (field is optional, so no breaking changes)

**Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add companionsPending field to Book type"
```

---

### Task 2: Update kindleShareProcessor to set companionsPending

**Files:**
- Modify: `lib/kindleShareProcessor.ts`
- Test: `__tests__/lib/kindleShareProcessor.test.ts`

**Step 1: Write the failing test - sets companionsPending when API key exists**

Add to `__tests__/lib/kindleShareProcessor.test.ts`:

```typescript
it('sets companionsPending to true when API key is configured', async () => {
  const { settings } = require('@/lib/settings');
  (settings.get as jest.Mock).mockResolvedValue({
    apiKey: 'test-api-key',
    googleBooksApiKey: null
  });

  (parseKindleShareText as jest.Mock).mockReturnValue({
    title: 'Test Book',
    authors: ['Test Author'],
    asin: 'B123456789',
    sourceUrl: 'https://read.amazon.com/...',
  });
  (storage.findDuplicateBook as jest.Mock).mockResolvedValue(null);
  (enrichBookData as jest.Mock).mockResolvedValue({
    coverUrl: 'https://example.com/cover.jpg',
    synopsis: 'A great book',
    pageCount: 300,
    genres: ['Fiction'],
    source: 'google',
  });
  (storage.saveBook as jest.Mock).mockResolvedValue(undefined);

  const result = await processKindleShare('valid share text', {});

  expect(result.success).toBe(true);
  expect(result.book?.companionsPending).toBe(true);
  expect(result.book?.companions).toBeUndefined();
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern="kindleShareProcessor" --testNamePattern="sets companionsPending"`
Expected: FAIL - `companionsPending` is undefined

**Step 3: Write test - companionsPending false when no API key**

Add to test file:

```typescript
it('sets companionsPending to false when no API key configured', async () => {
  const { settings } = require('@/lib/settings');
  (settings.get as jest.Mock).mockResolvedValue({
    apiKey: null,
    googleBooksApiKey: null
  });

  (parseKindleShareText as jest.Mock).mockReturnValue({
    title: 'Test Book',
    authors: ['Test Author'],
    asin: 'B123456789',
    sourceUrl: 'https://read.amazon.com/...',
  });
  (storage.findDuplicateBook as jest.Mock).mockResolvedValue(null);
  (enrichBookData as jest.Mock).mockResolvedValue({
    coverUrl: 'https://example.com/cover.jpg',
    synopsis: 'A great book',
    pageCount: 300,
    genres: ['Fiction'],
    source: 'google',
  });
  (storage.saveBook as jest.Mock).mockResolvedValue(undefined);

  const result = await processKindleShare('valid share text', {});

  expect(result.success).toBe(true);
  expect(result.book?.companionsPending).toBe(false);
});
```

**Step 4: Write test - no longer calls companion research**

Add to test file:

```typescript
it('does not call companion research or image generation', async () => {
  const { settings } = require('@/lib/settings');
  (settings.get as jest.Mock).mockResolvedValue({
    apiKey: 'test-api-key',
    googleBooksApiKey: null
  });

  (parseKindleShareText as jest.Mock).mockReturnValue({
    title: 'Test Book',
    authors: ['Test Author'],
    asin: 'B123456789',
    sourceUrl: 'https://read.amazon.com/...',
  });
  (storage.findDuplicateBook as jest.Mock).mockResolvedValue(null);
  (enrichBookData as jest.Mock).mockResolvedValue({
    coverUrl: 'https://example.com/cover.jpg',
    synopsis: 'A great book',
    pageCount: 300,
    genres: ['Fiction'],
    source: 'google',
  });
  (storage.saveBook as jest.Mock).mockResolvedValue(undefined);

  const steps: string[] = [];
  await processKindleShare('valid share text', {
    onProgress: (step) => steps.push(step),
  });

  // Should NOT include researching or generating-images steps
  expect(steps).not.toContain('researching');
  expect(steps).not.toContain('generating-images');
});
```

**Step 5: Implement the changes**

In `lib/kindleShareProcessor.ts`:

1. Remove imports for companion orchestration and image generation (lines 6-8):
```typescript
// DELETE these lines:
// import { orchestrateCompanionResearch, shouldRunCompanionResearch } from './companionOrchestrator';
// import { generateBufferedImages } from './companionImageQueue';
// import { generateImageForCompanion } from './imageGen';
```

2. Update ProcessingStep type (line 11) - remove 'researching' and 'generating-images':
```typescript
export type ProcessingStep = 'parsing' | 'checking-duplicate' | 'enriching' | 'saving';
```

3. After creating the book object (around line 108), set `companionsPending`:
```typescript
  const book: Book = {
    id: Date.now().toString(),
    title: parsed.title,
    authors: parsed.authors,
    asin: parsed.asin,
    coverUrl: enrichment.coverUrl,
    synopsis: enrichment.synopsis,
    pageCount: enrichment.pageCount,
    genres: enrichment.genres,
    publisher: enrichment.publisher,
    publishedDate: enrichment.publishedDate,
    sourceUrl: parsed.sourceUrl,
    source: 'kindle-share',
    status: 'to_read',
    totalReadingTime: 0,
    createdAt: Date.now(),
    metadataSynced: enrichment.source !== 'none',
    companionsPending: !!config.apiKey,  // ADD THIS LINE
  };
  debug.log('kindle', 'Book object created', { id: book.id, companionsPending: book.companionsPending });
```

4. Delete the entire companion research section (lines 111-157) - everything from `// Step 5: Research companions` through the closing brace of the else block.

**Step 6: Run tests to verify they pass**

Run: `npm test -- --testPathPattern="kindleShareProcessor"`
Expected: All tests PASS

**Step 7: Commit**

```bash
git add lib/kindleShareProcessor.ts __tests__/lib/kindleShareProcessor.test.ts
git commit -m "feat: skip companion generation in processor, set companionsPending flag"
```

---

### Task 3: Create companionBackgroundGenerator module

**Files:**
- Create: `lib/companionBackgroundGenerator.ts`
- Create: `__tests__/lib/companionBackgroundGenerator.test.ts`

**Step 1: Write the failing test - successful generation**

Create `__tests__/lib/companionBackgroundGenerator.test.ts`:

```typescript
import { generateCompanionsInBackground } from '@/lib/companionBackgroundGenerator';
import { Book, BookCompanions } from '@/lib/types';

jest.mock('@/lib/companionOrchestrator');
jest.mock('@/lib/companionImageQueue');
jest.mock('@/lib/imageGen');
jest.mock('@/lib/settings');
jest.mock('@/lib/debug', () => ({
  debug: {
    log: jest.fn(),
    error: jest.fn(),
    time: jest.fn(),
    timeEnd: jest.fn(),
  },
}));

import { orchestrateCompanionResearch } from '@/lib/companionOrchestrator';
import { generateBufferedImages } from '@/lib/companionImageQueue';
import { generateImageForCompanion } from '@/lib/imageGen';
import { settings } from '@/lib/settings';

describe('companionBackgroundGenerator', () => {
  const mockBook: Book = {
    id: 'book-123',
    title: 'Test Book',
    authors: ['Test Author'],
    coverUrl: null,
    synopsis: 'A test synopsis',
    sourceUrl: null,
    status: 'to_read',
    totalReadingTime: 0,
    createdAt: Date.now(),
    companionsPending: true,
  };

  const mockCompanions: BookCompanions = {
    researchComplete: true,
    researchConfidence: 'high',
    readingTimeQueue: { companions: [], nextGenerateIndex: 0 },
    poolQueue: { companions: [], nextGenerateIndex: 0 },
    unlockedCompanions: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (settings.get as jest.Mock).mockResolvedValue({
      apiKey: 'test-api-key',
      imageModel: 'test-model',
      imageSize: '1K',
      llmModel: 'test-llm',
    });
  });

  it('calls research and image generation, then onComplete with updated book', async () => {
    (orchestrateCompanionResearch as jest.Mock).mockResolvedValue(mockCompanions);
    (generateBufferedImages as jest.Mock).mockResolvedValue(mockCompanions);

    const onComplete = jest.fn();

    await generateCompanionsInBackground(mockBook, onComplete);

    expect(orchestrateCompanionResearch).toHaveBeenCalledWith({
      bookId: mockBook.id,
      title: mockBook.title,
      author: mockBook.authors?.[0],
      synopsis: mockBook.synopsis,
    });
    expect(generateBufferedImages).toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
      id: mockBook.id,
      companions: mockCompanions,
      companionsPending: false,
    }));
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern="companionBackgroundGenerator"`
Expected: FAIL - module does not exist

**Step 3: Write minimal implementation**

Create `lib/companionBackgroundGenerator.ts`:

```typescript
import { Book, Companion } from './types';
import { orchestrateCompanionResearch } from './companionOrchestrator';
import { generateBufferedImages } from './companionImageQueue';
import { generateImageForCompanion } from './imageGen';
import { settings } from './settings';
import { debug } from './debug';

/**
 * Generate companions for a book in the background.
 * This is called from the book detail page when companionsPending is true.
 *
 * @param book - The book to generate companions for
 * @param onComplete - Callback with the updated book when generation finishes
 */
export async function generateCompanionsInBackground(
  book: Book,
  onComplete: (updatedBook: Book) => void
): Promise<void> {
  debug.log('background', `Starting companion generation for "${book.title}"`);

  const config = await settings.get();

  if (!config.apiKey) {
    debug.log('background', 'No API key, skipping generation');
    onComplete({ ...book, companionsPending: false });
    return;
  }

  try {
    // Step 1: Research companions
    debug.time('background', 'companion-research');
    const companions = await orchestrateCompanionResearch({
      bookId: book.id,
      title: book.title,
      author: book.authors?.[0],
      synopsis: book.synopsis,
    });
    debug.timeEnd('background', 'companion-research');

    // Step 2: Generate images
    debug.time('background', 'image-generation');
    const generateImage = async (companion: Companion) => {
      try {
        return await generateImageForCompanion(companion, config.apiKey!, {
          model: config.imageModel,
          imageSize: config.imageSize,
          llmModel: config.llmModel,
        });
      } catch (error) {
        debug.error('background', `Image generation failed for "${companion.name}"`, error);
        return null;
      }
    };

    const companionsWithImages = await generateBufferedImages(companions, generateImage);
    debug.timeEnd('background', 'image-generation');

    // Step 3: Return updated book
    const updatedBook: Book = {
      ...book,
      companions: companionsWithImages,
      companionsPending: false,
    };

    debug.log('background', `Companion generation complete for "${book.title}"`);
    onComplete(updatedBook);
  } catch (error) {
    debug.error('background', `Companion generation failed for "${book.title}"`, error);
    // Leave companionsPending: true so it retries on next visit
    // Don't call onComplete - the book state remains unchanged
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPattern="companionBackgroundGenerator"`
Expected: PASS

**Step 5: Write test - handles errors silently**

Add to test file:

```typescript
it('catches errors and does not call onComplete (leaves pending for retry)', async () => {
  (orchestrateCompanionResearch as jest.Mock).mockRejectedValue(new Error('API failed'));

  const onComplete = jest.fn();

  await generateCompanionsInBackground(mockBook, onComplete);

  expect(onComplete).not.toHaveBeenCalled();
});
```

**Step 6: Run test to verify it passes**

Run: `npm test -- --testPathPattern="companionBackgroundGenerator"`
Expected: All tests PASS

**Step 7: Write test - skips when no API key**

Add to test file:

```typescript
it('calls onComplete with companionsPending: false when no API key', async () => {
  (settings.get as jest.Mock).mockResolvedValue({ apiKey: null });

  const onComplete = jest.fn();

  await generateCompanionsInBackground(mockBook, onComplete);

  expect(orchestrateCompanionResearch).not.toHaveBeenCalled();
  expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
    companionsPending: false,
  }));
});
```

**Step 8: Run all tests**

Run: `npm test -- --testPathPattern="companionBackgroundGenerator"`
Expected: All tests PASS

**Step 9: Commit**

```bash
git add lib/companionBackgroundGenerator.ts __tests__/lib/companionBackgroundGenerator.test.ts
git commit -m "feat: add companionBackgroundGenerator module"
```

---

### Task 4: Update book detail page to trigger background generation

**Files:**
- Modify: `app/book/[id].tsx`

**Step 1: Add imports and state**

At top of file, add import:

```typescript
import { generateCompanionsInBackground } from '@/lib/companionBackgroundGenerator';
```

Inside the component, add state for tracking generation:

```typescript
const [isGeneratingCompanions, setIsGeneratingCompanions] = useState(false);
const generationStartedRef = useRef(false);
```

Add `useRef` to the React import at top:

```typescript
import { useEffect, useState, useRef } from 'react';
```

**Step 2: Add effect to trigger background generation**

After the existing `useEffect` for `loadBook`, add:

```typescript
useEffect(() => {
  if (book?.companionsPending && !isGeneratingCompanions && !generationStartedRef.current) {
    generationStartedRef.current = true;
    setIsGeneratingCompanions(true);

    generateCompanionsInBackground(book, async (updatedBook) => {
      await storage.saveBook(updatedBook);
      setBook(updatedBook);
      setIsGeneratingCompanions(false);
      generationStartedRef.current = false;
    });
  }
}, [book?.companionsPending, book?.id]);
```

**Step 3: Update companion section UI to show spinner**

Find the companion section (around line 338). Replace the else block for "No companion data yet" with logic that shows spinner when generating:

Replace this block:
```typescript
) : (
  // No companion data yet
  <>
    <Text style={styles.sectionLabel}>companions_</Text>
    <Text style={styles.lockedText}>
      companions will be researched when adding books_
    </Text>
  </>
)}
```

With:
```typescript
) : (
  // No companion data yet - show spinner if generating
  <>
    <Text style={styles.sectionLabel}>companions_</Text>
    {isGeneratingCompanions ? (
      <View style={styles.generatingContainer}>
        <ActivityIndicator size="small" color={colors.textMuted} />
        <Text style={styles.generatingText}>generating companions...</Text>
      </View>
    ) : (
      <Text style={styles.lockedText}>
        companions will be researched when adding books_
      </Text>
    )}
  </>
)}
```

**Step 4: Add ActivityIndicator import**

Update the react-native import at top of file:

```typescript
import { View, Text, Image, Pressable, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
```

**Step 5: Add styles for generating state**

In `createStyles` function, add:

```typescript
generatingContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing(2),
},
generatingText: {
  color: colors.textMuted,
  fontFamily: FONTS.mono,
  fontSize: fontSize('small'),
  letterSpacing: letterSpacing('tight'),
},
```

**Step 6: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 7: Commit**

```bash
git add app/book/[id].tsx
git commit -m "feat: trigger background companion generation from book detail page"
```

---

### Task 5: Update existing kindleShareProcessor tests

**Files:**
- Modify: `__tests__/lib/kindleShareProcessor.test.ts`

**Step 1: Update test for processing steps**

The test "calls onProgress for each processing step" currently expects 'researching' and 'generating-images' might be in the steps. Update to verify they are NOT present:

Find this test and update the expectations:

```typescript
it('calls onProgress for each processing step', async () => {
  const steps: ProcessingStep[] = [];

  (parseKindleShareText as jest.Mock).mockReturnValue({
    title: 'Test Book',
    authors: ['Test Author'],
    asin: 'B123456789',
    sourceUrl: 'https://read.amazon.com/...',
  });
  (storage.findDuplicateBook as jest.Mock).mockResolvedValue(null);
  (enrichBookData as jest.Mock).mockResolvedValue({
    coverUrl: 'https://example.com/cover.jpg',
    synopsis: 'A great book',
    pageCount: 300,
    genres: ['Fiction'],
    source: 'google',
  });
  (storage.saveBook as jest.Mock).mockResolvedValue(undefined);

  await processKindleShare('valid share text', {
    onProgress: (step) => steps.push(step),
  });

  expect(steps).toContain('parsing');
  expect(steps).toContain('checking-duplicate');
  expect(steps).toContain('enriching');
  expect(steps).toContain('saving');
  // Should NOT include these anymore:
  expect(steps).not.toContain('researching');
  expect(steps).not.toContain('generating-images');
});
```

**Step 2: Run all processor tests**

Run: `npm test -- --testPathPattern="kindleShareProcessor"`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add __tests__/lib/kindleShareProcessor.test.ts
git commit -m "test: update kindleShareProcessor tests for async companion generation"
```

---

### Task 6: Run full test suite and verify

**Step 1: Run all tests**

Run: `npm test`
Expected: All tests PASS

**Step 2: Check for TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Final commit if any fixes needed**

If any fixes were needed, commit them:
```bash
git add -A
git commit -m "fix: resolve test/type issues from async companion generation"
```
