/**
 * @deprecated This module is deprecated. Use companionOrchestrator.ts instead.
 * Kept for backwards compatibility only.
 */
import { storage } from './storage';
import { settings } from './settings';
import { generateCompanionData } from './llm';
import { generateCompanionImage } from './imageGen';
import { Book, Companion } from './types';

const UNLOCK_THRESHOLD = 5 * 60 * 60; // 5 hours in seconds

export function canUnlockCompanion(book: Book): boolean {
  return (
    !book.companion &&
    !!book.synopsis &&
    (book.status === 'finished' || book.totalReadingTime >= UNLOCK_THRESHOLD)
  );
}

export async function generateCompanion(book: Book): Promise<Companion> {
  if (!book.synopsis) throw new Error('Book has no synopsis');

  const config = await settings.get();
  if (!config.apiKey) throw new Error('API key not configured');

  const companionData = await generateCompanionData(book.synopsis, config.apiKey, { model: config.llmModel });
  const imageUrl = await generateCompanionImage(companionData.creature, companionData.keywords, config.apiKey, { model: config.imageModel });

  // Legacy companion format - cast to any for backwards compatibility
  const companion = {
    id: Date.now().toString(),
    bookId: book.id,
    imageUrl,
    archetype: companionData.archetype,
    creature: companionData.creature,
    keywords: companionData.keywords,
    generatedAt: Date.now(),
  } as unknown as Companion;

  book.companion = companion;
  await storage.saveBook(book);
  return companion;
}
