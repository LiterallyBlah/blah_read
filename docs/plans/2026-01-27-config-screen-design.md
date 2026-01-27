# Config Screen Design

## Overview

Settings screen for API configuration, reading goals, display preferences, and data management. All data stored device-only in AsyncStorage.

## Entry Point

Accessible from profile screen via `[config]` link at top. Single scrollable screen with collapsible sections.

## New Files

- `app/config.tsx` - Main config screen
- `lib/settings.ts` - Settings storage/retrieval
- `lib/openrouter.ts` - Model fetching & validation
- `lib/ThemeContext.tsx` - Theme provider for dark/light mode

## Sections

### 1. API Configuration

**API Key:**
- Masked input field with reveal toggle
- `[test]` button validates key via `/api/v1/models`
- Status indicator: `not set_`, `testing..._`, `connected_`, `invalid_`

**Model Selection:**
- LLM model: free text input, default `google/gemini-2.5-flash-preview-05-20`
- Image model: free text input, default `bytedance-seed/seedream-4.5`
- Validate image model supports `output_modalities.includes("image")`
- Show warning if incompatible: `⚠ model does not support image generation_`

### 2. Reading Goals

**Daily Target:**
- Numeric input in minutes, default 30
- Progress resets at midnight local time
- Displayed on home screen as progress bar

**Smart Reminders:**
- Toggle on/off with time picker
- Uses `expo-notifications` for local notifications
- Only notifies if daily goal not yet met
- Notification text: `"you haven't read today - X min to go_"`
- Request permission when user enables reminders

### 3. Display Preferences

**Theme:**
- Three options: Auto, Dark, Light
- Auto follows device `useColorScheme()`
- Dark: current OLED black theme
- Light: inverted (white background, dark text)

**Light Theme Colors:**
```typescript
COLORS_LIGHT = {
  background: '#ffffff',
  backgroundCard: '#f5f5f5',
  surface: '#f5f5f5',
  text: '#0a0a0a',
  textSecondary: '#555555',
  textMuted: '#888888',
  border: '#e0e0e0',
  // success, error, rarity colors unchanged
}
```

**Font Size:**
- Three presets: small (0.85x), normal (1x), large (1.2x)
- Applies multiplier to all `fontSize()` calls

### 4. Data Management

**Export:**
- Downloads all data as JSON via `expo-file-system`
- Opens share sheet for save/send options
- Filename: `blahread-export-YYYY-MM-DD.json`

**Clear Progress:**
- Resets: XP, level, streaks, loot
- Keeps: books, sessions, companions, settings
- Requires confirmation dialog

**Reset App:**
- Clears all AsyncStorage data
- Two-step confirmation: type "reset" to confirm
- Red danger zone styling

## Settings Schema

```typescript
interface Settings {
  // API
  apiKey: string | null;
  llmModel: string;
  imageModel: string;

  // Goals
  dailyTarget: number; // minutes
  reminderEnabled: boolean;
  reminderTime: string; // "HH:MM"

  // Display
  theme: 'auto' | 'dark' | 'light';
  fontScale: 0.85 | 1 | 1.2;
}
```

Storage key: `blahread:settings`

## Dependencies

- `expo-notifications` - Local scheduled notifications
- `expo-file-system` - Export data to file
- `expo-sharing` - Share exported file

## Implementation Notes

1. Create `ThemeContext` provider wrapping app in `_layout.tsx`
2. Components use `useTheme()` hook instead of importing `COLORS` directly
3. Reschedule reminder notification after each reading session
4. Cancel reminder if daily goal already met
