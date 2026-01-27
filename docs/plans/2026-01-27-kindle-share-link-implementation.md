# Kindle Share Link Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add books to library by sharing from Kindle app or pasting a Kindle share link, with automatic metadata enrichment and companion generation.

**Architecture:** Parse Kindle share text to extract title/author/ASIN, enrich via Google Books API (OpenLibrary fallback), create book record, navigate to detail screen, auto-generate companion with progress steps UI.

**Tech Stack:** React Native/Expo, AsyncStorage, Google Books API, OpenLibrary API, OpenRouter (existing), expo-router

---

## Task 1: Kindle Share Text Parser

**Files:**
- Create: `lib/kindleParser.ts`
- Test: `__tests__/lib/kindleParser.test.ts`

**Step 1: Write the failing tests**

```typescript
// __tests__/lib/kindleParser.test.ts
import { parseKindleShareText, isKindleShareText } from '@/lib/kindleParser';

describe('kindleParser', () => {
  const validShareText = `I think you might like this book – "Power (Buryoku Book 1)" by Aaron Oster, Richard Sashigane.

Start reading it for free: https://read.amazon.co.uk/kp/kshare?asin=B07WNJ7FTQ&id=na3mclw4jvdlvigiojnkaga2sq&ref_=r_sa_glf_b_0_hdrw_ss_AAu4AAA`;

  describe('isKindleShareText', () => {
    it('returns true for valid Kindle share text', () => {
      expect(isKindleShareText(validShareText)).toBe(true);
    });

    it('returns true for text with read.amazon.com domain', () => {
      const usShare = validShareText.replace('read.amazon.co.uk', 'read.amazon.com');
      expect(isKindleShareText(usShare)).toBe(true);
    });

    it('returns false for random text', () => {
      expect(isKindleShareText('Hello world')).toBe(false);
    });

    it('returns false for non-Kindle Amazon links', () => {
      expect(isKindleShareText('Check out https://www.amazon.com/dp/B07WNJ7FTQ')).toBe(false);
    });
  });

  describe('parseKindleShareText', () => {
    it('extracts title from quoted text', () => {
      const result = parseKindleShareText(validShareText);
      expect(result?.title).toBe('Power (Buryoku Book 1)');
    });

    it('extracts single author', () => {
      const singleAuthor = `I think you might like this book – "Test Book" by John Smith.
Start reading it for free: https://read.amazon.com/kp/kshare?asin=B123456789`;
      const result = parseKindleShareText(singleAuthor);
      expect(result?.authors).toEqual(['John Smith']);
    });

    it('extracts multiple authors', () => {
      const result = parseKindleShareText(validShareText);
      expect(result?.authors).toEqual(['Aaron Oster', 'Richard Sashigane']);
    });

    it('extracts ASIN from URL', () => {
      const result = parseKindleShareText(validShareText);
      expect(result?.asin).toBe('B07WNJ7FTQ');
    });

    it('extracts source URL', () => {
      const result = parseKindleShareText(validShareText);
      expect(result?.sourceUrl).toContain('read.amazon.co.uk');
    });

    it('returns null for invalid text', () => {
      expect(parseKindleShareText('Not a Kindle share')).toBeNull();
    });

    it('handles title with special characters', () => {
      const special = `I think you might like this book – "The King's Dark Tidings: Book 1 – Free the Darkness" by Kel Kade.
Start reading it for free: https://read.amazon.com/kp/kshare?asin=B00PW2MXXW`;
      const result = parseKindleShareText(special);
      expect(result?.title).toBe("The King's Dark Tidings: Book 1 – Free the Darkness");
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- __tests__/lib/kindleParser.test.ts`
Expected: FAIL - module not found

**Step 3: Write minimal implementation**

```typescript
// lib/kindleParser.ts
export interface KindleParsedData {
  title: string;
  authors: string[];
  asin: string;
  sourceUrl: string;
}

/**
 * Check if text looks like a Kindle share
 */
export function isKindleShareText(text: string): boolean {
  return text.includes('read.amazon.co') || text.includes('read.amazon.com');
}

/**
 * Parse Kindle share text to extract book details
 *
 * Expected format:
 * I think you might like this book – "[TITLE]" by [AUTHORS].
 * Start reading it for free: https://read.amazon.../asin=[ASIN]...
 */
export function parseKindleShareText(text: string): KindleParsedData | null {
  if (!isKindleShareText(text)) {
    return null;
  }

  // Extract title between quotes (handle smart quotes too)
  const titleMatch = text.match(/[""]([^""]+)[""]/);
  if (!titleMatch) {
    return null;
  }
  const title = titleMatch[1];

  // Extract authors between "by " and "."
  const authorMatch = text.match(/[""][^""]+[""] by ([^.]+)\./);
  if (!authorMatch) {
    return null;
  }
  const authors = authorMatch[1].split(',').map(a => a.trim());

  // Extract ASIN from URL
  const asinMatch = text.match(/asin=([A-Z0-9]{10})/i);
  if (!asinMatch) {
    return null;
  }
  const asin = asinMatch[1];

  // Extract full URL
  const urlMatch = text.match(/(https:\/\/read\.amazon\.[^\s]+)/);
  const sourceUrl = urlMatch ? urlMatch[1] : '';

  return {
    title,
    authors,
    asin,
    sourceUrl,
  };
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- __tests__/lib/kindleParser.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add lib/kindleParser.ts __tests__/lib/kindleParser.test.ts
git commit -m "feat: add Kindle share text parser"
```

---

## Task 2: Extend Book Type

**Files:**
- Modify: `lib/types.ts`

**Step 1: Read current types file**

Review `lib/types.ts` to understand current Book interface.

**Step 2: Add new fields to Book interface**

```typescript
// lib/types.ts
export type BookStatus = 'to_read' | 'reading' | 'finished';

export interface Book {
  id: string;
  title: string;
  authors?: string[];              // ADD: array of authors
  asin?: string;                   // ADD: Amazon ASIN
  coverUrl: string | null;
  synopsis: string | null;
  pageCount?: number | null;       // ADD: page count from API
  genres?: string[];               // ADD: categories/genres
  publisher?: string | null;       // ADD: publisher name
  publishedDate?: string | null;   // ADD: publication date
  sourceUrl: string | null;
  source?: 'kindle-share' | 'manual' | 'url';  // ADD: how book was added
  status: BookStatus;
  totalReadingTime: number;
  createdAt: number;
  finishedAt?: number;
  metadataSynced?: boolean;        // ADD: whether API enrichment succeeded
  companion?: Companion;
}
```

**Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: extend Book type with author, ASIN, metadata fields"
```

---

## Task 3: OpenLibrary API Integration

**Files:**
- Create: `lib/openLibrary.ts`
- Test: `__tests__/lib/openLibrary.test.ts`

**Step 1: Write the failing tests**

```typescript
// __tests__/lib/openLibrary.test.ts
import { parseOpenLibraryResponse, buildOpenLibraryCoverUrl } from '@/lib/openLibrary';

describe('openLibrary', () => {
  describe('parseOpenLibraryResponse', () => {
    it('extracts book data from search response', () => {
      const response = {
        docs: [{
          title: 'Test Book',
          author_name: ['Test Author'],
          cover_i: 12345,
          number_of_pages_median: 300,
          subject: ['Fiction', 'Fantasy'],
          publisher: ['Test Publisher'],
          first_publish_year: 2020,
        }],
      };
      const result = parseOpenLibraryResponse(response);
      expect(result?.title).toBe('Test Book');
      expect(result?.authors).toEqual(['Test Author']);
      expect(result?.coverId).toBe(12345);
      expect(result?.pageCount).toBe(300);
    });

    it('returns null for empty results', () => {
      expect(parseOpenLibraryResponse({ docs: [] })).toBeNull();
    });

    it('handles missing optional fields', () => {
      const response = {
        docs: [{
          title: 'Minimal Book',
        }],
      };
      const result = parseOpenLibraryResponse(response);
      expect(result?.title).toBe('Minimal Book');
      expect(result?.authors).toEqual([]);
      expect(result?.coverId).toBeNull();
    });
  });

  describe('buildOpenLibraryCoverUrl', () => {
    it('builds cover URL from cover ID', () => {
      const url = buildOpenLibraryCoverUrl(12345, 'L');
      expect(url).toBe('https://covers.openlibrary.org/b/id/12345-L.jpg');
    });

    it('returns null for null cover ID', () => {
      expect(buildOpenLibraryCoverUrl(null, 'L')).toBeNull();
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- __tests__/lib/openLibrary.test.ts`
Expected: FAIL - module not found

**Step 3: Write minimal implementation**

```typescript
// lib/openLibrary.ts
const SEARCH_URL = 'https://openlibrary.org/search.json';

export interface OpenLibraryResult {
  title: string;
  authors: string[];
  coverId: number | null;
  pageCount: number | null;
  genres: string[];
  publisher: string | null;
  publishedYear: number | null;
}

export function parseOpenLibraryResponse(response: any): OpenLibraryResult | null {
  if (!response.docs?.length) {
    return null;
  }

  const doc = response.docs[0];
  return {
    title: doc.title || 'Unknown Title',
    authors: doc.author_name || [],
    coverId: doc.cover_i || null,
    pageCount: doc.number_of_pages_median || null,
    genres: doc.subject?.slice(0, 5) || [],
    publisher: doc.publisher?.[0] || null,
    publishedYear: doc.first_publish_year || null,
  };
}

export function buildOpenLibraryCoverUrl(
  coverId: number | null,
  size: 'S' | 'M' | 'L' = 'L'
): string | null {
  if (!coverId) {
    return null;
  }
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
}

export async function searchOpenLibrary(
  title: string,
  author?: string
): Promise<OpenLibraryResult | null> {
  const params = new URLSearchParams({ title, limit: '1' });
  if (author) {
    params.set('author', author);
  }

  const response = await fetch(`${SEARCH_URL}?${params}`);
  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return parseOpenLibraryResponse(data);
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- __tests__/lib/openLibrary.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add lib/openLibrary.ts __tests__/lib/openLibrary.test.ts
git commit -m "feat: add OpenLibrary API integration"
```

---

## Task 4: Book Enrichment Service

**Files:**
- Modify: `lib/googleBooks.ts` (extend interface)
- Create: `lib/bookEnrichment.ts`
- Test: `__tests__/lib/bookEnrichment.test.ts`

**Step 1: Extend Google Books response interface**

```typescript
// lib/googleBooks.ts - extend the existing interface
export interface GoogleBookResult {
  title: string;
  authors?: string[];              // ADD
  coverUrl: string | null;
  description: string | null;
  pageCount?: number | null;       // ADD
  categories?: string[];           // ADD
  publisher?: string | null;       // ADD
  publishedDate?: string | null;   // ADD
}

export function parseGoogleBooksResponse(response: any): GoogleBookResult | null {
  if (!response.items?.length) return null;

  const book = response.items[0].volumeInfo;
  return {
    title: book.title || 'Unknown Title',
    authors: book.authors || [],
    coverUrl: book.imageLinks?.thumbnail || book.imageLinks?.smallThumbnail || null,
    description: book.description || null,
    pageCount: book.pageCount || null,
    categories: book.categories || [],
    publisher: book.publisher || null,
    publishedDate: book.publishedDate || null,
  };
}
```

**Step 2: Write failing tests for enrichment service**

```typescript
// __tests__/lib/bookEnrichment.test.ts
import { enrichBookData, EnrichmentResult } from '@/lib/bookEnrichment';

// Mock the API modules
jest.mock('@/lib/googleBooks', () => ({
  searchGoogleBooks: jest.fn(),
}));

jest.mock('@/lib/openLibrary', () => ({
  searchOpenLibrary: jest.fn(),
  buildOpenLibraryCoverUrl: jest.fn((id, size) =>
    id ? `https://covers.openlibrary.org/b/id/${id}-${size}.jpg` : null
  ),
}));

import { searchGoogleBooks } from '@/lib/googleBooks';
import { searchOpenLibrary } from '@/lib/openLibrary';

describe('bookEnrichment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns Google Books data when available', async () => {
    (searchGoogleBooks as jest.Mock).mockResolvedValue({
      title: 'Power',
      authors: ['Aaron Oster'],
      coverUrl: 'https://books.google.com/cover.jpg',
      description: 'A cultivation story',
      pageCount: 400,
      categories: ['Fantasy'],
    });

    const result = await enrichBookData('Power', 'Aaron Oster');

    expect(result.coverUrl).toBe('https://books.google.com/cover.jpg');
    expect(result.synopsis).toBe('A cultivation story');
    expect(result.pageCount).toBe(400);
    expect(result.source).toBe('google');
  });

  it('falls back to OpenLibrary when Google Books fails', async () => {
    (searchGoogleBooks as jest.Mock).mockResolvedValue(null);
    (searchOpenLibrary as jest.Mock).mockResolvedValue({
      title: 'Power',
      authors: ['Aaron Oster'],
      coverId: 12345,
      pageCount: 380,
      genres: ['Fantasy'],
    });

    const result = await enrichBookData('Power', 'Aaron Oster');

    expect(result.coverUrl).toBe('https://covers.openlibrary.org/b/id/12345-L.jpg');
    expect(result.source).toBe('openlibrary');
  });

  it('returns partial data when both APIs fail', async () => {
    (searchGoogleBooks as jest.Mock).mockResolvedValue(null);
    (searchOpenLibrary as jest.Mock).mockResolvedValue(null);

    const result = await enrichBookData('Unknown Book', 'Unknown Author');

    expect(result.coverUrl).toBeNull();
    expect(result.synopsis).toBeNull();
    expect(result.source).toBe('none');
  });
});
```

**Step 3: Run tests to verify they fail**

Run: `npm test -- __tests__/lib/bookEnrichment.test.ts`
Expected: FAIL - module not found

**Step 4: Write implementation**

```typescript
// lib/bookEnrichment.ts
import { searchGoogleBooks, GoogleBookResult } from './googleBooks';
import { searchOpenLibrary, buildOpenLibraryCoverUrl, OpenLibraryResult } from './openLibrary';

