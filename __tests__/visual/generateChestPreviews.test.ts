/**
 * Visual asset generation test for chest tinting.
 *
 * Run with: npm test -- __tests__/visual/generateChestPreviews.test.ts
 *
 * Generates preview images in: assets/generated/chest-previews/
 *
 * This allows visual iteration on tinting approaches without
 * needing to run the app.
 */

import sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';

const ASSETS_DIR = path.join(__dirname, '../../assets');
const OUTPUT_DIR = path.join(ASSETS_DIR, 'generated/chest-previews');

// Source chest tiles
const CHEST_CLOSED = path.join(ASSETS_DIR, 'kenney_tiny-dungeon/Tiles/tile_0089.png');
const CHEST_OPEN = path.join(ASSETS_DIR, 'kenney_tiny-dungeon/Tiles/tile_0092.png');

// Tier configurations - using subtle 35% opacity for better detail preservation
const TIER_COLORS = {
  wood: {
    tint: null,
    tintOpacity: 0,
    glow: '#8B7355',
  },
  silver: {
    tint: '#B8C8D8',      // Slightly lighter silver
    tintOpacity: 0.35,    // Subtle blend preserves wood detail
    glow: '#C0C0C0',
  },
  gold: {
    tint: '#FFD700',
    tintOpacity: 0.35,    // Subtle blend preserves wood detail
    glow: '#FFD700',
  },
} as const;

type LootBoxTier = keyof typeof TIER_COLORS;

// Parse hex color to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) throw new Error(`Invalid hex color: ${hex}`);
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

// Generate a tinted version of an image
async function generateTintedImage(
  sourcePath: string,
  outputPath: string,
  tintColor: string,
  tintOpacity: number,
  scale: number = 4
): Promise<void> {
  // Load the source image
  const source = sharp(sourcePath);
  const metadata = await source.metadata();
  const width = metadata.width!;
  const height = metadata.height!;

  // Get raw pixel data
  const { data, info } = await source.raw().toBuffer({ resolveWithObject: true });

  const rgb = hexToRgb(tintColor);

  // Create a new buffer for the tinted image
  const tintedData = Buffer.alloc(data.length);

  // Apply tint to each pixel (preserving alpha)
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = info.channels === 4 ? data[i + 3] : 255;

    if (a > 0) {
      // Blend original color with tint color
      tintedData[i] = Math.round(r * (1 - tintOpacity) + rgb.r * tintOpacity);
      tintedData[i + 1] = Math.round(g * (1 - tintOpacity) + rgb.g * tintOpacity);
      tintedData[i + 2] = Math.round(b * (1 - tintOpacity) + rgb.b * tintOpacity);
      if (info.channels === 4) {
        tintedData[i + 3] = a; // Preserve alpha
      }
    } else {
      // Fully transparent - keep as is
      tintedData[i] = r;
      tintedData[i + 1] = g;
      tintedData[i + 2] = b;
      if (info.channels === 4) {
        tintedData[i + 3] = a;
      }
    }
  }

  // Create image from tinted data and scale up (nearest neighbor for pixel art)
  await sharp(tintedData, {
    raw: {
      width,
      height,
      channels: info.channels as 1 | 2 | 3 | 4,
    },
  })
    .resize(width * scale, height * scale, { kernel: 'nearest' })
    .png()
    .toFile(outputPath);
}

// Generate an untinted scaled version
async function generateScaledImage(
  sourcePath: string,
  outputPath: string,
  scale: number = 4
): Promise<void> {
  const metadata = await sharp(sourcePath).metadata();
  const width = metadata.width!;
  const height = metadata.height!;

  await sharp(sourcePath)
    .resize(width * scale, height * scale, { kernel: 'nearest' })
    .png()
    .toFile(outputPath);
}

