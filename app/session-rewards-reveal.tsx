import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SessionRewardsReveal } from '@/components/SessionRewardsReveal';
import { useTheme } from '@/lib/ThemeContext';

export default function SessionRewardsRevealRoute() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{
    companions: string;
    lootBoxes: string;
    resultsData: string;
    bookTitle: string;
  }>();

  const companions = JSON.parse(params.companions || '[]');
  const lootBoxes = JSON.parse(params.lootBoxes || '[]');
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
