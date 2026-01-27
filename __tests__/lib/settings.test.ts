import { settings, defaultSettings, exportAllData, clearProgress, resetApp } from '@/lib/settings';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage');

describe('settings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns default settings when none saved', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    const result = await settings.get();
    expect(result.apiKey).toBeNull();
    expect(result.llmModel).toBe('google/gemini-2.5-flash-preview-05-20');
    expect(result.imageModel).toBe('bytedance-seed/seedream-4.5');
    expect(result.theme).toBe('auto');
  });

  it('merges partial stored settings with defaults', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({ theme: 'dark' }));
    const result = await settings.get();
    expect(result.theme).toBe('dark');
    expect(result.apiKey).toBeNull(); // default preserved
    expect(result.dailyTarget).toBe(30); // default preserved
  });

  it('set() saves merged settings and preserves existing values', async () => {
    // First get returns existing settings
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({ theme: 'dark', dailyTarget: 45 }));
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    await settings.set({ apiKey: 'test-key' });

    const savedData = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
    expect(savedData.apiKey).toBe('test-key'); // new value saved
    expect(savedData.theme).toBe('dark'); // existing value preserved
    expect(savedData.dailyTarget).toBe(45); // existing value preserved
    expect(savedData.llmModel).toBe(defaultSettings.llmModel); // default preserved
  });

  it('returns default imageSize of 1K', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    const result = await settings.get();
    expect(result.imageSize).toBe('1K');
  });

  it('persists imageSize setting', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({ imageSize: '2K' }));
    const result = await settings.get();
    expect(result.imageSize).toBe('2K');
  });
});

describe('data management', () => {
  beforeEach(() => jest.clearAllMocks());

  it('exportAllData returns JSON string', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    const data = await exportAllData();
    expect(typeof data).toBe('string');
    expect(() => JSON.parse(data)).not.toThrow();
  });

  it('clearProgress resets XP but structure remains valid', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    await clearProgress();
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });

  it('resetApp removes all storage keys', async () => {
    (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);
    await resetApp();
    expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
      'blahread:books',
      'blahread:sessions',
      'blahread:progress',
      'blahread:settings',
    ]);
  });
});
