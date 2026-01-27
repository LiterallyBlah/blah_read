# Blah Read MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a gamified reading companion app that tracks reading time, earns XP/loot, and generates pixel-art companions from book metadata.

**Architecture:** Expo + React Native with local-first AsyncStorage. Share intent receives URLs, scrapes OG tags for metadata. Timer tracks sessions, XP system rewards consistency, LLM+ImageGen creates collectible companions on book completion.

**Tech Stack:** Expo 54, React Native, TypeScript, Expo Router, AsyncStorage, expo-linking, expo-sharing

---

## Phase 1: Foundation

### Task 1: Project Scaffolding

**Files:**
- Create: `app/_layout.tsx`
- Create: `app/(tabs)/_layout.tsx`
- Create: `app/(tabs)/index.tsx`
- Create: `app/(tabs)/library.tsx`
- Create: `app/(tabs)/profile.tsx`
- Modify: `app.json`

**Step 1: Initialize Expo project structure**

Run: `npx create-expo-app@latest . --template blank-typescript`

**Step 2: Install core dependencies**

Run:
```bash
npx expo install expo-router expo-linking expo-constants expo-status-bar @react-native-async-storage/async-storage expo-haptics react-native-safe-area-context react-native-screens
```

**Step 3: Configure app.json for expo-router**

```json
{
  "expo": {
    "name": "Blah Read",
    "slug": "blah-read",
    "scheme": "blahread",
    "plugins": ["expo-router"],
    "experiments": { "typedRoutes": true }
  }
}
```

**Step 4: Create root layout**

```typescript
// app/_layout.tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
```

**Step 5: Create tab layout**

```typescript
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { COLORS } from '@/lib/theme';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: { backgroundColor: COLORS.background, borderTopColor: COLORS.border },
      tabBarActiveTintColor: COLORS.text,
    }}>
      <Tabs.Screen name="index" options={{ title: 'home' }} />
      <Tabs.Screen name="library" options={{ title: 'library' }} />
      <Tabs.Screen name="profile" options={{ title: 'profile' }} />
    </Tabs>
  );
}
```

**Step 6: Commit**

```bash
git add -A && git commit -m "feat: scaffold expo project with tab navigation"
```

---

### Task 2: Theme & Design Tokens

**Files:**
- Create: `lib/theme.ts`

**Step 1: Write failing test**

```typescript
// __tests__/lib/theme.test.ts
import { COLORS, FONTS, spacing, fontSize, letterSpacing } from '@/lib/theme';

describe('theme', () => {
  it('exports COLORS matching design system', () => {
    expect(COLORS.background).toBe('#0a0a0a');
    expect(COLORS.backgroundCard).toBe('#1a1a1a');
    expect(COLORS.text).toBe('#ffffff');
    expect(COLORS.textSecondary).toBe('#888888');
    expect(COLORS.textMuted).toBe('#555555');
    expect(COLORS.border).toBe('#2a2a2a');
    expect(COLORS.success).toBe('#00ff88');
  });

  it('exports FONTS with Courier', () => {
    expect(FONTS.mono).toBe('Courier');
    expect(FONTS.monoBold).toBe('700');
  });

  it('spacing returns 4px base unit', () => {
    expect(spacing(1)).toBe(4);
    expect(spacing(6)).toBe(24); // contentPadding on compact
  });

  it('fontSize returns design system values', () => {
    expect(fontSize('body')).toBe(14);
    expect(fontSize('title')).toBe(28);
  });

  it('letterSpacing returns design system values', () => {
    expect(letterSpacing('tight')).toBe(1);
    expect(letterSpacing('hero')).toBe(4);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/theme.test.ts`
Expected: FAIL - module not found

**Step 3: Write implementation**

```typescript
// lib/theme.ts
// Follows BlahFret design system - monochrome typewriter aesthetic

export const COLORS = {
  // Backgrounds
  background: '#0a0a0a',
  backgroundLight: '#141414',
  backgroundCard: '#1a1a1a',

  // Text
  primary: '#ffffff',
  primaryMuted: '#e0e0e0',
  text: '#ffffff',
  textSecondary: '#888888',
  textMuted: '#555555',

  // Borders
  border: '#2a2a2a',
  secondary: '#2a2a2a',
  accent: '#3a3a3a',

  // Status
  success: '#00ff88',
  error: '#ff4444',
  warning: '#ffaa00',

  // Rarity (for loot/companions)
  rarityCommon: '#555555',
  rarityRare: '#4A90D9',
  rarityEpic: '#9B59B6',
  rarityLegendary: '#F1C40F',

  // Prestige tiers
  prestigeBronze: '#CD7F32',
  prestigeSilver: '#C0C0C0',
  prestigeGold: '#FFD700',
  prestigePlatinum: '#E5E4E2',
  prestigeDiamond: '#B9F2FF',
} as const;

export const FONTS = {
  mono: 'Courier',
  monoWeight: '400' as const,
  monoBold: '700' as const,
};

// Base spacing unit is 4px, matches design system
export const spacing = (units: number) => units * 4;

// Type scale matching design system
export const fontSize = (size: 'micro' | 'small' | 'body' | 'large' | 'title' | 'hero') => {
  const sizes = { micro: 10, small: 12, body: 14, large: 18, title: 28, hero: 48 };
  return sizes[size];
};

// Letter spacing conventions from design system
export const letterSpacing = (type: 'tight' | 'normal' | 'wide' | 'hero') => {
  const spacings = { tight: 1, normal: 2, wide: 3, hero: 4 };
  return spacings[type];
};
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/theme.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/theme.ts __tests__/lib/theme.test.ts
git commit -m "feat: add theme with design tokens"
```

---

### Task 3: Data Models & Types

**Files:**
- Create: `lib/types.ts`

**Step 1: Write failing test**

```typescript
// __tests__/lib/types.test.ts
import { Book, ReadingSession, UserProgress, BookStatus } from '@/lib/types';

describe('types', () => {
  it('Book type has required fields', () => {
    const book: Book = {
      id: '1',
      title: 'Test Book',
      coverUrl: 'https://example.com/cover.jpg',
      synopsis: 'A test book',
      sourceUrl: 'https://amazon.com/book',
      status: 'reading',
      totalReadingTime: 0,
      createdAt: Date.now(),
    };
    expect(book.status).toBe('reading');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/types.test.ts`
Expected: FAIL

**Step 3: Write implementation**

```typescript
// lib/types.ts
export type BookStatus = 'to_read' | 'reading' | 'finished';

export interface Book {
  id: string;
  title: string;
  coverUrl: string | null;
  synopsis: string | null;
  sourceUrl: string | null;
  status: BookStatus;
  totalReadingTime: number; // in seconds
  createdAt: number;
  finishedAt?: number;
  companion?: Companion;
}

export interface ReadingSession {
  id: string;
  bookId: string;
  startTime: number;
  endTime: number;
  duration: number; // in seconds
  xpEarned: number;
}

export interface Companion {
  id: string;
  bookId: string;
  imageUrl: string;
  archetype: string;
  creature: string;
  keywords: string[];
  generatedAt: number;
}

export interface UserProgress {
  totalXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastReadDate: string | null; // YYYY-MM-DD
  lootItems: LootItem[];
}

export interface LootItem {
  id: string;
  name: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earnedAt: number;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/types.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/types.ts __tests__/lib/types.test.ts
git commit -m "feat: add core data types"
```

---

### Task 4: Storage Layer

**Files:**
- Create: `lib/storage.ts`

**Step 1: Write failing test**

