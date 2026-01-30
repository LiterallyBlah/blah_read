import { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { storage } from '@/lib/storage';
import { BookCard } from '@/components/BookCard';
import { Book, BookStatus } from '@/lib/types';
import { FONTS } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';
import { isKindleShareText } from '@/lib/kindleParser';
import { settings } from '@/lib/settings';
import { setDebugEnabled } from '@/lib/debug';

const FILTERS: { label: string; value: BookStatus | 'all' }[] = [
  { label: 'all', value: 'all' },
  { label: 'reading', value: 'reading' },
  { label: 'to read', value: 'to_read' },
  { label: 'finished', value: 'finished' },
];

export default function LibraryScreen() {
  const { colors, spacing, fontSize, letterSpacing } = useTheme();
  const insets = useSafeAreaInsets();
  const [books, setBooks] = useState<Book[]>([]);
  const [filter, setFilter] = useState<BookStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [isPasting, setIsPasting] = useState(false);
  const styles = createStyles(colors, spacing, fontSize, letterSpacing);

  useFocusEffect(
    useCallback(() => {
      loadBooks();
    }, [])
  );

  async function loadBooks() {
    const config = await settings.get();
    setDebugEnabled(config.debugMode);
    setBooks(await storage.getBooks());
  }

  async function handlePasteKindleLink() {
    setIsPasting(true);
    try {
      const clipboardText = await Clipboard.getStringAsync();

      if (!clipboardText) {
        Alert.alert('Empty Clipboard', 'No text found in clipboard.');
        return;
      }

      if (!isKindleShareText(clipboardText)) {
        Alert.alert('Invalid Link', 'No Kindle share link found in clipboard.');
        return;
      }

      router.push({
        pathname: '/kindle-share',
        params: { text: clipboardText },
      });
    } catch (error) {
      Alert.alert('Error', 'Could not read clipboard.');
    } finally {
      setIsPasting(false);
    }
  }

  const filteredBooks = books
    .filter(b => filter === 'all' || b.status === filter)
    .filter(b => b.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>library_</Text>

      {/* Search input */}
      <TextInput
        style={styles.search}
        placeholder="search..."
        placeholderTextColor={colors.textMuted}
        value={search}
        onChangeText={setSearch}
      />

      {/* Filter tabs */}
      <View style={styles.filters}>
        {FILTERS.map(f => (
          <Pressable
            key={f.value}
            style={[styles.filterTab, filter === f.value && styles.filterTabActive]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>
              [{f.label}]
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Paste Kindle link button */}
      <Pressable
        style={[styles.pasteButton, { borderColor: colors.textMuted }]}
        onPress={handlePasteKindleLink}
        disabled={isPasting}
      >
        <Text style={[styles.pasteButtonText, { color: colors.text }]}>
          {isPasting ? 'checking...' : '[paste kindle link]'}
        </Text>
      </Pressable>

      {/* Book grid */}
      {filteredBooks.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>no books yet_</Text>
          <Text style={styles.emptyHint}>share a book url to add one</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBooks}
          keyExtractor={item => item.id}
          numColumns={3}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
            <BookCard book={item} onPress={() => router.push(`/book/${item.id}`)} />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: spacing(6) + insets.bottom }]}
        />
      )}
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
      padding: spacing(6),
      paddingTop: spacing(16),
    },
    title: {
      color: colors.text,
      fontFamily: FONTS.mono,
      fontWeight: FONTS.monoBold,
      fontSize: fontSize('title'), // 28px
      letterSpacing: letterSpacing('normal'),
      marginBottom: spacing(6),
    },
    search: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.backgroundCard,
      color: colors.text,
      fontFamily: FONTS.mono,
      fontSize: fontSize('body'),
      padding: spacing(3),
      marginBottom: spacing(4),
    },
    filters: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing(2),
      marginBottom: spacing(6),
    },
    filterTab: {
      paddingVertical: spacing(1),
      paddingHorizontal: spacing(2),
    },
    filterTabActive: {
      borderBottomWidth: 1,
      borderBottomColor: colors.text,
    },
    filterText: {
      color: colors.textMuted,
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
      letterSpacing: letterSpacing('tight'),
    },
    filterTextActive: {
      color: colors.text,
    },
    list: {},
    row: {
      marginBottom: spacing(4),
    },
    empty: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyText: {
      color: colors.textSecondary,
      fontFamily: FONTS.mono,
      fontSize: fontSize('large'),
      letterSpacing: letterSpacing('tight'),
      marginBottom: spacing(2),
    },
    emptyHint: {
      color: colors.textMuted,
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
      letterSpacing: letterSpacing('tight'),
    },
    pasteButton: {
      borderWidth: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: 'center',
      marginBottom: 16,
    },
    pasteButtonText: {
      fontFamily: FONTS.mono,
      fontSize: 14,
    },
  });
