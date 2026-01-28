# Image Generation Redesign

## Overview

Redesign the companion image generation system to ensure consistent styling with rarity-based borders. The key change is splitting image prompt creation into two phases: character research (physical description only) and image prompt generation (styling + borders).

## Problem

The current system has the LLM generate `visualDescription` during companion research, which sometimes includes unwanted styling elements like borders. This causes inconsistent image output where some companions have borders and others don't, regardless of rarity.

## Solution

### Two-Phase Approach

**Phase 1 - Research (existing, modified):**
- LLM generates companion data with `physicalDescription`
- Contains only physical attributes: body type, coloring, clothing, features, expressions
- Explicitly excludes art style, framing, backgrounds, or borders

**Phase 2 - Image Prompt Generation (new):**
- LLM generates the actual image prompt
- Takes companion data + rarity as input
- Applies rarity-specific border rules
- Outputs a complete prompt for the image model

### Border Specifications

| Rarity | Border | Color | Width | Pattern |
|--------|--------|-------|-------|---------|
| common | none | - | - | - |
| rare | yes | #4A90D9 (blue) | 2-3px | LLM decides |
| legendary | yes | #F1C40F (gold) | 2-3px | LLM decides |

Border pattern variation is intentional - constraining color and width while allowing creative freedom on patterns makes each companion unique while maintaining visual consistency.

### Image Size Configuration

New user setting: `imageSize` with options:
- `1K` (default) - 1024x1024
- `2K` - higher resolution
- `4K` - highest resolution

For 32x32 pixel art sprites, 1K is sufficient but users can experiment with higher resolutions.

## Technical Design

### New Module: `lib/imagePromptBuilder.ts`

```typescript
async function generateImagePrompt(
  companion: Companion,
  apiKey: string,
  config: { model?: string }
): Promise<string>

function getBorderInstruction(rarity: CompanionRarity): string
```

### LLM Prompt Template

```
You are a pixel art prompt engineer. Create an image generation prompt
for this character:

Name: {companion.name}
Type: {companion.type}
Description: {companion.physicalDescription}

Requirements:
- 32x32 pixel art sprite
- White background
- Limited retro color palette
- Centered composition
- Simple, cute aesthetic

{BORDER_INSTRUCTION based on rarity - only one provided}

Output ONLY the image prompt, no explanation or markdown.
```

### Border Instructions

**common:**
> The sprite should have NO border or frame. Clean edges directly against the white background.

**rare:**
> Add a decorative border in blue (#4A90D9), 2-3 pixels wide. The border must run edge-to-edge around the entire perimeter of the image, forming a complete rectangular frame. You have creative freedom over the pattern - simple lines, dotted edges, small flourishes, or geometric designs all work.

**legendary:**
> Add an ornate border in gold (#F1C40F), 2-3 pixels wide. The border must run edge-to-edge around the entire perimeter of the image, forming a complete rectangular frame. Make it feel prestigious - you have creative freedom over the pattern. Could be elegant filigree, royal motifs, shimmering edges, or other special designs.

## Files to Modify

| File | Change |
|------|--------|
| `lib/types.ts` | Rename `visualDescription` → `physicalDescription` |
| `lib/companionResearch.ts` | Update schema + prompt wording |
| `lib/inspiredCompanions.ts` | Update templates (17 entries) |
| `lib/settings.ts` | Add `imageSize` setting |
| `lib/imageGen.ts` | Accept `imageSize`, call new prompt builder |
| `app/config.tsx` | Add image size dropdown |

### New File

| `lib/imagePromptBuilder.ts` | LLM-based prompt generation with rarity borders |

## Migration

Existing companions with `visualDescription` are left unchanged. Only new companions use the new `physicalDescription` field and two-phase flow. This avoids data migration complexity and existing images are already generated.

## Error Handling

If the LLM prompt generation fails:
- Log the error
- Do not generate an image
- Companion remains with `imageUrl: null`

No fallback to static templates - this would violate the design principles. Consistency over availability.

## Testing

### Unit Tests (`__tests__/lib/imagePromptBuilder.test.ts`)

1. `getBorderInstruction()` returns correct instruction per rarity
2. `generateImagePrompt()` with mocked LLM, verify prompt structure
3. Error handling - throws on LLM failure, no fallback

### Manual Testing Checklist

- [ ] Generate common companion → no border
- [ ] Generate rare companion → blue border, varied patterns
- [ ] Generate legendary companion → gold border, varied patterns
- [ ] Generate 3 of same rarity → borders differ in pattern but match in color/width
- [ ] LLM prompt fails → no image generated, error logged
- [ ] Config dropdown works → 1K/2K/4K persists

## Flow Diagram

```
Research (llmModel)
    │
    ▼
companion.physicalDescription (no styling)
    │
    ▼
Image Prompt (llmModel)
    │
    ├── rarity: common → no border instruction
    ├── rarity: rare → blue border instruction
    └── rarity: legendary → gold border instruction
    │
    ▼
Generated prompt (detailed, styled)
    │
    ▼
Image Generation (imageModel + imageSize)
    │
    ▼
Pixel art with consistent rarity-based borders
```
