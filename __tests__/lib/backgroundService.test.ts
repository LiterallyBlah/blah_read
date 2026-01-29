// __tests__/lib/backgroundService.test.ts
import { backgroundService } from '@/lib/backgroundService';
import { Platform, NativeModules, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  NativeModules: {
    TimerService: {
      startService: jest.fn(),
      stopService: jest.fn(),
    },
  },
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
}));

describe('backgroundService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('start (Android)', () => {
    it('starts native foreground service on Android', async () => {
      (Platform as any).OS = 'android';
      (NativeModules.TimerService.startService as jest.Mock).mockResolvedValue(null);

      await backgroundService.start('book-123');

      expect(NativeModules.TimerService.startService).toHaveBeenCalledWith('book-123');
    });
  });

  describe('stop (Android)', () => {
    it('stops native foreground service on Android', async () => {
      (Platform as any).OS = 'android';
      (NativeModules.TimerService.stopService as jest.Mock).mockResolvedValue(null);

      await backgroundService.stop();

      expect(NativeModules.TimerService.stopService).toHaveBeenCalled();
    });
  });

  describe('start (iOS)', () => {
    it('schedules local notification on iOS', async () => {
      (Platform as any).OS = 'ios';

      await backgroundService.start('book-123');

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'Reading session active',
          body: 'Tap to return',
          data: { bookId: 'book-123' },
        },
        trigger: null,
      });
    });
  });

  describe('stop (iOS)', () => {
    it('cancels scheduled notifications on iOS', async () => {
      (Platform as any).OS = 'ios';

      await backgroundService.stop();

      expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    });
  });
});