```typescript
// __tests__/lib/storage.test.ts
import { storage } from '@/lib/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage');

describe('storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getBooks returns empty array when no books', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    const books = await storage.getBooks();
    expect(books).toEqual([]);
  });

  it('saveBook adds book to storage', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('[]');
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    const book = { id: '1', title: 'Test', status: 'reading' };
    await storage.saveBook(book as any);

    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/storage.test.ts`
Expected: FAIL

**Step 3: Write implementation**

```typescript
// lib/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Book, ReadingSession, UserProgress } from './types';

const KEYS = {
  BOOKS: 'blahread:books',
  SESSIONS: 'blahread:sessions',
  PROGRESS: 'blahread:progress',
} as const;

const defaultProgress: UserProgress = {
  totalXp: 0,
  level: 1,
  currentStreak: 0,
  longestStreak: 0,
  lastReadDate: null,
  lootItems: [],
};

export const storage = {
  async getBooks(): Promise<Book[]> {
    const data = await AsyncStorage.getItem(KEYS.BOOKS);
    return data ? JSON.parse(data) : [];
  },

  async saveBook(book: Book): Promise<void> {
    const books = await this.getBooks();
    const index = books.findIndex(b => b.id === book.id);
    if (index >= 0) {
      books[index] = book;
    } else {
      books.push(book);
    }
    await AsyncStorage.setItem(KEYS.BOOKS, JSON.stringify(books));
  },

  async deleteBook(id: string): Promise<void> {
    const books = await this.getBooks();
    await AsyncStorage.setItem(KEYS.BOOKS, JSON.stringify(books.filter(b => b.id !== id)));
  },

  async getSessions(): Promise<ReadingSession[]> {
    const data = await AsyncStorage.getItem(KEYS.SESSIONS);
    return data ? JSON.parse(data) : [];
  },

  async saveSession(session: ReadingSession): Promise<void> {
    const sessions = await this.getSessions();
    sessions.push(session);
    await AsyncStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
  },

  async getProgress(): Promise<UserProgress> {
    const data = await AsyncStorage.getItem(KEYS.PROGRESS);
    return data ? JSON.parse(data) : defaultProgress;
  },

  async saveProgress(progress: UserProgress): Promise<void> {
    await AsyncStorage.setItem(KEYS.PROGRESS, JSON.stringify(progress));
  },
};
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/storage.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/storage.ts __tests__/lib/storage.test.ts
git commit -m "feat: add AsyncStorage layer for books, sessions, progress"
```

---

## Phase 2: The Link Eater

### Task 5: OG Tag Scraper

**Files:**
- Create: `lib/ogScraper.ts`

**Step 1: Write failing test**

```typescript
// __tests__/lib/ogScraper.test.ts
import { parseOgTags } from '@/lib/ogScraper';

describe('parseOgTags', () => {
  it('extracts og:title, og:image, og:description from HTML', () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Test Book Title" />
        <meta property="og:image" content="https://example.com/cover.jpg" />
        <meta property="og:description" content="A great book synopsis" />
      </head></html>
    `;
    const result = parseOgTags(html);
    expect(result.title).toBe('Test Book Title');
    expect(result.image).toBe('https://example.com/cover.jpg');
    expect(result.description).toBe('A great book synopsis');
  });

  it('returns nulls for missing tags', () => {
    const html = '<html><head></head></html>';
    const result = parseOgTags(html);
    expect(result.title).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/ogScraper.test.ts`
Expected: FAIL

**Step 3: Write implementation**

```typescript
// lib/ogScraper.ts
export interface OgTags {
  title: string | null;
  image: string | null;
  description: string | null;
}

export function parseOgTags(html: string): OgTags {
  const getMetaContent = (property: string): string | null => {
    const regex = new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i');
    const altRegex = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i');
    const match = html.match(regex) || html.match(altRegex);
    return match ? match[1] : null;
  };

  return {
    title: getMetaContent('og:title'),
    image: getMetaContent('og:image'),
    description: getMetaContent('og:description'),
  };
}

export async function fetchOgTags(url: string): Promise<OgTags> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BlahRead/1.0)' },
  });
  const html = await response.text();
  return parseOgTags(html);
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/ogScraper.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/ogScraper.ts __tests__/lib/ogScraper.test.ts
git commit -m "feat: add OG tag parser for URL metadata extraction"
```

---

### Task 6: Google Books API Fallback

**Files:**
- Create: `lib/googleBooks.ts`

**Step 1: Write failing test**

```typescript
// __tests__/lib/googleBooks.test.ts
import { searchGoogleBooks, parseGoogleBooksResponse } from '@/lib/googleBooks';

