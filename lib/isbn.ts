/**
 * ISBN utilities for ASIN to ISBN conversion
 *
 * For physical books, Amazon's ASIN is typically the same as ISBN-10.
 * This module provides validation and conversion utilities.
 */

/**
 * Check if a string looks like an ISBN-10 (10 chars, digits with possible X at end)
 */
export function looksLikeIsbn10(value: string): boolean {
  if (value.length !== 10) return false;
  // First 9 must be digits, last can be digit or X
  return /^\d{9}[\dX]$/i.test(value);
}

/**
 * Validate ISBN-10 checksum using modulo 11 algorithm
 */
export function validateIsbn10(isbn10: string): boolean {
  if (!looksLikeIsbn10(isbn10)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(isbn10[i], 10) * (10 - i);
  }

  // Last digit: X = 10, otherwise parse as digit
  const lastChar = isbn10[9].toUpperCase();
  const lastDigit = lastChar === 'X' ? 10 : parseInt(lastChar, 10);
  sum += lastDigit;

  return sum % 11 === 0;
}

/**
 * Calculate ISBN-13 check digit using modulo 10 algorithm
 */
function calculateIsbn13CheckDigit(first12: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(first12[i], 10);
    sum += (i % 2 === 0) ? digit : digit * 3;
  }
  const remainder = sum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

/**
 * Convert ISBN-10 to ISBN-13
 * Takes first 9 digits, adds 978 prefix, calculates new check digit
 */
export function isbn10ToIsbn13(isbn10: string): string | null {
  if (!looksLikeIsbn10(isbn10)) return null;

  const first9 = isbn10.substring(0, 9);
  const prefix = '978' + first9;
  const checkDigit = calculateIsbn13CheckDigit(prefix);

  return prefix + checkDigit;
}

/**
 * Check if ASIN can be converted to ISBN
 * ASINs starting with 'B' are Kindle-specific and have no ISBN
 */
export function asinToIsbn13(asin: string): string | null {
  console.log('[asinToIsbn13] Input ASIN:', asin);

  if (!asin || asin.length !== 10) {
    console.log('[asinToIsbn13] Invalid length:', asin?.length);
    return null;
  }

  // Kindle ASINs start with B and can't be converted
  if (asin.startsWith('B')) {
    console.log('[asinToIsbn13] Kindle ASIN detected (starts with B), cannot convert');
    return null;
  }

  // Check if it looks like ISBN-10
  if (!looksLikeIsbn10(asin)) {
    console.log('[asinToIsbn13] Does not look like ISBN-10');
    return null;
  }

  const isValidChecksum = validateIsbn10(asin);
  console.log('[asinToIsbn13] ISBN-10 checksum valid:', isValidChecksum);

  const isbn13 = isbn10ToIsbn13(asin);
  console.log('[asinToIsbn13] Converted to ISBN-13:', isbn13);

  return isbn13;
}
