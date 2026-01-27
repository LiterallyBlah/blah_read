# Config Screen Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a settings screen with API configuration, reading goals, display preferences, and data management.

**Architecture:** Settings stored in AsyncStorage via new `lib/settings.ts`. ThemeContext provides colors app-wide. OpenRouter API validates model capabilities. expo-notifications handles smart reminders.

**Tech Stack:** React Native, AsyncStorage, expo-notifications, expo-file-system, expo-sharing

---

### Task 1: Settings Types and Storage

**Files:**
- Create: `lib/settings.ts`
- Create: `__tests__/lib/settings.test.ts`

**Step 1: Write failing test**

```typescript
// __tests__/lib/settings.test.ts
import { settings, defaultSettings, Settings } from '@/lib/settings';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage');

describe('settings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns default settings when none saved', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    const result = await settings.get();
    expect(result.apiKey).toBeNull();
    expect(result.llmModel).toBe('google/gemini-2.5-flash-preview-05-20');
    expect(result.imageModel).toBe('bytedance-seed/seedream-4.5');
    expect(result.theme).toBe('auto');
  });

  it('saves and retrieves settings', async () => {
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({ apiKey: 'test-key' }));

    await settings.set({ apiKey: 'test-key' });
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/settings.test.ts`
Expected: FAIL with "Cannot find module '@/lib/settings'"

**Step 3: Write implementation**

```typescript
// lib/settings.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'blahread:settings';

export interface Settings {
  // API
  apiKey: string | null;
  llmModel: string;
  imageModel: string;
  // Goals
  dailyTarget: number;
  reminderEnabled: boolean;
  reminderTime: string;
  // Display
  theme: 'auto' | 'dark' | 'light';
  fontScale: 0.85 | 1 | 1.2;
}

export const defaultSettings: Settings = {
  apiKey: null,
  llmModel: 'google/gemini-2.5-flash-preview-05-20',
  imageModel: 'bytedance-seed/seedream-4.5',
  dailyTarget: 30,
  reminderEnabled: false,
  reminderTime: '20:00',
  theme: 'auto',
  fontScale: 1,
};

export const settings = {
  async get(): Promise<Settings> {
    const data = await AsyncStorage.getItem(SETTINGS_KEY);
    return data ? { ...defaultSettings, ...JSON.parse(data) } : defaultSettings;
  },

  async set(partial: Partial<Settings>): Promise<void> {
    const current = await this.get();
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...partial }));
  },
};
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/settings.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/settings.ts __tests__/lib/settings.test.ts
git commit -m "feat: add settings storage layer"
```

---

### Task 2: OpenRouter Model Validation

**Files:**
- Create: `lib/openrouter.ts`
- Create: `__tests__/lib/openrouter.test.ts`

**Step 1: Write failing test**

```typescript
// __tests__/lib/openrouter.test.ts
import { parseModelsResponse, supportsImageOutput } from '@/lib/openrouter';

describe('openrouter', () => {
  it('parses models response', () => {
    const response = {
      data: [
        { id: 'model-1', name: 'Model 1', architecture: { output_modalities: ['text'] } },
        { id: 'model-2', name: 'Model 2', architecture: { output_modalities: ['text', 'image'] } },
      ],
    };
    const models = parseModelsResponse(response);
    expect(models).toHaveLength(2);
    expect(models[0].id).toBe('model-1');
  });

  it('detects image output support', () => {
    const imageModel = { id: 'x', name: 'x', outputModalities: ['text', 'image'] };
    const textModel = { id: 'y', name: 'y', outputModalities: ['text'] };
    expect(supportsImageOutput(imageModel)).toBe(true);
    expect(supportsImageOutput(textModel)).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/openrouter.test.ts`
Expected: FAIL

**Step 3: Write implementation**

```typescript
// lib/openrouter.ts
const API_URL = 'https://openrouter.ai/api/v1';

export interface OpenRouterModel {
  id: string;
  name: string;
  outputModalities: string[];
}

export function parseModelsResponse(response: any): OpenRouterModel[] {
  return (response.data || []).map((m: any) => ({
    id: m.id,
    name: m.name,
    outputModalities: m.architecture?.output_modalities || ['text'],
  }));
}

export function supportsImageOutput(model: OpenRouterModel): boolean {
  return model.outputModalities.includes('image');
}

export async function fetchModels(apiKey: string): Promise<OpenRouterModel[]> {
  const response = await fetch(`${API_URL}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) throw new Error('Failed to fetch models');
  return parseModelsResponse(await response.json());
}

