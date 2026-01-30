import * as FileSystem from 'expo-file-system/legacy';

// Simple console logging to avoid circular dependency with debug.ts -> settings.ts
const log = (msg: string, data?: unknown) => {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log(`[imageStorage] ${msg}`, data ?? '');
  }
};

/**
 * Directory for storing companion images
 */
const IMAGE_DIR = `${FileSystem.documentDirectory}companion-images/`;

/**
 * Ensure the image directory exists
 */
async function ensureImageDir(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(IMAGE_DIR);
  if (!dirInfo.exists) {
    log( 'Creating image directory');
    await FileSystem.makeDirectoryAsync(IMAGE_DIR, { intermediates: true });
  }
}

/**
 * List all images in the storage directory
 */
export async function listStoredImages(): Promise<string[]> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(IMAGE_DIR);
    if (!dirInfo.exists) {
      log('listStoredImages: directory does not exist');
      return [];
    }
    const files = await FileSystem.readDirectoryAsync(IMAGE_DIR);
    log(`listStoredImages: ${files.length} files`, files);
    return files;
  } catch (error) {
    log('listStoredImages failed', error);
    return [];
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
  log(`saveCompanionImage starting for ${companionId}`);

  // List existing files before save
  const beforeFiles = await listStoredImages();
  log(`Before save: ${beforeFiles.length} files exist`);

  await ensureImageDir();

  // Extract the base64 data and mime type
  const matches = base64DataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) {
    log('Invalid base64 data URL format');
    throw new Error('Invalid base64 data URL format');
  }

  const [, extension, base64Data] = matches;
  const filename = `${companionId}.${extension}`;
  const fileUri = `${IMAGE_DIR}${filename}`;

  log(`Saving image for ${companionId}`, {
    extension,
    dataLength: base64Data.length,
    fileUri,
  });

  await FileSystem.writeAsStringAsync(fileUri, base64Data, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Verify the file was saved
  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  log(`Image saved: ${filename}`, {
    exists: fileInfo.exists,
    size: 'size' in fileInfo ? fileInfo.size : 'unknown',
  });

  // List files after save
  const afterFiles = await listStoredImages();
  log(`After save: ${afterFiles.length} files exist`);

  return fileUri;
}

/**
 * Delete a companion image from the file system
 * @param imageUri - The local file URI or just the filename
 */
export async function deleteCompanionImage(imageUri: string): Promise<void> {
  // Support both full URI and filename-only
  const fullPath = imageUri.startsWith(IMAGE_DIR) ? imageUri : `${IMAGE_DIR}${imageUri}`;

  try {
    const fileInfo = await FileSystem.getInfoAsync(fullPath);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(fullPath);
      log(`Deleted image: ${fullPath}`);
    }
  } catch (error) {
    log(`Failed to delete image: ${fullPath}`, error);
  }
}

/**
 * Delete all companion images for a book
 * @param bookId - The book ID
 */
export async function deleteBookImages(bookId: string): Promise<void> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(IMAGE_DIR);
    if (!dirInfo.exists) return;

    const files = await FileSystem.readDirectoryAsync(IMAGE_DIR);
    const bookFiles = files.filter((f: string) => f.startsWith(bookId));

    for (const file of bookFiles) {
      await FileSystem.deleteAsync(`${IMAGE_DIR}${file}`);
    }

    log( `Deleted ${bookFiles.length} images for book ${bookId}`);
  } catch (error) {
    log( `Failed to delete book images: ${bookId}`, error);
  }
}

/**
 * Get the size of all stored images
 */
export async function getImageStorageSize(): Promise<number> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(IMAGE_DIR);
    if (!dirInfo.exists) return 0;

    const files = await FileSystem.readDirectoryAsync(IMAGE_DIR);
    let totalSize = 0;

    for (const file of files) {
      const fileInfo = await FileSystem.getInfoAsync(`${IMAGE_DIR}${file}`);
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
 * Get diagnostic information about image storage
 */
export async function getImageStorageDiagnostics(): Promise<{
  directoryExists: boolean;
  fileCount: number;
  files: string[];
  totalSize: number;
}> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(IMAGE_DIR);
    if (!dirInfo.exists) {
      return { directoryExists: false, fileCount: 0, files: [], totalSize: 0 };
    }

    const files = await FileSystem.readDirectoryAsync(IMAGE_DIR);
    let totalSize = 0;

    for (const file of files) {
      const fileInfo = await FileSystem.getInfoAsync(`${IMAGE_DIR}${file}`);
      if (fileInfo.exists && 'size' in fileInfo) {
        totalSize += fileInfo.size || 0;
      }
    }

    return { directoryExists: true, fileCount: files.length, files, totalSize };
  } catch (error) {
    log('getImageStorageDiagnostics failed', error);
    return { directoryExists: false, fileCount: 0, files: [], totalSize: 0 };
  }
}

/**
 * Delete orphaned companion images that don't belong to any current book
 * @param validCompanionIds - Array of companion IDs that are currently in the library
 * @returns Number of orphaned images deleted
 */
export async function deleteOrphanedImages(validCompanionIds: string[]): Promise<number> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(IMAGE_DIR);
    if (!dirInfo.exists) return 0;

    const files = await FileSystem.readDirectoryAsync(IMAGE_DIR);
    let deletedCount = 0;

    for (const file of files) {
      // Extract companion ID from filename (e.g., "abc123.png" -> "abc123")
      const companionId = file.replace(/\.[^.]+$/, '');

      if (!validCompanionIds.includes(companionId)) {
        await FileSystem.deleteAsync(`${IMAGE_DIR}${file}`);
        log(`Deleted orphaned image: ${file}`);
        deletedCount++;
      }
    }

    log(`Deleted ${deletedCount} orphaned images`);
    return deletedCount;
  } catch (error) {
    log('Failed to delete orphaned images', error);
    return 0;
  }
}

/**
 * Clear all companion images
 */
export async function clearAllImages(): Promise<void> {
  // Log stack trace to debug unexpected calls
  const stack = new Error().stack;
  log('=== clearAllImages CALLED ===');
  log('STACK TRACE:', stack);

  // Log what's about to be deleted
  const diagnostics = await getImageStorageDiagnostics();
  log('About to delete:', diagnostics);

  try {
    const dirInfo = await FileSystem.getInfoAsync(IMAGE_DIR);
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(IMAGE_DIR, { idempotent: true });
      log('Cleared all companion images');
    } else {
      log('Directory did not exist, nothing to clear');
    }
  } catch (error) {
    log('Failed to clear images', error);
  }
}
