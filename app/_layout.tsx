import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { ThemeProvider, useTheme } from '@/lib/ThemeContext';
import { isKindleShareText } from '@/lib/books';
import { checkForInterruptedSession, timerPersistence, storage } from '@/lib/storage';
import { TimerRecoveryData } from '@/lib/shared';
import { backgroundService } from '@/lib/shared/backgroundService';
import { processSessionEnd } from '@/lib/sessionRewards';
import { SessionRecoveryModal } from '@/components/SessionRecoveryModal';

function RootLayoutInner() {
  const { isDark } = useTheme();
  const [recoveryData, setRecoveryData] = useState<TimerRecoveryData | null>(null);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);

  async function requestNotificationPermissions() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }
  }

  useEffect(() => {
    // Request notification permissions
    requestNotificationPermissions();

    // Handle initial URL (app opened via share)
    Linking.getInitialURL().then(handleIncomingUrl);

    // Handle URL while app is running
    const subscription = Linking.addEventListener('url', (event) => {
      handleIncomingUrl(event.url);
    });

    // Check for interrupted session
    checkForInterruptedSession().then((data) => {
      if (data) {
        setRecoveryData(data);
        setShowRecoveryModal(true);
      }
    });

    // Handle notification taps
    const notificationSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const bookId = response.notification.request.content.data?.bookId;
        if (bookId) {
          router.push({
            pathname: '/timer/[bookId]',
            params: { bookId: bookId as string },
          });
        }
      }
    );

    return () => {
      subscription.remove();
      notificationSubscription.remove();
    };
  }, []);

  function handleIncomingUrl(url: string | null) {
    if (!url) return;

    // Check if this is shared text (Android intent)
    // The URL will contain the shared text as a parameter
    const parsed = Linking.parse(url);

    // Handle blahread://share?text=... scheme
    if (parsed.path === 'share' && parsed.queryParams?.text) {
      const sharedText = decodeURIComponent(parsed.queryParams.text as string);
      if (isKindleShareText(sharedText)) {
        router.push({
          pathname: '/kindle-share',
          params: { text: sharedText },
        });
      }
    }
  }

  async function handleContinue() {
    if (!recoveryData) return;

    // Navigate to timer with session continuing
    setShowRecoveryModal(false);
    router.push({
      pathname: '/timer/[bookId]',
      params: { bookId: recoveryData.bookId },
    });
  }

  async function handleSaveAtInterruption() {
    if (!recoveryData) return;

    // End the session with the interrupted duration
    const books = await storage.getBooks();
    const book = books.find(b => b.id === recoveryData.bookId);
    if (!book) {
      await handleDiscard();
      return;
    }

    const progress = await storage.getProgress();

    // Process session with interrupted duration
    const sessionResult = processSessionEnd(
      book,
      progress,
      [], // No equipped companions for recovery
      recoveryData.elapsedAtInterruption,
      false
    );

    await storage.saveBook(sessionResult.updatedBook);
    await storage.saveProgress(sessionResult.updatedProgress);

    // Clean up
    await timerPersistence.clear();
    await backgroundService.stop();

    setShowRecoveryModal(false);
    setRecoveryData(null);
  }

  async function handleDiscard() {
    // Just clear the timer state
    await timerPersistence.clear();
    await backgroundService.stop();

    setShowRecoveryModal(false);
    setRecoveryData(null);
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }} />
      {recoveryData && (
        <SessionRecoveryModal
          visible={showRecoveryModal}
          recoveryData={recoveryData}
          onContinue={handleContinue}
          onSaveAtInterruption={handleSaveAtInterruption}
          onDiscard={handleDiscard}
        />
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutInner />
    </ThemeProvider>
  );
}
