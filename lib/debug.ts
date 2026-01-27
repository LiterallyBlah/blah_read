import { settings } from './settings';

let debugEnabled: boolean | null = null;
let debugCheckPromise: Promise<boolean> | null = null;

/**
 * Check if debug mode is enabled (cached for performance)
 */
export async function isDebugEnabled(): Promise<boolean> {
  if (debugEnabled !== null) {
    return debugEnabled;
  }

  if (debugCheckPromise) {
    return debugCheckPromise;
  }

  debugCheckPromise = settings.get().then(config => {
    debugEnabled = config.debugMode;
    return debugEnabled;
  });

  return debugCheckPromise;
}

/**
 * Reset the debug cache (call when settings change)
 */
export function resetDebugCache(): void {
  debugEnabled = null;
  debugCheckPromise = null;
}

/**
 * Synchronous debug check - uses cached value, defaults to false if not yet loaded
 */
export function isDebugEnabledSync(): boolean {
  return debugEnabled ?? false;
}

/**
 * Set debug mode directly (useful when you already have the setting)
 */
export function setDebugEnabled(enabled: boolean): void {
  debugEnabled = enabled;
}

/**
 * Debug logger - logs with [DEBUG] prefix when debug mode is enabled
 */
export const debug = {
  log: (category: string, message: string, ...args: unknown[]) => {
    if (debugEnabled) {
      console.log(`[DEBUG:${category}] ${message}`, ...args);
    }
  },

  warn: (category: string, message: string, ...args: unknown[]) => {
    if (debugEnabled) {
      console.warn(`[DEBUG:${category}] ${message}`, ...args);
    }
  },

  error: (category: string, message: string, ...args: unknown[]) => {
    if (debugEnabled) {
      console.error(`[DEBUG:${category}] ${message}`, ...args);
    }
  },

  /**
   * Always log (for critical errors that should show regardless of debug mode)
   */
  always: (category: string, message: string, ...args: unknown[]) => {
    console.log(`[${category}] ${message}`, ...args);
  },

  /**
   * Log with timing information
   */
  time: (category: string, label: string) => {
    if (debugEnabled) {
      console.time(`[DEBUG:${category}] ${label}`);
    }
  },

  timeEnd: (category: string, label: string) => {
    if (debugEnabled) {
      console.timeEnd(`[DEBUG:${category}] ${label}`);
    }
  },
};
