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
import { useTheme } from '@/lib/ThemeContext';

export default function SessionResultsRoute() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{
    data: string;
    bookTitle: string;
  }>();

  // Parse the serialized data
  const data: SessionResultsData = JSON.parse(params.data || '{}');
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
