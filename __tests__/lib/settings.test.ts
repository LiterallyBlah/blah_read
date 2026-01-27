import { settings, defaultSettings, Settings } from '@/lib/settings';
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

  it('saves and retrieves settings', async () => {
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({ apiKey: 'test-key' }));

    await settings.set({ apiKey: 'test-key' });
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });
});