export interface EnrichmentResult {
  coverUrl: string | null;
  synopsis: string | null;
  pageCount: number | null;
  genres: string[];
  publisher: string | null;
  publishedDate: string | null;
  source: 'google' | 'openlibrary' | 'none';
}

export async function enrichBookData(
  title: string,
  author?: string
): Promise<EnrichmentResult> {
  // Try Google Books first
  const query = author ? `intitle:"${title}" inauthor:"${author}"` : title;
  const googleResult = await searchGoogleBooks(query);

  if (googleResult?.coverUrl) {
    return {
      coverUrl: googleResult.coverUrl,
      synopsis: googleResult.description,
      pageCount: googleResult.pageCount || null,
      genres: googleResult.categories || [],
      publisher: googleResult.publisher || null,
      publishedDate: googleResult.publishedDate || null,
      source: 'google',
    };
  }

  // Fallback to OpenLibrary
  const openLibResult = await searchOpenLibrary(title, author);

  if (openLibResult) {
    return {
      coverUrl: buildOpenLibraryCoverUrl(openLibResult.coverId, 'L'),
      synopsis: null, // OpenLibrary doesn't provide descriptions in search
      pageCount: openLibResult.pageCount,
      genres: openLibResult.genres,
      publisher: openLibResult.publisher,
      publishedDate: openLibResult.publishedYear?.toString() || null,
      source: 'openlibrary',
    };
  }

  // No data found
  return {
    coverUrl: null,
    synopsis: null,
    pageCount: null,
    genres: [],
    publisher: null,
    publishedDate: null,
    source: 'none',
  };
}
```

**Step 5: Run tests to verify they pass**

Run: `npm test -- __tests__/lib/bookEnrichment.test.ts`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add lib/googleBooks.ts lib/bookEnrichment.ts __tests__/lib/bookEnrichment.test.ts
git commit -m "feat: add book enrichment service with Google Books and OpenLibrary fallback"
```

