import { timerPersistence, PersistedTimerState } from '@/lib/timerPersistence';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage');

describe('timerPersistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('save', () => {
    it('saves timer state to AsyncStorage', async () => {
      const state: PersistedTimerState = {
        bookId: 'book-123',
        startTimestamp: 1706500000000,
        pausedElapsed: 0,
        isRunning: true,
        lastHeartbeat: 1706500000000,
      };
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await timerPersistence.save(state);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'blahread:timerState',
        JSON.stringify(state)
      );
    });
  });

  describe('load', () => {
    it('returns null when no state exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await timerPersistence.load();

      expect(result).toBeNull();
    });

    it('returns parsed state when exists', async () => {
      const state: PersistedTimerState = {
        bookId: 'book-123',
        startTimestamp: 1706500000000,
        pausedElapsed: 300,
        isRunning: false,
        lastHeartbeat: 1706500300000,
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(state));

      const result = await timerPersistence.load();

      expect(result).toEqual(state);
    });

    it('returns null and clears storage when data is corrupted', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('not valid json{');
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      const result = await timerPersistence.load();

      expect(result).toBeNull();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('blahread:timerState');
    });
  });

  describe('clear', () => {
    it('removes timer state from AsyncStorage', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      await timerPersistence.clear();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('blahread:timerState');
    });
  });

  describe('updateHeartbeat', () => {
    it('updates lastHeartbeat in existing state', async () => {
      const existingState: PersistedTimerState = {
        bookId: 'book-123',
        startTimestamp: 1706500000000,
        pausedElapsed: 0,
        isRunning: true,
        lastHeartbeat: 1706500000000,
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingState));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const newHeartbeat = 1706500030000;
      await timerPersistence.updateHeartbeat(newHeartbeat);

      const savedCall = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const savedState = JSON.parse(savedCall[1]);
      expect(savedState.lastHeartbeat).toBe(newHeartbeat);
    });

    it('does nothing when no state exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      await timerPersistence.updateHeartbeat(Date.now());

      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('isInterrupted', () => {
    it('returns true when running and heartbeat is stale', async () => {
      const staleState: PersistedTimerState = {
        bookId: 'book-123',
        startTimestamp: 1706500000000,
        pausedElapsed: 0,
        isRunning: true,
        lastHeartbeat: Date.now() - 120000, // 2 minutes ago
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(staleState));

      const result = await timerPersistence.isInterrupted();

      expect(result).toBe(true);
    });

    it('returns false when not running', async () => {
      const pausedState: PersistedTimerState = {
        bookId: 'book-123',
        startTimestamp: 1706500000000,
        pausedElapsed: 300,
        isRunning: false,
        lastHeartbeat: Date.now() - 120000,
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(pausedState));

      const result = await timerPersistence.isInterrupted();

      expect(result).toBe(false);
    });

    it('returns false when heartbeat is recent', async () => {
      const freshState: PersistedTimerState = {
        bookId: 'book-123',
        startTimestamp: 1706500000000,
        pausedElapsed: 0,
        isRunning: true,
        lastHeartbeat: Date.now() - 30000, // 30 seconds ago
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(freshState));

      const result = await timerPersistence.isInterrupted();

      expect(result).toBe(false);
    });

    it('returns false when no state exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await timerPersistence.isInterrupted();

      expect(result).toBe(false);
    });
  });
});
