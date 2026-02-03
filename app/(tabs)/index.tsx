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
  Easing,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { storage } from '@/lib/storage';
import { calculateLevel, xpProgress } from '@/lib/xp';
import { Book, UserProgress, Companion } from '@/lib/types';
import { FONTS } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';
import { DungeonBar } from '@/components/dungeon';
import { ReadingBookCard } from '@/components/ReadingBookCard';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Card stack configuration
const CARD_OFFSET = 8; // Vertical offset between cards in stack
const CARD_SCALE_DIFF = 0.03; // Scale reduction for each card behind
const MAX_VISIBLE_CARDS = 3; // Maximum number of cards visible in stack
const SWIPE_THRESHOLD = 50; // Minimum swipe distance to trigger card change
const ANIMATION_DURATION = 250; // Duration for card transitions

export default function HomeScreen() {
  const { colors, spacing, fontSize, letterSpacing } = useTheme();
  const [readingBooks, setReadingBooks] = useState<Book[]>([]);
  const [allCompanions, setAllCompanions] = useState<Companion[]>([]);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [topIndex, setTopIndex] = useState(0); // Which book is currently on top
  const cursorAnim = useRef(new Animated.Value(1)).current;

  // Animation values
  const swipeAnim = useRef(new Animated.Value(0)).current; // For drag gesture
  const transitionAnim = useRef(new Animated.Value(0)).current; // For smooth transitions
  const isAnimating = useRef(false); // Prevent interruptions

  // Refs for pan responder (to avoid stale closures)
  const readingBooksRef = useRef<Book[]>([]);
  readingBooksRef.current = readingBooks;

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
    const reading = books.filter(b => b.status === 'reading');

    setReadingBooks(reading);

    // Restore last active book position
    const lastActiveId = await storage.getLastActiveBookId();
    if (lastActiveId && reading.length > 0) {
      const lastActiveIndex = reading.findIndex(b => b.id === lastActiveId);
      if (lastActiveIndex >= 0) {
        setTopIndex(lastActiveIndex);
      } else {
        setTopIndex(0);
        await storage.setLastActiveBookId(reading[0].id);
      }
    } else if (reading.length > 0) {
      setTopIndex(0);
      await storage.setLastActiveBookId(reading[0].id);
    }

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

  // Helper to get wrapped index
  const getWrappedIndex = useCallback((index: number, length: number) => {
    if (length === 0) return 0;
    return ((index % length) + length) % length;
  }, []);

  // Update lastActiveBookId when topIndex changes
  useEffect(() => {
    if (readingBooks.length > 0) {
      const currentBook = readingBooks[getWrappedIndex(topIndex, readingBooks.length)];
      if (currentBook) {
        storage.setLastActiveBookId(currentBook.id);
      }
    }
  }, [topIndex, readingBooks, getWrappedIndex]);

  // Animate to next card (swipe up)
  const goToNext = useCallback(() => {
    if (readingBooksRef.current.length <= 1 || isAnimating.current) return;
    isAnimating.current = true;

    // Animate: current card flies up, transition progress goes 0 -> 1
    Animated.parallel([
      Animated.timing(swipeAnim, {
        toValue: -SCREEN_HEIGHT * 0.5,
        duration: ANIMATION_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(transitionAnim, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Update index first, then reset animations on next frame to avoid flicker
      setTopIndex(prev => getWrappedIndex(prev + 1, readingBooksRef.current.length));
      // Wait for React to commit the state change before resetting animations
      requestAnimationFrame(() => {
        swipeAnim.setValue(0);
        transitionAnim.setValue(0);
        isAnimating.current = false;
      });
    });
  }, [swipeAnim, transitionAnim, getWrappedIndex]);

  // Animate to previous card (swipe down)
  // Mirror of swipe up - card slides DOWN and fades, card behind moves into position
  const goToPrev = useCallback(() => {
    if (readingBooksRef.current.length <= 1 || isAnimating.current) return;
    isAnimating.current = true;

    // Animate: current card flies DOWN, cards behind move up (same as swipe up)
    Animated.parallel([
      Animated.timing(swipeAnim, {
        toValue: SCREEN_HEIGHT * 0.5, // Opposite direction from swipe up
        duration: ANIMATION_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(transitionAnim, {
        toValue: 1, // Same as swipe up - cards behind move into position
        duration: ANIMATION_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Update index (go to previous instead of next)
      setTopIndex(prev => getWrappedIndex(prev - 1, readingBooksRef.current.length));
      requestAnimationFrame(() => {
        swipeAnim.setValue(0);
        transitionAnim.setValue(0);
        isAnimating.current = false;
      });
    });
  }, [swipeAnim, transitionAnim, getWrappedIndex]);

  // Refs for pan responder callbacks
  const goToNextRef = useRef(goToNext);
  const goToPrevRef = useRef(goToPrev);
  goToNextRef.current = goToNext;
  goToPrevRef.current = goToPrev;

  // Pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to vertical swipes with enough movement
        if (isAnimating.current) return false;
        return Math.abs(gestureState.dy) > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.2;
      },
      onPanResponderGrant: () => {
        swipeAnim.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        if (isAnimating.current) return;
        // Follow finger movement with resistance at edges
        const damping = 0.5;
        swipeAnim.setValue(gestureState.dy * damping);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isAnimating.current) return;

        const velocity = gestureState.vy;
        const distance = gestureState.dy;

        // Use both distance and velocity to determine action
        if (distance < -SWIPE_THRESHOLD || (velocity < -0.5 && distance < -20)) {
          // Swiped up - go to next
          goToNextRef.current();
        } else if (distance > SWIPE_THRESHOLD || (velocity > 0.5 && distance > 20)) {
          // Swiped down - go to previous
          goToPrevRef.current();
        } else {
          // Snap back with spring
          Animated.spring(swipeAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 150,
            friction: 12,
          }).start();
        }
      },
    })
  ).current;

  // Navigate to book detail
  const handleCardPress = useCallback((book: Book) => {
    router.push(`/book/${book.id}`);
  }, []);

  const level = progress ? calculateLevel(progress.totalXp) : 1;
  const xp = progress ? xpProgress(progress.totalXp) : { current: 0, needed: 1000 };

  const styles = createStyles(colors, spacing, fontSize, letterSpacing);

  // Build the visible cards array based on current topIndex
  const getVisibleCards = useCallback(() => {
    if (readingBooks.length === 0) return [];

    const cards: { book: Book; stackPosition: number }[] = [];
    const usedBookIds = new Set<string>();

    // Render cards at positions 0 through MAX_VISIBLE_CARDS
    const cardsToRender = Math.min(MAX_VISIBLE_CARDS + 1, readingBooks.length);
    for (let i = 0; i < cardsToRender; i++) {
      const bookIndex = getWrappedIndex(topIndex + i, readingBooks.length);
      const book = readingBooks[bookIndex];
      // Skip if we already added this book (prevents duplicates with small lists)
      if (usedBookIds.has(book.id)) continue;
      cards.push({ book, stackPosition: i });
      usedBookIds.add(book.id);
    }
    return cards;
  }, [readingBooks, topIndex, getWrappedIndex]);

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

    const visibleCards = getVisibleCards();

    return (
      <View style={styles.stackContainer} {...panResponder.panHandlers}>
        {visibleCards.map(({ book, stackPosition }) => {
          const isTopCard = stackPosition === 0;
          const isHiddenCard = stackPosition >= MAX_VISIBLE_CARDS;
          const zIndex = MAX_VISIBLE_CARDS - stackPosition;

          // Base values for this stack position
          const baseOffset = stackPosition * CARD_OFFSET;
          const baseScale = 1 - stackPosition * CARD_SCALE_DIFF;
          const baseOpacity = stackPosition >= MAX_VISIBLE_CARDS ? 0 : 1 - stackPosition * 0.15;

          let translateY: Animated.AnimatedInterpolation<number> | number;
          let scale: Animated.AnimatedInterpolation<number> | number;
          let opacity: Animated.AnimatedInterpolation<number> | number;

          if (isTopCard) {
            // Top card follows the swipe gesture
            translateY = swipeAnim;
            scale = baseScale;
            // Fade out as it moves away (up OR down)
            opacity = swipeAnim.interpolate({
              inputRange: [-SCREEN_HEIGHT * 0.5, -SCREEN_HEIGHT * 0.15, 0, SCREEN_HEIGHT * 0.15, SCREEN_HEIGHT * 0.5],
              outputRange: [0, 0.6, 1, 0.6, 0],
              extrapolate: 'clamp',
            });
          } else {
            // Cards behind animate up when transitionAnim goes to 1 (swipe up)
            const nextUpOffset = Math.max(0, stackPosition - 1) * CARD_OFFSET;
            const nextUpScale = 1 - Math.max(0, stackPosition - 1) * CARD_SCALE_DIFF;
            const nextUpOpacity = stackPosition - 1 >= MAX_VISIBLE_CARDS ? 0 : 1 - Math.max(0, stackPosition - 1) * 0.15;

            translateY = transitionAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [baseOffset, nextUpOffset],
              extrapolate: 'clamp',
            });
            scale = transitionAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [baseScale, nextUpScale],
              extrapolate: 'clamp',
            });
            opacity = transitionAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [baseOpacity, nextUpOpacity],
              extrapolate: 'clamp',
            });
          }

          // Use book.id as stable key to prevent unmount/remount during transitions
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
              // Hide from accessibility when not visible
              accessibilityElementsHidden={isHiddenCard}
              importantForAccessibility={isHiddenCard ? 'no-hide-descendants' : 'auto'}
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
              {getWrappedIndex(topIndex, readingBooks.length) + 1}/{readingBooks.length}
            </Text>
            <Text style={styles.stackHint}>swipe up/down to browse</Text>
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
