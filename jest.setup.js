// Native modules have no implementation under Jest, so they are stubbed here.

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-config', () => ({
  __esModule: true,
  default: { BASE_URL: 'http://localhost/api/' },
}));

jest.mock('react-native-html-to-pdf', () => ({
  __esModule: true,
  default: { generatePDF: jest.fn() },
  generatePDF: jest.fn(),
}));

jest.mock('react-native-share', () => ({
  __esModule: true,
  default: { open: jest.fn() },
}));