// Generate a comparison sheet showing all variants
async function generateComparisonSheet(
  variants: { path: string; label: string }[],
  outputPath: string,
  columns: number = 3
): Promise<void> {
  if (variants.length === 0) return;

  const images = await Promise.all(
    variants.map(async (v) => {
      const img = sharp(v.path);
      const meta = await img.metadata();
      return {
        buffer: await img.toBuffer(),
        width: meta.width!,
        height: meta.height!,
        label: v.label,
      };
    })
  );

  const tileWidth = images[0].width;
  const tileHeight = images[0].height;
  const labelHeight = 20;
  const padding = 10;

  const rows = Math.ceil(images.length / columns);
  const totalWidth = columns * (tileWidth + padding) + padding;
  const totalHeight = rows * (tileHeight + labelHeight + padding) + padding;

  // Create composites array
  const composites: sharp.OverlayOptions[] = [];

  for (let i = 0; i < images.length; i++) {
    const col = i % columns;
    const row = Math.floor(i / columns);
    const x = padding + col * (tileWidth + padding);
    const y = padding + row * (tileHeight + labelHeight + padding);

    composites.push({
      input: images[i].buffer,
      left: x,
      top: y,
    });
  }

  // Create the comparison sheet with a dark background
  await sharp({
    create: {
      width: totalWidth,
      height: totalHeight,
      channels: 4,
      background: { r: 32, g: 32, b: 32, alpha: 1 },
    },
  })
    .composite(composites)
    .png()
    .toFile(outputPath);
}

// Generate a tinted version using "tintColor" style (replaces color, preserves luminance)
async function generateTintColorStyle(
  sourcePath: string,
  outputPath: string,
  tintColor: string,
  overlayOpacity: number,
  scale: number = 4
): Promise<void> {
  const source = sharp(sourcePath);
  const metadata = await source.metadata();
  const width = metadata.width!;
  const height = metadata.height!;

  const { data, info } = await source.raw().toBuffer({ resolveWithObject: true });
  const rgb = hexToRgb(tintColor);

  const tintedData = Buffer.alloc(data.length);

  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = info.channels === 4 ? data[i + 3] : 255;

    if (a > 0) {
      // Calculate luminance of original pixel
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

      // Apply tint color with luminance
      const tintedR = Math.round(rgb.r * luminance);
      const tintedG = Math.round(rgb.g * luminance);
      const tintedB = Math.round(rgb.b * luminance);

      // Blend between original and tinted based on overlay opacity
      tintedData[i] = Math.round(r * (1 - overlayOpacity) + tintedR * overlayOpacity);
      tintedData[i + 1] = Math.round(g * (1 - overlayOpacity) + tintedG * overlayOpacity);
      tintedData[i + 2] = Math.round(b * (1 - overlayOpacity) + tintedB * overlayOpacity);
      if (info.channels === 4) {
        tintedData[i + 3] = a;
      }
    } else {
      tintedData[i] = r;
      tintedData[i + 1] = g;
      tintedData[i + 2] = b;
      if (info.channels === 4) {
        tintedData[i + 3] = a;
      }
    }
  }

  await sharp(tintedData, {
    raw: { width, height, channels: info.channels as 1 | 2 | 3 | 4 },
  })
    .resize(width * scale, height * scale, { kernel: 'nearest' })
    .png()
    .toFile(outputPath);
}

// Multiply blend mode - darkens and colorizes
async function generateMultiplyBlend(
  sourcePath: string,
  outputPath: string,
  tintColor: string,
  blendStrength: number,
  scale: number = 4
): Promise<void> {
  const source = sharp(sourcePath);
  const metadata = await source.metadata();
  const width = metadata.width!;
  const height = metadata.height!;

  const { data, info } = await source.raw().toBuffer({ resolveWithObject: true });
  const rgb = hexToRgb(tintColor);

  const tintedData = Buffer.alloc(data.length);

  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = info.channels === 4 ? data[i + 3] : 255;

    if (a > 0) {
      // Multiply blend: (base * tint) / 255
      const multR = (r * rgb.r) / 255;
      const multG = (g * rgb.g) / 255;
      const multB = (b * rgb.b) / 255;

      // Blend between original and multiplied
      tintedData[i] = Math.round(r * (1 - blendStrength) + multR * blendStrength);
      tintedData[i + 1] = Math.round(g * (1 - blendStrength) + multG * blendStrength);
      tintedData[i + 2] = Math.round(b * (1 - blendStrength) + multB * blendStrength);
      if (info.channels === 4) {
        tintedData[i + 3] = a;
      }
    } else {
      tintedData[i] = r;
      tintedData[i + 1] = g;
      tintedData[i + 2] = b;
      if (info.channels === 4) {
        tintedData[i + 3] = a;
      }
    }
  }

  await sharp(tintedData, {
    raw: { width, height, channels: info.channels as 1 | 2 | 3 | 4 },
  })
    .resize(width * scale, height * scale, { kernel: 'nearest' })
    .png()
    .toFile(outputPath);
}

