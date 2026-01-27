import type { Companion, CompanionType, CompanionRarity } from './types';

/**
 * Template for generating inspired companions when LLM research fails
 * or returns limited results.
 */
interface InspiredTemplate {
  name: string;
  type: CompanionType;
  description: string;
  traits: string;
  visualDescription: string;
  keywords: string[];
}

/**
 * Thematic templates for generating inspired companions
 * ~17 templates covering characters, creatures, and objects
 */
export const INSPIRED_TEMPLATES: InspiredTemplate[] = [
  // Characters (7)
  {
    name: 'The Wanderer',
    type: 'character',
    description: 'A mysterious traveler who has seen countless lands and carries wisdom from distant places.',
    traits: 'Mysterious, wise, well-traveled, introspective',
    visualDescription: 'Cloaked figure with a walking staff, weathered face, distant gaze, travel-worn clothes',
    keywords: ['journey', 'travel', 'wander', 'road', 'path', 'quest', 'adventure', 'explore', 'stranger'],
  },
  {
    name: 'The Scholar',
    type: 'character',
    description: 'A keeper of knowledge who seeks to understand the mysteries of the world through study and research.',
    traits: 'Intelligent, curious, methodical, bookish',
    visualDescription: 'Spectacled figure with ink-stained fingers, surrounded by books, quill in hand',
    keywords: ['book', 'knowledge', 'learn', 'study', 'library', 'scholar', 'wisdom', 'research', 'read', 'write'],
  },
  {
    name: 'The Guardian',
    type: 'character',
    description: 'A stalwart protector dedicated to defending those who cannot defend themselves.',
    traits: 'Loyal, brave, protective, steadfast',
    visualDescription: 'Armored warrior with shield, stern expression, battle-scarred, vigilant stance',
    keywords: ['protect', 'guard', 'defend', 'shield', 'warrior', 'knight', 'battle', 'fight', 'safe', 'watch'],
  },
  {
    name: 'The Trickster',
    type: 'character',
    description: 'A cunning figure who uses wit and deception to navigate the world and achieve their goals.',
    traits: 'Clever, mischievous, quick-witted, unpredictable',
    visualDescription: 'Sly-eyed figure with a smirk, nimble hands, colorful clothes, always moving',
    keywords: ['trick', 'clever', 'cunning', 'deceive', 'wit', 'thief', 'rogue', 'scheme', 'plan', 'escape'],
  },
  {
    name: 'The Healer',
    type: 'character',
    description: 'A compassionate soul dedicated to mending wounds and bringing comfort to the suffering.',
    traits: 'Compassionate, gentle, patient, selfless',
    visualDescription: 'Gentle figure with healing herbs, soft eyes, caring hands, simple robes',
    keywords: ['heal', 'cure', 'medicine', 'help', 'care', 'doctor', 'nurse', 'comfort', 'pain', 'sick'],
  },
  {
    name: 'The Outcast',
    type: 'character',
    description: 'One who lives on the edges of society, finding strength in their solitude and difference.',
    traits: 'Independent, resilient, misunderstood, resourceful',
    visualDescription: 'Solitary figure in worn clothes, wary eyes, marks of hardship, hidden strength',
    keywords: ['alone', 'outcast', 'exile', 'lonely', 'different', 'misfit', 'stranger', 'reject', 'survive'],
  },
  {
    name: 'The Mentor',
    type: 'character',
    description: 'A wise guide who shapes the paths of others through teaching and example.',
    traits: 'Patient, wise, experienced, nurturing',
    visualDescription: 'Elder figure with kind eyes, silver hair, teaching gesture, knowing smile',
    keywords: ['teach', 'mentor', 'guide', 'master', 'student', 'lesson', 'learn', 'wisdom', 'old', 'train'],
  },

  // Creatures (5)
  {
    name: 'Shadow Sprite',
    type: 'creature',
    description: 'A mischievous being of darkness that dances between light and shadow.',
    traits: 'Playful, elusive, curious, nocturnal',
    visualDescription: 'Small shadowy figure with glowing eyes, wispy form, darting movements',
    keywords: ['shadow', 'dark', 'night', 'spirit', 'ghost', 'mysterious', 'hidden', 'secret', 'whisper'],
  },
  {
    name: 'Flame Wisp',
    type: 'creature',
    description: 'A dancing flame given life, bringing warmth and light to dark places.',
    traits: 'Energetic, warm, flickering, bright',
    visualDescription: 'Floating ball of warm fire, dancing flames, orange and gold glow, sparks trailing',
    keywords: ['fire', 'flame', 'burn', 'light', 'warm', 'heat', 'spark', 'blaze', 'glow', 'hot'],
  },
  {
    name: 'Forest Guardian',
    type: 'creature',
    description: 'An ancient spirit of the woods that protects the trees and creatures within.',
    traits: 'Ancient, patient, protective, nature-bound',
    visualDescription: 'Tree-like being with bark skin, leaf hair, moss covering, deep green eyes',
    keywords: ['forest', 'tree', 'wood', 'nature', 'plant', 'green', 'wild', 'grow', 'leaf', 'ancient'],
  },
  {
    name: 'Storm Hawk',
    type: 'creature',
    description: 'A majestic bird that rides the winds of tempests and commands the skies.',
    traits: 'Fierce, free, powerful, untameable',
    visualDescription: 'Large bird with lightning-streaked feathers, sharp talons, electric blue eyes',
    keywords: ['storm', 'wind', 'sky', 'fly', 'bird', 'thunder', 'lightning', 'cloud', 'weather', 'air'],
  },
  {
    name: 'Deep Dweller',
    type: 'creature',
    description: 'A mysterious creature from the ocean depths, holding secrets of the abyss.',
    traits: 'Mysterious, ancient, alien, unfathomable',
    visualDescription: 'Tentacled being with bioluminescent spots, deep blue scales, large dark eyes',
    keywords: ['sea', 'ocean', 'water', 'deep', 'fish', 'swim', 'wave', 'underwater', 'dive', 'ship'],
  },

  // Objects (5)
  {
    name: 'The Lost Key',
    type: 'object',
    description: 'An ancient key that unlocks doors thought forever sealed, both literal and metaphorical.',
    traits: 'Mysterious, powerful, sought-after, unique',
    visualDescription: 'Ornate golden key with intricate designs, glowing runes, worn from ages',
    keywords: ['key', 'lock', 'door', 'open', 'secret', 'hidden', 'unlock', 'treasure', 'mystery', 'find'],
  },
  {
    name: "Seeker's Compass",
    type: 'object',
    description: 'A compass that points not to north, but to what the bearer truly seeks.',
    traits: 'Guiding, truthful, magical, reliable',
    visualDescription: 'Brass compass with swirling needle, etched symbols, leather case, soft glow',
    keywords: ['compass', 'direction', 'find', 'search', 'lost', 'guide', 'path', 'way', 'seek', 'navigate'],
  },
  {
    name: 'Memory Stone',
    type: 'object',
    description: 'A smooth stone that captures and preserves memories, allowing them to be relived.',
    traits: 'Precious, fragile, personal, timeless',
    visualDescription: 'Polished gem with swirling colors inside, warm to touch, fits in palm',
    keywords: ['memory', 'remember', 'past', 'time', 'stone', 'gem', 'forget', 'history', 'lost', 'dream'],
  },
  {
    name: 'Binding Tome',
    type: 'object',
    description: 'An ancient book containing powerful words that can shape reality when spoken.',
    traits: 'Powerful, dangerous, coveted, ancient',
    visualDescription: 'Leather-bound book with metal clasps, glowing pages, mystical symbols',
    keywords: ['book', 'spell', 'magic', 'power', 'word', 'ancient', 'forbidden', 'write', 'read', 'tome'],
  },
  {
    name: "Warrior's Blade",
    type: 'object',
    description: 'A legendary sword that has seen countless battles and carries the spirit of its wielders.',
    traits: 'Noble, battle-tested, legendary, loyal',
    visualDescription: 'Gleaming sword with rune-etched blade, worn leather grip, noble design',
    keywords: ['sword', 'blade', 'weapon', 'fight', 'battle', 'war', 'hero', 'steel', 'cut', 'warrior'],
  },
];

