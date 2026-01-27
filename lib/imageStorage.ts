import * as FileSystem from 'expo-file-system';
import { debug } from './debug';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FS = FileSystem as any;

/**
 * Directory for storing companion images
 */
const IMAGE_DIR = `${FS.documentDirectory}companion-images/`;

/**
 * Ensure the image directory exists
 */
async function ensureImageDir(): Promise<void> {
  const dirInfo = await FS.getInfoAsync(IMAGE_DIR);
  if (!dirInfo.exists) {
    debug.log('imageStorage', 'Creating image directory');
    await FS.makeDirectoryAsync(IMAGE_DIR, { intermediates: true });
  }
}

/**
 * Save a base64 image to the file system and return the local URI
 * @param base64DataUrl - The full data URL (e.g., "data:image/jpeg;base64,...")
 * @param companionId - Unique identifier for the companion
 * @returns Local file URI
 */
export async function saveCompanionImage(
  base64DataUrl: string,
  companionId: string
): Promise<string> {
  await ensureImageDir();

  // Extract the base64 data and mime type
  const matches = base64DataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) {
    debug.error('imageStorage', 'Invalid base64 data URL format');
    throw new Error('Invalid base64 data URL format');
  }

  const [, extension, base64Data] = matches;
  const filename = `${companionId}.${extension}`;
  const fileUri = `${IMAGE_DIR}${filename}`;

  debug.log('imageStorage', `Saving image for ${companionId}`, {
    extension,
    dataLength: base64Data.length,
    fileUri,
  });

  await FS.writeAsStringAsync(fileUri, base64Data, {
    encoding: FS.EncodingType.Base64,
  });

  debug.log('imageStorage', `Image saved: ${filename}`);
  return fileUri;
}

/**
 * Delete a companion image from the file system
 * @param imageUri - The local file URI
 */
export async function deleteCompanionImage(imageUri: string): Promise<void> {
  if (!imageUri.startsWith(IMAGE_DIR)) {
    return; // Not a local image, skip
  }

  try {
    const fileInfo = await FS.getInfoAsync(imageUri);
    if (fileInfo.exists) {
      await FS.deleteAsync(imageUri);
      debug.log('imageStorage', `Deleted image: ${imageUri}`);
    }
  } catch (error) {
    debug.warn('imageStorage', `Failed to delete image: ${imageUri}`, error);
  }
}

/**
 * Delete all companion images for a book
 * @param bookId - The book ID
 */
export async function deleteBookImages(bookId: string): Promise<void> {
  try {
    const dirInfo = await FS.getInfoAsync(IMAGE_DIR);
    if (!dirInfo.exists) return;

    const files = await FS.readDirectoryAsync(IMAGE_DIR);
    const bookFiles = files.filter((f: string) => f.startsWith(bookId));

    for (const file of bookFiles) {
      await FS.deleteAsync(`${IMAGE_DIR}${file}`);
    }

    debug.log('imageStorage', `Deleted ${bookFiles.length} images for book ${bookId}`);
  } catch (error) {
    debug.warn('imageStorage', `Failed to delete book images: ${bookId}`, error);
  }
}

/**
 * Get the size of all stored images
 */
export async function getImageStorageSize(): Promise<number> {
  try {
    const dirInfo = await FS.getInfoAsync(IMAGE_DIR);
    if (!dirInfo.exists) return 0;

    const files = await FS.readDirectoryAsync(IMAGE_DIR);
    let totalSize = 0;

    for (const file of files) {
      const fileInfo = await FS.getInfoAsync(`${IMAGE_DIR}${file}`);
      if (fileInfo.exists && 'size' in fileInfo) {
        totalSize += fileInfo.size || 0;
      }
    }

    return totalSize;
  } catch {
    return 0;
  }
}

/**
 * Clear all companion images
 */
export async function clearAllImages(): Promise<void> {
  try {
    const dirInfo = await FS.getInfoAsync(IMAGE_DIR);
    if (dirInfo.exists) {
      await FS.deleteAsync(IMAGE_DIR, { idempotent: true });
      debug.log('imageStorage', 'Cleared all companion images');
    }
  } catch (error) {
    debug.warn('imageStorage', 'Failed to clear images', error);
  }
}
