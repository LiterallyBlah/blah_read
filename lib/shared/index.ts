// Types
export * from './types';

// Utilities
export * from './genres';
export * from './genreDetection';
export * from './debug';
export * from './idGenerator';
export * from './streak';
export * from './slotProgress';

// Image generation
export * from './imageGen';
export * from './imageStorage';
export * from './imagePromptBuilder';

// LLM
export * from './openrouter';

// Note: The following files are NOT exported from barrel to avoid circular dependencies.
// Import them directly when needed:
//   - nextMilestone: import { ... } from '@/lib/shared/nextMilestone'
//   - loadout: import { ... } from '@/lib/shared/loadout'
//   - llm: import { ... } from '@/lib/shared/llm'
//   - backgroundService: import { ... } from '@/lib/shared/backgroundService'