describe('parseGoogleBooksResponse', () => {
  it('extracts title, cover, and description from API response', () => {
    const response = {
      items: [{
        volumeInfo: {
          title: 'Test Book',
          description: 'A test description',
          imageLinks: { thumbnail: 'https://books.google.com/cover.jpg' },
        },
      }],
    };
    const result = parseGoogleBooksResponse(response);
    expect(result?.title).toBe('Test Book');
    expect(result?.coverUrl).toBe('https://books.google.com/cover.jpg');
  });

  it('returns null for empty results', () => {
    const result = parseGoogleBooksResponse({ items: [] });
    expect(result).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/googleBooks.test.ts`
Expected: FAIL

**Step 3: Write implementation**

```typescript
// lib/googleBooks.ts
const API_URL = 'https://www.googleapis.com/books/v1/volumes';

export interface GoogleBookResult {
  title: string;
  coverUrl: string | null;
  description: string | null;
}

export function parseGoogleBooksResponse(response: any): GoogleBookResult | null {
  if (!response.items?.length) return null;

  const book = response.items[0].volumeInfo;
  return {
    title: book.title || 'Unknown Title',
    coverUrl: book.imageLinks?.thumbnail || book.imageLinks?.smallThumbnail || null,
    description: book.description || null,
  };
}

export async function searchGoogleBooks(query: string): Promise<GoogleBookResult | null> {
  const url = `${API_URL}?q=${encodeURIComponent(query)}&maxResults=1`;
  const response = await fetch(url);
  const data = await response.json();
  return parseGoogleBooksResponse(data);
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/googleBooks.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/googleBooks.ts __tests__/lib/googleBooks.test.ts
git commit -m "feat: add Google Books API fallback for manual search"
```

---

### Task 7: Share Intent Handler

**Files:**
- Create: `app/share.tsx`
- Modify: `app.json` (add intent filters)

**Step 1: Configure app.json for share intent**

Add to `app.json`:
```json
{
  "expo": {
    "android": {
      "intentFilters": [{
        "action": "android.intent.action.SEND",
        "category": ["android.intent.category.DEFAULT"],
        "data": [{ "mimeType": "text/plain" }]
      }]
    }
  }
}
```

**Step 2: Create share handler screen**

```typescript
// app/share.tsx
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { fetchOgTags } from '@/lib/ogScraper';
import { storage } from '@/lib/storage';
import { Book } from '@/lib/types';
import { COLORS, spacing } from '@/lib/theme';

export default function ShareScreen() {
  const { url } = useLocalSearchParams<{ url: string }>();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!url) {
      setStatus('error');
      return;
    }
    processUrl(url);
  }, [url]);

  async function processUrl(sharedUrl: string) {
    try {
      const og = await fetchOgTags(sharedUrl);
      const book: Book = {
        id: Date.now().toString(),
        title: og.title || 'Unknown Book',
        coverUrl: og.image,
        synopsis: og.description,
        sourceUrl: sharedUrl,
        status: 'to_read',
        totalReadingTime: 0,
        createdAt: Date.now(),
      };
      await storage.saveBook(book);
      setStatus('success');
      setTimeout(() => router.replace('/library'), 1500);
    } catch {
      setStatus('error');
    }
  }

  return (
    <View style={styles.container}>
      {status === 'loading' && <ActivityIndicator color={COLORS.text} />}
      {status === 'success' && <Text style={styles.text}>book added_</Text>}
      {status === 'error' && <Text style={styles.text}>failed to add book_</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  text: { color: COLORS.text, fontFamily: 'Courier', fontSize: 18 },
});
```

**Step 3: Commit**

```bash
git add app/share.tsx app.json
git commit -m "feat: add share intent handler for URL ingestion"
```

---

## Phase 3: The Focus Timer

### Task 8: XP Calculator

**Files:**
- Create: `lib/xp.ts`

**Step 1: Write failing test**

```typescript
// __tests__/lib/xp.test.ts
import { calculateXp, getStreakMultiplier, calculateLevel } from '@/lib/xp';

describe('xp', () => {
  it('calculates base XP as 10 per minute', () => {
    expect(calculateXp(60, 0)).toBe(10); // 1 minute = 10 XP
    expect(calculateXp(600, 0)).toBe(100); // 10 minutes = 100 XP
  });

  it('applies 1.2x multiplier for 3-day streak', () => {
    expect(calculateXp(60, 3)).toBe(12);
  });

  it('applies 1.5x multiplier for 7+ day streak', () => {
    expect(calculateXp(60, 7)).toBe(15);
    expect(calculateXp(60, 30)).toBe(15);
  });

  it('calculates level from total XP', () => {
    expect(calculateLevel(0)).toBe(1);
    expect(calculateLevel(1000)).toBe(2);
    expect(calculateLevel(5000)).toBe(5);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/xp.test.ts`
Expected: FAIL

**Step 3: Write implementation**

```typescript
// lib/xp.ts
const XP_PER_MINUTE = 10;
const XP_PER_LEVEL = 1000;

export function getStreakMultiplier(streak: number): number {
  if (streak >= 7) return 1.5;
  if (streak >= 3) return 1.2;
  return 1.0;
}

export function calculateXp(durationSeconds: number, streak: number): number {
  const minutes = durationSeconds / 60;
  const baseXp = minutes * XP_PER_MINUTE;
  const multiplier = getStreakMultiplier(streak);
  return Math.floor(baseXp * multiplier);
}

export function calculateLevel(totalXp: number): number {
  return Math.floor(totalXp / XP_PER_LEVEL) + 1;
}

export function xpForNextLevel(currentLevel: number): number {
  return currentLevel * XP_PER_LEVEL;
}

export function xpProgress(totalXp: number): { current: number; needed: number } {
  const level = calculateLevel(totalXp);
  const xpAtLevelStart = (level - 1) * XP_PER_LEVEL;
  return {
    current: totalXp - xpAtLevelStart,
    needed: XP_PER_LEVEL,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/xp.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/xp.ts __tests__/lib/xp.test.ts
git commit -m "feat: add XP calculation with streak multipliers"
```

---

### Task 9: Loot System

**Files:**
- Create: `lib/loot.ts`

**Step 1: Write failing test**

```typescript
// __tests__/lib/loot.test.ts
import { shouldTriggerLoot, rollLoot, LOOT_TABLE } from '@/lib/loot';

describe('loot', () => {
  it('triggers loot every 60 minutes of reading', () => {
    expect(shouldTriggerLoot(0, 3600)).toBe(true); // 0 -> 60 min
    expect(shouldTriggerLoot(3000, 3600)).toBe(true); // 50 -> 60 min
    expect(shouldTriggerLoot(3600, 7200)).toBe(true); // 60 -> 120 min
    expect(shouldTriggerLoot(0, 1800)).toBe(false); // 0 -> 30 min
  });

  it('rollLoot returns a valid loot item', () => {
    const loot = rollLoot();
    expect(loot).toHaveProperty('id');
    expect(loot).toHaveProperty('name');
    expect(loot).toHaveProperty('icon');
    expect(loot).toHaveProperty('rarity');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/loot.test.ts`
Expected: FAIL

**Step 3: Write implementation**

```typescript
// lib/loot.ts
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
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/loot.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/loot.ts __tests__/lib/loot.test.ts
git commit -m "feat: add loot drop system with rarity tiers"
```

---

### Task 10: Timer Hook

**Files:**
- Create: `hooks/useTimer.ts`

**Step 1: Write failing test**

```typescript
// __tests__/hooks/useTimer.test.ts
import { renderHook, act } from '@testing-library/react-native';
import { useTimer } from '@/hooks/useTimer';

jest.useFakeTimers();

describe('useTimer', () => {
  it('starts at 0', () => {
    const { result } = renderHook(() => useTimer());
    expect(result.current.elapsed).toBe(0);
    expect(result.current.isRunning).toBe(false);
  });

  it('increments elapsed time when running', () => {
    const { result } = renderHook(() => useTimer());

    act(() => result.current.start());
    expect(result.current.isRunning).toBe(true);

    act(() => jest.advanceTimersByTime(5000));
    expect(result.current.elapsed).toBe(5);
  });

  it('stops incrementing when paused', () => {
    const { result } = renderHook(() => useTimer());

    act(() => result.current.start());
    act(() => jest.advanceTimersByTime(3000));
    act(() => result.current.pause());

    const elapsedAtPause = result.current.elapsed;
    act(() => jest.advanceTimersByTime(5000));

    expect(result.current.elapsed).toBe(elapsedAtPause);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/hooks/useTimer.test.ts`
Expected: FAIL

**Step 3: Write implementation**

```typescript
// hooks/useTimer.ts
import { useState, useRef, useCallback, useEffect } from 'react';

export function useTimer() {
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const start = useCallback(() => {
    if (isRunning) return;
    startTimeRef.current = Date.now() - elapsed * 1000;
    setIsRunning(true);
  }, [isRunning, elapsed]);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setElapsed(0);
  }, []);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  return { elapsed, isRunning, start, pause, reset };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/hooks/useTimer.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add hooks/useTimer.ts __tests__/hooks/useTimer.test.ts
git commit -m "feat: add useTimer hook for session tracking"
```

---

### Task 11: Timer Screen

**Files:**
- Create: `app/timer/[bookId].tsx`

**Step 1: Create timer screen**

```typescript
// app/timer/[bookId].tsx
// Clean OLED-black focus screen per spec - monochrome typewriter aesthetic
import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useTimer } from '@/hooks/useTimer';
import { storage } from '@/lib/storage';
import { calculateXp } from '@/lib/xp';
import { shouldTriggerLoot, rollLoot } from '@/lib/loot';
import { updateStreak, getDateString } from '@/lib/streak';
import { Book, ReadingSession } from '@/lib/types';
import { COLORS, FONTS, spacing, fontSize, letterSpacing } from '@/lib/theme';

export default function TimerScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const { elapsed, isRunning, start, pause, reset } = useTimer();

  useEffect(() => {
    loadBook();
    activateKeepAwakeAsync();
    return () => deactivateKeepAwake();
  }, []);

  async function loadBook() {
    const books = await storage.getBooks();
    setBook(books.find(b => b.id === bookId) || null);
  }

  function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  async function handleEnd() {
    if (!book || elapsed === 0) return;

    const progress = await storage.getProgress();
    const previousTime = book.totalReadingTime;
    const newTime = previousTime + elapsed;

    // Update streak
    const today = getDateString();
    const streakUpdate = updateStreak(
      progress.lastReadDate,
      today,
      progress.currentStreak,
      progress.longestStreak
    );
    progress.currentStreak = streakUpdate.currentStreak;
    progress.longestStreak = streakUpdate.longestStreak;
    progress.lastReadDate = streakUpdate.lastReadDate;

    // Calculate XP with streak multiplier
    const xp = calculateXp(elapsed, progress.currentStreak);

    // Check for loot (every 60 minutes)
    if (shouldTriggerLoot(previousTime, newTime)) {
      const loot = rollLoot();
      progress.lootItems.push(loot);
    }

    // Save session
    const session: ReadingSession = {
      id: Date.now().toString(),
      bookId: book.id,
      startTime: Date.now() - elapsed * 1000,
      endTime: Date.now(),
      duration: elapsed,
      xpEarned: xp,
    };
    await storage.saveSession(session);

    // Update book
    book.totalReadingTime = newTime;
    book.status = 'reading';
    await storage.saveBook(book);

    // Update progress
    progress.totalXp += xp;
    await storage.saveProgress(progress);

    router.back();
  }

  return (
    <View style={styles.container}>
      {/* Book cover (optional) */}
      {book?.coverUrl && (
        <Image source={{ uri: book.coverUrl }} style={styles.cover} resizeMode="contain" />
      )}

      {/* Book title */}
      <Text style={styles.title}>{book?.title.toLowerCase() || 'loading...'}_</Text>

      {/* Large timer display */}
      <Text style={styles.timer}>{formatTime(elapsed)}</Text>

      {/* Control buttons */}
      <View style={styles.buttons}>
        {!isRunning ? (
          <Pressable style={styles.primaryButton} onPress={start}>
            <Text style={styles.primaryButtonText}>[ start ]</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.secondaryButton} onPress={pause}>
            <Text style={styles.secondaryButtonText}>[pause]</Text>
          </Pressable>
        )}

        <Pressable style={styles.secondaryButton} onPress={handleEnd}>
          <Text style={styles.secondaryButtonText}>[end]</Text>
        </Pressable>
      </View>

      {/* Manual entry link */}
      <Pressable onPress={() => router.push(`/manual-entry?bookId=${bookId}`)}>
        <Text style={styles.manualLink}>forgot to track?</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing(6),
  },
  cover: {
    width: 120,
    height: 180,
    marginBottom: spacing(6),
    opacity: 0.8,
  },
  title: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.mono,
    fontSize: fontSize('body'),
    letterSpacing: letterSpacing('tight'),
    marginBottom: spacing(8),
    textAlign: 'center',
  },
  timer: {
    color: COLORS.text,
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: 72, // Large display per spec
    letterSpacing: letterSpacing('hero'),
  },
  buttons: {
    marginTop: spacing(12),
    gap: spacing(3),
    width: '100%',
    maxWidth: 280,
  },
  // Primary CTA button (from design system CommandButton)
  primaryButton: {
    borderWidth: 1,
    borderColor: COLORS.text,
    paddingVertical: spacing(5), // 20px
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  primaryButtonText: {
    color: COLORS.text,
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: fontSize('large'),
    letterSpacing: letterSpacing('hero'),
  },
  // Secondary button (compact inline control)
  secondaryButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: spacing(4), // 16px
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.mono,
    fontSize: fontSize('body'),
    letterSpacing: letterSpacing('tight'),
  },
  manualLink: {
    color: COLORS.textMuted,
    fontFamily: FONTS.mono,
    fontSize: fontSize('small'),
    letterSpacing: letterSpacing('tight'),
    marginTop: spacing(8),
  },
});
```

**Step 2: Commit**

```bash
git add app/timer/[bookId].tsx
git commit -m "feat: add timer screen with session tracking"
```

---

## Phase 4: The Context Engine (Companion Generator)

### Task 12: LLM Service

**Files:**
- Create: `lib/llm.ts`

**Step 1: Write failing test**

```typescript
// __tests__/lib/llm.test.ts
import { buildCompanionPrompt, parseCompanionResponse } from '@/lib/llm';

describe('llm', () => {
  it('builds prompt with synopsis', () => {
    const prompt = buildCompanionPrompt('A young cultivator rises to power...');
    expect(prompt).toContain('cultivator');
    expect(prompt).toContain('archetype');
  });

  it('parses LLM response into companion data', () => {
    const response = `Archetype: Cultivator
Creature: Dragon
Keywords: mystical, scaled, ancient`;

    const result = parseCompanionResponse(response);
    expect(result.archetype).toBe('Cultivator');
    expect(result.creature).toBe('Dragon');
    expect(result.keywords).toEqual(['mystical', 'scaled', 'ancient']);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/llm.test.ts`
Expected: FAIL

**Step 3: Write implementation**

```typescript
// lib/llm.ts
export interface CompanionData {
  archetype: string;
  creature: string;
  keywords: string[];
}

export function buildCompanionPrompt(synopsis: string): string {
  return `Analyze this book synopsis and extract:
1. The main character archetype (e.g., Knight, Cultivator, Wizard, Hacker, Survivor)
2. A companion creature that fits the story (e.g., Dragon, AI Bot, Wolf, Phoenix)
3. Three visual keywords to describe the companion

Synopsis: "${synopsis}"

Respond in exactly this format:
Archetype: [archetype]
Creature: [creature]
Keywords: [keyword1], [keyword2], [keyword3]`;
}

export function parseCompanionResponse(response: string): CompanionData {
  const archetypeMatch = response.match(/Archetype:\s*(.+)/i);
  const creatureMatch = response.match(/Creature:\s*(.+)/i);
  const keywordsMatch = response.match(/Keywords:\s*(.+)/i);

  return {
    archetype: archetypeMatch?.[1]?.trim() || 'Adventurer',
    creature: creatureMatch?.[1]?.trim() || 'Spirit',
    keywords: keywordsMatch?.[1]?.split(',').map(k => k.trim()) || ['mystical', 'glowing', 'small'],
  };
}

export async function generateCompanionData(synopsis: string, apiKey: string): Promise<CompanionData> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: buildCompanionPrompt(synopsis) }],
      max_tokens: 150,
    }),
  });

  const data = await response.json();
  return parseCompanionResponse(data.choices[0].message.content);
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/llm.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/llm.ts __tests__/lib/llm.test.ts
git commit -m "feat: add LLM service for companion data extraction"
```

---

### Task 13: Image Generation Service

**Files:**
- Create: `lib/imageGen.ts`

**Step 1: Write failing test**

```typescript
// __tests__/lib/imageGen.test.ts
import { buildImagePrompt } from '@/lib/imageGen';

describe('imageGen', () => {
  it('builds pixel art prompt from companion data', () => {
    const prompt = buildImagePrompt('Dragon', ['mystical', 'scaled', 'ancient']);
    expect(prompt).toContain('32x32');
    expect(prompt).toContain('pixel art');
    expect(prompt).toContain('Dragon');
    expect(prompt).toContain('mystical');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/imageGen.test.ts`
Expected: FAIL

**Step 3: Write implementation**

```typescript
// lib/imageGen.ts
export function buildImagePrompt(creature: string, keywords: string[]): string {
  return `32x32 pixel art sprite, ${creature}, ${keywords.join(', ')}, white background, limited color palette, retro game style, centered, simple, cute`;
}

export async function generateCompanionImage(
  creature: string,
  keywords: string[],
  apiKey: string
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: buildImagePrompt(creature, keywords),
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    }),
  });

  const data = await response.json();
  return data.data[0].url;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/imageGen.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/imageGen.ts __tests__/lib/imageGen.test.ts
git commit -m "feat: add image generation service for pixel companions"
```

---

### Task 14: Companion Generation Flow

**Files:**
- Create: `lib/companionGenerator.ts`

**Step 1: Write integration**

```typescript
// lib/companionGenerator.ts
import { storage } from './storage';
import { generateCompanionData } from './llm';
import { generateCompanionImage } from './imageGen';
import { Book, Companion } from './types';

const UNLOCK_THRESHOLD = 5 * 60 * 60; // 5 hours in seconds

export function canUnlockCompanion(book: Book): boolean {
  return (
    !book.companion &&
    book.synopsis &&
    (book.status === 'finished' || book.totalReadingTime >= UNLOCK_THRESHOLD)
  );
}

export async function generateCompanion(book: Book, apiKey: string): Promise<Companion> {
  if (!book.synopsis) throw new Error('Book has no synopsis');

  const companionData = await generateCompanionData(book.synopsis, apiKey);
  const imageUrl = await generateCompanionImage(
    companionData.creature,
    companionData.keywords,
    apiKey
  );

  const companion: Companion = {
    id: Date.now().toString(),
    bookId: book.id,
    imageUrl,
    archetype: companionData.archetype,
    creature: companionData.creature,
    keywords: companionData.keywords,
    generatedAt: Date.now(),
  };

  book.companion = companion;
  await storage.saveBook(book);

  return companion;
}
```

**Step 2: Commit**

```bash
git add lib/companionGenerator.ts
git commit -m "feat: add companion generation orchestration"
```

---

## Phase 5: UI Screens

### Task 15: Book Card Component

**Files:**
- Create: `components/BookCard.tsx`

```typescript
// components/BookCard.tsx
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Book } from '@/lib/types';
import { COLORS, spacing, fontSize } from '@/lib/theme';

interface Props {
  book: Book;
  onPress: () => void;
}

export function BookCard({ book, onPress }: Props) {
  const hours = Math.floor(book.totalReadingTime / 3600);
  const minutes = Math.floor((book.totalReadingTime % 3600) / 60);

  return (
    <Pressable style={styles.container} onPress={onPress}>
      {book.coverUrl ? (
        <Image source={{ uri: book.coverUrl }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.placeholder]}>
          <Text style={styles.placeholderText}>?</Text>
        </View>
      )}
      <Text style={styles.title} numberOfLines={2}>{book.title}</Text>
      <Text style={styles.time}>{hours}h {minutes}m</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { width: 120, marginRight: spacing(4) },
  cover: { width: 120, height: 180, backgroundColor: COLORS.surface, marginBottom: spacing(2) },
  placeholder: { justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  placeholderText: { color: COLORS.textMuted, fontSize: 48, fontFamily: 'Courier' },
  title: { color: COLORS.text, fontFamily: 'Courier', fontSize: fontSize('small') },
  time: { color: COLORS.textMuted, fontFamily: 'Courier', fontSize: fontSize('small') },
});
```

**Commit:**
```bash
git add components/BookCard.tsx
git commit -m "feat: add BookCard component"
```

---

### Task 16: Home Screen

**Files:**
- Modify: `app/(tabs)/index.tsx`

```typescript
// app/(tabs)/index.tsx
// Follows BlahFret design system - lowercase, trailing underscores, bracket actions
import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { storage } from '@/lib/storage';
import { calculateLevel, xpProgress } from '@/lib/xp';
import { Book, UserProgress } from '@/lib/types';
import { COLORS, FONTS, spacing, fontSize, letterSpacing } from '@/lib/theme';

export default function HomeScreen() {
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const cursorAnim = useRef(new Animated.Value(1)).current;

  // Blinking cursor animation (530ms cycle from design system)
  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorAnim, { toValue: 0, duration: 0, delay: 530, useNativeDriver: true }),
        Animated.timing(cursorAnim, { toValue: 1, duration: 0, delay: 530, useNativeDriver: true }),
      ])
    );
    blink.start();
    return () => blink.stop();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    const books = await storage.getBooks();
    const reading = books.find(b => b.status === 'reading');
    setCurrentBook(reading || null);
    setProgress(await storage.getProgress());
  }

  const level = progress ? calculateLevel(progress.totalXp) : 1;
  const xp = progress ? xpProgress(progress.totalXp) : { current: 0, needed: 1000 };

  return (
    <View style={styles.container}>
      {/* Logo with blinking cursor */}
      <View style={styles.logoRow}>
        <Text style={styles.logo}>blah_read</Text>
        <Animated.Text style={[styles.cursor, { opacity: cursorAnim }]}>▌</Animated.Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <Text style={styles.stat}>level {level}</Text>
        <Text style={styles.stat}>streak: {progress?.currentStreak || 0}_</Text>
      </View>

      {/* XP progress bar */}
      <View style={styles.xpBar}>
        <View style={[styles.xpFill, { width: `${(xp.current / xp.needed) * 100}%` }]} />
      </View>
      <Text style={styles.xpText}>{xp.current} / {xp.needed} xp</Text>

      {/* Current book card */}
      {currentBook ? (
        <Pressable
          style={styles.currentBook}
          onPress={() => router.push(`/timer/${currentBook.id}`)}
        >
          <Text style={styles.bookLabel}>currently reading_</Text>
          <Text style={styles.bookTitle}>{currentBook.title.toLowerCase()}</Text>
          <Text style={styles.startButton}>[ start reading ]</Text>
        </Pressable>
      ) : (
        <Pressable style={styles.currentBook} onPress={() => router.push('/library')}>
          <Text style={styles.bookLabel}>no book selected_</Text>
          <Text style={styles.startButton}>[ pick a book ]</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: spacing(6), // 24px - contentPadding from design system
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(12), // 48px - logo to content spacing
  },
  logo: {
    color: COLORS.text,
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: fontSize('hero'), // 48px
    letterSpacing: letterSpacing('normal'),
  },
  cursor: {
    color: COLORS.text,
    fontFamily: FONTS.mono,
    fontSize: fontSize('hero'),
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing(4),
  },
  stat: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.mono,
    fontSize: fontSize('body'), // 14px
    letterSpacing: letterSpacing('tight'),
  },
  xpBar: {
    height: 4, // Progress track height from design system
    backgroundColor: COLORS.backgroundCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: spacing(2),
  },
  xpFill: {
    height: '100%',
    backgroundColor: COLORS.success,
  },
  xpText: {
    color: COLORS.success,
    fontFamily: FONTS.mono,
    fontSize: fontSize('small'), // 12px
    letterSpacing: letterSpacing('tight'),
    marginBottom: spacing(10), // 40px - section separation
  },
  currentBook: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.backgroundCard,
    padding: spacing(6),
  },
  bookLabel: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.mono,
    fontSize: fontSize('small'),
    letterSpacing: letterSpacing('tight'),
    marginBottom: spacing(2),
  },
  bookTitle: {
    color: COLORS.text,
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: fontSize('large'), // 18px
    letterSpacing: letterSpacing('tight'),
    marginBottom: spacing(6),
    textAlign: 'center',
  },
  startButton: {
    color: COLORS.text,
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: fontSize('large'),
    letterSpacing: letterSpacing('hero'), // 4 for CTAs
  },
});
```

**Commit:**
```bash
git add app/(tabs)/index.tsx
git commit -m "feat: add home screen with current book and stats"
```

---

### Task 17: Library Screen

**Files:**
- Modify: `app/(tabs)/library.tsx`

```typescript
// app/(tabs)/library.tsx
import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, TextInput } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { storage } from '@/lib/storage';
import { searchGoogleBooks } from '@/lib/googleBooks';
import { BookCard } from '@/components/BookCard';
import { Book, BookStatus } from '@/lib/types';
import { COLORS, spacing, fontSize } from '@/lib/theme';

export default function LibraryScreen() {
  const [books, setBooks] = useState<Book[]>([]);
  const [filter, setFilter] = useState<BookStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadBooks();
    }, [])
  );

  async function loadBooks() {
    setBooks(await storage.getBooks());
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const result = await searchGoogleBooks(searchQuery);
    if (result) {
      const book: Book = {
        id: Date.now().toString(),
        title: result.title,
        coverUrl: result.coverUrl,
        synopsis: result.description,
        sourceUrl: null,
        status: 'to_read',
        totalReadingTime: 0,
        createdAt: Date.now(),
      };
      await storage.saveBook(book);
      await loadBooks();
    }
    setSearching(false);
    setSearchQuery('');
  }

  const filtered = filter === 'all' ? books : books.filter(b => b.status === filter);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>library_</Text>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="search books..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
        />
        <Pressable style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>{searching ? '...' : '+'}</Text>
        </Pressable>
      </View>

      <View style={styles.filters}>
        {(['all', 'to_read', 'reading', 'finished'] as const).map(f => (
          <Pressable key={f} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterActive]}>
              {f.replace('_', ' ')}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        numColumns={3}
        renderItem={({ item }) => (
          <BookCard book={item} onPress={() => router.push(`/book/${item.id}`)} />
        )}
        contentContainerStyle={styles.grid}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: spacing(4) },
  header: { color: COLORS.text, fontFamily: 'Courier', fontSize: fontSize('title'), marginBottom: spacing(4) },
  searchRow: { flexDirection: 'row', marginBottom: spacing(4) },
  searchInput: { flex: 1, borderWidth: 1, borderColor: COLORS.border, padding: spacing(2), color: COLORS.text, fontFamily: 'Courier' },
  searchButton: { borderWidth: 1, borderColor: COLORS.border, padding: spacing(2), marginLeft: spacing(2), width: 44, alignItems: 'center' },
  searchButtonText: { color: COLORS.text, fontFamily: 'Courier', fontSize: fontSize('large') },
  filters: { flexDirection: 'row', gap: spacing(4), marginBottom: spacing(4) },
  filterText: { color: COLORS.textMuted, fontFamily: 'Courier', fontSize: fontSize('small') },
  filterActive: { color: COLORS.text, textDecorationLine: 'underline' },
  grid: { gap: spacing(4) },
});
```

**Commit:**
```bash
git add app/(tabs)/library.tsx
git commit -m "feat: add library screen with filtering and search"
```

---

### Task 18: Profile Screen

**Files:**
- Modify: `app/(tabs)/profile.tsx`

```typescript
// app/(tabs)/profile.tsx
// Character sheet view - follows BlahFret design system
import { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { storage } from '@/lib/storage';
import { calculateLevel, xpProgress } from '@/lib/xp';
import { UserProgress, Book, LootItem } from '@/lib/types';
import { COLORS, FONTS, spacing, fontSize, letterSpacing } from '@/lib/theme';

// Rank titles per spec (Level 1 -> 50 progression)
const RANK_TITLES = [
  { level: 1, title: 'novice' },
  { level: 10, title: 'apprentice' },
  { level: 25, title: 'scholar' },
  { level: 50, title: 'grandmaster' },
];

// Rarity colors from design system
const RARITY_COLORS: Record<string, string> = {
  common: COLORS.rarityCommon,    // #555555
  rare: COLORS.rarityRare,        // #4A90D9
  epic: COLORS.rarityEpic,        // #9B59B6
  legendary: COLORS.rarityLegendary, // #F1C40F
};

export default function ProfileScreen() {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [books, setBooks] = useState<Book[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    setProgress(await storage.getProgress());
    setBooks(await storage.getBooks());
  }

  const level = progress ? calculateLevel(progress.totalXp) : 1;
  const rank = RANK_TITLES.filter(r => r.level <= level).pop()?.title || 'novice';
  const xp = progress ? xpProgress(progress.totalXp) : { current: 0, needed: 1000 };
  const totalHours = books.reduce((sum, b) => sum + b.totalReadingTime, 0) / 3600;
  const companions = books.filter(b => b.companion).map(b => b.companion!);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>profile_</Text>

      {/* Level and Rank */}
      <View style={styles.levelCard}>
        <Text style={styles.levelNumber}>{level}</Text>
        <Text style={styles.rankTitle}>{rank}_</Text>
        <View style={styles.xpBar}>
          <View style={[styles.xpFill, { width: `${(xp.current / xp.needed) * 100}%` }]} />
        </View>
        <Text style={styles.xpText}>{xp.current} / {xp.needed} xp to next level</Text>
      </View>

      {/* Stats Grid - uses 1px gap technique from design system */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>total xp</Text>
          <Text style={styles.statValue}>{progress?.totalXp || 0}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>hours read</Text>
          <Text style={styles.statValue}>{totalHours.toFixed(1)}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>books finished</Text>
          <Text style={styles.statValue}>{books.filter(b => b.status === 'finished').length}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>longest streak</Text>
          <Text style={styles.statValue}>{progress?.longestStreak || 0}</Text>
        </View>
      </View>

      {/* Section: Loot (using SectionHeader pattern) */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>INVENTORY</Text>
      </View>

      <Text style={styles.sectionTitle}>loot_</Text>
      {(progress?.lootItems?.length || 0) > 0 ? (
        <FlatList
          data={progress?.lootItems}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={[styles.lootItem, { borderColor: RARITY_COLORS[item.rarity] }]}>
              <Text style={[styles.lootName, { color: RARITY_COLORS[item.rarity] }]}>
                {item.name.toLowerCase()}
              </Text>
              <Text style={styles.lootRarity}>{item.rarity}</Text>
            </View>
          )}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>no loot yet_</Text>
          <Text style={styles.emptySubtext}>read for 60 minutes to earn loot</Text>
        </View>
      )}

      {/* Section: Companions */}
      <Text style={styles.sectionTitle}>companions_</Text>
      {companions.length > 0 ? (
        <FlatList
          data={companions}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.companionCard}>
              <Text style={styles.companionCreature}>{item.creature.toLowerCase()}</Text>
              <Text style={styles.companionArchetype}>{item.archetype.toLowerCase()}_</Text>
            </View>
          )}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>no companions yet_</Text>
          <Text style={styles.emptySubtext}>finish a book to unlock its companion</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: spacing(6), // 24px contentPadding
    paddingBottom: spacing(25), // Extra space for tab bar
  },
  header: {
    color: COLORS.text,
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: fontSize('title'), // 28px
    letterSpacing: letterSpacing('normal'),
    marginBottom: spacing(6),
  },
  // Level card
  levelCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.backgroundCard,
    padding: spacing(6),
    alignItems: 'center',
    marginBottom: spacing(8),
  },
  levelNumber: {
    color: COLORS.text,
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: 64, // Large hero display
    letterSpacing: letterSpacing('normal'),
  },
  rankTitle: {
    color: COLORS.success,
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: fontSize('large'),
    letterSpacing: letterSpacing('normal'),
    marginBottom: spacing(4),
  },
  xpBar: {
    width: '100%',
    height: 4,
    backgroundColor: COLORS.background,
    marginBottom: spacing(2),
  },
  xpFill: {
    height: '100%',
    backgroundColor: COLORS.success,
  },
  xpText: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.mono,
    fontSize: fontSize('small'),
    letterSpacing: letterSpacing('tight'),
  },
  // Stats grid (1px gap technique from design system)
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
    marginBottom: spacing(8),
    backgroundColor: COLORS.border,
  },
  statCard: {
    width: '49.5%',
    backgroundColor: COLORS.background,
    padding: spacing(6),
    alignItems: 'center',
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.mono,
    fontSize: fontSize('micro'), // 10px
    letterSpacing: letterSpacing('normal'),
    marginBottom: spacing(2),
  },
  statValue: {
    color: COLORS.text,
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: 20,
    letterSpacing: letterSpacing('tight'),
  },
  // Section header (uppercase category label from design system)
  sectionHeader: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: spacing(6),
    marginBottom: spacing(6),
    marginTop: spacing(2),
  },
  sectionHeaderText: {
    color: COLORS.textMuted,
    fontFamily: FONTS.mono,
    fontSize: fontSize('micro'),
    letterSpacing: letterSpacing('wide'), // 3
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: COLORS.text,
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: fontSize('body'),
    letterSpacing: letterSpacing('tight'),
    marginBottom: spacing(4),
  },
  // Loot items
  lootItem: {
    borderWidth: 1,
    padding: spacing(4),
    marginRight: spacing(3),
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    minWidth: 80,
  },
  lootName: {
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: fontSize('small'),
    letterSpacing: letterSpacing('tight'),
    marginBottom: spacing(1),
  },
  lootRarity: {
    color: COLORS.textMuted,
    fontFamily: FONTS.mono,
    fontSize: fontSize('micro'),
    letterSpacing: letterSpacing('tight'),
  },
  // Companion cards
  companionCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: spacing(4),
    marginRight: spacing(3),
    backgroundColor: COLORS.backgroundCard,
    minWidth: 100,
  },
  companionCreature: {
    color: COLORS.text,
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: fontSize('body'),
    letterSpacing: letterSpacing('tight'),
  },
  companionArchetype: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.mono,
    fontSize: fontSize('small'),
    letterSpacing: letterSpacing('tight'),
  },
  // Empty state (from design system EmptyState component)
  emptyContainer: {
    paddingVertical: spacing(8),
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.text,
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: fontSize('large'),
    letterSpacing: letterSpacing('normal'),
    marginBottom: spacing(3),
  },
  emptySubtext: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.mono,
    fontSize: fontSize('small'),
    letterSpacing: letterSpacing('tight'),
  },
});
```

**Commit:**
```bash
git add app/(tabs)/profile.tsx
git commit -m "feat: add profile screen with stats, loot, and companions"
```

---

### Task 19: Book Detail Screen

**Files:**
- Create: `app/book/[id].tsx`

```typescript
// app/book/[id].tsx
// Follows BlahFret design system
import { useEffect, useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { storage } from '@/lib/storage';
import { canUnlockCompanion, generateCompanion } from '@/lib/companionGenerator';
import { Book } from '@/lib/types';
import { COLORS, FONTS, spacing, fontSize, letterSpacing } from '@/lib/theme';

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [book, setBook] = useState<Book | null>(null);

  useEffect(() => {
    loadBook();
  }, [id]);

  async function loadBook() {
    const books = await storage.getBooks();
    setBook(books.find(b => b.id === id) || null);
  }

  async function handleStatusChange(status: Book['status']) {
    if (!book) return;
    book.status = status;
    if (status === 'finished') book.finishedAt = Date.now();
    await storage.saveBook(book);
    await loadBook();
  }

  async function handleGenerateCompanion() {
    if (!book) return;
    Alert.alert('api key required_', 'add your openai api key in settings');
  }

  const hours = book ? Math.floor(book.totalReadingTime / 3600) : 0;
  const minutes = book ? Math.floor((book.totalReadingTime % 3600) / 60) : 0;

  if (!book) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Back navigation (angle bracket pattern from design system) */}
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.back}>{'< back'}</Text>
      </Pressable>

      {/* Book cover */}
      {book.coverUrl && <Image source={{ uri: book.coverUrl }} style={styles.cover} />}

      {/* Book info */}
      <Text style={styles.title}>{book.title.toLowerCase()}</Text>
      <Text style={styles.time}>{hours}h {minutes}m read_</Text>

      {/* Status toggle (ToggleCard pattern) */}
      <View style={styles.statusRow}>
        {(['to_read', 'reading', 'finished'] as const).map(s => (
          <Pressable
            key={s}
            style={[styles.statusButton, book.status === s && styles.statusActive]}
            onPress={() => handleStatusChange(s)}
          >
            <Text style={[styles.statusText, book.status === s && styles.statusTextActive]}>
              {s.replace('_', ' ')}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Action buttons (CommandButton pattern) */}
      {book.status === 'reading' && (
        <Pressable style={styles.primaryButton} onPress={() => router.push(`/timer/${book.id}`)}>
          <Text style={styles.primaryButtonText}>[ start timer ]</Text>
        </Pressable>
      )}

      {canUnlockCompanion(book) && !book.companion && (
        <Pressable style={styles.secondaryButton} onPress={handleGenerateCompanion}>
          <Text style={styles.secondaryButtonText}>[ generate companion ]</Text>
        </Pressable>
      )}

      {/* Companion card */}
      {book.companion && (
        <View style={styles.companionCard}>
          <Text style={styles.companionLabel}>companion unlocked_</Text>
          <Text style={styles.companionName}>{book.companion.creature.toLowerCase()}</Text>
          <Text style={styles.companionArchetype}>{book.companion.archetype.toLowerCase()}_</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: spacing(6),
  },
  backButton: {
    paddingVertical: spacing(2),
    marginBottom: spacing(6),
  },
  back: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.mono,
    fontSize: fontSize('body'),
    letterSpacing: letterSpacing('tight'),
  },
  cover: {
    width: 150,
    height: 225,
    alignSelf: 'center',
    marginBottom: spacing(6),
  },
  title: {
    color: COLORS.text,
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: fontSize('large'),
    letterSpacing: letterSpacing('tight'),
    textAlign: 'center',
    marginBottom: spacing(2),
  },
  time: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.mono,
    fontSize: fontSize('body'),
    letterSpacing: letterSpacing('tight'),
    textAlign: 'center',
    marginBottom: spacing(6),
  },
  // Status toggles (OptionButton pattern from design system)
  statusRow: {
    flexDirection: 'row',
    gap: 1,
    backgroundColor: COLORS.border,
    marginBottom: spacing(8),
  },
  statusButton: {
    flex: 1,
    paddingVertical: spacing(4),
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
  },
  statusActive: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.text,
  },
  statusText: {
    color: COLORS.textMuted,
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: fontSize('small'),
    letterSpacing: letterSpacing('tight'),
  },
  statusTextActive: {
    color: COLORS.text,
  },
  // Primary CTA button
  primaryButton: {
    borderWidth: 1,
    borderColor: COLORS.text,
    paddingVertical: spacing(5),
    alignItems: 'center',
    marginBottom: spacing(3),
  },
  primaryButtonText: {
    color: COLORS.text,
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: fontSize('large'),
    letterSpacing: letterSpacing('hero'),
  },
  // Secondary button
  secondaryButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: spacing(4),
    alignItems: 'center',
    marginBottom: spacing(3),
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.mono,
    fontSize: fontSize('body'),
    letterSpacing: letterSpacing('normal'),
  },
  // Companion unlock card
  companionCard: {
    borderWidth: 1,
    borderColor: COLORS.success,
    backgroundColor: COLORS.backgroundCard,
    padding: spacing(6),
    marginTop: spacing(4),
    alignItems: 'center',
  },
  companionLabel: {
    color: COLORS.success,
    fontFamily: FONTS.mono,
    fontSize: fontSize('small'),
    letterSpacing: letterSpacing('tight'),
    marginBottom: spacing(2),
  },
  companionName: {
    color: COLORS.text,
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: fontSize('large'),
    letterSpacing: letterSpacing('tight'),
  },
  companionArchetype: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.mono,
    fontSize: fontSize('small'),
    letterSpacing: letterSpacing('tight'),
  },
});
```

**Commit:**
```bash
git add app/book/[id].tsx
git commit -m "feat: add book detail screen with status and companion unlock"
```

---

### Task 20: Manual Time Entry

**Files:**
- Create: `app/manual-entry.tsx`

```typescript
// app/manual-entry.tsx
// Follows BlahFret design system
import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { storage } from '@/lib/storage';
import { calculateXp } from '@/lib/xp';
import { updateStreak, getDateString } from '@/lib/streak';
import { ReadingSession } from '@/lib/types';
import { COLORS, FONTS, spacing, fontSize, letterSpacing } from '@/lib/theme';

