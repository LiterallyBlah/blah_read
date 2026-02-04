// lib/backgroundService.ts
import { Platform, NativeModules } from 'react-native';
import * as Notifications from 'expo-notifications';

const { TimerService } = NativeModules;

export const backgroundService = {
  async start(bookId: string): Promise<void> {
    if (Platform.OS === 'android') {
      await TimerService?.startService(bookId);
    } else if (Platform.OS === 'ios') {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Reading session active',
          body: 'Tap to return',
          data: { bookId },
        },
        trigger: null, // Show immediately
      });
    }
  },

  async stop(): Promise<void> {
    if (Platform.OS === 'android') {
      await TimerService?.stopService();
    } else if (Platform.OS === 'ios') {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
  },
};
