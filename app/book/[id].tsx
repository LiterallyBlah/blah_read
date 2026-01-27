import { useEffect, useState } from 'react';
import { View, Text, Image, Pressable, ScrollView, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { storage } from '@/lib/storage';
import { canUnlockCompanion, generateCompanion } from '@/lib/companionGenerator';
import { enrichBookData } from '@/lib/bookEnrichment';
import { Book, BookStatus } from '@/lib/types';
import { FONTS } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';
import { CompanionProgress, CompanionStep } from '@/components/CompanionProgress';
import { settings } from '@/lib/settings';

const STATUS_OPTIONS: { label: string; value: BookStatus }[] = [
  { label: 'to read', value: 'to_read' },
  { label: 'reading', value: 'reading' },
  { label: 'finished', value: 'finished' },
];

export default function BookDetailScreen() {
  const { colors, spacing, fontSize, letterSpacing } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [generating, setGenerating] = useState(false);
  const [companionStep, setCompanionStep] = useState<CompanionStep | null>(null);
  const [companionError, setCompanionError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const styles = createStyles(colors, spacing, fontSize, letterSpacing);

  useEffect(() => {
    loadBook();
  }, [id]);

  async function loadBook() {
    const books = await storage.getBooks();
    setBook(books.find(b => b.id === id) || null);
  }

  useEffect(() => {
    if (!book) return;

    // Auto-generate companion for newly added kindle-share books without companions
    const shouldAutoGenerate =
      book.source === 'kindle-share' &&
      !book.companion &&
      book.synopsis &&
      // Only if book was created in last 30 seconds (freshly added)
      Date.now() - book.createdAt < 30000;

    if (shouldAutoGenerate) {
      autoGenerateCompanion();
    }
  }, [book?.id]);

  async function autoGenerateCompanion() {
    if (!book) return;

    const config = await settings.get();
    if (!config.apiKey) {
      // No API key, skip auto-generation
      return;
    }

    setCompanionStep('analyzing');
    setCompanionError(null);

    try {
      setCompanionStep('personality');
      // Small delay for UX
      await new Promise(r => setTimeout(r, 500));

      setCompanionStep('avatar');
      await generateCompanion(book);

      setCompanionStep('done');
      await loadBook();
    } catch (error: any) {
      setCompanionStep('error');
      setCompanionError(error.message || 'Failed to generate companion');
    }
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

  async function handleSyncMetadata() {
    if (!book) return;

    setIsSyncing(true);
    try {
      const enrichment = await enrichBookData(book.title, book.authors?.[0]);

      const updatedBook: Book = {
        ...book,
        coverUrl: enrichment.coverUrl || book.coverUrl,
        synopsis: enrichment.synopsis || book.synopsis,
        pageCount: enrichment.pageCount || book.pageCount,
        genres: enrichment.genres.length ? enrichment.genres : book.genres,
        publisher: enrichment.publisher || book.publisher,
        publishedDate: enrichment.publishedDate || book.publishedDate,
        metadataSynced: enrichment.source !== 'none',
      };

      await storage.saveBook(updatedBook);
      setBook(updatedBook);

      if (enrichment.source === 'none') {
        Alert.alert('No Data Found', 'Could not find additional metadata for this book.');
      }
    } catch (error) {
      Alert.alert('Sync Failed', 'Could not fetch book metadata.');
    } finally {
      setIsSyncing(false);
    }
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

      {/* Sync metadata button - show when metadata not synced */}
      {book.metadataSynced === false && (
        <Pressable
          style={[styles.syncButton, { borderColor: colors.textMuted }]}
          onPress={handleSyncMetadata}
          disabled={isSyncing}
        >
          <Text style={[styles.syncText, { color: colors.textMuted }]}>
            {isSyncing ? 'syncing...' : '[sync metadata]'}
          </Text>
        </Pressable>
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
        {companionStep && companionStep !== 'done' && (
          <CompanionProgress
            currentStep={companionStep}
            error={companionError || undefined}
          />
        )}

        {companionStep === 'error' && (
          <Pressable onPress={autoGenerateCompanion} style={styles.retryButton}>
            <Text style={[styles.retryText, { color: colors.text }]}>
              [try again]
            </Text>
          </Pressable>
        )}

        {!companionStep && book.companion ? (
          <View style={styles.companionCard}>
            <Image source={{ uri: book.companion.imageUrl }} style={styles.companionImage} />
            <Text style={styles.companionName}>{book.companion.creature.toLowerCase()}</Text>
            <Text style={styles.companionType}>{book.companion.archetype.toLowerCase()}</Text>
          </View>
        ) : !companionStep && canUnlock ? (
          <Pressable style={styles.unlockButton} onPress={handleUnlockCompanion} disabled={generating}>
            <Text style={styles.unlockText}>
              {generating ? 'generating..._' : '[ unlock companion ]'}
            </Text>
          </Pressable>
        ) : !companionStep && !book.companion ? (
          <Text style={styles.lockedText}>
            finish book or read 5 hours to unlock_
          </Text>
        ) : null}
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

function createStyles(colors: any, spacing: any, fontSize: any, letterSpacing: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: spacing(6),
      paddingTop: spacing(16),
    },
    loading: {
      color: colors.textSecondary,
      fontFamily: FONTS.mono,
      fontSize: fontSize('body'),
    },
    backButton: {
      marginBottom: spacing(6),
    },
    backText: {
      color: colors.textSecondary,
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
      backgroundColor: colors.surface,
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
      fontSize: 48,
    },
    title: {
      color: colors.text,
      fontFamily: FONTS.mono,
      fontWeight: FONTS.monoBold,
      fontSize: fontSize('title'),
      letterSpacing: letterSpacing('tight'),
      marginBottom: spacing(2),
    },
    time: {
      color: colors.textMuted,
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
      letterSpacing: letterSpacing('tight'),
      marginBottom: spacing(4),
    },
    synopsis: {
      color: colors.textSecondary,
      fontFamily: FONTS.mono,
      fontSize: fontSize('body'),
      lineHeight: 22,
      marginBottom: spacing(6),
    },
    syncButton: {
      borderWidth: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: 'center',
      marginTop: 12,
      marginBottom: spacing(6),
    },
    syncText: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
      letterSpacing: letterSpacing('tight'),
    },
    section: {
      marginBottom: spacing(6),
    },
    sectionLabel: {
      color: colors.textMuted,
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
      borderColor: colors.border,
    },
    statusButtonActive: {
      borderColor: colors.text,
      backgroundColor: colors.backgroundCard,
    },
    statusText: {
      color: colors.textMuted,
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
      letterSpacing: letterSpacing('tight'),
    },
    statusTextActive: {
      color: colors.text,
    },
    companionCard: {
      alignItems: 'center',
      padding: spacing(4),
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.backgroundCard,
    },
    companionImage: {
      width: 96,
      height: 96,
      marginBottom: spacing(2),
    },
    companionName: {
      color: colors.text,
      fontFamily: FONTS.mono,
      fontWeight: FONTS.monoBold,
      fontSize: fontSize('large'),
      letterSpacing: letterSpacing('tight'),
    },
    companionType: {
      color: colors.textMuted,
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
      letterSpacing: letterSpacing('tight'),
    },
    unlockButton: {
      padding: spacing(4),
      borderWidth: 1,
      borderColor: colors.success,
      alignItems: 'center',
    },
    unlockText: {
      color: colors.success,
      fontFamily: FONTS.mono,
      fontSize: fontSize('body'),
      letterSpacing: letterSpacing('tight'),
    },
    lockedText: {
      color: colors.textMuted,
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
      letterSpacing: letterSpacing('tight'),
    },
    primaryButton: {
      borderWidth: 1,
      borderColor: colors.text,
      paddingVertical: spacing(5),
      alignItems: 'center',
      marginBottom: spacing(4),
    },
    primaryButtonText: {
      color: colors.text,
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
      color: colors.error,
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
      letterSpacing: letterSpacing('tight'),
    },
    retryButton: {
      marginTop: 12,
      paddingVertical: 8,
    },
    retryText: {
      fontFamily: FONTS.mono,
      fontSize: 14,
      textAlign: 'center',
    },
  });
}
