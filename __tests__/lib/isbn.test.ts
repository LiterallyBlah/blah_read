import {
  looksLikeIsbn10,
  validateIsbn10,
  isbn10ToIsbn13,
  asinToIsbn13,
} from '@/lib/isbn';

describe('isbn', () => {
  describe('looksLikeIsbn10', () => {
    it('returns true for valid ISBN-10 format', () => {
      expect(looksLikeIsbn10('0123456789')).toBe(true);
      expect(looksLikeIsbn10('012345678X')).toBe(true);
      expect(looksLikeIsbn10('012345678x')).toBe(true);
    });

    it('returns false for wrong length', () => {
      expect(looksLikeIsbn10('123456789')).toBe(false);
      expect(looksLikeIsbn10('12345678901')).toBe(false);
    });

    it('returns false for invalid characters', () => {
      expect(looksLikeIsbn10('012345678A')).toBe(false);
      expect(looksLikeIsbn10('01234X6789')).toBe(false);
    });
  });

  describe('validateIsbn10', () => {
    it('validates correct ISBN-10', () => {
      // Real ISBN-10: "The Pragmatic Programmer"
      expect(validateIsbn10('020161622X')).toBe(true);
      // Real ISBN-10: "Clean Code"
      expect(validateIsbn10('0132350882')).toBe(true);
    });

    it('rejects invalid checksum', () => {
      expect(validateIsbn10('0201616221')).toBe(false);
      expect(validateIsbn10('0132350881')).toBe(false);
    });

    it('rejects invalid format', () => {
      expect(validateIsbn10('123')).toBe(false);
      expect(validateIsbn10('ABCDEFGHIJ')).toBe(false);
    });
  });

  describe('isbn10ToIsbn13', () => {
    it('converts ISBN-10 to ISBN-13', () => {
      // The Pragmatic Programmer: 020161622X -> 9780201616224
      expect(isbn10ToIsbn13('020161622X')).toBe('9780201616224');
      // Clean Code: 0132350882 -> 9780132350884
      expect(isbn10ToIsbn13('0132350882')).toBe('9780132350884');
    });

    it('returns null for invalid format', () => {
      expect(isbn10ToIsbn13('123')).toBeNull();
      expect(isbn10ToIsbn13('B07WNJ7FTQ')).toBeNull();
    });
  });

  describe('asinToIsbn13', () => {
    it('converts book ASIN to ISBN-13', () => {
      expect(asinToIsbn13('020161622X')).toBe('9780201616224');
    });

    it('returns null for Kindle ASIN (starts with B)', () => {
      expect(asinToIsbn13('B07WNJ7FTQ')).toBeNull();
      expect(asinToIsbn13('B000000000')).toBeNull();
    });

    it('returns null for invalid ASIN', () => {
      expect(asinToIsbn13('')).toBeNull();
      expect(asinToIsbn13('12345')).toBeNull();
    });
  });
});
