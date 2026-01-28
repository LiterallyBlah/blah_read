// Note: We don't import settings here to avoid circular dependency
// (settings -> storage -> debug -> settings)
// Instead, callers should use setDebugEnabled() to set the debug state

let debugEnabled: boolean | null = null;

/**
 * Check if debug mode is enabled (synchronous, uses cached value)
 * Returns false if not yet set - callers should call setDebugEnabled() first
 */
export function isDebugEnabled(): boolean {
  return debugEnabled ?? false;
}

/**
 * Reset the debug cache (call when settings change)
 */
export function resetDebugCache(): void {
  debugEnabled = null;
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