export default function ManualEntryScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const [minutes, setMinutes] = useState('');

  async function handleSubmit() {
    const mins = parseInt(minutes, 10);
    if (!mins || mins <= 0 || !bookId) return;

    const duration = mins * 60;
    const progress = await storage.getProgress();

    // Update streak
    const today = getDateString();
    const streakUpdate = updateStreak(
      progress.lastReadDate,
      today,
      progress.currentStreak,
      progress.longestStreak
    );
    progress.currentStreak = streakUpdate.currentStreak;
    progress.longestStreak = streakUpdate.longestStreak;
    progress.lastReadDate = streakUpdate.lastReadDate;

    const xp = calculateXp(duration, progress.currentStreak);

    const session: ReadingSession = {
      id: Date.now().toString(),
      bookId,
      startTime: Date.now() - duration * 1000,
      endTime: Date.now(),
      duration,
      xpEarned: xp,
    };
    await storage.saveSession(session);

    const books = await storage.getBooks();
    const book = books.find(b => b.id === bookId);
    if (book) {
      book.totalReadingTime += duration;
      book.status = 'reading';
      await storage.saveBook(book);
    }

    progress.totalXp += xp;
    await storage.saveProgress(progress);

    router.back();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>forgot to track?_</Text>
      <Text style={styles.label}>how many minutes did you read?</Text>

      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        value={minutes}
        onChangeText={setMinutes}
        placeholder="45"
        placeholderTextColor={COLORS.textMuted}
        selectionColor={COLORS.text}
      />

      <Pressable style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>[ add time ]</Text>
      </Pressable>

      <Pressable onPress={() => router.back()} style={styles.cancelButton}>
        <Text style={styles.cancelText}>cancel</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: spacing(6),
    justifyContent: 'center',
  },
  header: {
    color: COLORS.text,
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: fontSize('title'),
    letterSpacing: letterSpacing('normal'),
    marginBottom: spacing(4),
  },
  label: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.mono,
    fontSize: fontSize('body'),
    letterSpacing: letterSpacing('tight'),
    marginBottom: spacing(4),
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.backgroundCard,
    padding: spacing(4),
    color: COLORS.text,
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: 48, // Large input for easy entry
    letterSpacing: letterSpacing('normal'),
    marginBottom: spacing(6),
    textAlign: 'center',
  },
  button: {
    borderWidth: 1,
    borderColor: COLORS.text,
    paddingVertical: spacing(5),
    alignItems: 'center',
    marginBottom: spacing(4),
  },
  buttonText: {
    color: COLORS.text,
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: fontSize('large'),
    letterSpacing: letterSpacing('hero'),
  },
  cancelButton: {
    paddingVertical: spacing(3),
    alignItems: 'center',
  },
  cancelText: {
    color: COLORS.textMuted,
    fontFamily: FONTS.mono,
    fontSize: fontSize('body'),
    letterSpacing: letterSpacing('tight'),
  },
});
```

**Commit:**
```bash
git add app/manual-entry.tsx
git commit -m "feat: add manual time entry screen"
```

---

## Phase 6: Streak Logic

### Task 21: Streak Calculator

**Files:**
- Create: `lib/streak.ts`

**Step 1: Write failing test**

```typescript
// __tests__/lib/streak.test.ts
import { updateStreak, getDateString } from '@/lib/streak';

