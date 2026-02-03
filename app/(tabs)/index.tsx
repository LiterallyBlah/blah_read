// Follows BlahFret design system - lowercase, trailing underscores, bracket actions
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { storage } from '@/lib/storage';
import { calculateLevel, xpProgress } from '@/lib/xp';
import { Book, UserProgress, Companion } from '@/lib/types';
import { FONTS } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';
import { DungeonBar } from '@/components/dungeon';
import { ReadingBookCard } from '@/components/ReadingBookCard';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// Card stack configuration
const CARD_OFFSET = 8; // Vertical offset between cards in stack
const CARD_SCALE_DIFF = 0.03; // Scale reduction for each card behind
const MAX_VISIBLE_CARDS = 3; // Maximum number of cards visible in stack
const SWIPE_THRESHOLD = 80; // Minimum swipe distance to trigger card change

export default function HomeScreen() {
  const { colors, spacing, fontSize, letterSpacing } = useTheme();
  const [readingBooks, setReadingBooks] = useState<Book[]>([]);
  const [allCompanions, setAllCompanions] = useState<Companion[]>([]);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const cursorAnim = useRef(new Animated.Value(1)).current;

  // Animation value for the swipe gesture
  const swipeAnim = useRef(new Animated.Value(0)).current;

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
    let reading = books.filter(b => b.status === 'reading');

    // Sort by last active book (most recently read book first)
    const lastActiveId = await storage.getLastActiveBookId();
    if (lastActiveId) {
      const lastActiveIndex = reading.findIndex(b => b.id === lastActiveId);
      if (lastActiveIndex > 0) {
        // Move the last active book to the front
        const [activeBook] = reading.splice(lastActiveIndex, 1);
        reading = [activeBook, ...reading];
      }
    }

    setReadingBooks(reading);
    setCurrentIndex(0); // Reset to show first (most recent) book

    // Collect all unlocked companions from all books for loadout preview
    const companions: Companion[] = [];
    for (const book of books) {
      if (book.companions?.unlockedCompanions) {
        companions.push(...book.companions.unlockedCompanions);
      }
    }
    setAllCompanions(companions);

    setProgress(await storage.getProgress());
  }

  // Cycle to next card
  const cycleToNext = useCallback(() => {
    if (readingBooks.length <= 1) return;

    // Animate current card flying up
    Animated.timing(swipeAnim, {
      toValue: -SCREEN_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      // Cycle the array: move first item to end
      setReadingBooks(prev => {
        const newBooks = [...prev];
        const first = newBooks.shift()!;
        newBooks.push(first);
        return newBooks;
      });
      // Reset animation
      swipeAnim.setValue(0);
    });
  }, [readingBooks.length, swipeAnim]);

  // Cycle to previous card
  const cycleToPrev = useCallback(() => {
    if (readingBooks.length <= 1) return;

    // Move last item to front immediately, then animate in from bottom
    setReadingBooks(prev => {
      const newBooks = [...prev];
      const last = newBooks.pop()!;
      newBooks.unshift(last);
      return newBooks;
    });
    swipeAnim.setValue(SCREEN_HEIGHT);
    Animated.timing(swipeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [readingBooks.length, swipeAnim]);

  // Pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (
        _: GestureResponderEvent,
        gestureState: PanResponderGestureState
      ) => {
        // Only respond to vertical swipes
        return Math.abs(gestureState.dy) > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderGrant: () => {
        // Stop any ongoing animation
        swipeAnim.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        // Follow finger movement (with damping)
        swipeAnim.setValue(gestureState.dy * 0.5);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -SWIPE_THRESHOLD) {
          // Swiped up - go to next
          cycleToNext();
        } else if (gestureState.dy > SWIPE_THRESHOLD) {
          // Swiped down - go to previous
          cycleToPrev();
        } else {
          // Snap back
          Animated.spring(swipeAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 10,
          }).start();
        }
      },
    })
  ).current;

  // Save the current top book as last active when navigating to it
  const handleCardPress = useCallback((book: Book) => {
    storage.setLastActiveBookId(book.id);
    router.push(`/book/${book.id}`);
  }, []);

  const level = progress ? calculateLevel(progress.totalXp) : 1;
  const xp = progress ? xpProgress(progress.totalXp) : { current: 0, needed: 1000 };

  const styles = createStyles(colors, spacing, fontSize, letterSpacing);

  // Render the card stack
  const renderCardStack = () => {
    if (readingBooks.length === 0) {
      return (
        <Pressable style={styles.emptyState} onPress={() => router.push('/library')}>
          <Text style={styles.emptyText}>no books currently reading_</Text>
          <Text style={styles.emptySubtext}>visit your library!</Text>
          <Text style={styles.emptyButton}>[ pick a book ]</Text>
        </Pressable>
      );
    }

    // Render cards in reverse order (back cards first, front card last)
    const visibleCards = readingBooks.slice(0, MAX_VISIBLE_CARDS);

    return (
      <View style={styles.stackContainer} {...panResponder.panHandlers}>
        {visibleCards.map((book, index) => {
          const isTopCard = index === 0;
          const stackIndex = index;

          // Calculate position for stacked cards
          const translateY = isTopCard
            ? swipeAnim
            : new Animated.Value(stackIndex * CARD_OFFSET);

          const scale = 1 - stackIndex * CARD_SCALE_DIFF;
          const opacity = 1 - stackIndex * 0.15;
          const zIndex = MAX_VISIBLE_CARDS - stackIndex;

          return (
            <Animated.View
              key={book.id}
              style={[
                styles.stackCard,
                {
                  zIndex,
                  transform: [
                    { translateY },
                    { scale },
                  ],
                  opacity,
                },
              ]}
            >
              <ReadingBookCard
                book={book}
                allCompanions={allCompanions}
                onCardPress={() => handleCardPress(book)}
                variant="vertical"
              />
            </Animated.View>
          );
        })}

        {/* Stack indicator */}
        {readingBooks.length > 1 && (
          <View style={styles.stackIndicator}>
            <Text style={styles.stackIndicatorText}>
              {1}/{readingBooks.length}
            </Text>
            <Text style={styles.stackHint}>swipe to browse</Text>
          </View>
        )}
      </View>
    );
  };

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
      <DungeonBar
        value={xp.current}
        max={xp.needed}
        color="amber"
        showText
        style={styles.xpBar}
      />

      {/* Card stack */}
      {renderCardStack()}
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
      marginBottom: spacing(8),
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
      marginBottom: spacing(6),
    },
    stackContainer: {
      flex: 1,
      position: 'relative',
    },
    stackCard: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
    },
    stackIndicator: {
      position: 'absolute',
      bottom: spacing(4),
      left: 0,
      right: 0,
      alignItems: 'center',
    },
    stackIndicatorText: {
      color: colors.textMuted,
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
      letterSpacing: letterSpacing('tight'),
    },
    stackHint: {
      color: colors.textMuted,
      fontFamily: FONTS.mono,
      fontSize: fontSize('micro'),
      letterSpacing: letterSpacing('tight'),
      marginTop: spacing(1),
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.backgroundCard,
      padding: spacing(6),
    },
    emptyText: {
      color: colors.textSecondary,
      fontFamily: FONTS.mono,
      fontSize: fontSize('body'),
      letterSpacing: letterSpacing('tight'),
      marginBottom: spacing(2),
    },
    emptySubtext: {
      color: colors.textMuted,
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
      letterSpacing: letterSpacing('tight'),
      marginBottom: spacing(6),
    },
    emptyButton: {
      color: colors.text,
      fontFamily: FONTS.mono,
      fontWeight: FONTS.monoBold,
      fontSize: fontSize('large'),
      letterSpacing: letterSpacing('hero'),
    },
  });
}
