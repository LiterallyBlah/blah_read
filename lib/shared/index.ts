// Types
export * from './types';

// Utilities
export * from './genres';
export * from './genreDetection';
export * from './debug';
export * from './idGenerator';
export * from './streak';
export * from './slotProgress';
export * from './nextMilestone';
export * from './loadout';

// Image generation
export * from './imageGen';
export * from './imageStorage';
export * from './imagePromptBuilder';

// LLM
export * from './llm';
export * from './openrouter';

// Note: backgroundService.ts is NOT exported from barrel due to React Native dependencies
// Import it directly: import { ... } from '@/lib/shared/backgroundService'
