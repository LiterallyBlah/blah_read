import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import { FONTS } from '@/lib/theme';
import { processKindleShare, ProcessingStep, ProcessResult } from '@/lib/books';
import { DuplicateBookDialog } from '@/components/DuplicateBookDialog';
import { Book } from '@/lib/shared';

type ScreenState = 'processing' | 'duplicate' | 'error' | 'success';

const STEP_LABELS: Record<ProcessingStep, string> = {
  'parsing': 'reading share data...',
  'checking-duplicate': 'checking library...',
  'enriching': 'fetching book details...',
  'saving': 'adding to library...',
};

export default function KindleShareScreen() {
  const { colors, spacing, fontSize, letterSpacing } = useTheme();
  const { text } = useLocalSearchParams<{ text: string }>();

  const [state, setState] = useState<ScreenState>('processing');
  const [step, setStep] = useState<ProcessingStep>('parsing');
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [duplicateBook, setDuplicateBook] = useState<Book | null>(null);

  const processShare = useCallback(async (forceAdd = false) => {
    if (!text) {
      setState('error');
      return;
    }

    setState('processing');

    const processResult = await processKindleShare(text, {
      onProgress: setStep,
      forceAdd,
    });

    setResult(processResult);

    if (processResult.isDuplicate && processResult.existingBook) {
      setDuplicateBook(processResult.existingBook);
      setState('duplicate');
    } else if (processResult.success && processResult.book) {
      setState('success');
      // Navigate to book detail after short delay
      setTimeout(() => {
        router.replace(`/book/${processResult.book!.id}`);
      }, 500);
    } else {
      setState('error');
    }
  }, [text]);

  useEffect(() => {
    processShare();
  }, [processShare]);

  const handleViewExisting = () => {
    if (duplicateBook) {
      router.replace(`/book/${duplicateBook.id}`);
    }
  };

  const handleAddAnyway = () => {
    setDuplicateBook(null);
    processShare(true);
  };

  const handleCancel = () => {
    router.back();
  };

  const styles = createStyles(colors, spacing, fontSize, letterSpacing);

  return (
    <View style={styles.container}>
      {state === 'processing' && (
        <>
          <ActivityIndicator size="large" color={colors.text} />
          <Text style={styles.text}>
            {STEP_LABELS[step]}
          </Text>
        </>
      )}

      {state === 'success' && (
        <Text style={[styles.text, { color: colors.success }]}>
          book added_
        </Text>
      )}

      {state === 'error' && (
        <>
          <Text style={[styles.text, { color: colors.error }]}>
            {result?.error === 'invalid-share-text'
              ? 'not a valid kindle share_'
              : 'failed to add book_'
            }
          </Text>
          <Text
            style={styles.link}
            onPress={() => router.back()}
          >
            [go back]
          </Text>
        </>
      )}

      {duplicateBook && (
        <DuplicateBookDialog
          visible={state === 'duplicate'}
          book={duplicateBook}
          onViewExisting={handleViewExisting}
          onAddAnyway={handleAddAnyway}
          onCancel={handleCancel}
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
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing(4),
    },
    text: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('large'),
      letterSpacing: letterSpacing('tight'),
      color: colors.text,
      marginTop: spacing(4),
    },
    link: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('body'),
      color: colors.textMuted,
      marginTop: spacing(2),
    },
  });