export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    await fetchModels(apiKey);
    return true;
  } catch {
    return false;
  }
}

export async function validateImageModel(apiKey: string, modelId: string): Promise<boolean> {
  const models = await fetchModels(apiKey);
  const model = models.find(m => m.id === modelId);
  return model ? supportsImageOutput(model) : false;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/openrouter.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/openrouter.ts __tests__/lib/openrouter.test.ts
git commit -m "feat: add OpenRouter model validation"
```

---

### Task 3: Light Theme Colors

**Files:**
- Modify: `lib/theme.ts`
- Modify: `__tests__/lib/theme.test.ts`

**Step 1: Add test for light colors**

```typescript
// Add to __tests__/lib/theme.test.ts
import { COLORS, COLORS_LIGHT } from '@/lib/theme';

it('exports COLORS_LIGHT with inverted palette', () => {
  expect(COLORS_LIGHT.background).toBe('#ffffff');
  expect(COLORS_LIGHT.text).toBe('#0a0a0a');
  expect(COLORS_LIGHT.success).toBe(COLORS.success); // Status colors unchanged
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/theme.test.ts`
Expected: FAIL with "COLORS_LIGHT is not exported"

**Step 3: Add COLORS_LIGHT to theme.ts**

Add after COLORS definition:

```typescript
export const COLORS_LIGHT = {
  // Backgrounds (inverted)
  background: '#ffffff',
  backgroundLight: '#f5f5f5',
  backgroundCard: '#f0f0f0',
  surface: '#f0f0f0',

  // Text (inverted)
  primary: '#0a0a0a',
  primaryMuted: '#333333',
  text: '#0a0a0a',
  textSecondary: '#555555',
  textMuted: '#888888',

  // Borders (inverted)
  border: '#e0e0e0',
  secondary: '#e0e0e0',
  accent: '#d0d0d0',

  // Status (unchanged)
  success: '#00ff88',
  error: '#ff4444',
  warning: '#ffaa00',

  // Rarity (unchanged)
  rarityCommon: '#555555',
  rarityRare: '#4A90D9',
  rarityEpic: '#9B59B6',
  rarityLegendary: '#F1C40F',

  // Prestige (unchanged)
  prestigeBronze: '#CD7F32',
  prestigeSilver: '#C0C0C0',
  prestigeGold: '#FFD700',
  prestigePlatinum: '#E5E4E2',
  prestigeDiamond: '#B9F2FF',
} as const;
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/theme.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/theme.ts __tests__/lib/theme.test.ts
git commit -m "feat: add light theme colors"
```

---

### Task 4: Theme Context Provider

**Files:**
- Create: `lib/ThemeContext.tsx`

**Step 1: Create ThemeContext**

```typescript
// lib/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { COLORS, COLORS_LIGHT, FONTS, spacing as baseSpacing, fontSize as baseFontSize, letterSpacing } from './theme';
import { settings, Settings } from './settings';

interface ThemeContextValue {
  colors: typeof COLORS;
  fonts: typeof FONTS;
  spacing: typeof baseSpacing;
  fontSize: (size: 'micro' | 'small' | 'body' | 'large' | 'title' | 'hero') => number;
  letterSpacing: typeof letterSpacing;
  isDark: boolean;
  fontScale: number;
  reload: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [theme, setTheme] = useState<'auto' | 'dark' | 'light'>('auto');
  const [fontScale, setFontScale] = useState<number>(1);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const s = await settings.get();
    setTheme(s.theme);
    setFontScale(s.fontScale);
  }

  const isDark = theme === 'auto' ? systemScheme !== 'light' : theme === 'dark';
  const colors = isDark ? COLORS : COLORS_LIGHT;

  const scaledFontSize = (size: 'micro' | 'small' | 'body' | 'large' | 'title' | 'hero') => {
    return Math.round(baseFontSize(size) * fontScale);
  };

  return (
    <ThemeContext.Provider value={{
      colors,
      fonts: FONTS,
      spacing: baseSpacing,
      fontSize: scaledFontSize,
      letterSpacing,
      isDark,
      fontScale,
      reload: loadSettings,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
```

**Step 2: Commit**

```bash
git add lib/ThemeContext.tsx
git commit -m "feat: add ThemeContext provider"
```

---

### Task 5: Wrap App in ThemeProvider

**Files:**
- Modify: `app/_layout.tsx`

**Step 1: Update root layout**

```typescript
// app/_layout.tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '@/lib/ThemeContext';

function RootLayoutInner() {
  const { isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutInner />
    </ThemeProvider>
  );
}
```

**Step 2: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat: wrap app in ThemeProvider"
```

---

### Task 6: Install Dependencies

**Step 1: Install expo-notifications, expo-file-system, expo-sharing**

```bash
npx expo install expo-notifications expo-file-system expo-sharing
```

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add expo-notifications, file-system, sharing"
```

---

### Task 7: Data Management Functions

**Files:**
- Modify: `lib/settings.ts`
- Modify: `__tests__/lib/settings.test.ts`

**Step 1: Add test for data functions**

```typescript
// Add to __tests__/lib/settings.test.ts
import { exportAllData, clearProgress, resetApp } from '@/lib/settings';

it('exportAllData returns JSON string', async () => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue('[]');
  const data = await exportAllData();
  expect(typeof data).toBe('string');
  expect(() => JSON.parse(data)).not.toThrow();
});

it('clearProgress resets XP but keeps books', async () => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({ totalXp: 100 }));
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  await clearProgress();
  expect(AsyncStorage.setItem).toHaveBeenCalled();
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/settings.test.ts`
Expected: FAIL

**Step 3: Add functions to settings.ts**

```typescript
// Add to lib/settings.ts
import { storage } from './storage';

export async function exportAllData(): Promise<string> {
  const [books, sessions, progress, settingsData] = await Promise.all([
    storage.getBooks(),
    storage.getSessions(),
    storage.getProgress(),
    settings.get(),
  ]);
  return JSON.stringify({ books, sessions, progress, settings: settingsData }, null, 2);
}

export async function clearProgress(): Promise<void> {
  await storage.saveProgress({
    totalXp: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    lastReadDate: null,
    lootItems: [],
  });
}

export async function resetApp(): Promise<void> {
  await AsyncStorage.multiRemove([
    'blahread:books',
    'blahread:sessions',
    'blahread:progress',
    'blahread:settings',
  ]);
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/settings.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/settings.ts __tests__/lib/settings.test.ts
git commit -m "feat: add data export, clear, reset functions"
```

---

### Task 8: Config Screen UI - API Section

**Files:**
- Create: `app/config.tsx`

**Step 1: Create config screen with API section**

```typescript
// app/config.tsx
import { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import { settings, Settings } from '@/lib/settings';
import { validateApiKey, validateImageModel } from '@/lib/openrouter';
import { FONTS } from '@/lib/theme';

type ApiStatus = 'not set' | 'testing' | 'connected' | 'invalid';

export default function ConfigScreen() {
  const { colors, spacing, fontSize, letterSpacing } = useTheme();
  const [config, setConfig] = useState<Settings | null>(null);
  const [apiStatus, setApiStatus] = useState<ApiStatus>('not set');
  const [imageModelValid, setImageModelValid] = useState<boolean | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('api');

  useEffect(() => { loadConfig(); }, []);

  async function loadConfig() {
    const c = await settings.get();
    setConfig(c);
    setApiStatus(c.apiKey ? 'connected' : 'not set');
  }

  async function updateConfig(partial: Partial<Settings>) {
    if (!config) return;
    const updated = { ...config, ...partial };
    setConfig(updated);
    await settings.set(partial);
  }

  async function testApiKey() {
    if (!config?.apiKey) return;
    setApiStatus('testing');
    const valid = await validateApiKey(config.apiKey);
    setApiStatus(valid ? 'connected' : 'invalid');
  }

  async function checkImageModel() {
    if (!config?.apiKey || !config?.imageModel) return;
    const valid = await validateImageModel(config.apiKey, config.imageModel);
    setImageModelValid(valid);
  }

  const styles = createStyles(colors, spacing, fontSize, letterSpacing);

  if (!config) return <View style={styles.container}><Text style={styles.text}>loading..._</Text></View>;

  return (
    <ScrollView style={styles.container}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>{'<'} back</Text>
      </Pressable>

      <Text style={styles.title}>config_</Text>

      {/* API Section */}
      <Pressable style={styles.sectionHeader} onPress={() => setExpandedSection(expandedSection === 'api' ? null : 'api')}>
        <Text style={styles.sectionTitle}>[api] {expandedSection === 'api' ? '▼' : '▶'}</Text>
      </Pressable>

      {expandedSection === 'api' && (
        <View style={styles.sectionContent}>
          <Text style={styles.label}>openrouter key_</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={config.apiKey || ''}
              onChangeText={v => updateConfig({ apiKey: v || null })}
              placeholder="sk-or-..."
              placeholderTextColor={colors.textMuted}
              secureTextEntry
            />
            <Pressable style={styles.smallButton} onPress={testApiKey}>
              <Text style={styles.smallButtonText}>[test]</Text>
            </Pressable>
          </View>
          <Text style={[styles.status, apiStatus === 'connected' && { color: colors.success }]}>
            status: {apiStatus}_
          </Text>

          <Text style={styles.label}>llm model_</Text>
          <TextInput
            style={styles.input}
            value={config.llmModel}
            onChangeText={v => updateConfig({ llmModel: v })}
            placeholder="google/gemini-2.5-flash-preview-05-20"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>image model_</Text>
          <TextInput
            style={styles.input}
            value={config.imageModel}
            onChangeText={v => { updateConfig({ imageModel: v }); setImageModelValid(null); }}
            onBlur={checkImageModel}
            placeholder="bytedance-seed/seedream-4.5"
            placeholderTextColor={colors.textMuted}
          />
          {imageModelValid === true && <Text style={[styles.hint, { color: colors.success }]}>✓ supports image output</Text>}
          {imageModelValid === false && <Text style={[styles.hint, { color: colors.error }]}>⚠ model does not support image generation</Text>}
        </View>
      )}
    </ScrollView>
  );
}

function createStyles(colors: any, spacing: any, fontSize: any, letterSpacing: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: spacing(6), paddingTop: spacing(16) },
    backButton: { marginBottom: spacing(6) },
    backText: { color: colors.textSecondary, fontFamily: FONTS.mono, fontSize: fontSize('body') },
    title: { color: colors.text, fontFamily: FONTS.mono, fontWeight: '700', fontSize: fontSize('title'), marginBottom: spacing(6) },
    sectionHeader: { paddingVertical: spacing(3), borderBottomWidth: 1, borderBottomColor: colors.border },
    sectionTitle: { color: colors.text, fontFamily: FONTS.mono, fontSize: fontSize('body'), letterSpacing: letterSpacing('tight') },
    sectionContent: { paddingVertical: spacing(4) },
    label: { color: colors.textSecondary, fontFamily: FONTS.mono, fontSize: fontSize('small'), marginBottom: spacing(2), marginTop: spacing(4) },
    input: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.backgroundCard, color: colors.text, fontFamily: FONTS.mono, fontSize: fontSize('body'), padding: spacing(3) },
    row: { flexDirection: 'row', gap: spacing(2) },
    smallButton: { borderWidth: 1, borderColor: colors.border, padding: spacing(3), justifyContent: 'center' },
    smallButtonText: { color: colors.textSecondary, fontFamily: FONTS.mono, fontSize: fontSize('small') },
    status: { color: colors.textMuted, fontFamily: FONTS.mono, fontSize: fontSize('small'), marginTop: spacing(2) },
    hint: { color: colors.textMuted, fontFamily: FONTS.mono, fontSize: fontSize('small'), marginTop: spacing(1) },
    text: { color: colors.text, fontFamily: FONTS.mono, fontSize: fontSize('body') },
  });
}
```

**Step 2: Commit**

```bash
git add app/config.tsx
git commit -m "feat: add config screen with API section"
```

---

### Task 9: Config Screen - Goals Section

**Files:**
- Modify: `app/config.tsx`

**Step 1: Add goals section after API section**

Add inside ScrollView, after API section:

```typescript
{/* Goals Section */}
<Pressable style={styles.sectionHeader} onPress={() => setExpandedSection(expandedSection === 'goals' ? null : 'goals')}>
  <Text style={styles.sectionTitle}>[goals] {expandedSection === 'goals' ? '▼' : '▶'}</Text>
</Pressable>

{expandedSection === 'goals' && (
  <View style={styles.sectionContent}>
    <Text style={styles.label}>daily target_</Text>
    <View style={styles.row}>
      <TextInput
        style={[styles.input, { width: 80, textAlign: 'center' }]}
        value={String(config.dailyTarget)}
        onChangeText={v => updateConfig({ dailyTarget: parseInt(v, 10) || 30 })}
        keyboardType="number-pad"
      />
      <Text style={styles.hint}>minutes</Text>
    </View>

    <Text style={styles.label}>reminder_</Text>
    <View style={styles.row}>
      <Pressable
        style={[styles.toggleButton, config.reminderEnabled && styles.toggleActive]}
        onPress={() => updateConfig({ reminderEnabled: !config.reminderEnabled })}
      >
        <Text style={[styles.toggleText, config.reminderEnabled && styles.toggleTextActive]}>
          [{config.reminderEnabled ? 'on' : 'off'}]
        </Text>
      </Pressable>
      {config.reminderEnabled && (
        <>
          <Text style={styles.hint}>at</Text>
          <TextInput
            style={[styles.input, { width: 80, textAlign: 'center' }]}
            value={config.reminderTime}
            onChangeText={v => updateConfig({ reminderTime: v })}
            placeholder="20:00"
            placeholderTextColor={colors.textMuted}
          />
        </>
      )}
    </View>
    <Text style={styles.hint}>only notifies if you haven't hit your goal yet</Text>
  </View>
)}
```

Add to styles:
```typescript
toggleButton: { borderWidth: 1, borderColor: colors.border, padding: spacing(2) },
toggleActive: { borderColor: colors.text, backgroundColor: colors.backgroundCard },
toggleText: { color: colors.textMuted, fontFamily: FONTS.mono, fontSize: fontSize('small') },
toggleTextActive: { color: colors.text },
```

**Step 2: Commit**

```bash
git add app/config.tsx
git commit -m "feat: add goals section to config"
```

---

### Task 10: Config Screen - Display Section

**Files:**
- Modify: `app/config.tsx`

**Step 1: Add display section**

Add after goals section:

```typescript
{/* Display Section */}
<Pressable style={styles.sectionHeader} onPress={() => setExpandedSection(expandedSection === 'display' ? null : 'display')}>
  <Text style={styles.sectionTitle}>[display] {expandedSection === 'display' ? '▼' : '▶'}</Text>
</Pressable>

{expandedSection === 'display' && (
  <View style={styles.sectionContent}>
    <Text style={styles.label}>theme_</Text>
    <View style={styles.row}>
      {(['auto', 'dark', 'light'] as const).map(t => (
        <Pressable
          key={t}
          style={[styles.toggleButton, config.theme === t && styles.toggleActive]}
          onPress={() => updateConfig({ theme: t })}
        >
          <Text style={[styles.toggleText, config.theme === t && styles.toggleTextActive]}>[{t}]</Text>
        </Pressable>
      ))}
    </View>
    <Text style={styles.hint}>auto follows your device setting</Text>

    <Text style={styles.label}>font size_</Text>
    <View style={styles.row}>
      {([0.85, 1, 1.2] as const).map((s, i) => (
        <Pressable
          key={s}
          style={[styles.toggleButton, config.fontScale === s && styles.toggleActive]}
          onPress={() => updateConfig({ fontScale: s })}
        >
          <Text style={[styles.toggleText, config.fontScale === s && styles.toggleTextActive, { fontSize: fontSize('body') * s }]}>
            A
          </Text>
        </Pressable>
      ))}
    </View>
  </View>
)}
```

**Step 2: Commit**

```bash
git add app/config.tsx
git commit -m "feat: add display section to config"
```

---

### Task 11: Config Screen - Data Section

**Files:**
- Modify: `app/config.tsx`

**Step 1: Add imports and data section**

Add imports:
```typescript
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { exportAllData, clearProgress, resetApp } from '@/lib/settings';
```

Add data section:

```typescript
{/* Data Section */}
<Pressable style={styles.sectionHeader} onPress={() => setExpandedSection(expandedSection === 'data' ? null : 'data')}>
  <Text style={styles.sectionTitle}>[data] {expandedSection === 'data' ? '▼' : '▶'}</Text>
</Pressable>

{expandedSection === 'data' && (
  <View style={styles.sectionContent}>
    <Text style={styles.label}>export_</Text>
    <Pressable style={styles.actionButton} onPress={handleExport}>
      <Text style={styles.actionButtonText}>[download json]</Text>
    </Pressable>

    <Text style={styles.label}>clear progress_</Text>
    <Pressable style={styles.actionButton} onPress={handleClearProgress}>
      <Text style={styles.actionButtonText}>[reset stats]</Text>
    </Pressable>
    <Text style={styles.hint}>keeps your books, clears xp, streaks, and loot</Text>

    <Text style={[styles.label, { color: colors.error }]}>reset app_</Text>
    <Pressable style={[styles.actionButton, styles.dangerButton]} onPress={handleReset}>
      <Text style={[styles.actionButtonText, { color: colors.error }]}>[delete everything]</Text>
    </Pressable>
  </View>
)}
```

Add handlers:
```typescript
async function handleExport() {
  const data = await exportAllData();
  const path = `${FileSystem.documentDirectory}blahread-export-${new Date().toISOString().split('T')[0]}.json`;
  await FileSystem.writeAsStringAsync(path, data);
  await Sharing.shareAsync(path);
}

async function handleClearProgress() {
  Alert.alert('Clear Progress', 'Reset all XP, streaks, and loot? Books will be kept.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Clear', style: 'destructive', onPress: async () => { await clearProgress(); Alert.alert('Done', 'Progress cleared.'); } },
  ]);
}

async function handleReset() {
  Alert.prompt('Reset App', 'Type "reset" to confirm deletion of all data.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async (text) => {
      if (text === 'reset') { await resetApp(); router.replace('/'); }
    }},
  ]);
}
```

Add styles:
```typescript
actionButton: { borderWidth: 1, borderColor: colors.border, padding: spacing(3), marginTop: spacing(2) },
actionButtonText: { color: colors.textSecondary, fontFamily: FONTS.mono, fontSize: fontSize('small'), textAlign: 'center' },
dangerButton: { borderColor: colors.error },
```

**Step 2: Commit**

```bash
git add app/config.tsx
git commit -m "feat: add data section to config"
```

---

### Task 12: Add Config Link to Profile

**Files:**
- Modify: `app/(tabs)/profile.tsx`

**Step 1: Add config link at top of profile**

Add import:
```typescript
import { router } from 'expo-router';
```

Add after title, before stats section:
```typescript
<Pressable style={styles.configLink} onPress={() => router.push('/config')}>
  <Text style={styles.configLinkText}>[config]</Text>