---

## Task 5: Duplicate Detection

**Files:**
- Modify: `lib/storage.ts`
- Test: `__tests__/lib/storage.test.ts`

**Step 1: Add failing tests for duplicate detection**

```typescript
// Add to __tests__/lib/storage.test.ts

describe('findDuplicateBook', () => {
  it('finds duplicate by exact ASIN match', async () => {
    const existingBooks = [
      { id: '1', title: 'Power', asin: 'B07WNJ7FTQ' },
    ];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingBooks));

    const duplicate = await storage.findDuplicateBook({ asin: 'B07WNJ7FTQ' });
    expect(duplicate?.id).toBe('1');
  });

  it('finds duplicate by title and author match', async () => {
    const existingBooks = [
      { id: '1', title: 'Power', authors: ['Aaron Oster'] },
    ];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingBooks));

    const duplicate = await storage.findDuplicateBook({
      title: 'Power',
      authors: ['Aaron Oster']
    });
    expect(duplicate?.id).toBe('1');
  });

  it('handles case-insensitive title matching', async () => {
    const existingBooks = [
      { id: '1', title: 'The Power', authors: ['Aaron Oster'] },
    ];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingBooks));

    const duplicate = await storage.findDuplicateBook({
      title: 'the power',
      authors: ['Aaron Oster']
    });
    expect(duplicate?.id).toBe('1');
  });

  it('returns null when no duplicate found', async () => {
    const existingBooks = [
      { id: '1', title: 'Different Book', asin: 'B123456789' },
    ];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingBooks));

    const duplicate = await storage.findDuplicateBook({
      asin: 'B07WNJ7FTQ',
      title: 'Power',
    });
    expect(duplicate).toBeNull();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- __tests__/lib/storage.test.ts`
