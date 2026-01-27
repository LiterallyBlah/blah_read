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
});
