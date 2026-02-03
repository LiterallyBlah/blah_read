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

  describe('updateBookLoadout', () => {
    it('updates the loadout for a specific book', async () => {
      const existingBooks = [
        { id: '1', title: 'Book 1', loadout: { slots: [null, null, null], unlockedSlots: 1 } },
        { id: '2', title: 'Book 2', loadout: { slots: [null, null, null], unlockedSlots: 1 } },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingBooks));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const newLoadout = { slots: ['companion-1', 'companion-2', null] as [string | null, string | null, string | null], unlockedSlots: 2 as const };
      await storage.updateBookLoadout('1', newLoadout);

      const savedData = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(savedData[0].loadout).toEqual(newLoadout);
      expect(savedData[1].loadout.slots).toEqual([null, null, null]); // Unchanged
    });

    it('throws error when book not found', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('[]');

      await expect(
        storage.updateBookLoadout('non-existent', { slots: [null, null, null], unlockedSlots: 1 })
      ).rejects.toThrow('Book not found: non-existent');
    });
  });

  describe('getDefaultLoadoutForNewBook', () => {
    it('uses unlockedSlots from user progress', async () => {
      const progress = {
        loadout: { slots: ['comp-1', null, null], unlockedSlots: 2 },
      };
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'blahread:progress') return JSON.stringify(progress);
        return null;
      });

      const defaultLoadout = await storage.getDefaultLoadoutForNewBook();

      expect(defaultLoadout.slots).toEqual([null, null, null]); // Empty slots
      expect(defaultLoadout.unlockedSlots).toBe(2); // Same unlocked count as user
    });

    it('defaults to 1 unlocked slot when no progress exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const defaultLoadout = await storage.getDefaultLoadoutForNewBook();

      expect(defaultLoadout.slots).toEqual([null, null, null]);
      expect(defaultLoadout.unlockedSlots).toBe(1);
    });
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