Expected: FAIL - findDuplicateBook not defined

**Step 3: Implement duplicate detection**

```typescript
// Add to lib/storage.ts

export interface DuplicateQuery {
  asin?: string;
  title?: string;
  authors?: string[];
}

// Add to storage object:
async findDuplicateBook(query: DuplicateQuery): Promise<Book | null> {
  const books = await this.getBooks();

  // Check ASIN first (exact match)
  if (query.asin) {
    const asinMatch = books.find(b => b.asin === query.asin);
    if (asinMatch) return asinMatch;
  }

  // Check title + author (fuzzy match)
  if (query.title) {
    const normalizedTitle = query.title.toLowerCase().trim();
    const queryAuthor = query.authors?.[0]?.toLowerCase().trim();

    const titleMatch = books.find(b => {
      const bookTitle = b.title.toLowerCase().trim();
      const bookAuthor = b.authors?.[0]?.toLowerCase().trim();

      // Title must match
      if (bookTitle !== normalizedTitle) return false;

      // If we have author info, it should match too
      if (queryAuthor && bookAuthor) {
        return bookAuthor.includes(queryAuthor) || queryAuthor.includes(bookAuthor);
      }

      return true;
    });

    if (titleMatch) return titleMatch;
  }

  return null;
},
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- __tests__/lib/storage.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add lib/storage.ts __tests__/lib/storage.test.ts
git commit -m "feat: add duplicate book detection to storage"
```

---

## Task 6: Kindle Share Processing Service

**Files:**
- Create: `lib/kindleShareProcessor.ts`
- Test: `__tests__/lib/kindleShareProcessor.test.ts`

**Step 1: Write failing tests**

```typescript
// __tests__/lib/kindleShareProcessor.test.ts
import { processKindleShare, ProcessingStep } from '@/lib/kindleShareProcessor';

jest.mock('@/lib/kindleParser');
jest.mock('@/lib/bookEnrichment');
jest.mock('@/lib/storage');

import { parseKindleShareText } from '@/lib/kindleParser';
import { enrichBookData } from '@/lib/bookEnrichment';
import { storage } from '@/lib/storage';

describe('kindleShareProcessor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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
    expect(steps).toContain('enriching');
    expect(steps).toContain('saving');
  });

  it('returns created book on success', async () => {
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
    expect(result.book?.title).toBe('Test Book');
    expect(result.book?.source).toBe('kindle-share');
  });

  it('returns duplicate info when book exists', async () => {
    (parseKindleShareText as jest.Mock).mockReturnValue({
      title: 'Test Book',
      authors: ['Test Author'],
      asin: 'B123456789',
      sourceUrl: 'https://read.amazon.com/...',
    });
    (storage.findDuplicateBook as jest.Mock).mockResolvedValue({
      id: 'existing-123',
      title: 'Test Book',
    });

    const result = await processKindleShare('valid share text', {});

    expect(result.isDuplicate).toBe(true);
    expect(result.existingBook?.id).toBe('existing-123');
  });

  it('returns error for invalid share text', async () => {
    (parseKindleShareText as jest.Mock).mockReturnValue(null);

    const result = await processKindleShare('invalid text', {});

    expect(result.success).toBe(false);
    expect(result.error).toBe('invalid-share-text');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- __tests__/lib/kindleShareProcessor.test.ts`
Expected: FAIL - module not found

**Step 3: Write implementation**

