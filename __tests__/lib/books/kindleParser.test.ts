import { parseKindleShareText, isKindleShareText } from '@/lib/books';

describe('kindleParser', () => {
  const validShareText = `I think you might like this book – "Power (Buryoku Book 1)" by Aaron Oster, Richard Sashigane.

Start reading it for free: https://read.amazon.co.uk/kp/kshare?asin=B07WNJ7FTQ&id=na3mclw4jvdlvigiojnkaga2sq&ref_=r_sa_glf_b_0_hdrw_ss_AAu4AAA`;

  describe('isKindleShareText', () => {
    it('returns true for valid Kindle share text', () => {
      expect(isKindleShareText(validShareText)).toBe(true);
    });

    it('returns true for text with read.amazon.com domain', () => {
      const usShare = validShareText.replace('read.amazon.co.uk', 'read.amazon.com');
      expect(isKindleShareText(usShare)).toBe(true);
    });

    it('returns false for random text', () => {
      expect(isKindleShareText('Hello world')).toBe(false);
    });

    it('returns false for non-Kindle Amazon links', () => {
      expect(isKindleShareText('Check out https://www.amazon.com/dp/B07WNJ7FTQ')).toBe(false);
    });

    it('returns true for regional Amazon domains', () => {
      const germanShare = validShareText.replace('read.amazon.co.uk', 'read.amazon.de');
      expect(isKindleShareText(germanShare)).toBe(true);
      const frenchShare = validShareText.replace('read.amazon.co.uk', 'read.amazon.fr');
      expect(isKindleShareText(frenchShare)).toBe(true);
    });
  });

  describe('parseKindleShareText', () => {
    it('extracts title from quoted text', () => {
      const result = parseKindleShareText(validShareText);
      expect(result?.title).toBe('Power (Buryoku Book 1)');
    });

    it('extracts single author', () => {
      const singleAuthor = `I think you might like this book – "Test Book" by John Smith.
Start reading it for free: https://read.amazon.com/kp/kshare?asin=B123456789`;
      const result = parseKindleShareText(singleAuthor);
      expect(result?.authors).toEqual(['John Smith']);
    });

    it('extracts multiple authors', () => {
      const result = parseKindleShareText(validShareText);
      expect(result?.authors).toEqual(['Aaron Oster', 'Richard Sashigane']);
    });

    it('extracts ASIN from URL', () => {
      const result = parseKindleShareText(validShareText);
      expect(result?.asin).toBe('B07WNJ7FTQ');
    });

    it('extracts source URL', () => {
      const result = parseKindleShareText(validShareText);
      expect(result?.sourceUrl).toContain('read.amazon.co.uk');
    });

    it('returns null for invalid text', () => {
      expect(parseKindleShareText('Not a Kindle share')).toBeNull();
    });

    it('handles title with special characters', () => {
      const special = `I think you might like this book – "The King's Dark Tidings: Book 1 – Free the Darkness" by Kel Kade.
Start reading it for free: https://read.amazon.com/kp/kshare?asin=B00PW2MXXW`;
      const result = parseKindleShareText(special);
      expect(result?.title).toBe("The King's Dark Tidings: Book 1 – Free the Darkness");
    });

    it('extracts author name with periods', () => {
      const tolkienShare = `I think you might like this book – "The Hobbit" by J.R.R. Tolkien.
Start reading it for free: https://read.amazon.com/kp/kshare?asin=B007978NPG`;
      const result = parseKindleShareText(tolkienShare);
      expect(result?.authors).toEqual(['J.R.R. Tolkien']);
    });
  });
});
