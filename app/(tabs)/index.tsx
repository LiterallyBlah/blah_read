// Follows BlahFret design system - lowercase, trailing underscores, bracket actions
import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, ImageBackground } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { storage } from '@/lib/storage';
import { calculateLevel, xpProgress } from '@/lib/xp';
import { Book, UserProgress } from '@/lib/types';
import { FONTS } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';

export default function HomeScreen() {
  const { colors, spacing, fontSize, letterSpacing } = useTheme();
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

  const styles = createStyles(colors, spacing, fontSize, letterSpacing);

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
          style={[styles.currentBook, currentBook.coverUrl && styles.currentBookWithCover]}
          onPress={() => router.push(`/timer/${currentBook.id}`)}
        >
          {currentBook.coverUrl && (
            <ImageBackground
              source={{ uri: currentBook.coverUrl }}
              style={StyleSheet.absoluteFillObject}
              imageStyle={styles.coverImage}
              resizeMode="cover"
            />
          )}
          <View style={[styles.coverOverlay, !currentBook.coverUrl && styles.noCoverOverlay]}>
            <Text style={styles.bookLabel}>currently reading_</Text>
            <Text style={styles.bookTitle}>{currentBook.title.toLowerCase()}</Text>
            <Text style={styles.startButton}>[ start reading ]</Text>
          </View>
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

function createStyles(colors: any, spacing: any, fontSize: any, letterSpacing: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: spacing(6), // 24px - contentPadding from design system
      paddingTop: spacing(16), // Extra top padding for status bar
    },
    logoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing(12), // 48px - logo to content spacing
    },
    logo: {
      color: colors.text,
      fontFamily: FONTS.mono,
      fontWeight: FONTS.monoBold,
      fontSize: fontSize('hero'), // 48px
      letterSpacing: letterSpacing('normal'),
    },
    cursor: {
      color: colors.text,
      fontFamily: FONTS.mono,
      fontSize: fontSize('hero'),
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing(4),
    },
    stat: {
      color: colors.textSecondary,
      fontFamily: FONTS.mono,
      fontSize: fontSize('body'), // 14px
      letterSpacing: letterSpacing('tight'),
    },
    xpBar: {
      height: 4, // Progress track height from design system
      backgroundColor: colors.backgroundCard,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing(2),
    },
    xpFill: {
      height: '100%',
      backgroundColor: colors.success,
    },
    xpText: {
      color: colors.success,
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
      borderColor: colors.border,
      backgroundColor: colors.backgroundCard,
      padding: spacing(6),
      overflow: 'hidden',
    },
    currentBookWithCover: {
      padding: 0,
    },
    coverImage: {
      opacity: 0.4,
    },
    coverOverlay: {
      flex: 1,
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing(6),
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    noCoverOverlay: {
      backgroundColor: 'transparent',
    },
    bookLabel: {
      color: colors.textSecondary,
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
      letterSpacing: letterSpacing('tight'),
      marginBottom: spacing(2),
    },
    bookTitle: {
      color: colors.text,
      fontFamily: FONTS.mono,
      fontWeight: FONTS.monoBold,
      fontSize: fontSize('large'), // 18px
      letterSpacing: letterSpacing('tight'),
      marginBottom: spacing(6),
      textAlign: 'center',
    },
    startButton: {
      color: colors.text,
      fontFamily: FONTS.mono,
      fontWeight: FONTS.monoBold,
      fontSize: fontSize('large'),
      letterSpacing: letterSpacing('hero'), // 4 for CTAs
    },
  });
}