describe('streak', () => {
  it('increments streak for consecutive days', () => {
    const result = updateStreak('2026-01-26', '2026-01-27', 5);
    expect(result.currentStreak).toBe(6);
  });

  it('resets streak if day was skipped', () => {
    const result = updateStreak('2026-01-25', '2026-01-27', 5);
    expect(result.currentStreak).toBe(1);
  });

  it('maintains streak for same day', () => {
    const result = updateStreak('2026-01-27', '2026-01-27', 5);
    expect(result.currentStreak).toBe(5);
  });

  it('updates longest streak when current exceeds it', () => {
    const result = updateStreak('2026-01-26', '2026-01-27', 10, 8);
    expect(result.longestStreak).toBe(11);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/streak.test.ts`
Expected: FAIL

**Step 3: Write implementation**

```typescript
// lib/streak.ts
export function getDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

export function updateStreak(
  lastReadDate: string | null,
  today: string,
  currentStreak: number,
  longestStreak: number = 0
): { currentStreak: number; longestStreak: number; lastReadDate: string } {
  if (!lastReadDate) {
    return { currentStreak: 1, longestStreak: Math.max(1, longestStreak), lastReadDate: today };
  }

  if (lastReadDate === today) {
    return { currentStreak, longestStreak, lastReadDate: today };
  }

  const last = new Date(lastReadDate);
  const current = new Date(today);
  const diffDays = Math.floor((current.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    const newStreak = currentStreak + 1;
    return {
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, longestStreak),
      lastReadDate: today,
    };
  }

  return { currentStreak: 1, longestStreak: Math.max(1, longestStreak), lastReadDate: today };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/streak.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/streak.ts __tests__/lib/streak.test.ts
git commit -m "feat: add streak calculation logic"
```

---

## Summary

**Total Tasks:** 21
**Phases:**
1. Foundation (Tasks 1-4): Project setup, theme, types, storage
2. Link Eater (Tasks 5-7): OG scraper, Google Books, share intent
3. Focus Timer (Tasks 8-11): XP, loot, timer hook, timer screen
4. Context Engine (Tasks 12-14): LLM, image gen, companion flow
5. UI Screens (Tasks 15-20): Components and all screens
6. Streak Logic (Task 21): Streak calculations

**Key Files:**
- `lib/theme.ts` - Design tokens
- `lib/types.ts` - Data models
- `lib/storage.ts` - AsyncStorage layer
- `lib/ogScraper.ts` - URL metadata extraction
- `lib/xp.ts` - XP/leveling calculations
- `lib/loot.ts` - Loot drop system
- `lib/llm.ts` - LLM integration
- `lib/imageGen.ts` - Pixel art generation
- `hooks/useTimer.ts` - Timer hook
- `app/(tabs)/*` - Main tab screens
- `app/timer/[bookId].tsx` - Reading session timer
- `app/book/[id].tsx` - Book detail view
