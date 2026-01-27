import { storage } from '@/lib/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage');

describe('storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getBooks returns empty array when no books', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    const books = await storage.getBooks();
    expect(books).toEqual([]);
  });

  it('saveBook adds book to storage', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('[]');
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    const book = { id: '1', title: 'Test', status: 'reading' };
    await storage.saveBook(book as any);

    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });

  it('saveBook updates existing book', async () => {
    const existingBooks = [{ id: '1', title: 'Old Title', status: 'to_read' }];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingBooks));
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    const updatedBook = { id: '1', title: 'New Title', status: 'reading' };
    await storage.saveBook(updatedBook as any);

    const savedData = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
    expect(savedData[0].title).toBe('New Title');
  });

  it('deleteBook removes book from storage', async () => {
    const existingBooks = [{ id: '1' }, { id: '2' }];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingBooks));
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    await storage.deleteBook('1');

    const savedData = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
    expect(savedData).toHaveLength(1);
    expect(savedData[0].id).toBe('2');
  });

  it('getProgress returns default progress when none exists', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    const progress = await storage.getProgress();
    expect(progress.totalXp).toBe(0);
    expect(progress.level).toBe(1);
    expect(progress.lootItems).toEqual([]);
  });

  describe('findDuplicateBook', () => {
    it('finds duplicate by exact ASIN match', async () => {
      const existingBooks = [
        { id: '1', title: 'Power', asin: 'B07WNJ7FTQ' },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingBooks));

      const duplicate = await storage.findDuplicateBook({ asin: 'B07WNJ7FTQ' });
      expect(duplicate?.id).toBe('1');
    });

    it('finds duplicate by title and author match', async () => {
      const existingBooks = [
        { id: '1', title: 'Power', authors: ['Aaron Oster'] },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingBooks));

      const duplicate = await storage.findDuplicateBook({
        title: 'Power',
        authors: ['Aaron Oster']
      });
      expect(duplicate?.id).toBe('1');
    });

    it('handles case-insensitive title matching', async () => {
      const existingBooks = [
        { id: '1', title: 'The Power', authors: ['Aaron Oster'] },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingBooks));

      const duplicate = await storage.findDuplicateBook({
        title: 'the power',
        authors: ['Aaron Oster']
      });
      expect(duplicate?.id).toBe('1');
    });

    it('returns null when no duplicate found', async () => {
      const existingBooks = [
        { id: '1', title: 'Different Book', asin: 'B123456789' },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingBooks));

      const duplicate = await storage.findDuplicateBook({
        asin: 'B07WNJ7FTQ',
        title: 'Power',
      });
      expect(duplicate).toBeNull();
    });
  });
});
