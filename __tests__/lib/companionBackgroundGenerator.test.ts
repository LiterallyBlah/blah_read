import { generateCompanionsInBackground } from '@/lib/companionBackgroundGenerator';
import { Book, BookCompanions } from '@/lib/shared';

jest.mock('@/lib/companionOrchestrator');
jest.mock('@/lib/companionImageQueue');
jest.mock('@/lib/shared/imageGen');
jest.mock('@/lib/storage');
jest.mock('@/lib/shared/debug', () => ({
  debug: {
    log: jest.fn(),
    error: jest.fn(),
    time: jest.fn(),
    timeEnd: jest.fn(),
  },
}));

import { orchestrateCompanionResearch } from '@/lib/companionOrchestrator';
import { generateBufferedImages } from '@/lib/companionImageQueue';
import { settings } from '@/lib/storage';

describe('companionBackgroundGenerator', () => {
  const mockBook: Book = {
    id: 'book-123',
    title: 'Test Book',
    authors: ['Test Author'],
    coverUrl: null,
    synopsis: 'A test synopsis',
    sourceUrl: null,
    status: 'to_read',
    totalReadingTime: 0,
    createdAt: Date.now(),
    companionsPending: true,
  };

  const mockCompanions: BookCompanions = {
    researchComplete: true,
    researchConfidence: 'high',
    readingTimeQueue: { companions: [], nextGenerateIndex: 0 },
    poolQueue: { companions: [], nextGenerateIndex: 0 },
    unlockedCompanions: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (settings.get as jest.Mock).mockResolvedValue({
      apiKey: 'test-api-key',
      imageModel: 'test-model',
      imageSize: '1K',
      llmModel: 'test-llm',
    });
  });

  it('calls research and image generation, then onComplete with updated book', async () => {
    (orchestrateCompanionResearch as jest.Mock).mockResolvedValue(mockCompanions);
    (generateBufferedImages as jest.Mock).mockResolvedValue(mockCompanions);

    const onComplete = jest.fn();

    await generateCompanionsInBackground(mockBook, onComplete);

    expect(orchestrateCompanionResearch).toHaveBeenCalledWith({
      bookId: mockBook.id,
      title: mockBook.title,
      author: mockBook.authors?.[0],
      synopsis: mockBook.synopsis,
    });
    expect(generateBufferedImages).toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
      id: mockBook.id,
      companions: mockCompanions,
      companionsPending: false,
    }));
  });

  it('catches errors and does not call onComplete (leaves pending for retry)', async () => {
    (orchestrateCompanionResearch as jest.Mock).mockRejectedValue(new Error('API failed'));

    const onComplete = jest.fn();

    await generateCompanionsInBackground(mockBook, onComplete);

    expect(onComplete).not.toHaveBeenCalled();
  });

  it('calls onComplete with companionsPending: false when no API key', async () => {
    (settings.get as jest.Mock).mockResolvedValue({ apiKey: null });

    const onComplete = jest.fn();

    await generateCompanionsInBackground(mockBook, onComplete);

    expect(orchestrateCompanionResearch).not.toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
      companionsPending: false,
    }));
  });
});
