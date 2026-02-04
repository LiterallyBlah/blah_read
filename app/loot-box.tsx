import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTheme, FONTS } from '@/lib/ui';
import { storage, settings } from '@/lib/storage';
import { openLootBox, openLootBoxWithRarity, getPoolCompanions } from '@/lib/lootBox';
import { openLootBoxV3 } from '@/lib/lootBoxV3';
import { PITY_HARD_CAP, rollConsumable } from '@/lib/lootV3';
import { LootBoxReveal } from '@/components/LootBoxReveal';
import type { Companion, LootBoxV3, LootBoxTier } from '@/lib/shared';
import { ConsumableDefinition, addActiveConsumable, applyInstantConsumable } from '@/lib/consumables';
import { maybeGenerateImages } from '@/lib/companion';
import { generateImageForCompanion, debug } from '@/lib/shared';
import { TintedChest } from '@/components/dungeon/TintedChest';

// Box tier visual styling
const TIER_STYLES: Record<LootBoxTier, { label: string; emoji: string }> = {
  wood: { label: 'wood', emoji: '' },
  silver: { label: 'silver', emoji: '' },
  gold: { label: 'gold', emoji: '' },
};

export default function LootBoxScreen() {
  const { colors, spacing, fontSize } = useTheme();
  const [revealing, setRevealing] = useState(false);
  const [revealedCompanion, setRevealedCompanion] = useState<Companion | null>(null);
  const [revealedConsumable, setRevealedConsumable] = useState<ConsumableDefinition | null>(null);
  const [revealedTier, setRevealedTier] = useState<LootBoxTier | null>(null);
  const [boxCount, setBoxCount] = useState(0);
  const [boxesV3, setBoxesV3] = useState<LootBoxV3[]>([]);
  const [goldPityCounter, setGoldPityCounter] = useState(0);
  const styles = createStyles(colors, spacing, fontSize);

  useEffect(() => {
    loadBoxCount();
  }, []);

  async function loadBoxCount() {
    const progress = await storage.getProgress();
    // Support both V2 (lootBoxes) and V3 (lootBoxesV3) boxes
    const v2Count = progress.lootBoxes?.availableBoxes?.length || 0;
    const v3Boxes = progress.lootBoxesV3 || [];
    setBoxCount(v2Count + v3Boxes.length);
    setBoxesV3(v3Boxes);
    setGoldPityCounter(progress.goldPityCounter ?? 0);
  }

  async function handleOpenBox() {
    if (revealing || boxCount === 0) return;
    setRevealing(true);

    try {
      const [books, progress] = await Promise.all([
        storage.getBooks(),
        storage.getProgress(),
      ]);

      // Get current book for genre targeting and equipped companions
      const currentBook = books
        .filter(b => b.status === 'reading')
        .sort((a, b) => b.totalReadingTime - a.totalReadingTime)[0];

      // Get equipped companions from current book's loadout
      const loadout = currentBook?.loadout ?? { slots: [null, null, null], unlockedSlots: 1 };
      const allCompanions = books.flatMap(b => b.companions?.unlockedCompanions ?? []);
      const equippedCompanions = (loadout.slots ?? [])
        .filter((id): id is string => id !== null)
        .map(id => allCompanions.find(c => c.id === id))
        .filter((c): c is Companion => c !== undefined);
      const bookGenres = currentBook?.normalizedGenres ?? [];

      // Check if we have V3 boxes first
      const v3Boxes = progress.lootBoxesV3 || [];
      if (v3Boxes.length > 0) {
        const boxToOpen = v3Boxes[0];

        // Check pool availability to avoid companion roll when pool is empty
        const pool = getPoolCompanions(books);

        // Open using new system with tier rolling and pity
        const { rolledTier, lootResult, updatedProgress: initialProgress } = openLootBoxV3(
          boxToOpen,
          progress,
          equippedCompanions,
          bookGenres,
          { companionPoolSize: pool.length }
        );
        let updatedProgress = initialProgress;

        debug.log('lootBox', 'V3 box opened', {
          poolSize: pool.length,
          rolledTier,
          category: lootResult.category,
          companionRarity: lootResult.companionRarity,
          consumable: lootResult.consumable?.name,
          pityCounter: updatedProgress.goldPityCounter,
        });

        // Remove the opened box
        updatedProgress.lootBoxesV3 = v3Boxes.slice(1);

        if (lootResult.category === 'consumable' && lootResult.consumable) {
          // Handle consumable drop
          if (lootResult.consumable.duration === 0) {
            // Instant consumable - apply directly
            const withInstant = applyInstantConsumable(updatedProgress, lootResult.consumable);
            updatedProgress = { ...updatedProgress, ...withInstant };
          } else {
            // Duration-based consumable - add to active list
            updatedProgress.activeConsumables = addActiveConsumable(
              updatedProgress.activeConsumables || [],
              lootResult.consumable
            );
          }
          await storage.saveProgress(updatedProgress);

          setRevealedConsumable(lootResult.consumable);
          setRevealedTier(rolledTier);
          setRevealedCompanion(null);
        } else if (lootResult.category === 'companion' && lootResult.companionRarity) {
          // Handle companion drop - get from pool with rarity-aware selection
          const pool = getPoolCompanions(books);
          debug.log('lootBox', 'Companion drop - checking pool', {
            poolSize: pool.length,
            targetRarity: lootResult.companionRarity,
            poolByRarity: {
              common: pool.filter(c => c.rarity === 'common').length,
              rare: pool.filter(c => c.rarity === 'rare').length,
              legendary: pool.filter(c => c.rarity === 'legendary').length,
            },
          });
          const { companion, actualRarity } = openLootBoxWithRarity(
            pool,
            currentBook?.id || null,
            lootResult.companionRarity
          );

          if (companion) {
            debug.log('lootBox', 'Companion selected from pool', {
              name: companion.name,
              targetRarity: lootResult.companionRarity,
              actualRarity: actualRarity,
              companionRarity: companion.rarity,
              bookId: companion.bookId,
            });
            // Update book's companion state
            const book = books.find(b => b.id === companion.bookId);
            if (book?.companions) {
              const poolIndex = book.companions.poolQueue.companions.findIndex(
                c => c.id === companion.id
              );
              if (poolIndex !== -1) {
                book.companions.poolQueue.companions[poolIndex] = companion;
                book.companions.unlockedCompanions.push(companion);
                await storage.saveBook(book);
                debug.log('lootBox', 'Companion unlocked, triggering image generation');

                // Trigger background image generation to refill pool buffer
                const config = await settings.get();
                if (config.apiKey) {
                  const generateImage = async (c: Companion) => {
                    try {
                      return await generateImageForCompanion(c, config.apiKey!, {
                        model: config.imageModel,
                      });
                    } catch {
                      return null;
                    }
                  };
                  maybeGenerateImages(book, generateImage).then(async finalBook => {
                    debug.log('lootBox', 'Image generation complete, saving book');
                    await storage.saveBook(finalBook);
                  }).catch(error => {
                    debug.error('lootBox', 'Image generation failed', error);
                  });
                } else {
                  debug.log('lootBox', 'No API key, skipping image generation');
                }
              }
            }

            await storage.saveProgress(updatedProgress);
            setRevealedCompanion(companion);
            setRevealedTier(rolledTier);
            setRevealedConsumable(null);
          } else {
            debug.log('lootBox', 'Pool empty - rolling consumable instead');
            // No companion available - roll a consumable using proper RNG based on box tier
            const fallbackConsumable = rollConsumable(rolledTier);
            if (fallbackConsumable.duration === 0) {
              // Instant consumable - apply directly
              const withInstant = applyInstantConsumable(updatedProgress, fallbackConsumable);
              updatedProgress = { ...updatedProgress, ...withInstant };
            } else {
              // Duration-based consumable - add to active list
              updatedProgress.activeConsumables = addActiveConsumable(
                updatedProgress.activeConsumables || [],
                fallbackConsumable
              );
            }
            await storage.saveProgress(updatedProgress);

            setRevealedConsumable(fallbackConsumable);
            setRevealedTier(rolledTier);
            setRevealedCompanion(null);
          }
        }

        const newV3Count = updatedProgress.lootBoxesV3?.length || 0;
        const v2Count = progress.lootBoxes?.availableBoxes?.length || 0;
        setBoxCount(v2Count + newV3Count);
        setBoxesV3(updatedProgress.lootBoxesV3 || []);
        setGoldPityCounter(updatedProgress.goldPityCounter ?? 0);
        setRevealing(false);
        return;
      }

      // Fallback to V2 boxes if no V3 boxes
      if (progress.lootBoxes.availableBoxes.length === 0) {
        setRevealing(false);
        return;
      }

      // Get pool and open box (currentBook already defined above)
      const pool = getPoolCompanions(books);
      const { companion } = openLootBox(pool, currentBook?.id || null);

      if (companion) {
        // Update book's companion state
        const book = books.find(b => b.id === companion.bookId);
        if (book?.companions) {
          const poolIndex = book.companions.poolQueue.companions.findIndex(
            c => c.id === companion.id
          );
          if (poolIndex !== -1) {
            book.companions.poolQueue.companions[poolIndex] = companion;
            book.companions.unlockedCompanions.push(companion);
            await storage.saveBook(book);

            // Trigger background image generation to refill pool buffer
            const config = await settings.get();
            if (config.apiKey) {
              const generateImage = async (c: Companion) => {
                try {
                  return await generateImageForCompanion(c, config.apiKey!, {
                    model: config.imageModel,
                  });
                } catch {
                  return null;
                }
              };
              maybeGenerateImages(book, generateImage).then(async finalBook => {
                await storage.saveBook(finalBook);
              }).catch(error => {
                debug.error('lootBox', 'Image generation failed', error);
              });
            }
          }
        }

        // Remove used box and record history
        const usedBox = progress.lootBoxes.availableBoxes.shift()!;
        progress.lootBoxes.openHistory.push({
          boxId: usedBox.id,
          openedAt: Date.now(),
          companionId: companion.id,
        });
        await storage.saveProgress(progress);

        setRevealedCompanion(companion);
        setRevealedTier(null); // V2 boxes don't have tiers
        setRevealedConsumable(null);
        setBoxCount(progress.lootBoxes.availableBoxes.length + (progress.lootBoxesV3?.length || 0));
      } else {
        // No companion available (empty pool) - roll consumable using RNG
        debug.log('lootBox', 'V2 pool empty - rolling consumable instead');
        const usedBox = progress.lootBoxes.availableBoxes.shift()!;
        progress.lootBoxes.openHistory.push({
          boxId: usedBox.id,
          openedAt: Date.now(),
          companionId: '',
        });

        // V2 boxes don't have tiers, default to wood tier for consumable roll
        const fallbackConsumable = rollConsumable('wood');
        if (fallbackConsumable.duration === 0) {
          // Instant consumable - apply directly
          const withInstant = applyInstantConsumable(progress, fallbackConsumable);
          Object.assign(progress, withInstant);
        } else {
          // Duration-based consumable - add to active list
          progress.activeConsumables = addActiveConsumable(
            progress.activeConsumables || [],
            fallbackConsumable
          );
        }
        await storage.saveProgress(progress);

        setRevealedConsumable(fallbackConsumable);
        setRevealedTier(null);
        setRevealedCompanion(null);
        setBoxCount(progress.lootBoxes.availableBoxes.length + (progress.lootBoxesV3?.length || 0));
      }

      setRevealing(false);
    } catch (error) {
      debug.error('lootBox', 'Error opening loot box', error);
      // Ensure we exit revealing state even on error
      setRevealing(false);
      // Roll a consumable using RNG so user isn't stuck (default to wood tier)
      const errorFallback = rollConsumable('wood');
      setRevealedConsumable(errorFallback);
      setRevealedTier('wood');
      setRevealedCompanion(null);
    }
  }

  function handleDismiss() {
    setRevealedCompanion(null);
    setRevealedConsumable(null);
    setRevealedTier(null);
  }

  // Show reveal screen for companion or consumable
  if (revealedCompanion || revealedConsumable) {
    return (
      <LootBoxReveal
        companion={revealedCompanion}
        consumable={revealedConsumable}
        boxTier={revealedTier}
        onDismiss={handleDismiss}
        hasMoreBoxes={boxCount > 0}
        onOpenAnother={handleOpenBox}
      />
    );
  }

  // Get tier colors
  const getTierColor = (tier: LootBoxTier) => {
    switch (tier) {
      case 'gold': return colors.rarityLegendary;
      case 'silver': return colors.rarityRare;
      case 'wood': return colors.rarityCommon;
      default: return colors.text;
    }
  };

  // Group boxes by tier for display (only count boxes with known tiers)
  const tierCounts = boxesV3.reduce((acc, box) => {
    if (box.tier) {
      acc[box.tier] = (acc[box.tier] || 0) + 1;
    }
    return acc;
  }, {} as Record<LootBoxTier, number>);

  // Count blank boxes (unknown tier until opened)
  const blankBoxCount = boxesV3.filter(b => !b.tier).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={[styles.backText, { color: colors.textSecondary }]}>{'<'} back</Text>
      </Pressable>

      <Text style={[styles.title, { color: colors.text }]}>loot_</Text>

      {boxCount > 0 ? (
        <>
          <View style={styles.boxCountRow}>
            <TintedChest
              tier={boxesV3[0]?.tier || 'wood'}
              isOpen={false}
              scale={2}
            />
            <Text style={[styles.countText, { color: colors.textSecondary }]}>
              {boxCount} box{boxCount !== 1 ? 'es' : ''} available
            </Text>
          </View>

          {/* Show tier breakdown if there are V3 boxes */}
          {boxesV3.length > 0 && (
            <View style={styles.tierBreakdown}>
              {(['gold', 'silver', 'wood'] as LootBoxTier[]).map(tier => {
                const count = tierCounts[tier] || 0;
                if (count === 0) return null;
                return (
                  <Text
                    key={tier}
                    style={[styles.tierCount, { color: getTierColor(tier) }]}
                  >
                    {TIER_STYLES[tier].emoji} {count} {tier}
                  </Text>
                );
              })}
            </View>
          )}

          {/* Pity counter display - pity triggers at counter >= 24, so boxes until = 24 - counter */}
          {(() => {
            const boxesUntilPity = (PITY_HARD_CAP - 1) - goldPityCounter;
            if (boxesUntilPity <= 0) {
              return (
                <Text style={[styles.pityText, { color: colors.rarityLegendary }]}>
                  next box guaranteed gold!
                </Text>
              );
            }
            return (
              <Text style={[styles.pityText, { color: colors.textMuted }]}>
                {boxesUntilPity} more until guaranteed gold
              </Text>
            );
          })()}

          <Pressable
            style={[styles.openButton, { borderColor: colors.text }]}
            onPress={handleOpenBox}
            disabled={revealing}
          >
            <Text style={[styles.openButtonText, { color: colors.text }]}>
              {revealing ? '[ opening... ]' : '[ open box ]'}
            </Text>
          </Pressable>
        </>
      ) : (
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          no boxes to open_
        </Text>
      )}
    </View>
  );
}