```typescript
// lib/kindleShareProcessor.ts
import { parseKindleShareText, KindleParsedData } from './kindleParser';
import { enrichBookData } from './bookEnrichment';
import { storage } from './storage';
import { Book } from './types';

export type ProcessingStep = 'parsing' | 'checking-duplicate' | 'enriching' | 'saving';

export interface ProcessOptions {
  onProgress?: (step: ProcessingStep) => void;
  forceAdd?: boolean; // Add even if duplicate exists
}

export interface ProcessResult {
  success: boolean;
  book?: Book;
  isDuplicate?: boolean;
  existingBook?: Book;
  error?: 'invalid-share-text' | 'save-failed';
  metadataSynced: boolean;
}

export async function processKindleShare(
  shareText: string,
  options: ProcessOptions
): Promise<ProcessResult> {
  const { onProgress, forceAdd } = options;

  // Step 1: Parse share text
  onProgress?.('parsing');
  const parsed = parseKindleShareText(shareText);

  if (!parsed) {
    return {
      success: false,
      error: 'invalid-share-text',
      metadataSynced: false,
    };
  }

  // Step 2: Check for duplicates
  onProgress?.('checking-duplicate');
  const existingBook = await storage.findDuplicateBook({
    asin: parsed.asin,
    title: parsed.title,
    authors: parsed.authors,
  });

  if (existingBook && !forceAdd) {
    return {
      success: false,
      isDuplicate: true,
      existingBook,
      metadataSynced: false,
    };
  }

  // Step 3: Enrich with metadata
  onProgress?.('enriching');
  const enrichment = await enrichBookData(parsed.title, parsed.authors[0]);

  // Step 4: Create and save book
  onProgress?.('saving');
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
  };

  try {
    await storage.saveBook(book);
    return {
      success: true,
      book,
      metadataSynced: enrichment.source !== 'none',
    };
  } catch {
    return {
      success: false,
      error: 'save-failed',
      metadataSynced: false,
    };
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- __tests__/lib/kindleShareProcessor.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add lib/kindleShareProcessor.ts __tests__/lib/kindleShareProcessor.test.ts
git commit -m "feat: add Kindle share processing service"
```

---

## Task 7: Companion Generation Progress Component

**Files:**
- Create: `components/CompanionProgress.tsx`

**Step 1: Create the component**

```typescript
// components/CompanionProgress.tsx
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';

export type CompanionStep = 'analyzing' | 'personality' | 'avatar' | 'done' | 'error';

interface CompanionProgressProps {
  currentStep: CompanionStep;
  error?: string;
}

const STEPS: { key: CompanionStep; label: string }[] = [
  { key: 'analyzing', label: 'Analyzing book...' },
  { key: 'personality', label: 'Creating personality...' },
  { key: 'avatar', label: 'Generating avatar...' },
];

export function CompanionProgress({ currentStep, error }: CompanionProgressProps) {
  const { colors, spacing, fontSize } = useTheme();

  if (currentStep === 'error') {
    return (
      <View style={styles.container}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          {error || 'Failed to generate companion'}
        </Text>
      </View>
    );
  }

  if (currentStep === 'done') {
    return null; // Component hides when done
  }

  const currentIndex = STEPS.findIndex(s => s.key === currentStep);

  return (
    <View style={[styles.container, { padding: spacing(4) }]}>
      {STEPS.map((step, index) => {
        const isComplete = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <View key={step.key} style={styles.stepRow}>
            <View style={styles.indicator}>
              {isComplete ? (
                <Text style={[styles.checkmark, { color: colors.success }]}>✓</Text>
              ) : isCurrent ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <Text style={[styles.pending, { color: colors.textMuted }]}>○</Text>
              )}
            </View>
            <Text
              style={[
                styles.stepLabel,
                {
                  color: isCurrent ? colors.text : colors.textMuted,
                  fontSize: fontSize('body'),
                },
              ]}
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  indicator: {
    width: 24,
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  pending: {
    fontSize: 16,
  },
  stepLabel: {
    fontFamily: 'Courier',
  },
  errorText: {
    fontFamily: 'Courier',
    fontSize: 14,
  },
});
```

**Step 2: Commit**

```bash
git add components/CompanionProgress.tsx
git commit -m "feat: add companion generation progress component"
```

---

## Task 8: Duplicate Book Dialog Component

**Files:**
- Create: `components/DuplicateBookDialog.tsx`

**Step 1: Create the component**

```typescript
// components/DuplicateBookDialog.tsx
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { Book } from '@/lib/types';

interface DuplicateBookDialogProps {
  visible: boolean;
  book: Book;
  onViewExisting: () => void;
  onAddAnyway: () => void;
  onCancel: () => void;
}

export function DuplicateBookDialog({
  visible,
  book,
  onViewExisting,
  onAddAnyway,
  onCancel,
}: DuplicateBookDialogProps) {
  const { colors, spacing, fontSize } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.dialog, { backgroundColor: colors.surface, padding: spacing(5) }]}>
          <Text style={[styles.title, { color: colors.text, fontSize: fontSize('large') }]}>
            book exists_
          </Text>

          <Text style={[styles.message, { color: colors.textMuted, fontSize: fontSize('body') }]}>
            "{book.title}" is already in your library.
          </Text>

          <View style={[styles.buttons, { marginTop: spacing(4), gap: spacing(3) }]}>
            <Pressable
              style={[styles.button, { borderColor: colors.text }]}
              onPress={onViewExisting}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>
                [view existing]
              </Text>
            </Pressable>

            <Pressable
              style={[styles.button, { borderColor: colors.textMuted }]}
              onPress={onAddAnyway}
            >
              <Text style={[styles.buttonText, { color: colors.textMuted }]}>
                [add anyway]
              </Text>
            </Pressable>

            <Pressable onPress={onCancel}>
              <Text style={[styles.cancelText, { color: colors.textMuted }]}>
                cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    width: '80%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: '#333',
  },
  title: {
    fontFamily: 'Courier',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  message: {
    fontFamily: 'Courier',
  },
  buttons: {
    alignItems: 'stretch',
  },
  button: {
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: 'Courier',
    fontSize: 14,
  },
  cancelText: {
    fontFamily: 'Courier',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});
```

**Step 2: Commit**

```bash
git add components/DuplicateBookDialog.tsx
git commit -m "feat: add duplicate book dialog component"
```

