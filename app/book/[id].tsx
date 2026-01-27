import { useEffect, useState, useRef } from 'react';
import { View, Text, Image, Pressable, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { storage } from '@/lib/storage';
import { enrichBookData } from '@/lib/bookEnrichment';
import { getNextMilestone } from '@/lib/companionUnlock';
import { checkLootBoxRewards } from '@/lib/lootBox';
import { generateBufferedImages } from '@/lib/companionImageQueue';
import { generateImageForCompanion } from '@/lib/imageGen';
import { Book, BookStatus, CompanionRarity } from '@/lib/types';
import type { Companion } from '@/lib/types';
import { FONTS } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';
import { settings } from '@/lib/settings';
import { generateCompanionsInBackground } from '@/lib/companionBackgroundGenerator';

const STATUS_OPTIONS: { label: string; value: BookStatus }[] = [
  { label: 'to read', value: 'to_read' },
  { label: 'reading', value: 'reading' },
  { label: 'finished', value: 'finished' },
];

function formatTimeRemaining(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function CompanionTile({
  companion,
  locked,
  colors,
  spacing,
}: {
  companion: Companion;
  locked: boolean;
  colors: any;
  spacing: any;
}) {
  const rarityColors: Record<string, string> = {
    common: colors.textMuted,
    rare: '#4A90D9',
    legendary: '#FFD700',
  };

  return (
    <View style={{
      width: 64,
      height: 80,
      marginRight: spacing(2),
      marginBottom: spacing(2),
      alignItems: 'center',
      borderWidth: 1,
      borderColor: locked ? colors.border : (rarityColors[companion.rarity] || colors.border),
      padding: spacing(1),
    }}>
      {locked ? (
        <View style={{
          width: 48,
          height: 48,
          backgroundColor: colors.surface,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <Text style={{ color: colors.textMuted, fontFamily: FONTS.mono }}>?</Text>
        </View>
      ) : companion.imageUrl ? (
        <Image source={{ uri: companion.imageUrl }} style={{ width: 48, height: 48 }} resizeMode="contain" />
      ) : (
        <View style={{ width: 48, height: 48, backgroundColor: colors.surface }} />
      )}
      <Text style={{
        color: locked ? colors.textMuted : colors.text,
        fontFamily: FONTS.mono,
        fontSize: 8,
        marginTop: spacing(1),
        textAlign: 'center',
      }} numberOfLines={1}>
        {locked ? '???' : companion.name.toLowerCase()}
      </Text>
    </View>
  );
}

export default function BookDetailScreen() {
  const { colors, spacing, fontSize, letterSpacing } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [completionLegendary, setCompletionLegendary] = useState<Companion | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [imageGenProgress, setImageGenProgress] = useState('');
  const [isGeneratingCompanions, setIsGeneratingCompanions] = useState(false);
  const generationStartedRef = useRef(false);

  const styles = createStyles(colors, spacing, fontSize, letterSpacing);

  useEffect(() => {
    loadBook();
    loadDebugMode();
  }, [id]);

  async function loadDebugMode() {
    const config = await settings.get();
    setDebugMode(config.debugMode);
  }

  useEffect(() => {
    if (book?.companionsPending && !isGeneratingCompanions && !generationStartedRef.current) {
      generationStartedRef.current = true;
      setIsGeneratingCompanions(true);

      generateCompanionsInBackground(book, async (updatedBook) => {
        await storage.saveBook(updatedBook);
        setBook(updatedBook);
        setIsGeneratingCompanions(false);
        generationStartedRef.current = false;
      });
    }
  }, [book?.companionsPending, book?.id]);

  async function loadBook() {
    const books = await storage.getBooks();
    setBook(books.find(b => b.id === id) || null);
  }

  async function updateStatus(status: BookStatus) {
    if (!book) return;

    const updatedBook = { ...book, status };

    if (status === 'finished') {
      updatedBook.finishedAt = Date.now();

      // Handle legendary unlock for book completion
      if (book.companions) {
        // Find an unlocked legendary in the pool queue
        const legendaryIndex = book.companions.poolQueue.companions.findIndex(
          c => c.rarity === 'legendary' && !c.unlockedAt
        );

        if (legendaryIndex !== -1) {
          const legendary: Companion = {
            ...book.companions.poolQueue.companions[legendaryIndex],
            unlockMethod: 'book_completion',
            unlockedAt: Date.now(),
          };

          updatedBook.companions = {
            ...book.companions,
            poolQueue: {
              ...book.companions.poolQueue,
              companions: book.companions.poolQueue.companions.map((c, i) =>
                i === legendaryIndex ? legendary : c
              ),
            },
            unlockedCompanions: [...book.companions.unlockedCompanions, legendary],
          };

          // Show celebration!
          setCompletionLegendary(legendary);
        }
      }

      // Update progress for loot box rewards
      const progress = await storage.getProgress();
      const previousProgress = { ...progress };
      progress.booksFinished = (progress.booksFinished || 0) + 1;

      // Check for loot box rewards from finishing book
      const newBoxes = checkLootBoxRewards(previousProgress, progress);
      if (newBoxes.length > 0) {
        progress.lootBoxes.availableBoxes.push(...newBoxes);
      }

      await storage.saveProgress(progress);
    }

    await storage.saveBook(updatedBook);
    setBook(updatedBook);
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
      const config = await settings.get();
      const enrichment = await enrichBookData(book.title, book.authors?.[0], {
        googleBooksApiKey: config.googleBooksApiKey,
        asin: book.asin,
      });

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

  async function handleDebugGenerateImages() {
    if (!book?.companions) return;

    const config = await settings.get();
    if (!config.apiKey) {
      Alert.alert('No API Key', 'Please configure your OpenRouter API key in settings.');
      return;
    }

    setIsGeneratingImages(true);
    setImageGenProgress('Starting image generation...');

    try {
      const generateImage = async (companion: Companion) => {
        setImageGenProgress(`Generating: ${companion.name}...`);
        console.log(`[Debug] Generating image for ${companion.name} using model ${config.imageModel}`);
        try {
          const url = await generateImageForCompanion(companion, config.apiKey!, {
            model: config.imageModel,
          });
          console.log(`[Debug] Image generated for ${companion.name}:`, url?.substring(0, 50));
          return url;
        } catch (error) {
          console.error(`[Debug] Failed to generate image for ${companion.name}:`, error);
          setImageGenProgress(`Failed: ${companion.name}`);
          return null;
        }
      };

      const updatedCompanions = await generateBufferedImages(
        book.companions,
        generateImage,
        (completed, total) => {
          setImageGenProgress(`Generated ${completed}/${total} images`);
        }
      );

      const updatedBook = { ...book, companions: updatedCompanions };
      await storage.saveBook(updatedBook);
      setBook(updatedBook);
      setImageGenProgress('Done!');

      Alert.alert('Images Generated', 'Companion images have been generated.');
    } catch (error) {
      console.error('[Debug] Image generation failed:', error);
      Alert.alert('Generation Failed', String(error));
    } finally {
      setIsGeneratingImages(false);
    }
  }

  async function handleDebugGenerateRarityImages() {
    if (!book?.companions) return;

    const config = await settings.get();
    if (!config.apiKey) {
      Alert.alert('No API Key', 'Please configure your OpenRouter API key in settings.');
      return;
    }

    setIsGeneratingImages(true);
    setImageGenProgress('Analyzing rarities...');

    try {
      // Get all companions from all sources
      const allCompanions = [
        ...book.companions.unlockedCompanions,
        ...book.companions.readingTimeQueue.companions,
        ...book.companions.poolQueue.companions,
      ];

      // Group by rarity and count those with images
      const rarities: CompanionRarity[] = ['common', 'rare', 'legendary'];
      const toGenerate: Companion[] = [];

      for (const rarity of rarities) {
        const ofRarity = allCompanions.filter(c => c.rarity === rarity);
        const withImages = ofRarity.filter(c => c.imageUrl);
        const withoutImages = ofRarity.filter(c => !c.imageUrl);
        const needed = Math.max(0, 2 - withImages.length);

        console.log(`[Debug Rarity] ${rarity}: ${withImages.length} with images, need ${needed} more`);

        // Add companions that need images, up to the needed amount
        toGenerate.push(...withoutImages.slice(0, needed));
      }

      if (toGenerate.length === 0) {
        Alert.alert('Already Complete', 'Already have 2+ images for each rarity.');
        setIsGeneratingImages(false);
        return;
      }

      setImageGenProgress(`Generating ${toGenerate.length} images...`);

      // Generate images for selected companions
      let generated = 0;
      for (const companion of toGenerate) {
        setImageGenProgress(`[${companion.rarity}] ${companion.name} (${generated + 1}/${toGenerate.length})`);
        console.log(`[Debug Rarity] Generating ${companion.rarity}: ${companion.name}`);

        try {
          const url = await generateImageForCompanion(companion, config.apiKey!, {
            model: config.imageModel,
            imageSize: config.imageSize,
            llmModel: config.llmModel,
          });
          if (url) {
            companion.imageUrl = url;
            generated++;
          }
        } catch (error) {
          console.error(`[Debug Rarity] Failed: ${companion.name}`, error);
        }
      }

      // Save updated book
      const updatedBook = { ...book, companions: { ...book.companions } };
      await storage.saveBook(updatedBook);
      setBook(updatedBook);

      setImageGenProgress('Done!');
      Alert.alert('Rarity Test Complete', `Generated ${generated} images across rarities.`);
    } catch (error) {
      console.error('[Debug Rarity] Generation failed:', error);
      Alert.alert('Generation Failed', String(error));
    } finally {
      setIsGeneratingImages(false);
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.contentContainer, { paddingBottom: spacing(6) + insets.bottom }]}>
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
        {book.companions ? (
          // New companion collection system
          <>
            <Text style={styles.sectionLabel}>
              companions_ ({book.companions.unlockedCompanions.length}/
              {book.companions.unlockedCompanions.length +
               book.companions.readingTimeQueue.companions.length +
               book.companions.poolQueue.companions.length})
            </Text>

            {/* Progress to next unlock */}
            {(() => {
              const nextMilestone = getNextMilestone(book.totalReadingTime);
              if (nextMilestone && book.companions.readingTimeQueue.companions.some(c => !c.unlockedAt)) {
                return (
                  <Text style={styles.progressText}>
                    next unlock in {formatTimeRemaining(nextMilestone.timeRemaining)}
                  </Text>
                );
              }
              return null;
            })()}

            {/* Companion grid */}
            <View style={styles.companionGrid}>
              {/* Unlocked companions */}
              {book.companions.unlockedCompanions.map(c => (
                <CompanionTile key={c.id} companion={c} locked={false} colors={colors} spacing={spacing} />
              ))}

              {/* Locked companions (from queues) */}
              {[...book.companions.readingTimeQueue.companions,
                ...book.companions.poolQueue.companions]
                .filter(c => !c.unlockedAt)
                .map(c => (
                  <CompanionTile key={c.id} companion={c} locked={true} colors={colors} spacing={spacing} />
                ))}
            </View>

            {book.companions.unlockedCompanions.length === 0 && (
              <Text style={styles.lockedText}>
                keep reading to unlock companions_
              </Text>
            )}

            {/* Debug: Generate Images Buttons */}
            {debugMode && (
              <View style={styles.debugSection}>
                <Pressable
                  style={[styles.debugButton, isGeneratingImages && { opacity: 0.5 }]}
                  onPress={handleDebugGenerateImages}
                  disabled={isGeneratingImages}
                >
                  <Text style={styles.debugButtonText}>
                    {isGeneratingImages ? imageGenProgress : '[generate images]'}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.debugButton, isGeneratingImages && { opacity: 0.5 }, { marginTop: spacing(2) }]}
                  onPress={handleDebugGenerateRarityImages}
                  disabled={isGeneratingImages}
                >
                  <Text style={styles.debugButtonText}>
                    [test rarity borders (2 each)]
                  </Text>
                </Pressable>
              </View>
            )}
          </>
        ) : book.companion ? (
          // Legacy single companion display
          <View style={styles.companionCard}>
            <Text style={styles.sectionLabel}>companion_</Text>
            {book.companion.imageUrl && (
              <Image source={{ uri: book.companion.imageUrl }} style={styles.companionImage} />
            )}
            <Text style={styles.companionName}>{book.companion.creature?.toLowerCase() || book.companion.name.toLowerCase()}</Text>
            <Text style={styles.companionType}>{book.companion.archetype?.toLowerCase() || book.companion.type.toLowerCase()}</Text>
          </View>
        ) : (
          // No companion data yet - show spinner if generating
          <>
            <Text style={styles.sectionLabel}>companions_</Text>
            {isGeneratingCompanions ? (
              <View style={styles.generatingContainer}>
                <ActivityIndicator size="small" color={colors.textMuted} />
                <Text style={styles.generatingText}>generating companions...</Text>
              </View>
            ) : (
              <Text style={styles.lockedText}>
                companions will be researched when adding books_
              </Text>
            )}
          </>
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

      {/* Legendary Unlock Celebration Modal */}
      {completionLegendary && (
        <View style={styles.celebrationOverlay}>
          <View style={styles.celebrationModal}>
            <Text style={[styles.celebrationTitle, { color: '#FFD700' }]}>
              legendary unlocked!
            </Text>

            {completionLegendary.imageUrl ? (
              <Image
                source={{ uri: completionLegendary.imageUrl }}
                style={styles.celebrationImage}
                resizeMode="contain"
              />
            ) : (
              <View style={[styles.celebrationImage, { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: colors.textMuted, fontFamily: FONTS.mono, fontSize: 48 }}>?</Text>
              </View>
            )}

            <Text style={styles.celebrationName}>
              {completionLegendary.name.toLowerCase()}
            </Text>

            <Text style={styles.celebrationDescription}>
              {completionLegendary.description}
            </Text>

            <Text style={styles.celebrationBonus}>
              +2 loot boxes awarded!
            </Text>

            <Pressable
              style={styles.celebrationButton}
              onPress={() => setCompletionLegendary(null)}
            >
              <Text style={styles.celebrationButtonText}>[continue]</Text>
            </Pressable>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function createStyles(colors: any, spacing: any, fontSize: any, letterSpacing: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    contentContainer: {
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
    lockedText: {
      color: colors.textMuted,
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
      letterSpacing: letterSpacing('tight'),
    },
    companionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: spacing(3),
    },
    progressText: {
      color: colors.textSecondary,
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
      marginTop: spacing(2),
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
    celebrationOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.9)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing(6),
    },
    celebrationModal: {
      padding: spacing(6),
      borderWidth: 2,
      borderColor: '#FFD700',
      alignItems: 'center',
      maxWidth: 300,
    },
    celebrationTitle: {
      fontFamily: FONTS.mono,
      fontWeight: FONTS.monoBold,
      fontSize: fontSize('title'),
      marginBottom: spacing(4),
    },
    celebrationImage: {
      width: 128,
      height: 128,
      marginBottom: spacing(4),
    },
    celebrationName: {
      fontFamily: FONTS.mono,
      fontWeight: FONTS.monoBold,
      fontSize: fontSize('large'),
      color: colors.text,
      marginBottom: spacing(2),
    },
    celebrationDescription: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing(4),
    },
    celebrationBonus: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('body'),
      color: '#FFD700',
      marginBottom: spacing(6),
    },
    celebrationButton: {
      borderWidth: 1,
      borderColor: colors.text,
      paddingVertical: spacing(3),
      paddingHorizontal: spacing(6),
    },
    celebrationButtonText: {
      fontFamily: FONTS.mono,
      fontWeight: FONTS.monoBold,
      fontSize: fontSize('body'),
      color: colors.text,
    },
    debugSection: {
      marginTop: spacing(4),
      paddingTop: spacing(4),
      borderTopWidth: 1,
      borderTopColor: '#f59e0b',
      borderStyle: 'dashed',
    },
    debugButton: {
      borderWidth: 1,
      borderColor: '#f59e0b',
      borderStyle: 'dashed',
      padding: spacing(3),
      alignItems: 'center',
    },
    debugButtonText: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
      color: '#f59e0b',
    },
    generatingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing(2),
    },
    generatingText: {
      color: colors.textMuted,
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
      letterSpacing: letterSpacing('tight'),
    },
  });
}
