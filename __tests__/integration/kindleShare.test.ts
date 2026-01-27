// __tests__/integration/kindleShare.test.ts
import { processKindleShare } from '@/lib/kindleShareProcessor';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage');

// Mock fetch for API calls
global.fetch = jest.fn();

describe('Kindle Share Integration', () => {
  const validShareText = `I think you might like this book – "Power (Buryoku Book 1)" by Aaron Oster, Richard Sashigane.

Start reading it for free: https://read.amazon.co.uk/kp/kshare?asin=B07WNJ7FTQ&id=test&ref_=test`;

  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('[]');
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  it('processes valid Kindle share end-to-end', async () => {
    // Mock Google Books API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{
          volumeInfo: {
            title: 'Power',
            authors: ['Aaron Oster'],
            imageLinks: { thumbnail: 'https://books.google.com/cover.jpg' },
            description: 'A cultivation story',
            pageCount: 400,
          },
        }],
      }),
    });

    const result = await processKindleShare(validShareText, {});

    expect(result.success).toBe(true);
    expect(result.book?.title).toBe('Power (Buryoku Book 1)');
    expect(result.book?.authors).toEqual(['Aaron Oster', 'Richard Sashigane']);
    expect(result.book?.asin).toBe('B07WNJ7FTQ');
    expect(result.book?.source).toBe('kindle-share');
    expect(result.metadataSynced).toBe(true);
  });

  it('handles API failure gracefully', async () => {
    // Mock failed API response
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const result = await processKindleShare(validShareText, {});

    expect(result.success).toBe(true); // Book still added
    expect(result.book?.title).toBe('Power (Buryoku Book 1)');
    expect(result.metadataSynced).toBe(false);
  });
});