---

## Task 9: Kindle Share Screen

**Files:**
- Create: `app/kindle-share.tsx`

**Step 1: Create the share screen**

```typescript
// app/kindle-share.tsx
import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import { processKindleShare, ProcessingStep, ProcessResult } from '@/lib/kindleShareProcessor';
import { DuplicateBookDialog } from '@/components/DuplicateBookDialog';
import { Book } from '@/lib/types';

type ScreenState = 'processing' | 'duplicate' | 'error' | 'success';

const STEP_LABELS: Record<ProcessingStep, string> = {
  'parsing': 'reading share data...',
  'checking-duplicate': 'checking library...',
  'enriching': 'fetching book details...',
  'saving': 'adding to library...',
};

export default function KindleShareScreen() {
  const { colors, spacing, fontSize } = useTheme();
  const { text } = useLocalSearchParams<{ text: string }>();

  const [state, setState] = useState<ScreenState>('processing');
  const [step, setStep] = useState<ProcessingStep>('parsing');
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [duplicateBook, setDuplicateBook] = useState<Book | null>(null);

  const processShare = useCallback(async (forceAdd = false) => {
    if (!text) {
      setState('error');
      return;
    }

    setState('processing');

    const processResult = await processKindleShare(text, {
      onProgress: setStep,
      forceAdd,
    });

    setResult(processResult);

    if (processResult.isDuplicate && processResult.existingBook) {
      setDuplicateBook(processResult.existingBook);
      setState('duplicate');
    } else if (processResult.success && processResult.book) {
      setState('success');
      // Navigate to book detail after short delay
      setTimeout(() => {
        router.replace(`/book/${processResult.book!.id}`);
      }, 500);
    } else {
      setState('error');
    }
  }, [text]);

  useEffect(() => {
    processShare();
  }, [processShare]);

  const handleViewExisting = () => {
    if (duplicateBook) {
      router.replace(`/book/${duplicateBook.id}`);
    }
  };

  const handleAddAnyway = () => {
    setDuplicateBook(null);
    processShare(true);
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {state === 'processing' && (
        <>
          <ActivityIndicator size="large" color={colors.text} />
          <Text style={[styles.text, { color: colors.text, fontSize: fontSize('body') }]}>
            {STEP_LABELS[step]}
          </Text>
        </>
      )}

      {state === 'success' && (
        <Text style={[styles.text, { color: colors.success, fontSize: fontSize('body') }]}>
          book added_
        </Text>
      )}

      {state === 'error' && (
        <>
          <Text style={[styles.text, { color: colors.error, fontSize: fontSize('body') }]}>
            {result?.error === 'invalid-share-text'
              ? 'not a valid kindle share_'
              : 'failed to add book_'
            }
          </Text>
          <Text
            style={[styles.link, { color: colors.textMuted }]}
            onPress={() => router.back()}
          >
            [go back]
          </Text>
        </>
      )}

      {duplicateBook && (
        <DuplicateBookDialog
          visible={state === 'duplicate'}
          book={duplicateBook}
          onViewExisting={handleViewExisting}
          onAddAnyway={handleAddAnyway}
          onCancel={handleCancel}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  text: {
    fontFamily: 'Courier',
    marginTop: 16,
  },
  link: {
    fontFamily: 'Courier',
    marginTop: 8,
  },
});
```

**Step 2: Commit**

```bash
git add app/kindle-share.tsx
git commit -m "feat: add Kindle share screen with processing and duplicate handling"
```

---

## Task 10: Handle Incoming Share Intent

**Files:**
- Modify: `app/_layout.tsx`

**Step 1: Read current layout file**

Review current `app/_layout.tsx` implementation.

**Step 2: Add share intent handling**

```typescript
// app/_layout.tsx
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { ThemeProvider } from '@/lib/ThemeContext';
import { isKindleShareText } from '@/lib/kindleParser';

export default function RootLayout() {
  useEffect(() => {
    // Handle initial URL (app opened via share)
    Linking.getInitialURL().then(handleIncomingUrl);

    // Handle URL while app is running
    const subscription = Linking.addEventListener('url', (event) => {
      handleIncomingUrl(event.url);
    });

    return () => subscription.remove();
  }, []);

  function handleIncomingUrl(url: string | null) {
    if (!url) return;

    // Check if this is shared text (Android intent)
    // The URL will contain the shared text as a parameter
    const parsed = Linking.parse(url);

    // Handle blahread://share?text=... scheme
    if (parsed.path === 'share' && parsed.queryParams?.text) {
      const sharedText = decodeURIComponent(parsed.queryParams.text as string);
      if (isKindleShareText(sharedText)) {
        router.push({
          pathname: '/kindle-share',
          params: { text: sharedText },
        });
      }
    }
  }

  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
```

