// Follows BlahFret design system - lowercase, trailing underscores, bracket actions
import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { storage } from '@/lib/storage';
import { calculateLevel, xpProgress } from '@/lib/xp';
import { Book, UserProgress } from '@/lib/types';
import { COLORS, FONTS, spacing, fontSize, letterSpacing } from '@/lib/theme';

export default function HomeScreen() {
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const cursorAnim = useRef(new Animated.Value(1)).current;

  // Blinking cursor animation (530ms cycle from design system)
  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorAnim, { toValue: 0, duration: 0, delay: 530, useNativeDriver: true }),
        Animated.timing(cursorAnim, { toValue: 1, duration: 0, delay: 530, useNativeDriver: true }),
      ])
    );
    blink.start();
    return () => blink.stop();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    const books = await storage.getBooks();
    const reading = books.find(b => b.status === 'reading');
    setCurrentBook(reading || null);
    setProgress(await storage.getProgress());
  }

  const level = progress ? calculateLevel(progress.totalXp) : 1;
  const xp = progress ? xpProgress(progress.totalXp) : { current: 0, needed: 1000 };

  return (
    <View style={styles.container}>
      {/* Logo with blinking cursor */}
      <View style={styles.logoRow}>
        <Text style={styles.logo}>blah_read</Text>
        <Animated.Text style={[styles.cursor, { opacity: cursorAnim }]}>▌</Animated.Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <Text style={styles.stat}>level {level}</Text>
        <Text style={styles.stat}>streak: {progress?.currentStreak || 0}_</Text>
      </View>

      {/* XP progress bar */}
      <View style={styles.xpBar}>
        <View style={[styles.xpFill, { width: `${(xp.current / xp.needed) * 100}%` }]} />
      </View>
      <Text style={styles.xpText}>{xp.current} / {xp.needed} xp</Text>

      {/* Current book card */}
      {currentBook ? (
        <Pressable
          style={styles.currentBook}
          onPress={() => router.push(`/timer/${currentBook.id}`)}
        >
          <Text style={styles.bookLabel}>currently reading_</Text>
          <Text style={styles.bookTitle}>{currentBook.title.toLowerCase()}</Text>
          <Text style={styles.startButton}>[ start reading ]</Text>
        </Pressable>
      ) : (
        <Pressable style={styles.currentBook} onPress={() => router.push('/library')}>
          <Text style={styles.bookLabel}>no book selected_</Text>
          <Text style={styles.startButton}>[ pick a book ]</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: spacing(6), // 24px - contentPadding from design system
    paddingTop: spacing(16), // Extra top padding for status bar
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(12), // 48px - logo to content spacing
  },
  logo: {
    color: COLORS.text,
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: fontSize('hero'), // 48px
    letterSpacing: letterSpacing('normal'),
  },
  cursor: {
    color: COLORS.text,
    fontFamily: FONTS.mono,
    fontSize: fontSize('hero'),
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing(4),
  },
  stat: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.mono,
    fontSize: fontSize('body'), // 14px
    letterSpacing: letterSpacing('tight'),
  },
  xpBar: {
    height: 4, // Progress track height from design system
    backgroundColor: COLORS.backgroundCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: spacing(2),
  },
  xpFill: {
    height: '100%',
    backgroundColor: COLORS.success,
  },
  xpText: {
    color: COLORS.success,
    fontFamily: FONTS.mono,
    fontSize: fontSize('small'), // 12px
    letterSpacing: letterSpacing('tight'),
    marginBottom: spacing(10), // 40px - section separation
  },
  currentBook: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.backgroundCard,
    padding: spacing(6),
  },
  bookLabel: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.mono,
    fontSize: fontSize('small'),
    letterSpacing: letterSpacing('tight'),
    marginBottom: spacing(2),
  },
  bookTitle: {
    color: COLORS.text,
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: fontSize('large'), // 18px
    letterSpacing: letterSpacing('tight'),
    marginBottom: spacing(6),
    textAlign: 'center',
  },
  startButton: {
    color: COLORS.text,
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: fontSize('large'),
    letterSpacing: letterSpacing('hero'), // 4 for CTAs
  },
});
