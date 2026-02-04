import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'blahread:timerState';
const HEARTBEAT_THRESHOLD = 60000; // 60 seconds

export interface PersistedTimerState {
  bookId: string;
  startTimestamp: number;
  pausedElapsed: number;
  isRunning: boolean;
  lastHeartbeat: number;
}

export const timerPersistence = {
  async save(state: PersistedTimerState): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  },

  async load(): Promise<PersistedTimerState | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      // Data corrupted, clear and return null
      console.error('[timerPersistence] Failed to parse stored state:', error);
      await AsyncStorage.removeItem(STORAGE_KEY);
      return null;
    }
  },

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
  },

  async updateHeartbeat(timestamp: number): Promise<void> {
    const state = await this.load();
    if (state) {
      state.lastHeartbeat = timestamp;
      await this.save(state);
    }
  },

  async isInterrupted(): Promise<boolean> {
    const state = await this.load();
    if (!state || !state.isRunning) {
      return false;
    }
    const elapsed = Date.now() - state.lastHeartbeat;
    return elapsed > HEARTBEAT_THRESHOLD;
  },
};