**Step 3: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat: handle incoming share intents in root layout"
```

---

## Task 11: Android Share Intent Activity

**Files:**
- Create: `android-intent-handler.js` (Expo config plugin)
- Modify: `app.json`

**Note:** Expo's built-in intent filter handles receiving the share, but we need to ensure the shared text is passed correctly to the app.

**Step 1: Verify app.json intent filter (already configured)**

The `app.json` already has:
```json
"intentFilters": [
  {
    "action": "android.intent.action.SEND",
    "category": ["android.intent.category.DEFAULT"],
    "data": [{ "mimeType": "text/plain" }]
  }
]
```

**Step 2: Create intent handler hook**

```typescript
// hooks/useShareIntent.ts
import { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

export function useShareIntent() {
  const [sharedText, setSharedText] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    // Get initial shared content
    Linking.getInitialURL().then((url) => {
      if (url) {
        extractSharedText(url);
      }
    });

    // Listen for new shares while app is open
    const subscription = Linking.addEventListener('url', (event) => {
      extractSharedText(event.url);
    });

    return () => subscription.remove();
  }, []);

  function extractSharedText(url: string) {
    try {
      const parsed = Linking.parse(url);
      if (parsed.queryParams?.text) {
        setSharedText(decodeURIComponent(parsed.queryParams.text as string));
      }
    } catch {
      // Invalid URL, ignore
    }
  }

  return { sharedText, clearSharedText: () => setSharedText(null) };
}
```

**Step 3: Commit**

```bash
git add hooks/useShareIntent.ts
git commit -m "feat: add useShareIntent hook for Android share handling"
```

---

## Task 12: Library Screen - Paste Button

**Files:**
- Modify: `app/(tabs)/library.tsx`

**Step 1: Read current library screen**

Review current implementation.

**Step 2: Add paste button and clipboard handling**

Add imports and paste functionality:

```typescript
// Add to app/(tabs)/library.tsx

import * as Clipboard from 'expo-clipboard';
import { isKindleShareText } from '@/lib/kindleParser';

// Add state for paste button
const [isPasting, setIsPasting] = useState(false);

// Add paste handler function
async function handlePasteKindleLink() {
  setIsPasting(true);
  try {
    const clipboardText = await Clipboard.getStringAsync();

    if (!clipboardText) {
      Alert.alert('Empty Clipboard', 'No text found in clipboard.');
      return;
    }

    if (!isKindleShareText(clipboardText)) {
      Alert.alert('Invalid Link', 'No Kindle share link found in clipboard.');
      return;
    }

    router.push({
      pathname: '/kindle-share',
      params: { text: clipboardText },
    });
  } catch (error) {
    Alert.alert('Error', 'Could not read clipboard.');
  } finally {
    setIsPasting(false);
  }
}

// Add button in the UI (before the book list, after filters):
<Pressable
  style={[styles.pasteButton, { borderColor: colors.textMuted }]}
  onPress={handlePasteKindleLink}
  disabled={isPasting}
>
  <Text style={[styles.pasteButtonText, { color: colors.text }]}>
    {isPasting ? 'checking...' : '[paste kindle link]'}
  </Text>
</Pressable>

// Add styles:
pasteButton: {
  borderWidth: 1,
  paddingVertical: 12,
  paddingHorizontal: 16,
  alignItems: 'center',
  marginBottom: 16,
},
pasteButtonText: {
  fontFamily: 'Courier',
  fontSize: 14,
},
```

**Step 3: Install expo-clipboard if needed**

Run: `npx expo install expo-clipboard`

**Step 4: Commit**

```bash
git add app/(tabs)/library.tsx package.json
git commit -m "feat: add paste Kindle link button to library screen"
```

---

## Task 13: Book Detail Screen - Auto Companion Generation

**Files:**
- Modify: `app/book/[id].tsx`

**Step 1: Read current book detail screen**

Review current implementation.

**Step 2: Add auto-generation for new books**

Add companion auto-generation with progress UI:

```typescript
// Add to app/book/[id].tsx

import { CompanionProgress, CompanionStep } from '@/components/CompanionProgress';
import { settings } from '@/lib/settings';

// Add state
const [companionStep, setCompanionStep] = useState<CompanionStep | null>(null);
const [companionError, setCompanionError] = useState<string | null>(null);

// Add auto-generation effect (after loadBook)
useEffect(() => {
  if (!book) return;

  // Auto-generate companion for newly added kindle-share books without companions
  const shouldAutoGenerate =
    book.source === 'kindle-share' &&
    !book.companion &&
    book.synopsis &&
    // Only if book was created in last 30 seconds (freshly added)
    Date.now() - book.createdAt < 30000;

  if (shouldAutoGenerate) {
    autoGenerateCompanion();
  }
}, [book?.id]);

async function autoGenerateCompanion() {
  if (!book) return;

  const config = await settings.get();
  if (!config.apiKey) {
    // No API key, skip auto-generation
    return;
  }

  setCompanionStep('analyzing');
  setCompanionError(null);

  try {
    setCompanionStep('personality');
    // Small delay for UX
    await new Promise(r => setTimeout(r, 500));

    setCompanionStep('avatar');
    await generateCompanion(book);

    setCompanionStep('done');
    await loadBook();
  } catch (error: any) {
    setCompanionStep('error');
    setCompanionError(error.message || 'Failed to generate companion');
  }
}

// In the companion section of the render:
{companionStep && companionStep !== 'done' && (
  <CompanionProgress
    currentStep={companionStep}
    error={companionError || undefined}
  />
)}

{companionStep === 'error' && (
  <Pressable onPress={autoGenerateCompanion} style={styles.retryButton}>
    <Text style={[styles.retryText, { color: colors.text }]}>
      [try again]
    </Text>
  </Pressable>
)}
```

**Step 3: Commit**

```bash
git add app/book/[id].tsx
git commit -m "feat: add auto companion generation with progress UI"
```

---

## Task 14: Book Detail Screen - Sync Metadata Button

**Files:**
- Modify: `app/book/[id].tsx`

**Step 1: Add sync metadata functionality**

```typescript
// Add to app/book/[id].tsx

import { enrichBookData } from '@/lib/bookEnrichment';

// Add state
const [isSyncing, setIsSyncing] = useState(false);

