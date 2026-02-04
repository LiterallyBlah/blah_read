import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Book, GENRE_DISPLAY_NAMES, Genre, debug } from '@/lib/shared';
import { FONTS } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';
import { getBookTier, getTierColorKey, getTierGlow } from '@/lib/bookTier';

interface Props {
  book: Book;
  onPress: () => void;
}

export function BookCard({ book, onPress }: Props) {
  const { colors, spacing, fontSize, letterSpacing } = useTheme();

  const styles = createStyles(colors, spacing, fontSize, letterSpacing);

  const level = book.progression?.level || 1;
  const tier = getBookTier(level);
  const tierColor = colors[getTierColorKey(tier)];
  const glow = getTierGlow(tier);

  const hours = Math.floor(book.totalReadingTime / 3600);
  const minutes = Math.floor((book.totalReadingTime % 3600) / 60);

  const genreText = book.normalizedGenres
    ?.slice(0, 2)
    .map(g => GENRE_DISPLAY_NAMES[g as Genre])
    .join(', ')
    .toLowerCase();

  debug.log('genres', `Book: "${book.title}"`, {
    rawGenres: book.genres || [],
    normalizedGenres: book.normalizedGenres || [],
    displayText: genreText || '(none)',
  });

  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View
        style={{
          borderWidth: 1,
          borderColor: tierColor,
          shadowColor: tierColor,
          shadowRadius: glow.shadowRadius,
          shadowOpacity: glow.shadowOpacity,
          shadowOffset: { width: 0, height: 0 },
          elevation: glow.elevation,
          marginBottom: spacing(2),
        }}
      >
        {book.coverUrl ? (
          <Image source={{ uri: book.coverUrl }} style={styles.coverImage} />
        ) : (
          <View style={[styles.coverImage, styles.placeholder]}>
            <Text style={styles.placeholderText}>?</Text>
          </View>
        )}
      </View>
      <Text style={styles.title} numberOfLines={2}>{book.title.toLowerCase()}</Text>
      {genreText && <Text style={styles.genre} numberOfLines={1}>{genreText}</Text>}
      <Text style={styles.time}>{hours}h {minutes}m</Text>
    </Pressable>
  );
}

const createStyles = (
  colors: ReturnType<typeof useTheme>['colors'],
  spacing: ReturnType<typeof useTheme>['spacing'],
  fontSize: ReturnType<typeof useTheme>['fontSize'],
  letterSpacing: ReturnType<typeof useTheme>['letterSpacing']
) => StyleSheet.create({
  container: {
    width: 100,
    marginRight: spacing(3),
  },
  coverImage: {
    width: 98,
    height: 148,
    backgroundColor: colors.surface,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: colors.textMuted,
    fontFamily: FONTS.mono,
    fontSize: 36,
  },
  title: {
    color: colors.text,
    fontFamily: FONTS.mono,
    fontSize: fontSize('small'),
    letterSpacing: letterSpacing('tight'),
    marginBottom: spacing(1),
  },
  genre: {
    color: colors.textMuted,
    fontFamily: FONTS.mono,
    fontSize: fontSize('micro'),
    letterSpacing: letterSpacing('tight'),
    marginBottom: spacing(1),
  },
  time: {
    color: colors.textMuted,
    fontFamily: FONTS.mono,
    fontSize: fontSize('micro'),
    letterSpacing: letterSpacing('tight'),
  },
});