describe('Chest Preview Generation', () => {
  beforeAll(() => {
    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
  });

  it('generates all chest tier variants', async () => {
    const tiers: LootBoxTier[] = ['wood', 'silver', 'gold'];
    const states = ['closed', 'open'] as const;
    const scale = 8; // 8x for better visibility (16px -> 128px)

    const generatedFiles: { path: string; label: string }[] = [];

    for (const tier of tiers) {
      for (const state of states) {
        const sourcePath = state === 'closed' ? CHEST_CLOSED : CHEST_OPEN;
        const outputPath = path.join(OUTPUT_DIR, `chest_${tier}_${state}.png`);

        const config = TIER_COLORS[tier];

        if (config.tint) {
          // Apply tint for silver/gold chests (both open and closed)
          await generateTintedImage(
            sourcePath,
            outputPath,
            config.tint,
            config.tintOpacity,
            scale
          );
        } else {
          // No tint (wood) - just scale
          await generateScaledImage(sourcePath, outputPath, scale);
        }

        generatedFiles.push({
          path: outputPath,
          label: `${tier} ${state}`,
        });

        console.log(`Generated: ${outputPath}`);
      }
    }

    // Generate comparison sheet
    const comparisonPath = path.join(OUTPUT_DIR, 'comparison.png');
    await generateComparisonSheet(generatedFiles, comparisonPath, 3);
    console.log(`Generated comparison sheet: ${comparisonPath}`);

    // Verify files exist
    for (const file of generatedFiles) {
      expect(fs.existsSync(file.path)).toBe(true);
    }
    expect(fs.existsSync(comparisonPath)).toBe(true);
  });

  it('generates tint opacity variations for experimentation', async () => {
    const opacities = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
    const scale = 8;

    const generatedFiles: { path: string; label: string }[] = [];

    // Generate silver variations
    for (const opacity of opacities) {
      const outputPath = path.join(OUTPUT_DIR, `silver_opacity_${Math.round(opacity * 100)}.png`);
      await generateTintedImage(
        CHEST_CLOSED,
        outputPath,
        TIER_COLORS.silver.tint!,
        opacity,
        scale
      );
      generatedFiles.push({ path: outputPath, label: `Silver ${Math.round(opacity * 100)}%` });
      console.log(`Generated: ${outputPath}`);
    }

    // Generate gold variations
    for (const opacity of opacities) {
      const outputPath = path.join(OUTPUT_DIR, `gold_opacity_${Math.round(opacity * 100)}.png`);
      await generateTintedImage(
        CHEST_CLOSED,
        outputPath,
        TIER_COLORS.gold.tint!,
        opacity,
        scale
      );
      generatedFiles.push({ path: outputPath, label: `Gold ${Math.round(opacity * 100)}%` });
      console.log(`Generated: ${outputPath}`);
    }

    // Generate comparison sheet for opacity variations
    const comparisonPath = path.join(OUTPUT_DIR, 'opacity_variations.png');
    await generateComparisonSheet(generatedFiles, comparisonPath, 6);
    console.log(`Generated opacity comparison: ${comparisonPath}`);

    expect(fs.existsSync(comparisonPath)).toBe(true);
  });

  it('generates alternative tint colors for experimentation', async () => {
    const scale = 8;

    // Alternative silver tints
    const silverAlternatives = [
      { color: '#A8B5C4', name: 'current' },      // Current
      { color: '#B8C4D4', name: 'lighter' },      // Lighter
      { color: '#98A5B4', name: 'darker' },       // Darker
      { color: '#C0C8D0', name: 'desaturated' },  // More desaturated
      { color: '#9EB3C8', name: 'bluer' },        // More blue
    ];

    // Alternative gold tints
    const goldAlternatives = [
      { color: '#FFD700', name: 'current' },      // Current
      { color: '#FFC000', name: 'orange' },       // More orange
      { color: '#FFE44D', name: 'lighter' },      // Lighter
      { color: '#E6C200', name: 'darker' },       // Darker
      { color: '#FFEC8B', name: 'pale' },         // Pale gold
    ];

    const generatedFiles: { path: string; label: string }[] = [];

    for (const alt of silverAlternatives) {
      const outputPath = path.join(OUTPUT_DIR, `silver_alt_${alt.name}.png`);
      await generateTintedImage(CHEST_CLOSED, outputPath, alt.color, 0.6, scale);
      generatedFiles.push({ path: outputPath, label: `Silver ${alt.name}` });
    }

    for (const alt of goldAlternatives) {
      const outputPath = path.join(OUTPUT_DIR, `gold_alt_${alt.name}.png`);
      await generateTintedImage(CHEST_CLOSED, outputPath, alt.color, 0.5, scale);
      generatedFiles.push({ path: outputPath, label: `Gold ${alt.name}` });
    }

    const comparisonPath = path.join(OUTPUT_DIR, 'color_alternatives.png');
    await generateComparisonSheet(generatedFiles, comparisonPath, 5);
    console.log(`Generated color alternatives: ${comparisonPath}`);

    expect(fs.existsSync(comparisonPath)).toBe(true);
  });

  it('compares different blending approaches', async () => {
    const scale = 8;
    const generatedFiles: { path: string; label: string }[] = [];

    // Original for reference
    const origPath = path.join(OUTPUT_DIR, 'blend_00_original.png');
    await generateScaledImage(CHEST_CLOSED, origPath, scale);
    generatedFiles.push({ path: origPath, label: 'Original' });

    // Simple blend (current approach)
    const blend50Silver = path.join(OUTPUT_DIR, 'blend_01_simple_silver.png');
    await generateTintedImage(CHEST_CLOSED, blend50Silver, '#A8B5C4', 0.5, scale);
    generatedFiles.push({ path: blend50Silver, label: 'Simple Silver 50%' });

    const blend50Gold = path.join(OUTPUT_DIR, 'blend_02_simple_gold.png');
    await generateTintedImage(CHEST_CLOSED, blend50Gold, '#FFD700', 0.5, scale);
    generatedFiles.push({ path: blend50Gold, label: 'Simple Gold 50%' });

    // TintColor style (luminance-preserving)
    const tintSilver = path.join(OUTPUT_DIR, 'blend_03_tint_silver.png');
    await generateTintColorStyle(CHEST_CLOSED, tintSilver, '#C0C8D8', 0.6, scale);
    generatedFiles.push({ path: tintSilver, label: 'Tint Silver 60%' });

    const tintGold = path.join(OUTPUT_DIR, 'blend_04_tint_gold.png');
    await generateTintColorStyle(CHEST_CLOSED, tintGold, '#FFD700', 0.5, scale);
    generatedFiles.push({ path: tintGold, label: 'Tint Gold 50%' });

    // Multiply blend
    const multSilver = path.join(OUTPUT_DIR, 'blend_05_mult_silver.png');
    await generateMultiplyBlend(CHEST_CLOSED, multSilver, '#C0D0E8', 0.7, scale);
    generatedFiles.push({ path: multSilver, label: 'Multiply Silver 70%' });

    const multGold = path.join(OUTPUT_DIR, 'blend_06_mult_gold.png');
    await generateMultiplyBlend(CHEST_CLOSED, multGold, '#FFE040', 0.6, scale);
    generatedFiles.push({ path: multGold, label: 'Multiply Gold 60%' });

    // Subtle variations
    const subtleSilver = path.join(OUTPUT_DIR, 'blend_07_subtle_silver.png');
    await generateTintedImage(CHEST_CLOSED, subtleSilver, '#B8C8D8', 0.35, scale);
    generatedFiles.push({ path: subtleSilver, label: 'Subtle Silver 35%' });

    const subtleGold = path.join(OUTPUT_DIR, 'blend_08_subtle_gold.png');
    await generateTintedImage(CHEST_CLOSED, subtleGold, '#FFD700', 0.35, scale);
    generatedFiles.push({ path: subtleGold, label: 'Subtle Gold 35%' });

    const comparisonPath = path.join(OUTPUT_DIR, 'blend_comparison.png');
    await generateComparisonSheet(generatedFiles, comparisonPath, 3);
    console.log(`Generated blend comparison: ${comparisonPath}`);

    expect(fs.existsSync(comparisonPath)).toBe(true);
  });
});