const createStyles = (
  colors: ReturnType<typeof useTheme>['colors'],
  spacing: ReturnType<typeof useTheme>['spacing'],
  fontSize: ReturnType<typeof useTheme>['fontSize']
) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing(6),
  },
  backButton: {
    position: 'absolute',
    top: spacing(16),
    left: spacing(6),
  },
  backText: {
    fontFamily: FONTS.mono,
    fontSize: fontSize('body'),
  },
  title: {
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: fontSize('title'),
    marginBottom: spacing(8),
  },
  countText: {
    fontFamily: FONTS.mono,
    fontSize: fontSize('body'),
  },
  boxCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    marginBottom: spacing(4),
  },
  tierBreakdown: {
    flexDirection: 'row',
    gap: spacing(4),
    marginBottom: spacing(6),
  },
  tierCount: {
    fontFamily: FONTS.mono,
    fontSize: fontSize('small'),
  },
  pityText: {
    fontFamily: FONTS.mono,
    fontSize: fontSize('small'),
    marginBottom: spacing(4),
  },
  openButton: {
    borderWidth: 1,
    paddingVertical: spacing(5),
    paddingHorizontal: spacing(8),
    marginBottom: spacing(4),
  },
  openButtonText: {
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: fontSize('large'),
  },
  emptyText: {
    fontFamily: FONTS.mono,
    fontSize: fontSize('body'),
    marginBottom: spacing(8),
  },
});
