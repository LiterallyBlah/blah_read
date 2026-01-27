import { useEffect, useState } from 'react';
import { View, Text, Image, Pressable, ScrollView, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { storage } from '@/lib/storage';
import { canUnlockCompanion, generateCompanion } from '@/lib/companionGenerator';
import { Book, BookStatus } from '@/lib/types';
import { COLORS, FONTS, spacing, fontSize, letterSpacing } from '@/lib/theme';

const STATUS_OPTIONS: { label: string; value: BookStatus }[] = [
  { label: 'to read', value: 'to_read' },
  { label: 'reading', value: 'reading' },
  { label: 'finished', value: 'finished' },
];

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadBook();
  }, [id]);

  async function loadBook() {
    const books = await storage.getBooks();
    setBook(books.find(b => b.id === id) || null);
  }

  async function updateStatus(status: BookStatus) {
    if (!book) return;
    book.status = status;
    if (status === 'finished' && !book.finishedAt) {
      book.finishedAt = Date.now();
    }
    await storage.saveBook(book);
    setBook({ ...book });
  }

  async function handleUnlockCompanion() {
    if (!book) return;
    setGenerating(true);
    try {
      await generateCompanion(book);
      await loadBook();
    } catch (error: any) {
      Alert.alert('Generation Failed', error.message || 'Could not generate companion.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete() {
    if (!book) return;
    Alert.alert('Delete Book', `Remove "${book.title}" from your library?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await storage.deleteBook(book.id);
          router.back();
        },
      },
    ]);
  }

  if (!book) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>loading..._</Text>
      </View>
    );
  }

  const hours = Math.floor(book.totalReadingTime / 3600);
  const minutes = Math.floor((book.totalReadingTime % 3600) / 60);
  const canUnlock = canUnlockCompanion(book);

  return (
    <ScrollView style={styles.container}>
      {/* Back button */}
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>{'<'} back</Text>
      </Pressable>

      {/* Book cover */}
      <View style={styles.coverSection}>
        {book.coverUrl ? (
          <Image source={{ uri: book.coverUrl }} style={styles.cover} resizeMode="contain" />
        ) : (
          <View style={[styles.cover, styles.placeholder]}>
            <Text style={styles.placeholderText}>?</Text>
          </View>
        )}
      </View>

      {/* Title and time */}
      <Text style={styles.title}>{book.title.toLowerCase()}_</Text>
      <Text style={styles.time}>{hours}h {minutes}m read</Text>

      {/* Synopsis */}
      {book.synopsis && (
        <Text style={styles.synopsis}>{book.synopsis}</Text>
      )}

      {/* Status selector */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>status_</Text>
        <View style={styles.statusRow}>
          {STATUS_OPTIONS.map(opt => (
            <Pressable
              key={opt.value}
              style={[styles.statusButton, book.status === opt.value && styles.statusButtonActive]}
              onPress={() => updateStatus(opt.value)}
            >
              <Text style={[styles.statusText, book.status === opt.value && styles.statusTextActive]}>
                [{opt.label}]
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Companion section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>companion_</Text>
        {book.companion ? (
          <View style={styles.companionCard}>
            <Image source={{ uri: book.companion.imageUrl }} style={styles.companionImage} />
            <Text style={styles.companionName}>{book.companion.creature.toLowerCase()}</Text>
            <Text style={styles.companionType}>{book.companion.archetype.toLowerCase()}</Text>
          </View>
        ) : canUnlock ? (
          <Pressable style={styles.unlockButton} onPress={handleUnlockCompanion} disabled={generating}>
            <Text style={styles.unlockText}>
              {generating ? 'generating..._' : '[ unlock companion ]'}
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.lockedText}>
            finish book or read 5 hours to unlock_
          </Text>
        )}
      </View>

      {/* Start reading button */}
      <Pressable style={styles.primaryButton} onPress={() => router.push(`/timer/${book.id}`)}>
        <Text style={styles.primaryButtonText}>[ start reading ]</Text>
      </Pressable>

      {/* Delete button */}
      <Pressable style={styles.deleteButton} onPress={handleDelete}>
        <Text style={styles.deleteText}>[delete]</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: spacing(6),
    paddingTop: spacing(16),
  },
  loading: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.mono,
    fontSize: fontSize('body'),
  },
  backButton: {
    marginBottom: spacing(6),
  },
  backText: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.mono,
    fontSize: fontSize('body'),
    letterSpacing: letterSpacing('tight'),
  },
  coverSection: {
    alignItems: 'center',
    marginBottom: spacing(6),
  },
  cover: {
    width: 150,
    height: 225,
    backgroundColor: COLORS.surface,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  placeholderText: {
    color: COLORS.textMuted,
    fontFamily: FONTS.mono,
    fontSize: 48,
  },
  title: {
    color: COLORS.text,
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: fontSize('title'),
    letterSpacing: letterSpacing('tight'),
    marginBottom: spacing(2),
  },
  time: {
    color: COLORS.textMuted,
    fontFamily: FONTS.mono,
    fontSize: fontSize('small'),
    letterSpacing: letterSpacing('tight'),
    marginBottom: spacing(4),
  },
  synopsis: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.mono,
    fontSize: fontSize('body'),
    lineHeight: 22,
    marginBottom: spacing(6),
  },
  section: {
    marginBottom: spacing(6),
  },
  sectionLabel: {
    color: COLORS.textMuted,
    fontFamily: FONTS.mono,
    fontSize: fontSize('small'),
    letterSpacing: letterSpacing('tight'),
    marginBottom: spacing(2),
  },
  statusRow: {
    flexDirection: 'row',
    gap: spacing(2),
  },
  statusButton: {
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusButtonActive: {
    borderColor: COLORS.text,
    backgroundColor: COLORS.backgroundCard,
  },
  statusText: {
    color: COLORS.textMuted,
    fontFamily: FONTS.mono,
    fontSize: fontSize('small'),
    letterSpacing: letterSpacing('tight'),
  },
  statusTextActive: {
    color: COLORS.text,
  },
  companionCard: {
    alignItems: 'center',
    padding: spacing(4),
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.backgroundCard,
  },
  companionImage: {
    width: 96,
    height: 96,
    marginBottom: spacing(2),
  },
  companionName: {
    color: COLORS.text,
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: fontSize('large'),
    letterSpacing: letterSpacing('tight'),
  },
  companionType: {
    color: COLORS.textMuted,
    fontFamily: FONTS.mono,
    fontSize: fontSize('small'),
    letterSpacing: letterSpacing('tight'),
  },
  unlockButton: {
    padding: spacing(4),
    borderWidth: 1,
    borderColor: COLORS.success,
    alignItems: 'center',
  },
  unlockText: {
    color: COLORS.success,
    fontFamily: FONTS.mono,
    fontSize: fontSize('body'),
    letterSpacing: letterSpacing('tight'),
  },
  lockedText: {
    color: COLORS.textMuted,
    fontFamily: FONTS.mono,
    fontSize: fontSize('small'),
    letterSpacing: letterSpacing('tight'),
  },
  primaryButton: {
    borderWidth: 1,
    borderColor: COLORS.text,
    paddingVertical: spacing(5),
    alignItems: 'center',
    marginBottom: spacing(4),
  },
  primaryButtonText: {
    color: COLORS.text,
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: fontSize('large'),
    letterSpacing: letterSpacing('hero'),
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: spacing(3),
    marginBottom: spacing(8),
  },
  deleteText: {
    color: COLORS.error,
    fontFamily: FONTS.mono,
    fontSize: fontSize('small'),
    letterSpacing: letterSpacing('tight'),
  },
});
