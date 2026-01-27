import { processKindleShare, ProcessingStep } from '@/lib/kindleShareProcessor';

jest.mock('@/lib/kindleParser');
jest.mock('@/lib/bookEnrichment');
jest.mock('@/lib/storage');

import { parseKindleShareText } from '@/lib/kindleParser';
import { enrichBookData } from '@/lib/bookEnrichment';
import { storage } from '@/lib/storage';

describe('kindleShareProcessor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls onProgress for each processing step', async () => {
    const steps: ProcessingStep[] = [];

    (parseKindleShareText as jest.Mock).mockReturnValue({
      title: 'Test Book',
      authors: ['Test Author'],
      asin: 'B123456789',
      sourceUrl: 'https://read.amazon.com/...',
    });
    (storage.findDuplicateBook as jest.Mock).mockResolvedValue(null);
    (enrichBookData as jest.Mock).mockResolvedValue({
      coverUrl: 'https://example.com/cover.jpg',
      synopsis: 'A great book',
      pageCount: 300,
      genres: ['Fiction'],
      source: 'google',
    });
    (storage.saveBook as jest.Mock).mockResolvedValue(undefined);

    await processKindleShare('valid share text', {
      onProgress: (step) => steps.push(step),
    });

    expect(steps).toContain('parsing');
    expect(steps).toContain('enriching');
    expect(steps).toContain('saving');
  });

  it('returns created book on success', async () => {
    (parseKindleShareText as jest.Mock).mockReturnValue({
      title: 'Test Book',
      authors: ['Test Author'],
      asin: 'B123456789',
      sourceUrl: 'https://read.amazon.com/...',
    });
    (storage.findDuplicateBook as jest.Mock).mockResolvedValue(null);
    (enrichBookData as jest.Mock).mockResolvedValue({
      coverUrl: 'https://example.com/cover.jpg',
      synopsis: 'A great book',
      pageCount: 300,
      genres: ['Fiction'],
      source: 'google',
    });
    (storage.saveBook as jest.Mock).mockResolvedValue(undefined);

    const result = await processKindleShare('valid share text', {});

    expect(result.success).toBe(true);
    expect(result.book?.title).toBe('Test Book');
    expect(result.book?.source).toBe('kindle-share');
  });

  it('returns duplicate info when book exists', async () => {
    (parseKindleShareText as jest.Mock).mockReturnValue({
      title: 'Test Book',
      authors: ['Test Author'],
      asin: 'B123456789',
      sourceUrl: 'https://read.amazon.com/...',
    });
    (storage.findDuplicateBook as jest.Mock).mockResolvedValue({
      id: 'existing-123',
      title: 'Test Book',
    });

    const result = await processKindleShare('valid share text', {});

    expect(result.isDuplicate).toBe(true);
    expect(result.existingBook?.id).toBe('existing-123');
  });

  it('returns error for invalid share text', async () => {
    (parseKindleShareText as jest.Mock).mockReturnValue(null);

    const result = await processKindleShare('invalid text', {});

    expect(result.success).toBe(false);
    expect(result.error).toBe('invalid-share-text');
  });

  it('calls checking-duplicate step during processing', async () => {
    const steps: ProcessingStep[] = [];

    (parseKindleShareText as jest.Mock).mockReturnValue({
      title: 'Test Book',
      authors: ['Test Author'],
      asin: 'B123456789',
      sourceUrl: 'https://read.amazon.com/...',
    });
    (storage.findDuplicateBook as jest.Mock).mockResolvedValue(null);
    (enrichBookData as jest.Mock).mockResolvedValue({
      coverUrl: 'https://example.com/cover.jpg',
      synopsis: 'A great book',
      pageCount: 300,
      genres: ['Fiction'],
      source: 'google',
    });
    (storage.saveBook as jest.Mock).mockResolvedValue(undefined);

    await processKindleShare('valid share text', {
      onProgress: (step) => steps.push(step),
    });

    expect(steps).toContain('checking-duplicate');
  });

  it('allows forceAdd to bypass duplicate check', async () => {
    (parseKindleShareText as jest.Mock).mockReturnValue({
      title: 'Test Book',
      authors: ['Test Author'],
      asin: 'B123456789',
      sourceUrl: 'https://read.amazon.com/...',
    });
    (storage.findDuplicateBook as jest.Mock).mockResolvedValue({
      id: 'existing-123',
      title: 'Test Book',
    });
    (enrichBookData as jest.Mock).mockResolvedValue({
      coverUrl: 'https://example.com/cover.jpg',
      synopsis: 'A great book',
      pageCount: 300,
      genres: ['Fiction'],
      source: 'google',
    });
    (storage.saveBook as jest.Mock).mockResolvedValue(undefined);

    const result = await processKindleShare('valid share text', {
      forceAdd: true,
    });

    expect(result.success).toBe(true);
    expect(result.book?.title).toBe('Test Book');
  });

  it('returns save-failed error when storage fails', async () => {
    (parseKindleShareText as jest.Mock).mockReturnValue({
      title: 'Test Book',
      authors: ['Test Author'],
      asin: 'B123456789',
      sourceUrl: 'https://read.amazon.com/...',
    });
    (storage.findDuplicateBook as jest.Mock).mockResolvedValue(null);
    (enrichBookData as jest.Mock).mockResolvedValue({
      coverUrl: 'https://example.com/cover.jpg',
      synopsis: 'A great book',
      pageCount: 300,
      genres: ['Fiction'],
      source: 'google',
    });
    (storage.saveBook as jest.Mock).mockRejectedValue(new Error('Storage full'));

    const result = await processKindleShare('valid share text', {});

    expect(result.success).toBe(false);
    expect(result.error).toBe('save-failed');
  });

  it('sets metadataSynced to true when enrichment succeeds', async () => {
    (parseKindleShareText as jest.Mock).mockReturnValue({
      title: 'Test Book',
      authors: ['Test Author'],
      asin: 'B123456789',
      sourceUrl: 'https://read.amazon.com/...',
    });
    (storage.findDuplicateBook as jest.Mock).mockResolvedValue(null);
    (enrichBookData as jest.Mock).mockResolvedValue({
      coverUrl: 'https://example.com/cover.jpg',
      synopsis: 'A great book',
      pageCount: 300,
      genres: ['Fiction'],
      source: 'google',
    });
    (storage.saveBook as jest.Mock).mockResolvedValue(undefined);

    const result = await processKindleShare('valid share text', {});

    expect(result.success).toBe(true);
    expect(result.metadataSynced).toBe(true);
    expect(result.book?.metadataSynced).toBe(true);
  });

  it('sets metadataSynced to false when enrichment returns none', async () => {
    (parseKindleShareText as jest.Mock).mockReturnValue({
      title: 'Test Book',
      authors: ['Test Author'],
      asin: 'B123456789',
      sourceUrl: 'https://read.amazon.com/...',
    });
    (storage.findDuplicateBook as jest.Mock).mockResolvedValue(null);
    (enrichBookData as jest.Mock).mockResolvedValue({
      coverUrl: null,
      synopsis: null,
      pageCount: null,
      genres: [],
      source: 'none',
    });
    (storage.saveBook as jest.Mock).mockResolvedValue(undefined);

    const result = await processKindleShare('valid share text', {});

    expect(result.success).toBe(true);
    expect(result.metadataSynced).toBe(false);
    expect(result.book?.metadataSynced).toBe(false);
  });
});