</Pressable>
```

Add style:
```typescript
configLink: { position: 'absolute', top: spacing(16), right: spacing(6) },
configLinkText: { color: COLORS.textSecondary, fontFamily: FONTS.mono, fontSize: fontSize('small') },
```

**Step 2: Commit**

```bash
git add app/\(tabs\)/profile.tsx
git commit -m "feat: add config link to profile screen"
```

---

### Task 13: Update Companion Generator to Use Settings

**Files:**
- Modify: `lib/companionGenerator.ts`

**Step 1: Update to read API key and models from settings**

```typescript
// lib/companionGenerator.ts
import { storage } from './storage';
import { settings } from './settings';
import { generateCompanionData } from './llm';
import { generateCompanionImage } from './imageGen';
import { Book, Companion } from './types';

const UNLOCK_THRESHOLD = 5 * 60 * 60;

export function canUnlockCompanion(book: Book): boolean {
  return !book.companion && !!book.synopsis && (book.status === 'finished' || book.totalReadingTime >= UNLOCK_THRESHOLD);
}

export async function generateCompanion(book: Book): Promise<Companion> {
  if (!book.synopsis) throw new Error('Book has no synopsis');

  const config = await settings.get();
  if (!config.apiKey) throw new Error('API key not configured');

  const companionData = await generateCompanionData(book.synopsis, config.apiKey, { model: config.llmModel });
  const imageUrl = await generateCompanionImage(companionData.creature, companionData.keywords, config.apiKey, { model: config.imageModel });

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

**Step 2: Update book detail screen to not require apiKey param**

In `app/book/[id].tsx`, update handleUnlockCompanion:

```typescript
async function handleUnlockCompanion() {
  if (!book) return;
  setGenerating(true);
  try {
    await generateCompanion(book);
    await loadBook();
  } catch (error: any) {
    Alert.alert('Generation Failed', error.message || 'Could not generate companion.');
  } finally {
    setGenerating(false);
  }
}
```

Remove the TODO comment and apiKey check.

**Step 3: Commit**

```bash
git add lib/companionGenerator.ts app/book/[id].tsx
git commit -m "feat: use settings for API key and models in companion generation"
```

---

### Task 14: Run All Tests

**Step 1: Run full test suite**

```bash
npm test
```

Expected: All tests pass

**Step 2: Commit any test fixes if needed**

---

### Task 15: Final Verification

**Step 1: Start the app**

```bash
npx expo start
```

**Step 2: Manual verification checklist**

- [ ] Profile shows [config] link
- [ ] Config screen opens with 4 collapsible sections
- [ ] API key can be entered and tested
- [ ] Models can be changed, image model shows validation
- [ ] Theme toggle switches between auto/dark/light
- [ ] Font size changes apply
- [ ] Export downloads JSON file
- [ ] Clear progress resets stats
- [ ] Reset app clears all data

**Step 3: Commit final changes**

```bash
git add -A
git commit -m "feat: complete config screen implementation"
```
