module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/jest.setup.js'],
  // The React Native preset only transforms react-native itself, but most
  // react-native-* and @react-navigation packages ship untranspiled ESM.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-[a-z-]+)?|@react-navigation|react-native-[a-z0-9-]+)/)',
  ],
  // Fonts and images are binary; stub them so imports resolve.
  moduleNameMapper: {
    '\\.(ttf|otf|woff2?|eot|png|jpe?g|gif|webp)$': '<rootDir>/__mocks__/fileMock.js',
  },
};
