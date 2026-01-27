import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Book } from '@/lib/types';
import { FONTS } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';

interface Props {
  book: Book;
  onPress: () => void;
}

export function BookCard({ book, onPress }: Props) {
  const { colors, spacing, fontSize, letterSpacing } = useTheme();

  const styles = createStyles(colors, spacing, fontSize, letterSpacing);

  const hours = Math.floor(book.totalReadingTime / 3600);
  const minutes = Math.floor((book.totalReadingTime % 3600) / 60);

  return (
    <Pressable style={styles.container} onPress={onPress}>
      {book.coverUrl ? (
        <Image source={{ uri: book.coverUrl }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.placeholder]}>
          <Text style={styles.placeholderText}>?</Text>
        </View>
      )}
      <Text style={styles.title} numberOfLines={2}>{book.title.toLowerCase()}</Text>
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
  cover: {
    width: 100,
    height: 150,
    backgroundColor: colors.surface,
    marginBottom: spacing(2),
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
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
  time: {
    color: colors.textMuted,
    fontFamily: FONTS.mono,
    fontSize: fontSize('micro'),
    letterSpacing: letterSpacing('tight'),
  },
});
