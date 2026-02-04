import { parseOgTags } from '@/lib/books';

describe('parseOgTags', () => {
  it('extracts og:title, og:image, og:description from HTML', () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Test Book Title" />
        <meta property="og:image" content="https://example.com/cover.jpg" />
        <meta property="og:description" content="A great book synopsis" />
      </head></html>
    `;
    const result = parseOgTags(html);
    expect(result.title).toBe('Test Book Title');
    expect(result.image).toBe('https://example.com/cover.jpg');
    expect(result.description).toBe('A great book synopsis');
  });

  it('handles alternate meta tag order (content before property)', () => {
    const html = `
      <html><head>
        <meta content="Alternate Order Title" property="og:title" />
      </head></html>
    `;
    const result = parseOgTags(html);
    expect(result.title).toBe('Alternate Order Title');
  });

  it('returns nulls for missing tags', () => {
    const html = '<html><head></head></html>';
    const result = parseOgTags(html);
    expect(result.title).toBeNull();
    expect(result.image).toBeNull();
    expect(result.description).toBeNull();
  });

  it('handles single quotes in attributes', () => {
    const html = `
      <html><head>
        <meta property='og:title' content='Single Quote Title' />
      </head></html>
    `;
    const result = parseOgTags(html);
    expect(result.title).toBe('Single Quote Title');
  });
});
