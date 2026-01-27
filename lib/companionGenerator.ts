import { storage } from './storage';
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

export async function generateCompanion(book: Book, apiKey: string): Promise<Companion> {
  if (!book.synopsis) throw new Error('Book has no synopsis');

  const companionData = await generateCompanionData(book.synopsis, apiKey);
  const imageUrl = await generateCompanionImage(
    companionData.creature,
    companionData.keywords,
    apiKey
  );

  const companion: Companion = {
    id: Date.now().toString(),
    bookId: book.id,
    imageUrl,
    archetype: companionData.archetype,
    creature: companionData.creature,
    keywords: companionData.keywords,
    generatedAt: Date.now(),
  };

  book.companion = companion;
  await storage.saveBook(book);

  return companion;
}
