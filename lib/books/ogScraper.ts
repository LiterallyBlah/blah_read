export interface OgTags {
  title: string | null;
  image: string | null;
  description: string | null;
}

export function parseOgTags(html: string): OgTags {
  const getMetaContent = (property: string): string | null => {
    // Match property="og:xxx" content="value" (double or single quotes)
    const regex = new RegExp(
      `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,
      'i'
    );
    // Also match content="value" property="og:xxx" (alternate order)
    const altRegex = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`,
      'i'
    );
    const match = html.match(regex) || html.match(altRegex);
    return match ? match[1] : null;
  };

  return {
    title: getMetaContent('og:title'),
    image: getMetaContent('og:image'),
    description: getMetaContent('og:description'),
  };
}

export async function fetchOgTags(url: string): Promise<OgTags> {
  const emptyResult: OgTags = { title: null, image: null, description: null };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BlahRead/1.0)' },
      signal: controller.signal,
    });

    if (!response.ok) {
      console.warn(`[ogScraper] HTTP error: ${response.status}`);
      return emptyResult;
    }

    const html = await response.text();
    return parseOgTags(html);
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.warn('[ogScraper] Request timed out');
    } else {
      console.error('[ogScraper] Fetch failed:', error);
    }
    return emptyResult;
  } finally {
    clearTimeout(timeoutId);
  }
}
