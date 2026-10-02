module.exports = {
  root: true,
  extends: '@react-native',
  overrides: [
    {
      // Jest config and setup run in Node with Jest globals available.
      files: ['jest.config.js', 'jest.setup.js', '__mocks__/**/*.js'],
      env: { node: true, jest: true },
    },
  ],
};
