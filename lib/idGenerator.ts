/**
 * Centralized ID generator to prevent ID collisions from Date.now()
 *
 * Problem: Date.now() can return the same value for operations
 * that occur in the same millisecond, causing ID collisions.
 *
 * Solution: Combine timestamp with random suffix for uniqueness.
 */

/**
 * Generate a unique ID with optional prefix.
 *
 * @param prefix - Optional prefix for the ID (e.g., 'book', 'session', 'companion')
 * @returns A unique ID string
 *
 * @example
 * generateId() // "1706123456789-a3f8kq2"
 * generateId('book') // "book-1706123456789-a3f8kq2"
 * generateId('lootbox') // "lootbox-1706123456789-x7m2np9"
 */
export function generateId(prefix = ''): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 9);
  return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`;
}

/**
 * Generate a unique ID for a specific index in a batch operation.
 * Useful when generating multiple IDs in the same loop iteration.
 *
 * @param prefix - Prefix for the ID
 * @param index - Index in the batch
 * @returns A unique ID string
 *
 * @example
 * generateBatchId('companion', 0) // "companion-0-1706123456789-a3f8kq2"
 * generateBatchId('companion', 1) // "companion-1-1706123456789-x7m2np9"
 */
export function generateBatchId(prefix: string, index: number): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 9);
  return `${prefix}-${index}-${timestamp}-${random}`;
}
