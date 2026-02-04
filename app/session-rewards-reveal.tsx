import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SessionRewardsReveal } from '@/components/SessionRewardsReveal';
import { useTheme } from '@/lib/ui';

export default function SessionRewardsRevealRoute() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{
    companions: string;
    lootBoxes: string;
    consumables: string;
    milestones: string;
    resultsData: string;
    bookTitle: string;
  }>();

  let companions = [];
  let lootBoxes = [];
  let consumables = [];
  let milestones = [];
  try {
    companions = JSON.parse(params.companions || '[]');
    lootBoxes = JSON.parse(params.lootBoxes || '[]');
    consumables = JSON.parse(params.consumables || '[]');
    milestones = JSON.parse(params.milestones || '[]');
  } catch (e) {
    console.error('Failed to parse rewards data:', e);
  }
  const resultsData = params.resultsData || '{}';
  const bookTitle = params.bookTitle || 'Unknown Book';

  const handleComplete = () => {
    router.replace({
      pathname: '/session-results',
      params: {
        data: resultsData,
        bookTitle,
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SessionRewardsReveal
        companions={companions}
        lootBoxes={lootBoxes}
        consumables={consumables}
        milestones={milestones}
        onComplete={handleComplete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
