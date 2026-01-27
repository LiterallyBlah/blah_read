import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { fetchOgTags } from '@/lib/ogScraper';
import { storage } from '@/lib/storage';
import { Book } from '@/lib/types';
import { FONTS } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';

export default function ShareScreen() {
  const { colors, spacing, fontSize, letterSpacing } = useTheme();
  const { url } = useLocalSearchParams<{ url: string }>();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!url) {
      setStatus('error');
      return;
    }
    processUrl(url);
  }, [url]);

  async function processUrl(sharedUrl: string) {
    try {
      const og = await fetchOgTags(sharedUrl);
      const book: Book = {
        id: Date.now().toString(),
        title: og.title || 'Unknown Book',
        coverUrl: og.image,
        synopsis: og.description,
        sourceUrl: sharedUrl,
        status: 'to_read',
        totalReadingTime: 0,
        createdAt: Date.now(),
      };
      await storage.saveBook(book);
      setStatus('success');
      setTimeout(() => router.replace('/library'), 1500);
    } catch {
      setStatus('error');
    }
  }

  const styles = createStyles(colors, spacing, fontSize, letterSpacing);

  return (
    <View style={styles.container}>
      {status === 'loading' && (
        <>
          <ActivityIndicator color={colors.text} size="large" />
          <Text style={styles.text}>adding book...</Text>
        </>
      )}
      {status === 'success' && <Text style={styles.text}>book added_</Text>}
      {status === 'error' && <Text style={styles.text}>failed to add book_</Text>}
    </View>
  );
}

const createStyles = (
  colors: ReturnType<typeof useTheme>['colors'],
  spacing: ReturnType<typeof useTheme>['spacing'],
  fontSize: ReturnType<typeof useTheme>['fontSize'],
  letterSpacing: ReturnType<typeof useTheme>['letterSpacing']
) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing(4),
    },
    text: {
      color: colors.text,
      fontFamily: FONTS.mono,
      fontSize: fontSize('large'),
      letterSpacing: letterSpacing('tight'),
    },
  });
