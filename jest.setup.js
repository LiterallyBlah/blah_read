// Mock expo-file-system for tests (both legacy and new paths)
const fileSystemMock = {
  documentDirectory: 'file:///mock/documents/',
  EncodingType: {
    UTF8: 'utf8',
    Base64: 'base64',
  },
  getInfoAsync: jest.fn().mockResolvedValue({ exists: false }),
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  readAsStringAsync: jest.fn().mockResolvedValue(''),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  readDirectoryAsync: jest.fn().mockResolvedValue([]),
};

jest.mock('expo-file-system', () => fileSystemMock);
jest.mock('expo-file-system/legacy', () => fileSystemMock);

// Mock expo-sharing for tests
jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn().mockResolvedValue(undefined),
  isAvailableAsync: jest.fn().mockResolvedValue(true),
}));
