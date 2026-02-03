# Loot Box Reveal Redesign

## Overview

Redesign the loot box opening experience to feel like one continuous, flowing animation rather than discrete state transitions. Add subtle visual flourishes (particles, glow, smooth transitions) while keeping the cozy dungeon aesthetic.

## Problem

The current reveal feels like a slideshow:
- Discrete state machine: `closed → shaking → open → category → item`
- Hard `setTimeout` cuts between stages
- Elements appear/disappear rather than emerge/flow
- No visual drama or payoff on the reveal

## Solution

Replace state-based stages with a **timeline-based animation** where multiple elements animate simultaneously with staggered starts.

## Animation Timeline

All times relative to tap:

| Time | Event |
|------|-------|
| 0ms | Tap - chest begins shaking |
| 0-400ms | Shake intensifies, chest glows based on tier |
| 400ms | Chest lid opens (sprite swap with scale animation) |
| 400-600ms | Soft particle burst emerges from chest |
| 500ms | Item begins rising from chest position |
| 500-800ms | Item floats up with gentle bounce easing |
| 600ms | Glow/aura fades in around item |
| 800ms | Item name fades in below |
| 1000ms | Rarity tag and description fade in |
| 1200ms | Buttons fade in |

Key principle: Elements **overlap** and **flow into each other** rather than waiting for previous steps.

## Visual Effects

### Chest Tier Coloring

Color multiply/tint approach to shift chest colors while preserving shading:

| Tier | Treatment |
|------|-----------|
| Wood | No tint - natural brown |
| Silver | Desaturated gray-blue tint (`#A8B5C4`) at 60% blend |
| Gold | Warm gold tint (`#FFD700`) at 50% blend |

Closed chest has a subtle **pulsing glow** underneath that hints at tier before opening.

### Particle Burst

Simple animated sprites (not a heavy particle system):

- 8-12 small sparkle sprites burst outward from chest center
- Each sparkle: fade in → drift outward/upward → fade out
- Color matches tier (brown/white/gold)
- Staggered spawn times for organic feel
- Total duration: ~600ms

### Item Glow/Aura

Soft radial gradient behind the item, scaled by rarity:

| Rarity | Radius | Opacity | Extra |
|--------|--------|---------|-------|
| Common | 40px | 30% | - |
| Rare | 60px | 50% | - |
| Legendary | 80px | 70% | Slight pulse |

Color matches companion/consumable rarity, not box tier.

## Technical Implementation

### Animation Approach

Use `react-native-reanimated` for timeline coordination. Single `useSharedValue` for progress (0→1), derive all animations from it.

### Component Structure

```
<ChestReveal>
  ├── <ChestSprite>           # Chest with tint + glow underneath
  ├── <ParticleBurst>         # 8-12 sparkle sprites, absolute positioned
  ├── <RisingItem>            # Item that floats up from chest
  │   ├── <ItemGlow>          # Radial gradient behind item
  │   └── <ItemImage>         # Companion image or consumable icon
  └── <ItemDetails>           # Name, rarity, description, buttons
      ├── <FadeIn> name
      ├── <FadeIn> rarity (staggered)
      ├── <FadeIn> description (staggered)
      └── <FadeIn> buttons (staggered)
```

### Technical Decisions

| Concern | Approach |
|---------|----------|
| Timeline coordination | Single shared value, derive all animations |
| Sparkle particles | Simple Views with border-radius + rotation |
| Item glow | `react-native-svg` RadialGradient or layered Views |
| Chest tinting | Wrapper with `tintColor` + `opacity` blending |
| Performance | `useNativeDriver: true` where possible |

## Edge Cases

### Item Type Handling

| Item type | Treatment |
|-----------|-----------|
| Consumable | PixelSprite icon, scales with rise animation |
| Companion with image | Rounded container, slight shadow, same rise |
| Companion without image | Fallback to pixel knight sprite |

### "Open Another" Flow

When user taps "open another":
1. Current item fades out (200ms)
2. New closed chest fades in at original position (200ms)
3. Ready for next tap

### Tap During Animation

Ignore taps during reveal - animation plays out fully (~1.2s). Short enough that skipping feels unnecessary.

### Tier Label

- Tier hinted by chest glow color before opening
- Explicit label fades in alongside item name
- Less redundant than current approach

## Files to Change

| File | Change |
|------|--------|
| `components/dungeon/ChestReveal.tsx` | Rewrite with timeline approach |
| `components/dungeon/TintedSprite.tsx` | New - tier-colored chest wrapper |
| `components/dungeon/ParticleBurst.tsx` | New - sparkle animation |
| `components/dungeon/ItemGlow.tsx` | New - rarity aura |
| `lib/dungeonAssets.ts` | Add tier color constants |

## Out of Scope

- Audio/sound effects (can add later)
- Tap-to-skip animation
- Additional particle variations
- Haptic feedback
