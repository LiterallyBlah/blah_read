import { useCallback, useState } from 'react';
import { View, Text, ScrollView, Image, StyleSheet, Pressable } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { storage } from '@/lib/storage';
import { calculateLevel, xpProgress } from '@/lib/xp';
import { Book, UserProgress, LootItem, Companion } from '@/lib/types';
import { COLORS, FONTS, spacing, fontSize, letterSpacing } from '@/lib/theme';

export default function ProfileScreen() {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [books, setBooks] = useState<Book[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    setProgress(await storage.getProgress());
    setBooks(await storage.getBooks());
  }

  const level = progress ? calculateLevel(progress.totalXp) : 1;
  const xp = progress ? xpProgress(progress.totalXp) : { current: 0, needed: 1000 };
  const companions = books.filter(b => b.companion).map(b => b.companion as Companion);
  const totalTime = books.reduce((sum, b) => sum + b.totalReadingTime, 0);
  const hours = Math.floor(totalTime / 3600);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>profile_</Text>

      <Pressable style={styles.configLink} onPress={() => router.push('/config')}>
        <Text style={styles.configLinkText}>[config]</Text>
      </Pressable>

      {/* Stats section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>stats_</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{level}</Text>
            <Text style={styles.statLabel}>level</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{progress?.currentStreak || 0}</Text>
            <Text style={styles.statLabel}>streak</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{progress?.longestStreak || 0}</Text>
            <Text style={styles.statLabel}>best</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{hours}</Text>
            <Text style={styles.statLabel}>hours</Text>
          </View>
        </View>

        {/* XP progress */}
        <View style={styles.xpSection}>
          <View style={styles.xpBar}>
            <View style={[styles.xpFill, { width: `${(xp.current / xp.needed) * 100}%` }]} />
          </View>
          <Text style={styles.xpText}>{xp.current} / {xp.needed} xp to next level</Text>
        </View>
      </View>

      {/* Loot section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>loot_</Text>
        {progress?.lootItems && progress.lootItems.length > 0 ? (
          <View style={styles.lootGrid}>
            {progress.lootItems.map((item: LootItem) => (
              <View key={item.id} style={[styles.lootItem, styles[`rarity_${item.rarity}` as keyof typeof styles]]}>
                <Text style={styles.lootIcon}>{item.icon}</Text>
                <Text style={styles.lootName}>{item.name.toLowerCase()}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>no loot yet - keep reading!_</Text>
        )}
      </View>

      {/* Companions section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>companions_</Text>
        {companions.length > 0 ? (
          <View style={styles.companionGrid}>
            {companions.map((c: Companion) => (
              <View key={c.id} style={styles.companionCard}>
                <Image source={{ uri: c.imageUrl }} style={styles.companionImage} />
                <Text style={styles.companionName}>{c.creature.toLowerCase()}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>finish a book to unlock companions_</Text>
        )}
      </View>
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
  title: {
    color: COLORS.text,
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: fontSize('title'),
    letterSpacing: letterSpacing('normal'),
    marginBottom: spacing(8),
  },
  section: {
    marginBottom: spacing(8),
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.mono,
    fontSize: fontSize('body'),
    letterSpacing: letterSpacing('tight'),
    marginBottom: spacing(4),
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing(4),
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: COLORS.text,
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: fontSize('title'),
    letterSpacing: letterSpacing('tight'),
  },
  statLabel: {
    color: COLORS.textMuted,
    fontFamily: FONTS.mono,
    fontSize: fontSize('micro'),
    letterSpacing: letterSpacing('tight'),
  },
  xpSection: {
    marginTop: spacing(2),
  },
  xpBar: {
    height: 4,
    backgroundColor: COLORS.backgroundCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  xpFill: {
    height: '100%',
    backgroundColor: COLORS.success,
  },
  xpText: {
    color: COLORS.textMuted,
    fontFamily: FONTS.mono,
    fontSize: fontSize('micro'),
    letterSpacing: letterSpacing('tight'),
    marginTop: spacing(1),
  },
  lootGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(2),
  },
  lootItem: {
    padding: spacing(2),
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    minWidth: 60,
  },
  lootIcon: {
    fontSize: 20,
    marginBottom: spacing(1),
  },
  lootName: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.mono,
    fontSize: fontSize('micro'),
    letterSpacing: letterSpacing('tight'),
  },
  rarity_common: { borderColor: COLORS.rarityCommon },
  rarity_rare: { borderColor: COLORS.rarityRare },
  rarity_epic: { borderColor: COLORS.rarityEpic },
  rarity_legendary: { borderColor: COLORS.rarityLegendary },
  companionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(3),
  },
  companionCard: {
    alignItems: 'center',
  },
  companionImage: {
    width: 64,
    height: 64,
    backgroundColor: COLORS.backgroundCard,
    marginBottom: spacing(1),
  },
  companionName: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.mono,
    fontSize: fontSize('micro'),
    letterSpacing: letterSpacing('tight'),
  },
  emptyText: {
    color: COLORS.textMuted,
    fontFamily: FONTS.mono,
    fontSize: fontSize('small'),
    letterSpacing: letterSpacing('tight'),
  },
  configLink: {
    position: 'absolute',
    top: spacing(16),
    right: spacing(6),
  },
  configLinkText: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.mono,
    fontSize: fontSize('small'),
  },
});
