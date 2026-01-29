#!/usr/bin/env node
/**
 * Pre-scale pixel art tiles using nearest-neighbor interpolation
 * This ensures crisp pixel-perfect rendering on all platforms
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Source directories
const KENNEY_TILES_DIR = path.join(__dirname, '../assets/kenney_tiny-dungeon/Tiles');
const FA_TILES_DIR = path.join(__dirname, '../assets/16x16');

// Output directories
const KENNEY_OUTPUT_DIR = path.join(__dirname, '../assets/kenney_tiny-dungeon/TilesScaled');
const FA_OUTPUT_DIR = path.join(__dirname, '../assets/16x16-scaled');

// Scales to generate (base is 16px)
const SCALES = [2, 3, 4];

// Kenney tiles we use
const KENNEY_TILES = [
  'tile_0036.png', // wall_stone_left
  'tile_0037.png', // wall_stone_center
  'tile_0038.png', // wall_stone_right
  'tile_0040.png', // wall_brick
  'tile_0056.png', // gem
  'tile_0057.png', // wall_brick_left
  'tile_0059.png', // wall_brick_right
  'tile_0089.png', // chest_closed
  'tile_0090.png', // chest_opening_1
  'tile_0091.png', // chest_opening_2
  'tile_0092.png', // chest_open
  'tile_0100.png', // character_knight
  'tile_0101.png', // coin
  'tile_0102.png', // shield
  'tile_0105.png', // scroll
  'tile_0110.png', // character_wizard
];

// 16x16 (fa) tiles we use for consumables
const FA_TILES = [
  'fa12.png',    // Golden Star (legendary luck)
  'fa67.png',    // Genie lamp (companion summon)
  'fa110.png',   // XP Blessing
  'fa116.png',   // Silver Horseshoe (rare luck)
  'fa132.png',   // Lucky Penny
  'fa176.png',   // Luck Charm
  'fa199.png',   // Time Warp Tome
  'fa214.png',   // Silver Star (rare luck)
  'fa289.png',   // Double XP Tome
  'fa294.png',   // Upgrade Charm
  'fa297.png',   // Minor XP Scroll
  'fa298.png',   // XP Scroll
  'fa314.png',   // Treasure Map Scrap
  'fa320.png',   // Treasure Map
  'fa668.png',   // Four-Leaf Clover
  'fa1810.png',  // Wooden Shield
  'fa1811.png',  // Platinum Shield
];

async function scaleTile(inputPath, outputPath, scale) {
  const baseSize = 16;
  const targetSize = baseSize * scale;

  await sharp(inputPath)
    .resize(targetSize, targetSize, {
      kernel: sharp.kernel.nearest, // Nearest-neighbor for crisp pixels
    })
    .png()
    .toFile(outputPath);
}

async function processSet(tiles, inputDir, outputDir, label) {
  // Create output directories for each scale
  for (const scale of SCALES) {
    const scaleDir = path.join(outputDir, `${scale}x`);
    if (!fs.existsSync(scaleDir)) {
      fs.mkdirSync(scaleDir, { recursive: true });
    }
  }

  console.log(`\nScaling ${label}...`);

  let processed = 0;
  let errors = 0;

  for (const tile of tiles) {
    const inputPath = path.join(inputDir, tile);

    if (!fs.existsSync(inputPath)) {
      console.log(`  [SKIP] ${tile} - not found`);
      continue;
    }

    for (const scale of SCALES) {
      const outputPath = path.join(outputDir, `${scale}x`, tile);

      try {
        await scaleTile(inputPath, outputPath, scale);
        processed++;
      } catch (err) {
        console.log(`  [ERROR] ${tile} @${scale}x: ${err.message}`);
        errors++;
      }
    }

    console.log(`  [OK] ${tile}`);
  }

  return { processed, errors };
}

async function main() {
  console.log('Scaling pixel art tiles with nearest-neighbor interpolation...');

  const kenney = await processSet(KENNEY_TILES, KENNEY_TILES_DIR, KENNEY_OUTPUT_DIR, 'Kenney tiles');
  const fa = await processSet(FA_TILES, FA_TILES_DIR, FA_OUTPUT_DIR, '16x16 (fa) tiles');

  const totalProcessed = kenney.processed + fa.processed;
  const totalErrors = kenney.errors + fa.errors;

  console.log(`\nDone! Processed ${totalProcessed} files, ${totalErrors} errors.`);
  console.log(`Kenney output: ${KENNEY_OUTPUT_DIR}`);
  console.log(`FA output: ${FA_OUTPUT_DIR}`);
}

main().catch(console.error);