// Add sync handler
async function handleSyncMetadata() {
  if (!book) return;

  setIsSyncing(true);
  try {
    const enrichment = await enrichBookData(book.title, book.authors?.[0]);

    const updatedBook: Book = {
      ...book,
      coverUrl: enrichment.coverUrl || book.coverUrl,
      synopsis: enrichment.synopsis || book.synopsis,
      pageCount: enrichment.pageCount || book.pageCount,
      genres: enrichment.genres.length ? enrichment.genres : book.genres,
      publisher: enrichment.publisher || book.publisher,
      publishedDate: enrichment.publishedDate || book.publishedDate,
      metadataSynced: enrichment.source !== 'none',
    };

    await storage.saveBook(updatedBook);
    setBook(updatedBook);

    if (enrichment.source === 'none') {
      Alert.alert('No Data Found', 'Could not find additional metadata for this book.');
    }
  } catch (error) {
    Alert.alert('Sync Failed', 'Could not fetch book metadata.');
  } finally {
    setIsSyncing(false);
  }
}

// Add button in UI (show when metadataSynced is false):
{book.metadataSynced === false && (
  <Pressable
    style={[styles.syncButton, { borderColor: colors.textMuted }]}
    onPress={handleSyncMetadata}
    disabled={isSyncing}
  >
    <Text style={[styles.syncText, { color: colors.textMuted }]}>
      {isSyncing ? 'syncing...' : '[sync metadata]'}
    </Text>
  </Pressable>
)}
```

**Step 2: Commit**

```bash
git add app/book/[id].tsx
git commit -m "feat: add sync metadata button to book detail screen"
```

---

## Task 15: Integration Testing

**Files:**
- Create: `__tests__/integration/kindleShare.test.ts`

**Step 1: Write integration tests**

```typescript
// __tests__/integration/kindleShare.test.ts
import { processKindleShare } from '@/lib/kindleShareProcessor';
import { storage } from '@/lib/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage');

// Mock fetch for API calls
global.fetch = jest.fn();

describe('Kindle Share Integration', () => {
  const validShareText = `I think you might like this book – "Power (Buryoku Book 1)" by Aaron Oster, Richard Sashigane.

Start reading it for free: https://read.amazon.co.uk/kp/kshare?asin=B07WNJ7FTQ&id=test&ref_=test`;

  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('[]');
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  it('processes valid Kindle share end-to-end', async () => {
    // Mock Google Books API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{
          volumeInfo: {
            title: 'Power',
            authors: ['Aaron Oster'],
            imageLinks: { thumbnail: 'https://books.google.com/cover.jpg' },
            description: 'A cultivation story',
            pageCount: 400,
          },
        }],
      }),
    });

    const result = await processKindleShare(validShareText, {});

    expect(result.success).toBe(true);
    expect(result.book?.title).toBe('Power (Buryoku Book 1)');
    expect(result.book?.authors).toEqual(['Aaron Oster', 'Richard Sashigane']);
    expect(result.book?.asin).toBe('B07WNJ7FTQ');
    expect(result.book?.source).toBe('kindle-share');
    expect(result.metadataSynced).toBe(true);
  });

  it('handles API failure gracefully', async () => {
    // Mock failed API response
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const result = await processKindleShare(validShareText, {});

    expect(result.success).toBe(true); // Book still added
    expect(result.book?.title).toBe('Power (Buryoku Book 1)');
    expect(result.metadataSynced).toBe(false);
  });
});
```

**Step 2: Run integration tests**

Run: `npm test -- __tests__/integration/kindleShare.test.ts`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add __tests__/integration/kindleShare.test.ts
git commit -m "test: add Kindle share integration tests"
```

---

## Task 16: Final Testing & Cleanup

**Step 1: Run all tests**

Run: `npm test`
Expected: All tests PASS

**Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 3: Build verification**

Run: `npx expo export --platform android`
Expected: Build succeeds

**Step 4: Manual testing checklist**

1. [ ] Share from Kindle app opens Blah Read
2. [ ] Book details are parsed correctly
3. [ ] Metadata is fetched from Google Books
4. [ ] Book appears in library
5. [ ] Companion auto-generates with progress UI
6. [ ] Duplicate dialog shows for existing books
7. [ ] "View existing" navigates to existing book
8. [ ] "Add anyway" creates duplicate
9. [ ] Paste button works from library screen
10. [ ] Invalid clipboard shows error toast
11. [ ] Sync metadata button works for books without metadata
12. [ ] Companion retry works after failure

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete Kindle share link integration"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Kindle parser | `lib/kindleParser.ts`, tests |
| 2 | Book type extension | `lib/types.ts` |
| 3 | OpenLibrary API | `lib/openLibrary.ts`, tests |
| 4 | Book enrichment service | `lib/bookEnrichment.ts`, tests |
| 5 | Duplicate detection | `lib/storage.ts`, tests |
| 6 | Share processor | `lib/kindleShareProcessor.ts`, tests |
| 7 | Companion progress UI | `components/CompanionProgress.tsx` |
| 8 | Duplicate dialog | `components/DuplicateBookDialog.tsx` |
| 9 | Kindle share screen | `app/kindle-share.tsx` |
| 10 | Intent handling | `app/_layout.tsx` |
| 11 | Share intent hook | `hooks/useShareIntent.ts` |
| 12 | Library paste button | `app/(tabs)/library.tsx` |
| 13 | Auto companion gen | `app/book/[id].tsx` |
| 14 | Sync metadata button | `app/book/[id].tsx` |
| 15 | Integration tests | `__tests__/integration/` |
| 16 | Final testing | Manual verification |
