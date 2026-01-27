# BlahFret Design System

A universal design document for replicating the BlahFret visual language in Expo/React Native applications.

---

## Table of Contents

1. [Design Principles](#design-principles)
2. [Color Tokens](#color-tokens)
3. [Icons & Avatars](#icons--avatars)
4. [Typography](#typography)
5. [Layout & Spacing](#layout--spacing)
6. [UI Grammar](#ui-grammar)
7. [Component Recipes](#component-recipes)
8. [Motion & Animation](#motion--animation)
9. [Haptic Feedback](#haptic-feedback)
10. [Audio Feedback](#audio-feedback)
11. [Navigation & Modals](#navigation--modals)
12. [Screen Templates](#screen-templates)
13. [Brand Assets](#brand-assets)
14. [External Dependencies](#external-dependencies)
15. [Consistency Audit](#consistency-audit)

---

## Design Principles

The BlahFret visual language is built on a **monochrome typewriter aesthetic** that evokes terminal interfaces and vintage computing.

### Core Tenets

1. **Monochrome palette**: Near-black backgrounds with white text. No gradients, no shadows.
2. **Square geometry**: All interactive elements use square corners (borderRadius: 0). Only small status indicators may be circular.
3. **Text-as-UI**: Actions are rendered as typographic tokens (e.g., `[ start ]`, `< back`) rather than icons or filled buttons.
4. **Thin borders**: 1px borders define structure. Borders are the primary visual separator.
5. **Typewriter typography**: Courier monospace throughout. Letter-spacing adds breathing room.
6. **Lowercase-first**: Nearly all UI copy uses lowercase for a casual, terminal-like feel.
7. **Minimal decoration**: No shadows, no gradients, no decorative elements. Content is king.

---

## Color Tokens

All colors are defined in `app/_layout.tsx` and should be imported from there.

### Background Colors

| Token             | Hex         | Usage                                           |
|-------------------|-------------|-------------------------------------------------|
| `background`      | `#0a0a0a`   | Primary app background, screen containers       |
| `backgroundLight` | `#141414`   | Slightly elevated surfaces (rarely used)        |
| `backgroundCard`  | `#1a1a1a`   | Card backgrounds, unselected toggle states      |

### Text Colors

| Token           | Hex         | Usage                                           |
|-----------------|-------------|-------------------------------------------------|
| `text`          | `#ffffff`   | Primary text, active labels, selected states    |
| `primary`       | `#ffffff`   | Alias for `text` (primary brand color)          |
| `primaryMuted`  | `#e0e0e0`   | Slightly dimmed primary (rarely used)           |
| `textSecondary` | `#888888`   | Descriptions, hints, inactive labels            |
| `textMuted`     | `#555555`   | Placeholders, disabled text, tertiary info      |

### Border & Accent Colors

| Token       | Hex         | Usage                                           |
|-------------|-------------|-------------------------------------------------|
| `border`    | `#2a2a2a`   | Default borders, dividers, inactive outlines    |
| `secondary` | `#2a2a2a`   | Alias for `border`                              |
| `accent`    | `#3a3a3a`   | Subtle accent (rarely used)                     |

### Status Colors

| Token     | Hex         | Usage                                           |
|-----------|-------------|-------------------------------------------------|
| `success` | `#00ff88`   | Correct answers, positive feedback, streaks     |
| `error`   | `#ff4444`   | Incorrect answers, destructive actions          |
| `warning` | `#ffaa00`   | Streaks, caution states, active highlights      |

### Rarity Colors

Used for titles, achievements, and unlockable items in the progression system.

| Rarity      | Hex         | Usage                                           |
|-------------|-------------|-------------------------------------------------|
| `common`    | `#555555`   | Base-tier items, starter content                |
| `rare`      | `#4A90D9`   | Mid-tier unlockables                            |
| `epic`      | `#9B59B6`   | High-tier achievements                          |
| `legendary` | `#F1C40F`   | Top-tier prestigious items                      |

```typescript
// lib/titleUtils.ts
const RARITY_COLORS: Record<TitleRarity, string> = {
  common: '#555555',
  rare: '#4A90D9',
  epic: '#9B59B6',
  legendary: '#F1C40F',
};
```

### Prestige Colors

5-tier prestige system colors displayed as star indicators on profiles.

| Tier | Name        | Hex         | Material Reference               |
|------|-------------|-------------|----------------------------------|
| 1    | Bronze      | `#CD7F32`   | Achievement bronze               |
| 2    | Silver      | `#C0C0C0`   | Achievement silver               |
| 3    | Gold        | `#FFD700`   | Achievement gold                 |
| 4    | Platinum    | `#E5E4E2`   | Premium platinum                 |
| 5    | Diamond     | `#B9F2FF`   | Ultimate tier                    |

```typescript
// Prestige star colors
const PRESTIGE_COLORS = ['#CD7F32', '#C0C0C0', '#FFD700', '#E5E4E2', '#B9F2FF'];
```

### Reference Implementation

```typescript
// app/_layout.tsx
export const COLORS = {
  background: '#0a0a0a',
  backgroundLight: '#141414',
  backgroundCard: '#1a1a1a',
  primary: '#ffffff',
  primaryMuted: '#e0e0e0',
  secondary: '#2a2a2a',
  accent: '#3a3a3a',
  text: '#ffffff',
  textSecondary: '#888888',
  textMuted: '#555555',
  success: '#00ff88',
  error: '#ff4444',
  warning: '#ffaa00',
  border: '#2a2a2a',
};
```

---

## Icons & Avatars

The app uses pixel-art style icons for visual elements and user avatars.

### Icon Library

**Package:** `@hackernoon/pixel-icon-library` (v1.0.6)

A pixel-art icon library providing 48px PNG icons in a retro gaming style that complements the typewriter aesthetic.

**Installation:**
```bash
npm install @hackernoon/pixel-icon-library
```

**Icon Location:**
```
node_modules/@hackernoon/pixel-icon-library/icons/PNG/for-dark-mode/48px/solid/
```

### PixelIcon Component

Custom wrapper component that provides a simplified API for rendering pixel icons.

**Location:** `components/PixelIcon.tsx`

**Usage:**
```tsx
import PixelIcon from '@/components/PixelIcon';

<PixelIcon name="star" size={48} />
<PixelIcon name="music" size={32} />
```

**Available Icons:**

| Name          | Usage                                    |
|---------------|------------------------------------------|
| `star`        | Achievements, ratings, prestige          |
| `music`       | Music/audio related features             |
| `bolt`        | Speed, power, energy                     |
| `heart`       | Favorites, health, likes                 |
| `lightbulb`   | Ideas, tips, hints                       |
| `fire`        | Streaks, hot items, intensity            |
| `trophy`      | Achievements, wins, leaderboards         |
| `badge-check` | Verification, completion                 |
| `headphones`  | Audio, listening mode                    |
| `sparkles`    | Special effects, magic, new              |
| `crown`       | Premium, royalty, top rank               |
| `robot`       | AI, automation                           |
| `moon`        | Night mode, zen, calm                    |
| `trending`    | Progress, growth, statistics             |
| `seedlings`   | Growth, beginners, new users             |

**Icon Assets Location:**
```
assets/icons/
├── star.png
├── music.png
├── bolt.png
├── heart.png
├── lightbulb.png
├── fire.png
├── trophy.png
├── badge-check.png
├── headphones.png
├── sparkles.png
├── crown.png
├── robot.png
├── moon.png
├── trending.png
└── seedlings.png
```

### Avatar System

Avatars are pixel-art icons used for user profile pictures with an unlock progression system.

**Configuration Files:**
- Avatar definitions: `lib/avatars.json`
- Avatar utilities: `lib/avatarUtils.ts`

**Avatar Structure:**
```typescript
interface Avatar {
  id: string;
  name: string;
  icon: string;           // PixelIcon name
  unlockCondition: {
    type: 'starter' | 'trackLevel' | 'prestigeLevel' | 'titleUnlock' | 'behavior';
    // ... condition-specific fields
  };
}
```

**Unlock Conditions:**

| Type           | Description                              | Example                          |
|----------------|------------------------------------------|----------------------------------|
| `starter`      | Available immediately                    | Default avatars                  |
| `trackLevel`   | Unlock at specific track level           | Level 10 in zen mode             |
| `prestigeLevel`| Unlock at prestige tier                  | Reach prestige 3                 |
| `titleUnlock`  | Unlock when earning a title              | Earn "Perfect Run" title         |
| `behavior`     | Unlock through specific actions          | Complete 100 sessions            |

**Default Avatars (Starters):**
- `music` - Musical note icon
- `star` - Star icon
- `bolt` - Lightning bolt icon

**Avatar Selection:**
Users can select their avatar from the profile settings screen. Only unlocked avatars are selectable.

---

## Typography

All text uses the **Courier** monospace font family for a typewriter aesthetic.

### Font Family

```typescript
export const FONTS = {
  mono: 'Courier',
  monoWeight: '400' as const,
  monoBold: '700' as const,
};
```

### Font Weights

| Weight | Usage                                    |
|--------|------------------------------------------|
| `400`  | Body text, descriptions, labels          |
| `700`  | Headings, values, selected states, CTAs  |

### Complete Type Scale (Exact Sizes)

#### Display / Hero Text

| Element                | Base Size | Weight | Letter Spacing | Responsive Scaling          |
|------------------------|-----------|--------|----------------|----------------------------|
| Note Display (main)    | 140px     | 700    | 4              | medium: 1.15x, expanded: 1.3x |
| Countdown Number       | 120px     | 700    | 4              | Fixed                       |
| Performance Score      | 72px      | 700    | 2              | medium: 1.1x, expanded: 1.2x |
| Tuner Target Note      | 80px      | 700    | 4              | medium: 1.1x, expanded: 1.2x |

#### Titles

| Element                | Size | Weight | Letter Spacing | Color              |
|------------------------|------|--------|----------------|--------------------|
| App Logo (`blah_fret`) | 48px | 700    | 2              | `text`             |
| Page Title             | 28px | 700    | 2              | `text`             |
| Paused State           | 32px | 700    | 4              | `text`             |
| Stat Card Value (large)| 24px | 700    | 1              | `text`             |

#### Section & Control Labels

| Element                | Size | Weight | Letter Spacing | Color              |
|------------------------|------|--------|----------------|--------------------|
| Section Title          | 14px | 700    | 1              | `text`             |
| Toggle Label           | 14px | 700    | 1              | `text`             |
| Position Summary       | 18px | 700    | 1              | `text`             |
| Mode Button Text       | 16px | 700    | 2              | `textSecondary` / `text` |
| Slider Value           | 16px | 700    | 1              | `text`             |
| Root Note Button       | 16px | 700    | -              | `textMuted` / `text` |

#### Body & Stats

| Element                | Size | Weight | Letter Spacing | Color              |
|------------------------|------|--------|----------------|--------------------|
| Start Button Text      | 18px | 700    | 4              | `text`             |
| Error Title            | 16px | 700    | 1              | `error`            |
| Streak Text            | 16px | 700    | 2              | `warning`          |
| Stat Value (in-game)   | 20px | 700    | 1              | `text`             |
| Control Button Text    | 14px | 400    | 1              | `text`             |
| Back Button Text       | 14px | 400    | 1              | `textSecondary`    |
| Resume Button Text     | 14px | 400    | 2              | `text`             |
| Countdown Option       | 14px | 400    | 1              | `textMuted` / `text` |
| Option Text            | 14px | 700    | 1              | `textMuted` / `text` |
| Notes/Miss Text        | 14px | 700    | 1              | `textSecondary` / `error` |

#### Descriptions & Secondary Text

| Element                | Size | Weight | Letter Spacing | Color              |
|------------------------|------|--------|----------------|--------------------|
| Page Description       | 12px | 400    | 1              | `textSecondary`    |
| Section Description    | 12px | 400    | 1              | `textSecondary`    |
| Toggle Description     | 12px | 400    | 1              | `textSecondary`    |
| Header Link Text       | 12px | 400    | 1              | `textSecondary`    |
| Mode Label             | 12px | 400    | 2              | `textSecondary`    |
| Toggle Text            | 12px | 700    | 1              | `textMuted` / `text` |
| Progress Text          | 12px | 700    | 1              | `text`             |
| Paused Stat Label      | 12px | 400    | 1              | `textSecondary`    |
| Paused Stat Value      | 12px | 700    | 1              | `text`             |
| Reset Button Text      | 12px | 400    | 1              | `textSecondary`    |
| Quick Start Button     | 12px | 400    | 2              | `textSecondary`    |
| Error Subtext          | 12px | 400    | 1              | `textSecondary`    |
| Stat Value Small       | 12px | 400    | 1              | `text`             |

#### Labels & Captions

| Element                | Size | Weight | Letter Spacing | Color              |
|------------------------|------|--------|----------------|--------------------|
| Fret Button Text       | 11px | 700    | -              | `textMuted` / inverted |
| Tuner Description      | 11px | 400    | 1              | `textSecondary`    |
| Entry Stat             | 11px | 400    | 1              | `textSecondary`    |
| Debug Text             | 11px | 400    | 1              | `textMuted`        |
| Stat Label             | 10px | 400    | 2              | `textSecondary`    |
| Mode Description       | 10px | 400    | 1              | `textMuted`        |
| Section Header (cat.)  | 10px | 400    | 3              | `textMuted` (uppercase) |
| Option Subtext         | 10px | 400    | 1              | `textMuted`        |
| Position Control Label | 10px | 400    | 1              | `textMuted`        |
| Entry Mode/Date        | 10px | 400    | 1              | `textMuted`        |
| Compact Toggle Text    | 10px | 700    | 1              | `textMuted` / inverted |
| Progress Label         | 10px | 400    | 1              | `textSecondary`    |
| Version Text           | 10px | 400    | 2              | `textMuted`        |
| String Toggle Name     | 10px | 400    | 1              | `textMuted`        |
| Listening Label        | 10px | 400    | 1              | `textMuted` / `textSecondary` |

#### Micro Text

| Element                | Size | Weight | Letter Spacing | Color              |
|------------------------|------|--------|----------------|--------------------|
| Trend Bar Label        | 8px  | 400    | -              | `textSecondary`    |

### Letter Spacing Conventions

| Spacing Value | Usage                                    |
|---------------|------------------------------------------|
| `1`           | Small UI elements, descriptions, options |
| `2`           | Labels, stat values, secondary text      |
| `3`           | Section header categories (uppercase)    |
| `4`           | Hero text, primary CTA buttons, logo     |

### Text Transform

- **Section category headers**: `textTransform: 'uppercase'` with `letterSpacing: 3`
- **All other text**: lowercase by convention (not via CSS)

### Android-Specific

For precise vertical alignment on Android:

```typescript
{
  includeFontPadding: false,
  textAlignVertical: 'center',
}
```

---

## Layout & Spacing

Layout rules are defined in `hooks/useResponsive.ts` using Material Design 3 window size classes.

### Breakpoints

| Size Class | Width Range    | Description              |
|------------|----------------|--------------------------|
| `compact`  | < 600dp        | Phones                   |
| `medium`   | 600–839dp      | Foldables, small tablets |
| `expanded` | ≥ 840dp        | Large tablets            |

### Content Width Constraints

| Size Class | Max Content Width | Behavior                        |
|------------|-------------------|---------------------------------|
| `compact`  | `undefined`       | Full width                      |
| `medium`   | `600px`           | Centered with horizontal margin |
| `expanded` | `700px`           | Centered with horizontal margin |

### Content Padding (Screen-Level)

The `contentPadding` value from `useResponsive()` scales with screen size:

| Size Class | contentPadding | Usage                                |
|------------|----------------|--------------------------------------|
| `compact`  | 24px           | Default horizontal padding on phones |
| `medium`   | 32px           | Horizontal padding on foldables      |
| `expanded` | 40px           | Horizontal padding on tablets        |

### Spacing Multipliers

Base spacing values are multiplied by size class using the `spacing(base)` helper:

| Size Class | Multiplier | Example: `spacing(16)` |
|------------|------------|------------------------|
| `compact`  | 1.0x       | 16px                   |
| `medium`   | 1.25x      | 20px                   |
| `expanded` | 1.5x       | 24px                   |

### Font Size Scaling

Hero/display text scales up on larger screens using the `fontSize(base, scale?)` helper:

| Size Class | Default Scale | Note Display Scale | Score Display Scale |
|------------|---------------|-------------------|---------------------|
| `compact`  | 1.0x          | 140px             | 72px                |
| `medium`   | 1.1x          | 161px (1.15x)     | 79px                |
| `expanded` | 1.2x          | 182px (1.3x)      | 86px                |

---

### Screen Padding Specifications

#### ScrollView Screens (Config, Settings, Stats)

| Property              | Value  | Notes                            |
|-----------------------|--------|----------------------------------|
| `scrollContent.padding` | 24px | Base padding (uses `contentPadding` dynamically) |
| `scrollContent.paddingBottom` | 100px | Extra space for pinned footer |

#### Header Section

| Property                    | Value  | Notes                    |
|-----------------------------|--------|--------------------------|
| `header.marginBottom`       | 24px   | Space below header       |
| `header.paddingHorizontal`  | 24px   | Side padding for header  |
| `header.paddingVertical`    | 20px   | Top/bottom padding       |
| `backButton.paddingVertical`| 8px    | Touch target padding     |

#### Title Section

| Property                      | Value  | Notes                    |
|-------------------------------|--------|--------------------------|
| `titleSection.marginBottom`   | 40px   | Large space after title  |
| `pageTitle.marginBottom`      | 8px    | Space before description |

#### Section Dividers

| Property                       | Value  | Notes                     |
|--------------------------------|--------|---------------------------|
| `sectionHeader.paddingTop`     | 24px   | Space above divider line  |
| `sectionHeader.marginBottom`   | 24px   | Space after category label |
| `sectionHeader.marginTop`      | 8px    | Extra top margin          |
| `section.marginBottom`         | 32px   | Space between sections    |
| `sectionDescription.marginBottom` | 20px | Space after description |

---

### Component Padding Specifications

#### Buttons

| Component           | paddingVertical | paddingHorizontal | Notes                |
|---------------------|-----------------|-------------------|----------------------|
| Start Button        | 20px            | -                 | Full width           |
| Secondary Button    | 16px            | -                 | Full width           |
| Quick Start Button  | 14px            | -                 | Full width           |
| Resume Button       | 16px            | 40px              | Centered             |
| Control Button      | 14px            | 12px              | Flex: 1              |
| Empty CTA Button    | 14px            | 24px              | Fixed width          |
| Clear Button        | 16px            | -                 | Full width           |
| Back Button         | 8px             | -                 | Touch target only    |
| Header Link         | 8px             | 4px               | Minimal              |

#### Cards & Containers

| Component           | padding   | Notes                            |
|---------------------|-----------|----------------------------------|
| Toggle Row          | 20px      | All sides                        |
| Entry Card          | 20px      | All sides                        |
| Score Container     | 40px      | Hero card                        |
| Stat Card           | 24px      | Grid items                       |
| Position Card       | 16px      | Complex card with internal gaps  |
| Session Card        | 16px      | List items                       |
| Highlight Card      | 20px      | Feature cards                    |
| Streak Container    | 20px      | Border card                      |
| Paused Stats        | 20px      | Modal stats box                  |
| Error Container     | 32px      | Full screen error                |

#### Option Buttons

| Component           | paddingVertical | paddingHorizontal | Notes              |
|---------------------|-----------------|-------------------|--------------------|
| Mode Button         | 24px            | 16px              | Large selectable   |
| Mode Button Wide    | 20px            | 16px              | Full-width option  |
| Option Button       | 16px            | 12px              | Grid option        |
| Toggle Button       | 16px            | -                 | Row toggle         |
| Direction Button    | 12px            | -                 | Compact toggle     |
| Countdown Option    | 16px            | -                 | Segmented control  |
| Root Note Button    | -               | -                 | 48x48 fixed size   |
| Fret Button         | -               | 6px               | 28x28 min size     |
| Compact Toggle      | 6px             | 10px              | Inline toggle      |

#### Top/Bottom Bars

| Component           | paddingVertical | paddingHorizontal | Notes              |
|---------------------|-----------------|-------------------|--------------------|
| Top Stat Bar        | 20px            | 24px              | Session header     |
| Progress Bar        | 12px            | 24px              | Scale progress     |
| Footer (pinned)     | 24px            | (contentPadding)  | Pinned CTA         |
| Filter Tabs         | -               | 24px              | Tab container      |
| Tab Item            | 12px            | -                 | Individual tab     |
| Controls Row        | 24px (or spacing(16)) | 24px       | Bottom controls    |

---

### Margin Specifications

#### Vertical Spacing Between Elements

| Context                           | marginBottom | Notes                     |
|-----------------------------------|--------------|---------------------------|
| Logo to mode selector             | 48px         | Large breathing room      |
| Mode container to footer          | 40px         | Section separation        |
| Title section to content          | 40px         | Major section break       |
| Section to section                | 32px         | Standard section gap      |
| Paused stats to resume button     | 32px         | Modal layout              |
| Stats grid to next section        | 32px         | Grid separation           |
| Trend container to next           | 32px         | Chart separation          |
| Paused text to stats              | 24px         | Modal header              |
| Header to content                 | 24px         | After navigation          |
| Section header to section         | 24px         | Category to content       |
| Section description to content    | 20px         | Description spacing       |
| Mode label to mode buttons        | 16px         | Label to control gap      |
| Recent section title to content   | 16px         | List header               |
| Entry card margin                 | 12px         | List item spacing         |
| Empty text to subtext             | 12px         | Stacked text              |
| Error text to subtext             | 12px         | Error message             |
| Page title to description         | 8px          | Tight title pair          |
| Label to value                    | 8px          | Label spacing             |
| Mode button text to description   | 8px          | Button internals          |
| Stat label to value               | 4px          | Tight stat pair           |
| Toggle label to description       | 4px          | Inline description        |
| Option text to subtext            | 4px          | Option internals          |
| Position summary subtext margin   | 4px (top)    | Summary details           |

#### Fixed Element Sizes

| Element                 | Size          | Notes                    |
|-------------------------|---------------|--------------------------|
| Root Note Button        | 48 x 48       | Square touch target      |
| Fret Button             | 28 x 28 (min) | Minimum, can grow        |
| Metronome Dot           | 12 x 12       | Circular indicator       |
| Listening Pulse         | 12 x 12       | Outer pulse ring         |
| Listening Dot           | 8 x 8         | Inner dot                |
| Slider Height           | 40px          | Touch target             |
| Streak Container Height | 60px          | Reserved space           |
| Progress Track Height   | 4px           | Thin progress bar        |
| Meter Indicator         | 8 x 20        | Tuner needle             |
| Trend Bar               | 20px width    | Chart bar                |

---

### Responsive Scaling Examples

#### Example: Logo Font Size

```tsx
// Base: 48px on compact
// Scales to 53px on medium (1.1x), 58px on expanded (1.2x)
const logoSize = fontSize(48, { medium: 1.1, expanded: 1.2 });

<Text style={{ fontSize: logoSize }}>blah_fret</Text>
```

#### Example: Note Display Font Size

```tsx
// Base: 140px on compact
// Scales to 161px on medium (1.15x), 182px on expanded (1.3x)
const noteSize = fontSize(140, { medium: 1.15, expanded: 1.3 });
```

#### Example: Dynamic Spacing

```tsx
// Base: 16px control padding
// Scales to 20px on medium, 24px on expanded
const controlPadding = spacing(16);
```

#### Example: Grid Columns

```tsx
// 2 columns on compact, 3 on medium, 4 on expanded
const presetColumns = gridColumns(2, 3, 4);
const presetWidth = presetColumns === 4 ? '23%' : presetColumns === 3 ? '31%' : '48%';
```

### Reference Implementation

```typescript
// hooks/useResponsive.ts
export const BREAKPOINTS = {
  compact: 0,      // < 600dp
  medium: 600,     // 600-839dp
  expanded: 840,   // >= 840dp
};

export const MAX_CONTENT_WIDTH = {
  compact: undefined,  // Full width
  medium: 600,         // Constrained
  expanded: 700,       // Constrained
};

export const SPACING = {
  compact: 1,      // 1.0x multiplier
  medium: 1.25,    // 1.25x multiplier
  expanded: 1.5,   // 1.5x multiplier
};

export function useResponsive(): ResponsiveValues {
  const { width, height } = useWindowDimensions();
  
  const sizeClass = 
    width >= BREAKPOINTS.expanded ? 'expanded' :
    width >= BREAKPOINTS.medium ? 'medium' : 
    'compact';
  
  const contentPadding = isExpanded ? 40 : isMedium ? 32 : 24;
  
  const spacing = (base: number) => Math.round(base * SPACING[sizeClass]);
  
  const fontSize = (base: number, scale?: { medium?: number; expanded?: number }) => {
    if (isExpanded) return Math.round(base * (scale?.expanded ?? 1.2));
    if (isMedium) return Math.round(base * (scale?.medium ?? 1.1));
    return base;
  };
  
  const gridColumns = (compact: number, medium: number, expanded: number) => {
    if (isExpanded) return expanded;
    if (isMedium) return medium;
    return compact;
  };
  
  return { width, height, sizeClass, contentPadding, spacing, fontSize, gridColumns, ... };
}
```

### ResponsiveContainer

Use `ResponsiveContainer` to constrain content width on larger screens:

```tsx
<ResponsiveContainer withPadding={true}>
  {/* Content is centered and width-constrained */}
</ResponsiveContainer>
```

**Props:**
| Prop          | Type              | Default | Description                          |
|---------------|-------------------|---------|--------------------------------------|
| `children`    | `ReactNode`       | -       | Content to render                    |
| `maxWidth`    | `number`          | auto    | Override max width                   |
| `style`       | `ViewStyle`       | -       | Outer container styles               |
| `contentStyle`| `ViewStyle`       | -       | Inner content styles                 |
| `withPadding` | `boolean`         | true    | Apply horizontal padding             |
| `flex`        | `boolean`         | true    | Use flex: 1                          |

---

## UI Grammar

The app uses a distinctive "syntax" for UI text that mimics command-line and typewriter aesthetics.

### Lowercase Convention

Nearly all UI text is lowercase:

| Do                     | Don't                  |
|------------------------|------------------------|
| `global settings_`     | `Global Settings`      |
| `session complete_`    | `Session Complete`     |
| `no scores yet_`       | `No Scores Yet`        |

### Trailing Underscore `_`

Trailing underscores suggest a prompt or active state:

| Pattern           | Usage                              | Examples                                |
|-------------------|------------------------------------|-----------------------------------------|
| `title_`          | Page/section titles                | `global settings_`, `scales mode_`      |
| `label_`          | Form field labels                  | `select mode_`, `quick presets_`        |
| `state_`          | Status indicators                  | `session complete_`, `paused_`          |
| `rating_`         | Dynamic values                     | `excellent_`, `in tune_`                |
| `instruction_`    | Prompts                            | `get ready_`, `play the string`         |

### Square Bracket Actions `[ ]`

Actions/commands are wrapped in brackets with internal spaces:

| Pattern             | Usage                    | Examples                               |
|---------------------|--------------------------|----------------------------------------|
| `[ action ]`        | Primary buttons          | `[ start ]`, `[ play again ]`          |
| `[ action: value ]` | Contextual actions       | `[ quick start: zen ]`                 |
| `[action]`          | Compact inline controls  | `[end]`, `[skip]`, `[pause]`           |

### Text Link Navigation

Back navigation and header links use angle brackets:

| Pattern       | Usage           | Examples              |
|---------------|-----------------|------------------------|
| `< back`      | Back navigation | `< back`               |
| `[label]`     | Header links    | `[scores]`, `[config]` |
| `[ label ]`   | Action links    | `[ tune ]`, `[ clear ]`|

### Brand Name

- Full name: `blah_fret` (underscore between words)
- Short mark: `bf_` (with trailing underscore)

### Examples from the App

```
// Titles
global settings_
scales mode_
session complete_

// Labels  
select mode_
quick presets_
default strings_

// Actions
[ start ]
[ play again ]
[ tap to resume ]
[ reset to defaults ]

// Inline controls
[pause]
[end]
[skip]

// Header links
[scores]
[stats]
[tune]
[config]

// Back navigation
< back

// States
paused_
loading...
calculating...
in tune_
too sharp_
```

---

## Component Recipes

### CommandButton (Primary Action)

The main call-to-action button with bracketed text.

**Structure:**
```tsx
<TouchableOpacity style={styles.startButton} onPress={handleStart}>
  <Text style={styles.startButtonText}>[ start ]</Text>
</TouchableOpacity>
```

**Styles:**
```typescript
startButton: {
  borderWidth: 1,
  borderColor: COLORS.text,        // White border
  paddingVertical: 20,
  alignItems: 'center',
  backgroundColor: COLORS.background,
},
startButtonText: {
  color: COLORS.text,
  fontSize: 18,
  fontFamily: 'Courier',
  fontWeight: '700',
  letterSpacing: 4,
},
```

**Variants:**

| Variant     | Border Color       | Text Color          | Background          |
|-------------|--------------------|--------------------|---------------------|
| Primary     | `COLORS.text`      | `COLORS.text`      | `COLORS.background` |
| Secondary   | `COLORS.border`    | `COLORS.textSecondary` | `COLORS.background` |
| Destructive | `COLORS.border`    | `COLORS.error`     | `COLORS.background` |

---

### Card

Basic container with border.

**Styles:**
```typescript
card: {
  borderWidth: 1,
  borderColor: COLORS.border,
  padding: 16,                     // or 20, 24 depending on content
  backgroundColor: COLORS.backgroundCard,
},
```

---

### ToggleCard / OptionButton

Selectable option with active/inactive states.

**Inactive State:**
```typescript
optionButton: {
  borderWidth: 1,
  borderColor: COLORS.border,
  paddingVertical: 16,
  paddingHorizontal: 12,
  backgroundColor: COLORS.backgroundCard,
},
optionText: {
  fontFamily: 'Courier',
  fontWeight: '700',
  color: COLORS.textMuted,
  letterSpacing: 1,
},
```

**Active/Selected State:**
```typescript
optionButtonSelected: {
  borderColor: COLORS.text,
  backgroundColor: COLORS.background,
},
optionTextSelected: {
  color: COLORS.text,
},
```

---

### InvertedToggle (Small Buttons)

Small toggle buttons that invert colors when selected.

**Inactive State:**
```typescript
fretButton: {
  minWidth: 28,
  height: 28,
  borderWidth: 1,
  borderColor: COLORS.border,
  backgroundColor: COLORS.background,
  justifyContent: 'center',
  alignItems: 'center',
},
fretText: {
  fontSize: 11,
  fontFamily: 'Courier',
  fontWeight: '700',
  color: COLORS.textMuted,
},
```

**Selected State (Inverted):**
```typescript
fretButtonSelected: {
  borderColor: COLORS.text,
  backgroundColor: COLORS.text,       // White background
},
fretTextSelected: {
  color: COLORS.background,           // Black text
},
```

---

### ToggleRow

Full-width toggle with label and Switch.

**Structure:**
```tsx
<View style={styles.toggleRow}>
  <View style={styles.toggleInfo}>
    <Text style={styles.toggleLabel}>haptic feedback_</Text>
    <Text style={styles.toggleDescription}>
      vibrate on correct and incorrect notes
    </Text>
  </View>
  <Switch
    value={value}
    onValueChange={onChange}
    trackColor={{ false: COLORS.border, true: COLORS.textSecondary }}
    thumbColor={COLORS.text}
  />
</View>
```

**Styles:**
```typescript
toggleRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderWidth: 1,
  borderColor: COLORS.border,
  padding: 20,
},
toggleLabel: {
  fontSize: 14,
  fontFamily: 'Courier',
  fontWeight: '700',
  color: COLORS.text,
  marginBottom: 4,
  letterSpacing: 1,
},
toggleDescription: {
  fontSize: 12,
  fontFamily: 'Courier',
  color: COLORS.textSecondary,
  letterSpacing: 1,
},
```

---

### TabBar / FilterTabs

Segmented control using 1px gap technique.

**Structure:**
```tsx
<View style={styles.filterTabs}>
  {tabs.map((tab) => (
    <TouchableOpacity
      key={tab}
      style={[styles.filterTab, active === tab && styles.filterTabActive]}
    >
      <Text style={[styles.filterTabText, active === tab && styles.filterTabTextActive]}>
        {tab}
      </Text>
    </TouchableOpacity>
  ))}
</View>
```

**Styles:**
```typescript
filterTabs: {
  flexDirection: 'row',
  padding: 24,
  gap: 1,                              // Creates 1px dividers
  backgroundColor: COLORS.border,      // Gap color = border
},
filterTab: {
  flex: 1,
  paddingVertical: 12,
  backgroundColor: COLORS.background,
  alignItems: 'center',
},
filterTabActive: {
  backgroundColor: COLORS.backgroundCard,
},
filterTabText: {
  fontSize: 12,
  fontFamily: 'Courier',
  color: COLORS.textMuted,
  letterSpacing: 1,
},
filterTabTextActive: {
  color: COLORS.text,
},
```

---

### StatsGrid

Grid of stat cards using the 1px gap technique.

**Styles:**
```typescript
statsGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 1,                              // Creates 1px grid lines
  marginBottom: 32,
  backgroundColor: COLORS.border,      // Gap color
},
statCard: {
  width: '49.5%',                      // or '24%' for 4 columns
  backgroundColor: COLORS.background,
  padding: 24,
  alignItems: 'center',
},
statCardLabel: {
  fontSize: 10,
  fontFamily: 'Courier',
  color: COLORS.textSecondary,
  marginBottom: 8,
  letterSpacing: 1,
},
statCardValue: {
  fontSize: 20,                        // or 24 for emphasis
  fontFamily: 'Courier',
  fontWeight: '700',
  color: COLORS.text,
  letterSpacing: 1,
},
```

---

### ListItem / EntryCard

Card for list items (leaderboard, history).

**Styles:**
```typescript
entryCard: {
  flexDirection: 'row',
  borderWidth: 1,
  borderColor: COLORS.border,
  padding: 20,
  marginBottom: 12,
},
entryScore: {
  fontSize: 20,
  fontFamily: 'Courier',
  fontWeight: '700',
  color: COLORS.text,
  letterSpacing: 1,
},
entryMode: {
  fontSize: 10,
  fontFamily: 'Courier',
  color: COLORS.textMuted,
  letterSpacing: 1,
},
entryStat: {
  fontSize: 11,
  fontFamily: 'Courier',
  color: COLORS.textSecondary,
  letterSpacing: 1,
},
entryDate: {
  fontSize: 10,
  fontFamily: 'Courier',
  color: COLORS.textMuted,
  letterSpacing: 1,
},
```

---

### SectionHeader

Category divider with uppercase label.

**Styles:**
```typescript
sectionHeader: {
  borderTopWidth: 1,
  borderTopColor: COLORS.border,
  paddingTop: 24,
  marginBottom: 24,
  marginTop: 8,
},
sectionHeaderText: {
  fontSize: 10,
  fontFamily: 'Courier',
  color: COLORS.textMuted,
  letterSpacing: 3,
  textTransform: 'uppercase',
},
```

---

### EmptyState

Empty state with CTA.

**Structure:**
```tsx
<View style={styles.emptyContainer}>
  <Text style={styles.emptyText}>no scores yet_</Text>
  <Text style={styles.emptySubtext}>
    complete a session to save your score
  </Text>
  <TouchableOpacity style={styles.emptyCtaButton}>
    <Text style={styles.emptyCtaText}>[ start practicing ]</Text>
  </TouchableOpacity>
</View>
```

**Styles:**
```typescript
emptyContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  paddingVertical: 60,
},
emptyText: {
  fontSize: 18,
  fontFamily: 'Courier',
  fontWeight: '700',
  color: COLORS.text,
  marginBottom: 12,
  letterSpacing: 2,
},
emptySubtext: {
  fontSize: 12,
  fontFamily: 'Courier',
  color: COLORS.textSecondary,
  textAlign: 'center',
  letterSpacing: 1,
},
emptyCtaButton: {
  marginTop: 24,
  borderWidth: 1,
  borderColor: COLORS.text,
  paddingVertical: 14,
  paddingHorizontal: 24,
},
emptyCtaText: {
  fontSize: 12,
  fontFamily: 'Courier',
  color: COLORS.text,
  letterSpacing: 2,
},
```

---

### ListeningIndicator

Pulsing dot indicator for audio state.

**Structure:**
- Outer pulsing ring (animated scale + opacity)
- Inner static dot
- Text label

**States:**
| State      | Dot Color       | Label          |
|------------|-----------------|----------------|
| Listening  | `#555555`       | "listening"    |
| Detecting  | `#00ff88`       | "detecting"    |

---

### Metronome Dot

Simple pulsing dot synced to BPM.

**Styles:**
```typescript
dot: {
  width: 12,
  height: 12,
  borderRadius: 6,
  backgroundColor: COLORS.text,
},
```

Animated with scale (1 → 1.4 → 1) and opacity (0.3 → 1 → 0.3) per beat.

---

### Slider / Range Input

Range slider for numeric settings (BPM, volume, etc.).

**Component:** `@react-native-community/slider`

**Structure:**
```tsx
import Slider from '@react-native-community/slider';

<View style={styles.sliderContainer}>
  <Slider
    style={styles.slider}
    minimumValue={40}
    maximumValue={200}
    step={1}
    value={bpm}
    onValueChange={setBpm}
    minimumTrackTintColor={COLORS.text}
    maximumTrackTintColor={COLORS.border}
    thumbTintColor={COLORS.text}
  />
  <Text style={styles.sliderValue}>{bpm} bpm</Text>
</View>
```

**Styles:**
```typescript
sliderContainer: {
  marginTop: 12,
},
slider: {
  height: 40,
},
sliderValue: {
  fontSize: 14,
  fontFamily: 'Courier',
  fontWeight: '700',
  color: COLORS.text,
  textAlign: 'center',
  marginTop: 8,
  letterSpacing: 1,
},
```

---

### FingerIndicator

Displays finger number hint for scale patterns with slide-up animation.

**Location:** `components/FingerIndicator.tsx`

**Structure:**
```tsx
<Animated.View style={[styles.container, { opacity, transform: [{ translateY }] }]}>
  <Text style={styles.text}>finger {fingerNumber} ({fingerName})_</Text>
</Animated.View>
```

**Styles:**
```typescript
container: {
  alignItems: 'center',
},
text: {
  fontSize: 14,
  fontFamily: 'Courier',
  color: COLORS.textSecondary,
  letterSpacing: 2,
},
```

**Animation:** Slide-up from 8px with 150ms fade-in when finger changes.

---

### DirectionArrow

Pulsing arrow indicator for fretboard navigation hints.

**Location:** `components/DirectionArrow.tsx`

**Structure:**
```tsx
<Animated.View style={[styles.container, { opacity, transform: [{ scale }] }]}>
  <Text style={styles.arrow}>{direction === 'higher' ? '---->' : '<----'}</Text>
  <Text style={styles.label}>{direction === 'higher' ? 'higher frets' : 'lower frets'}</Text>
</Animated.View>
```

**Styles:**
```typescript
container: {
  alignItems: 'center',
  marginVertical: 8,
},
arrow: {
  fontSize: 24,
  fontFamily: 'Courier',
  fontWeight: '700',
  color: COLORS.warning,
  letterSpacing: 4,
},
label: {
  fontSize: 10,
  fontFamily: 'Courier',
  color: COLORS.textMuted,
  marginTop: 4,
  letterSpacing: 1,
},
```

**Animation:** Continuous pulse 1 → 1.1 → 1 over 800ms cycle.

---

### LookAheadDisplay

Preview of next note in scale/pattern sequences.

**Location:** `components/LookAheadDisplay.tsx`

**Structure:**
```tsx
<View style={styles.container}>
  {showPlayNow && (
    <View style={styles.playNowRow}>
      <View style={styles.pulsingDot} />
      <Text style={styles.playNowText}>play now_</Text>
    </View>
  )}
  <View style={styles.noteCard}>
    <Text style={styles.noteText}>{note}</Text>
    <Text style={styles.stringText}>{stringName}_</Text>
  </View>
</View>
```

**Styles:**
```typescript
container: {
  alignItems: 'center',
},
playNowRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 8,
},
playNowText: {
  fontSize: 12,
  fontFamily: 'Courier',
  color: COLORS.warning,
  letterSpacing: 2,
},
pulsingDot: {
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: COLORS.warning,
  marginRight: 8,
},
noteCard: {
  borderWidth: 1,
  borderColor: COLORS.border,
  padding: 16,
  alignItems: 'center',
  opacity: 0.7,
},
noteText: {
  fontSize: 80,  // Scales with fontSize() helper
  fontFamily: 'Courier',
  fontWeight: '700',
  color: COLORS.text,
},
stringText: {
  fontSize: 12,
  fontFamily: 'Courier',
  color: COLORS.textSecondary,
  letterSpacing: 1,
},
```

---

### LoopProgress

Loop counter with milestone celebrations.

**Location:** `components/LoopProgress.tsx`

**Milestones:** 5, 10, 25, 50, 100 loops trigger celebration animation.

**Structure:**
```tsx
<View style={styles.container}>
  <View style={styles.progressTrack}>
    <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
  </View>
  <Animated.Text style={[styles.loopText, { transform: [{ scale }] }]}>
    loop {currentLoop}_
  </Animated.Text>
  {bpm && <Text style={styles.bpmText}>{bpm} bpm</Text>}
</View>
```

**Styles:**
```typescript
container: {
  alignItems: 'center',
},
progressTrack: {
  width: '100%',
  height: 2,
  backgroundColor: COLORS.border,
  marginBottom: 8,
},
progressFill: {
  height: '100%',
  backgroundColor: COLORS.textSecondary,
},
loopText: {
  fontSize: 14,
  fontFamily: 'Courier',
  fontWeight: '700',
  color: COLORS.text,
  letterSpacing: 2,
},
bpmText: {
  fontSize: 12,
  fontFamily: 'Courier',
  color: COLORS.textMuted,
  marginTop: 4,
  letterSpacing: 1,
},
```

**Animation:** Scale 1.3x on milestone, 1.1x on regular increment. Spring damping: 8.

---

### IntervalDisplay

Musical interval visualization for ear training.

**Location:** `components/IntervalDisplay.tsx`

**Structure:**
```tsx
<View style={styles.container}>
  <Text style={styles.arrow}>{direction === 'up' ? '↑' : '↓'}</Text>
  <Text style={styles.intervalText}>{intervalName}_</Text>
  {isRoot && <Text style={styles.rootHint}>same note_</Text>}
</View>
```

**Styles:**
```typescript
container: {
  alignItems: 'center',
},
arrow: {
  fontSize: 48,
  fontFamily: 'Courier',
  color: COLORS.text,
},
intervalText: {
  fontSize: 72,  // Scales with fontSize() helper
  fontFamily: 'Courier',
  fontWeight: '700',
  color: COLORS.warning,
  letterSpacing: 2,
},
rootHint: {
  fontSize: 14,
  fontFamily: 'Courier',
  color: COLORS.textMuted,
  marginTop: 8,
  letterSpacing: 1,
},
```

---

### IntervalButtons

Multi-choice grid for interval selection in ear training.

**Location:** `components/IntervalButtons.tsx`

**Structure:**
```tsx
<View style={styles.grid}>
  {intervals.map((interval) => (
    <TouchableOpacity
      key={interval.id}
      style={[
        styles.button,
        isCorrect && styles.buttonCorrect,
        disabled && styles.buttonDisabled,
      ]}
      onPress={() => onSelect(interval)}
      disabled={disabled}
    >
      <Text style={[styles.shortName, isCorrect && styles.textInverted]}>
        {interval.shortName}
      </Text>
      <Text style={[styles.fullName, isCorrect && styles.textInverted]}>
        {interval.fullName}
      </Text>
    </TouchableOpacity>
  ))}
</View>
```

**Styles:**
```typescript
grid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
  justifyContent: 'center',
},
button: {
  width: '30%',
  minWidth: 80,
  borderWidth: 1,
  borderColor: COLORS.border,
  paddingVertical: 16,
  paddingHorizontal: 12,
  alignItems: 'center',
  backgroundColor: COLORS.backgroundCard,
},
buttonCorrect: {
  backgroundColor: COLORS.success,
  borderColor: COLORS.success,
},
buttonDisabled: {
  opacity: 0.5,
},
shortName: {
  fontSize: 16,
  fontFamily: 'Courier',
  fontWeight: '700',
  color: COLORS.text,
  letterSpacing: 1,
},
fullName: {
  fontSize: 10,
  fontFamily: 'Courier',
  color: COLORS.textSecondary,
  marginTop: 4,
  letterSpacing: 1,
},
textInverted: {
  color: COLORS.background,
},
```

---

### NoteButtons

Chromatic 12-note selector grid.

**Location:** `components/NoteButtons.tsx`

**Notes:** C, C#, D, D#, E, F, F#, G, G#, A, A#, B

**Structure:**
```tsx
<View style={styles.grid}>
  {CHROMATIC_NOTES.map((note) => (
    <TouchableOpacity
      key={note}
      style={[styles.button, isCorrect && styles.buttonCorrect]}
      onPress={() => onSelect(note)}
    >
      <Text style={[styles.noteText, isCorrect && styles.textInverted]}>
        {note}
      </Text>
    </TouchableOpacity>
  ))}
</View>
```

**Styles:**
```typescript
grid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
  justifyContent: 'center',
},
button: {
  width: '22%',
  minWidth: 60,
  borderWidth: 1,
  borderColor: COLORS.border,
  paddingVertical: 16,
  alignItems: 'center',
  backgroundColor: COLORS.backgroundCard,
},
buttonCorrect: {
  backgroundColor: COLORS.success,
  borderColor: COLORS.success,
},
noteText: {
  fontSize: 16,
  fontFamily: 'Courier',
  fontWeight: '700',
  color: COLORS.text,
  letterSpacing: 1,
},
textInverted: {
  color: COLORS.background,
},
```

---

### ScaleReference

Displays scale notes with root and current note highlighting.

**Location:** `components/ScaleReference.tsx`

**Structure:**
```tsx
<View style={styles.container}>
  <Text style={styles.title}>{rootNote} {scaleName}_</Text>
  <View style={styles.notesRow}>
    {scaleNotes.map((note, index) => (
      <React.Fragment key={note}>
        {index > 0 && <Text style={styles.separator}>·</Text>}
        <Text style={[
          styles.note,
          isRoot(note) && styles.noteRoot,
          isCurrent(note) && styles.noteCurrent,
        ]}>
          {note}
        </Text>
      </React.Fragment>
    ))}
  </View>
</View>
```

**Styles:**
```typescript
container: {
  borderWidth: 1,
  borderColor: COLORS.border,
  backgroundColor: COLORS.backgroundCard,
  padding: 12,
  alignItems: 'center',
},
title: {
  fontSize: 12,
  fontFamily: 'Courier',
  color: COLORS.textSecondary,
  marginBottom: 8,
  letterSpacing: 1,
},
notesRow: {
  flexDirection: 'row',
  alignItems: 'center',
  flexWrap: 'wrap',
  justifyContent: 'center',
},
note: {
  fontSize: 14,
  fontFamily: 'Courier',
  color: COLORS.textMuted,
  letterSpacing: 1,
},
noteRoot: {
  fontWeight: '700',
  color: COLORS.text,
},
noteCurrent: {
  fontWeight: '700',
  color: COLORS.warning,
},
separator: {
  fontSize: 14,
  fontFamily: 'Courier',
  color: COLORS.textMuted,
  marginHorizontal: 6,
},
```

---

## Motion & Animation

All animations use React Native's `Animated` API with `useNativeDriver: true`.

### Screen Transitions

Navigation uses fade transitions:

```typescript
// app/_layout.tsx
<Stack
  screenOptions={{
    animation: 'fade',
  }}
/>
```

---

### Blinking Cursor

The logo cursor (`▌`) blinks with a ~530ms on/off cycle:

```typescript
const cursorAnim = useRef(new Animated.Value(1)).current;

useEffect(() => {
  const blink = Animated.loop(
    Animated.sequence([
      Animated.timing(cursorAnim, {
        toValue: 0,
        duration: 0,
        delay: 530,
        useNativeDriver: true,
      }),
      Animated.timing(cursorAnim, {
        toValue: 1,
        duration: 0,
        delay: 530,
        useNativeDriver: true,
      }),
    ])
  );
  blink.start();
  return () => blink.stop();
}, []);

// Usage
<Animated.Text style={{ opacity: cursorAnim }}>▌</Animated.Text>
```

---

### Score Reveal

Performance score animates in with scale + fade:

```typescript
Animated.timing(scoreAnim, {
  toValue: 1,
  duration: 800,
  useNativeDriver: true,
}).start();

// Interpolate
transform: [{
  scale: scoreAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  }),
}],
opacity: scoreAnim,
```

---

### Feedback Overlay

Flash overlay on correct/incorrect:

**Overlay Flash:**
```typescript
Animated.sequence([
  Animated.timing(overlayOpacity, {
    toValue: 0.15,
    duration: 40,
    useNativeDriver: true,
  }),
  Animated.timing(overlayOpacity, {
    toValue: 0,
    duration: 200,
    useNativeDriver: true,
  }),
]).start();
```

**Icon Animation (Success):**
- Spring scale 0 → 1 (damping: 12)
- Fade in 100ms, hold 100ms, fade out 150ms

**Icon Animation (Miss):**
- Same as success, plus horizontal shake:
```typescript
Animated.sequence([
  Animated.timing(shakeAnim, { toValue: 10, duration: 40 }),
  Animated.timing(shakeAnim, { toValue: -10, duration: 40 }),
  Animated.timing(shakeAnim, { toValue: 10, duration: 40 }),
  Animated.timing(shakeAnim, { toValue: 0, duration: 40 }),
])
```

**Icons:**
- Success: `✓` in `COLORS.success`
- Miss: `✗` in `COLORS.error`

---

### Countdown

Full-screen countdown before session:

**Cadence:** 800ms per number

**Number Animation:**
```typescript
// Scale: 0.5 → 1 (200ms) → 0.9 (600ms)
// Opacity: 0 → 1 (150ms), hold 500ms, → 0 (150ms)
```

**Text:** Numbers `3, 2, 1`, then `go`

**Background:** Full screen `COLORS.background`

---

### Listening Indicator Pulse

Continuous pulse while listening:

```typescript
Animated.loop(
  Animated.sequence([
    Animated.parallel([
      Animated.timing(pulseAnim, { toValue: 1.3, duration: 600 }),
      Animated.timing(opacityAnim, { toValue: 0.3, duration: 600 }),
    ]),
    Animated.parallel([
      Animated.timing(pulseAnim, { toValue: 1, duration: 600 }),
      Animated.timing(opacityAnim, { toValue: 0.6, duration: 600 }),
    ]),
  ])
)
```

---

### Metronome Pulse

Synced to BPM:

```typescript
const beatDuration = (60 / bpm) * 1000;

// Scale: 1 → 1.4 (10% of beat) → 1 (90% of beat)
// Opacity: 0.3 → 1 (10% of beat) → 0.3 (90% of beat)
```

---

### Note Display Pop

When new note appears:

```typescript
Animated.parallel([
  Animated.sequence([
    Animated.timing(scaleAnim, { toValue: 1.05, duration: 80 }),
    Animated.spring(scaleAnim, { toValue: 1, damping: 12 }),
  ]),
  Animated.sequence([
    Animated.timing(opacityAnim, { toValue: 0.6, duration: 40 }),
    Animated.timing(opacityAnim, { toValue: 1, duration: 80 }),
  ]),
])
```

---

### Streak Milestone

Pop-up notification for streak milestones (5, 10, 25, 50, 100):

**Messages:** "nice!", "great!", "amazing!", "incredible!", "legendary!"

**Animation:**
```typescript
// In: spring scale 0.5 → 1, fade 0 → 1, translateY 20 → 0
// Hold: 800ms
// Out: fade 1 → 0, translateY 0 → -30 (300ms)
```

---

### String/Fret Indicator Slide

Subtle slide-up when hint changes:

```typescript
Animated.parallel([
  Animated.timing(opacityAnim, { toValue: 1, duration: 150 }),
  Animated.timing(translateYAnim, { toValue: 0, duration: 150 }),  // from 8
])
```

---

### XP Popup

Floating notification for XP gains/losses in progression system.

**Location:** `components/XpPopup.tsx`

**Animation Sequence:**
```typescript
// Float up and fade
Animated.parallel([
  // Vertical movement: 0 → -30 over 850ms
  Animated.timing(translateYAnim, {
    toValue: -30,
    duration: 850,
    useNativeDriver: true,
  }),
  // Fade sequence: in 150ms, hold 300ms, out 400ms
  Animated.sequence([
    Animated.timing(opacityAnim, { toValue: 1, duration: 150 }),
    Animated.delay(300),
    Animated.timing(opacityAnim, { toValue: 0, duration: 400 }),
  ]),
])
```

**Styles:**
```typescript
container: {
  position: 'absolute',
  top: '40%',
  alignSelf: 'center',
  pointerEvents: 'none',
},
text: {
  fontSize: 24,
  fontFamily: 'Courier',
  fontWeight: '700',
  letterSpacing: 2,
},
textGain: {
  color: COLORS.success,  // +X XP
},
textLoss: {
  color: COLORS.error,    // X XP (negative shown without minus)
},
```

**Format:** `+15 XP` for gains, `5 XP` for losses

---

### Level Up Celebration

Full-screen modal celebration when user levels up.

**Location:** `components/LevelUpCelebration.tsx`

**Modal Animation:**
```typescript
// Spring scale with fade
Animated.parallel([
  Animated.spring(scaleAnim, {
    toValue: 1,
    tension: 50,
    friction: 7,
    useNativeDriver: true,
  }),
  Animated.timing(opacityAnim, {
    toValue: 1,
    duration: 200,
    useNativeDriver: true,
  }),
])
```

**Styles:**
```typescript
overlay: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  justifyContent: 'center',
  alignItems: 'center',
},
content: {
  backgroundColor: COLORS.background,
  borderWidth: 1,
  borderColor: COLORS.success,
  padding: 40,
  alignItems: 'center',
  maxWidth: '85%',
},
title: {
  fontSize: 24,
  fontFamily: 'Courier',
  fontWeight: '700',
  color: COLORS.success,
  letterSpacing: 2,
  marginBottom: 8,
},
trackName: {
  fontSize: 14,
  fontFamily: 'Courier',
  color: COLORS.textSecondary,
  letterSpacing: 1,
  marginBottom: 16,
},
levelNumber: {
  fontSize: 64,
  fontFamily: 'Courier',
  fontWeight: '700',
  color: COLORS.text,
  letterSpacing: 2,
},
```

**Auto-dismiss:** 3 seconds, or tap to dismiss immediately.

---

### Title Unlock Notification

Modal notification when user earns a new title.

**Location:** `components/TitleUnlockNotification.tsx`

**Border color:** Matches title rarity (common, rare, epic, legendary)

**Animation:** Same spring pattern as Level Up Celebration.

**Styles:**
```typescript
overlay: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.85)',
  justifyContent: 'center',
  alignItems: 'center',
},
content: {
  backgroundColor: COLORS.background,
  borderWidth: 1,
  borderColor: rarityColor,  // Dynamic based on title rarity
  padding: 32,
  alignItems: 'center',
  maxWidth: '85%',
},
title: {
  fontSize: 18,
  fontFamily: 'Courier',
  fontWeight: '700',
  color: COLORS.text,
  letterSpacing: 2,
  marginBottom: 8,
},
titleName: {
  fontSize: 24,
  fontFamily: 'Courier',
  fontWeight: '700',
  color: rarityColor,
  letterSpacing: 1,
  marginBottom: 16,
},
buttonRow: {
  flexDirection: 'row',
  gap: 12,
  marginTop: 24,
},
primaryButton: {
  borderWidth: 1,
  borderColor: COLORS.text,
  paddingVertical: 12,
  paddingHorizontal: 20,
},
secondaryButton: {
  borderWidth: 1,
  borderColor: COLORS.border,
  paddingVertical: 12,
  paddingHorizontal: 20,
},
```

**Actions:** "[ set as active ]" (primary) and "[ dismiss ]" (secondary)

---

### Direction Arrow Pulse

Continuous pulsing animation for navigation hints.

**Animation:**
```typescript
Animated.loop(
  Animated.sequence([
    Animated.timing(scaleAnim, {
      toValue: 1.1,
      duration: 400,
      useNativeDriver: true,
    }),
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }),
  ])
)
```

**Fade In/Out:**
- Fade in: 200ms when appearing
- Fade out: 150ms when disappearing

---

### Loop Milestone Celebration

Scale animation when reaching loop milestones.

**Milestones:** 5, 10, 25, 50, 100 loops

**Animation:**
```typescript
// Milestone hit
Animated.spring(scaleAnim, {
  toValue: 1.3,
  damping: 8,
  useNativeDriver: true,
}).start(() => {
  Animated.spring(scaleAnim, {
    toValue: 1,
    damping: 12,
    useNativeDriver: true,
  }).start();
});

// Regular increment
Animated.sequence([
  Animated.spring(scaleAnim, { toValue: 1.1, damping: 10 }),
  Animated.spring(scaleAnim, { toValue: 1, damping: 12 }),
])
```

---

## Screen Templates

### Home Screen

```
┌──────────────────────────────────────┐
│ [scores] [stats]     [tune] [config] │  ← Header links
├──────────────────────────────────────┤
│                                      │
│           blah_fret▌                 │  ← Logo with cursor
│                                      │
│  select mode_                        │
│  ┌─────────────┬─────────────┐       │
│  │     zen     │   pressure  │       │  ← Mode cards
│  │ no time... │ beat the... │       │
│  └─────────────┴─────────────┘       │
│  ┌───────────────────────────┐       │
│  │          scales           │       │
│  │   practice scale...       │       │
│  └───────────────────────────┘       │
│                                      │
├──────────────────────────────────────┤
│        [ start ]                     │  ← Primary CTA
│    [ quick start: zen ]              │  ← Secondary (if available)
└──────────────────────────────────────┘
```

---

### Config Screen

```
┌──────────────────────────────────────┐
│ < back                    [ tune ]   │  ← Header
├──────────────────────────────────────┤
│                                      │
│ zen mode_                            │  ← Title section
│ practice at your own pace            │
│                                      │
│ ─────────────────────────────────────│  ← Section divider
│ PRACTICE DEFAULTS                    │
│                                      │
│ section title_                       │
│ description text                     │
│ [Content...]                         │
│                                      │
│ ┌─────────────────────────────────┐  │
│ │ toggle label_            [===] │  │  ← Toggle row
│ │ description text                │  │
│ └─────────────────────────────────┘  │
│                                      │
├──────────────────────────────────────┤
│            [ start ]                 │  ← Pinned footer CTA
└──────────────────────────────────────┘
```

---

### Session Screen

```
┌──────────────────────────────────────┐
│   score          time         notes  │  ← Top stat bar
│     42          1:23           15    │
├──────────────────────────────────────┤
│                                      │
│                                      │
│               A                      │  ← Large note display
│                                      │
│         a string_                    │  ← String hint
│           fret 5                     │  ← Fret hint
│        hearing: A4                   │  ← Detected note
│           ● detecting                │  ← Listening indicator
│                                      │
│         streak: 5_                   │  ← Streak display
│                                      │
├──────────────────────────────────────┤
│  [pause]    [skip]    [end]          │  ← Control buttons
└──────────────────────────────────────┘
```

**Paused Overlay:**
```
┌──────────────────────────────────────┐
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░ paused_ ░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░ ┌──────────────┐ ░░░░░░░░░░░░│
│░░░░░░░░ │ score    42  │ ░░░░░░░░░░░░│
│░░░░░░░░ │ accuracy 87% │ ░░░░░░░░░░░░│
│░░░░░░░░ │ streak   5   │ ░░░░░░░░░░░░│
│░░░░░░░░ └──────────────┘ ░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░ [ tap to resume ] ░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
└──────────────────────────────────────┘
  (background: rgba(0,0,0,0.95))
```

---

### Results Screen

```
┌──────────────────────────────────────┐
│                                      │
│        session complete_             │
│            zen mode                  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │         performance            │  │
│  │            127                 │  │  ← Hero score
│  │         excellent_             │  │
│  │   ┌─────────────────────────┐  │  │
│  │   │  new personal best!     │  │  │  ← Optional badge
│  │   │  +15 from previous      │  │  │
│  │   └─────────────────────────┘  │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────┬────────┬────────┬─────┐  │
│  │accuracy│avg time│ streak │notes│  │  ← Stats grid
│  │  87%   │ 0.8s   │   12   │ 45  │  │
│  └────────┴────────┴────────┴─────┘  │
│                                      │
│  correct ─────────────────────  42   │
│  missed ──────────────────────   3   │  ← Additional stats
│  duration ───────────────────  2:15  │
│                                      │
│      added to leaderboard_           │  ← Status message
│                                      │
├──────────────────────────────────────┤
│          [ play again ]              │
│   [ reconfigure ]    [ home ]        │  ← Action buttons
└──────────────────────────────────────┘
```

---

### List Screen (Leaderboard/Stats)

```
┌──────────────────────────────────────┐
│  ┌────┬────────┬─────────┬───────┐   │
│  │all │  zen   │pressure │scales │   │  ← Filter tabs
│  └────┴────────┴─────────┴───────┘   │
├──────────────────────────────────────┤
│                                      │
│  ┌────────────────────────────────┐  │
│  │ 01 │ 127      zen              │  │
│  │    │ 87%  0.8s  x12            │  │  ← Entry card
│  │    │ Jan 15                    │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ 02 │ 115      pressure         │  │
│  │    │ 82%  0.9s  x8             │  │
│  │    │ Jan 14                    │  │
│  └────────────────────────────────┘  │
│                                      │
│  ... more entries ...                │
│                                      │
├──────────────────────────────────────┤
│           [ clear ]                  │  ← Footer action
└──────────────────────────────────────┘
```

---

## Brand Assets

### Icon Generation

Icons are generated programmatically with:
- **Background:** `#000000` (pure black)
- **Foreground:** `bf_` text in white
- **Font:** Courier, bold
- **Letter spacing:** Proportional to size

See `scripts/generate-assets.js` for implementation.

### Icon Sizes

| Asset              | Size      | Purpose                    |
|--------------------|-----------|----------------------------|
| `icon.png`         | 1024x1024 | Standard app icon          |
| `adaptive-icon.png`| 1024x1024 | Android adaptive foreground|
| `favicon.png`      | 48x48     | Web favicon                |
| `splash-icon.png`  | 200x200   | Splash screen logo         |

### Splash Screen

- **Background:** `#0a0a0a` (matches app background)
- **Logo:** `bf_` centered
- **Resize mode:** `contain`

### Reference SVG Template

```svg
<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#000000"/>
  <text 
    x="50%" 
    y="52%" 
    font-family="Courier, 'Courier New', monospace" 
    font-size="328px" 
    font-weight="bold"
    fill="#ffffff" 
    text-anchor="middle" 
    dominant-baseline="central"
    letter-spacing="15px"
  >bf_</text>
</svg>
```

---

## Haptic Feedback

The app uses `expo-haptics` for tactile feedback on user interactions.

**Location:** `hooks/useHaptics.ts`

### Haptic Types

| Type | Method | Usage |
|------|--------|-------|
| `successFeedback` | `Haptics.NotificationFeedbackType.Success` | Correct answers, level ups, achievements |
| `errorFeedback` | `Haptics.NotificationFeedbackType.Error` | Incorrect answers, errors |
| `lightFeedback` | `Haptics.ImpactFeedbackStyle.Light` | Subtle UI interactions |
| `mediumFeedback` | `Haptics.ImpactFeedbackStyle.Medium` | Button presses, metronome beats |
| `heavyFeedback` | `Haptics.ImpactFeedbackStyle.Heavy` | Important confirmations |
| `selectionFeedback` | `Haptics.selectionAsync()` | Selection changes, toggles |

### Implementation

```typescript
import * as Haptics from 'expo-haptics';

export function useHaptics() {
  const { enableHaptics } = useSettings();

  const successFeedback = useCallback(() => {
    if (!enableHaptics) return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  }, [enableHaptics]);

  const errorFeedback = useCallback(() => {
    if (!enableHaptics) return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {}
  }, [enableHaptics]);

  const mediumFeedback = useCallback(() => {
    if (!enableHaptics) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
  }, [enableHaptics]);

  // ... additional feedback types

  return {
    successFeedback,
    errorFeedback,
    lightFeedback,
    mediumFeedback,
    heavyFeedback,
    selectionFeedback,
  };
}
```

### Usage Guidelines

- **Always wrap in try-catch:** Some devices don't support haptics
- **Respect user settings:** Check `enableHaptics` before triggering
- **Match feedback to action:** Use appropriate intensity for context
- **Don't overuse:** Reserve haptics for meaningful interactions

---

## Audio Feedback

The app uses `expo-audio` for sound effects and audio feedback.

**Locations:**
- Sound effects: `hooks/useSoundEffects.ts`
- Metronome: `hooks/useMetronome.ts`

### Sound Effects

| Sound | Usage | Volume |
|-------|-------|--------|
| Success tone | Correct answers | 0.4 |
| Error tone | Incorrect answers | 0.4 |
| Click | Metronome beats | 0.5 |

### Implementation

```typescript
import { Audio } from 'expo-audio';

export function useSoundEffects() {
  const { enableSoundEffects } = useSettings();
  const successSound = useRef<Audio.Sound | null>(null);
  const errorSound = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    // Set audio mode for silent mode compatibility
    Audio.setAudioModeAsync({ playsInSilentMode: true });

    // Lazy load sounds
    const loadSounds = async () => {
      const { sound: success } = await Audio.Sound.createAsync(
        { uri: SUCCESS_SOUND_BASE64 },
        { volume: 0.4 }
      );
      successSound.current = success;

      const { sound: error } = await Audio.Sound.createAsync(
        { uri: ERROR_SOUND_BASE64 },
        { volume: 0.4 }
      );
      errorSound.current = error;
    };

    loadSounds();
    return () => {
      successSound.current?.unloadAsync();
      errorSound.current?.unloadAsync();
    };
  }, []);

  const playSuccess = useCallback(async () => {
    if (!enableSoundEffects || !successSound.current) return;
    await successSound.current.setPositionAsync(0);
    await successSound.current.playAsync();
  }, [enableSoundEffects]);

  const playError = useCallback(async () => {
    if (!enableSoundEffects || !errorSound.current) return;
    await errorSound.current.setPositionAsync(0);
    await errorSound.current.playAsync();
  }, [enableSoundEffects]);

  return { playSuccess, playError };
}
```

### Metronome System

BPM-synchronized feedback combining haptic and audio.

```typescript
export function useMetronome(bpm: number, enabled: boolean) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [beatCount, setBeatCount] = useState(0);
  const { mediumFeedback } = useHaptics();
  const clickSound = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const beatDuration = (60 / bpm) * 1000;

    intervalRef.current = setInterval(() => {
      setBeatCount(prev => prev + 1);
      mediumFeedback();
      clickSound.current?.setPositionAsync(0);
      clickSound.current?.playAsync();
    }, beatDuration);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [bpm, enabled]);

  return { beatCount, isFirstBeat: beatCount === 1 };
}
```

### Audio Guidelines

- **Use base64 encoding:** Embed small audio files as base64 for faster loading
- **Reset position:** Call `setPositionAsync(0)` before replay to prevent overlap
- **Respect settings:** Check `enableSoundEffects` before playing
- **Enable silent mode:** Set `playsInSilentMode: true` for practice apps

---

## Navigation & Modals

The app uses `expo-router` with a Stack navigator and modal presentations.

**Location:** `app/_layout.tsx`

### Screen Presentation Types

| Presentation | Usage | Example Screens |
|--------------|-------|-----------------|
| `card` (default) | Standard push navigation | Home, Config, Session |
| `modal` | Slide-up modal sheet | Settings, Leaderboard, Stats, Tuner, Profile |
| `fullScreenModal` | Full-screen takeover | Record Samples |
| `transparentModal` | Overlay with visible background | (not currently used) |

### Navigation Configuration

```typescript
// app/_layout.tsx
<Stack
  screenOptions={{
    animation: 'fade',
    headerShown: false,
    contentStyle: { backgroundColor: COLORS.background },
  }}
>
  <Stack.Screen name="index" />
  <Stack.Screen name="config/[mode]" />
  <Stack.Screen name="session/[mode]" />
  <Stack.Screen name="results" />

  {/* Modal screens */}
  <Stack.Screen
    name="settings"
    options={{
      presentation: 'modal',
      headerShown: true,
      headerTitle: 'settings_',
      headerTitleStyle: {
        fontFamily: 'Courier',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 1,
      },
      headerStyle: { backgroundColor: COLORS.background },
      headerTintColor: COLORS.text,
    }}
  />

  <Stack.Screen
    name="record-samples"
    options={{
      presentation: 'fullScreenModal',
      headerShown: true,
      headerTitle: 'record samples_',
      // ... header styles
    }}
  />
</Stack>
```

### Modal Header Styling

All modals use consistent header styling:

```typescript
headerStyle: {
  backgroundColor: COLORS.background,
},
headerTitleStyle: {
  fontFamily: 'Courier',
  fontSize: 16,
  fontWeight: '700',
  color: COLORS.text,
  letterSpacing: 1,
},
headerTintColor: COLORS.text,
headerShadowVisible: false,
```

### Back Button Handling

Session screens override hardware back button:

```typescript
useEffect(() => {
  const backHandler = BackHandler.addEventListener(
    'hardwareBackPress',
    () => {
      if (isPlaying) {
        pauseSession();
        return true;  // Prevent default back behavior
      }
      return false;  // Allow default
    }
  );

  return () => backHandler.remove();
}, [isPlaying]);
```

### Confirmation Dialogs

Use `Alert.alert()` for destructive actions:

```typescript
Alert.alert(
  'reset settings?',
  'this will restore all settings to defaults',
  [
    { text: 'cancel', style: 'cancel' },
    { text: 'reset', style: 'destructive', onPress: handleReset },
  ]
);
```

### Onboarding Modal

Special modal for first-time users:

```typescript
<Modal
  visible={showOnboarding}
  animationType="fade"
  transparent={true}
  statusBarTranslucent={true}
>
  <View style={styles.overlay}>
    <View style={styles.content}>
      {/* Onboarding content */}
    </View>
  </View>
</Modal>
```

---

## External Dependencies

UI-related external packages used in the app.

### Core UI Libraries

| Package | Version | Purpose |
|---------|---------|---------|
| `react-native` | 0.81.5 | Core UI framework |
| `expo` | 54.0.31 | Development platform |
| `expo-router` | 6.0.21 | File-based navigation |
| `react-native-safe-area-context` | 5.6.0 | Safe area handling |
| `react-native-screens` | 4.16.0 | Native navigation primitives |

### Input & Interaction

| Package | Version | Purpose |
|---------|---------|---------|
| `@react-native-community/slider` | 5.0.1 | Range slider component |
| `expo-haptics` | 15.0.8 | Haptic feedback |

### Audio

| Package | Version | Purpose |
|---------|---------|---------|
| `expo-audio` | 1.1.1 | Sound effects, metronome |

### Utilities

| Package | Version | Purpose |
|---------|---------|---------|
| `expo-keep-awake` | 15.0.8 | Prevent screen sleep during sessions |
| `@react-native-async-storage/async-storage` | 2.1.2 | Persistent storage |

### Icons

| Package | Version | Purpose |
|---------|---------|---------|
| `@hackernoon/pixel-icon-library` | 1.0.6 | Pixel-art icons for avatars/UI |

### Installation

```bash
npx expo install \
  @react-native-community/slider \
  expo-haptics \
  expo-audio \
  expo-keep-awake \
  @react-native-async-storage/async-storage \
  @hackernoon/pixel-icon-library
```

---

## Consistency Audit

### Known Inconsistencies

The following inconsistencies exist in the current codebase and should be addressed in new implementations:

#### 1. Duplicated Color Constants

Several components define their own local `COLORS` objects instead of importing from `app/_layout.tsx`:

| Component                    | Issue                                    |
|------------------------------|------------------------------------------|
| `components/ScaleSelector.tsx` | Full local COLORS object              |
| `components/StringToggle.tsx`  | Full local COLORS object              |
| `components/NoteDisplay.tsx`   | Partial local COLORS (text, textMuted)|
| `components/ListeningIndicator.tsx` | Inline hex values               |
| `components/StreakMilestone.tsx` | Inline hex values for warning      |
| `components/Countdown.tsx`     | Partial local COLORS                  |
| `components/FeedbackOverlay.tsx` | Local success/error colors         |
| `components/Metronome.tsx`     | Partial local COLORS                  |
| `components/Timer.tsx`         | Partial local COLORS                  |
| `components/FretIndicator.tsx` | Partial local COLORS                  |
| `components/DetectedNoteIndicator.tsx` | Partial local COLORS         |
| `components/StringIndicator.tsx` | Partial local COLORS                |

**Recommendation:** Import `COLORS` from `app/_layout.tsx` in all components.

#### 2. Missing Token: `surface`

`app/session/zen.tsx` references `COLORS.surface` which doesn't exist in the global tokens:

```typescript
debugContainer: {
  backgroundColor: COLORS.surface,  // Undefined!
}
```

**Recommendation:** Add `surface: '#141414'` (alias for `backgroundLight`) to the global COLORS, or use `backgroundLight` directly.

#### 3. Inconsistent Status Bar Color References

Some components use `#555555` or `#888888` directly instead of `COLORS.textMuted` or `COLORS.textSecondary`.

**Recommendation:** Always use semantic tokens.

### Standardization Checklist for New Apps

When starting a new app with this design system:

1. [ ] Create `COLORS` object in root layout
2. [ ] Create `FONTS` object in root layout
3. [ ] Import tokens in all components (no local definitions)
4. [ ] Use `ResponsiveContainer` for width constraints
5. [ ] Follow lowercase + trailing underscore text conventions
6. [ ] Use bracket syntax for actions: `[ action ]`
7. [ ] Apply 1px borders with no border radius
8. [ ] Use Courier font family exclusively
9. [ ] Set `userInterfaceStyle: "dark"` in app.json
10. [ ] Generate brand assets with `bf_` mark

---

## Quick Reference

### Import Statement

```typescript
import { COLORS, FONTS } from '@/app/_layout';
import { useResponsive } from '@/hooks/useResponsive';
import { ResponsiveContainer } from '@/components';
```

### Base Text Style

```typescript
{
  fontFamily: 'Courier',
  color: COLORS.text,
  letterSpacing: 1,
}
```

### Base Button Style

```typescript
{
  borderWidth: 1,
  borderColor: COLORS.border,
  paddingVertical: 16,
  alignItems: 'center',
  backgroundColor: COLORS.background,
}
```

### Base Card Style

```typescript
{
  borderWidth: 1,
  borderColor: COLORS.border,
  padding: 16,
  backgroundColor: COLORS.backgroundCard,
}
```