/**
 * Score how well a template matches the given synopsis based on keyword matches.
 * Higher score = better match.
 */
export function scoreTemplate(template: InspiredTemplate, synopsis: string): number {
  if (!synopsis) return 0;

  const normalizedSynopsis = synopsis.toLowerCase();
  let score = 0;

  for (const keyword of template.keywords) {
    if (normalizedSynopsis.includes(keyword.toLowerCase())) {
      score += 1;
    }
  }

  return score;
}

/**
 * Assign rarity based on distribution.
 * For a set of companions:
 * - ~20% legendary (at least 1 if count >= 3)
 * - ~27% rare (at least 1 if count >= 2)
 * - ~53% common (remaining)
 */
function assignRarities(count: number): CompanionRarity[] {
  const rarities: CompanionRarity[] = [];

  // Calculate counts based on target percentages
  const legendaryCount = Math.max(1, Math.min(3, Math.round(count * 0.2)));
  const rareCount = Math.max(1, Math.round(count * 0.27));
  const commonCount = count - legendaryCount - rareCount;

  // Add legendaries
  for (let i = 0; i < legendaryCount && rarities.length < count; i++) {
    rarities.push('legendary');
  }

  // Add rares
  for (let i = 0; i < rareCount && rarities.length < count; i++) {
    rarities.push('rare');
  }

  // Fill rest with commons
  while (rarities.length < count) {
    rarities.push('common');
  }

  return rarities;
}

/**
 * Generate inspired companions based on synopsis keyword matching.
 * Used as a fallback when LLM research fails or returns limited results.
 *
 * @param bookId - The book ID to associate companions with
 * @param synopsis - The book synopsis to match keywords against (can be null/empty)
 * @param count - Number of companions to generate
 * @returns Array of Companion objects with source: 'inspired'
 */
export function generateInspiredCompanions(
  bookId: string,
  synopsis: string | null | undefined,
  count: number
): Companion[] {
  const safeSynopsis = synopsis || '';

  // Score all templates against the synopsis
  const scoredTemplates = INSPIRED_TEMPLATES.map(template => ({
    template,
    score: scoreTemplate(template, safeSynopsis),
  }));

  // Sort by score (highest first), then shuffle ties for variety
  scoredTemplates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return Math.random() - 0.5; // Randomize ties
  });

  // Select top templates (cycling if we need more than available)
  const selectedTemplates: InspiredTemplate[] = [];
  for (let i = 0; i < count; i++) {
    const templateIndex = i % scoredTemplates.length;
    selectedTemplates.push(scoredTemplates[templateIndex].template);
  }

  // Assign rarities based on distribution
  const rarities = assignRarities(count);

  // Generate companions
  const companions: Companion[] = selectedTemplates.map((template, index) => ({
    id: `${bookId}-inspired-${index}-${Date.now()}`,
    bookId,
    name: template.name,
    type: template.type,
    rarity: rarities[index],
    description: template.description,
    traits: template.traits,
    visualDescription: template.visualDescription,
    imageUrl: null,
    source: 'inspired' as const,
    unlockMethod: null,
    unlockedAt: null,
  }));

  return companions;
}
