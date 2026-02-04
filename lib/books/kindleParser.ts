export interface KindleParsedData {
  title: string;
  authors: string[];
  asin: string;
  sourceUrl: string;
}

/**
 * Check if text looks like a Kindle share
 */
export function isKindleShareText(text: string): boolean {
  return /read\.amazon\.[a-z.]+/.test(text);
}

/**
 * Parse Kindle share text to extract book details
 *
 * Expected format:
 * I think you might like this book – "[TITLE]" by [AUTHORS].
 * Start reading it for free: https://read.amazon.../asin=[ASIN]...
 */
export function parseKindleShareText(text: string): KindleParsedData | null {
  if (!isKindleShareText(text)) {
    return null;
  }

  // Extract title between quotes (handle smart quotes too)
  const titleMatch = text.match(/[""]([^""]+)[""]/);
  if (!titleMatch) {
    return null;
  }
  const title = titleMatch[1];

  // Extract authors between "by " and the URL/newline
  // Must handle periods in names like "J.R.R. Tolkien", "John Smith Jr.", "Jane Doe Ph.D."
  // Look for the pattern ending with newline or "Start reading" (case-insensitive)
  const authorMatch = text.match(/[""][^""]+[""] by ([^\n]+?)(?:\.\s*(?:Start|$)|\s*\n)/i);
  if (!authorMatch) {
    return null;
  }
  // Clean up trailing period if present
  const authorText = authorMatch[1].replace(/\.$/, '').trim();
  const authors = authorText.split(',').map(a => a.trim());

  // Extract ASIN from URL
  const asinMatch = text.match(/asin=([A-Z0-9]{10})/i);
  if (!asinMatch) {
    return null;
  }
  const asin = asinMatch[1];

  // Extract full URL
  const urlMatch = text.match(/(https:\/\/read\.amazon\.[^\s]+)/);
  const sourceUrl = urlMatch ? urlMatch[1] : '';

  return {
    title,
    authors,
    asin,
    sourceUrl,
  };
}
