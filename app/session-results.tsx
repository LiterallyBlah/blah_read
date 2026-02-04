/**
 * Session Results Route
 *
 * Displays the session results screen after a reading session ends.
 * Receives data via route params and displays the SessionResultsScreen.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SessionResultsScreen } from '@/components/SessionResultsScreen';
import { SessionResultsData } from '@/lib/sessionResultsData';
import { useTheme } from '@/lib/ui';

export default function SessionResultsRoute() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{
    data: string;
    bookTitle: string;
  }>();

  // Parse the serialized data with safety fallback
  let data: SessionResultsData;
  try {
    data = JSON.parse(params.data || '{}');
  } catch (error) {
    console.error('[session-results] Failed to parse data:', error);
    data = {} as SessionResultsData;
  }
  const bookTitle = params.bookTitle || 'Unknown Book';

  const handleContinue = () => {
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SessionResultsScreen
        data={data}
        bookTitle={bookTitle}
        onContinue={handleContinue}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
