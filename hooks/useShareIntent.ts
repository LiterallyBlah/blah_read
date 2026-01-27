// hooks/useShareIntent.ts
import { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

export function useShareIntent() {
  const [sharedText, setSharedText] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    // Get initial shared content
    Linking.getInitialURL().then((url) => {
      if (url) {
        extractSharedText(url);
      }
    });

    // Listen for new shares while app is open
    const subscription = Linking.addEventListener('url', (event) => {
      extractSharedText(event.url);
    });

    return () => subscription.remove();
  }, []);

  function extractSharedText(url: string) {
    try {
      const parsed = Linking.parse(url);
      if (parsed.queryParams?.text) {
        setSharedText(decodeURIComponent(parsed.queryParams.text as string));
      }
    } catch {
      // Invalid URL, ignore
    }
  }

  return { sharedText, clearSharedText: () => setSharedText(null) };
}
