import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { ThemeProvider, useTheme } from '@/lib/ThemeContext';
import { isKindleShareText } from '@/lib/kindleParser';

function RootLayoutInner() {
  const { isDark } = useTheme();

  useEffect(() => {
    // Handle initial URL (app opened via share)
    Linking.getInitialURL().then(handleIncomingUrl);

    // Handle URL while app is running
    const subscription = Linking.addEventListener('url', (event) => {
      handleIncomingUrl(event.url);
    });

    return () => subscription.remove();
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

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }} />
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
