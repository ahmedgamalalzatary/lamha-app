// Unit tests: no database and no API, so they run on every core.
// Screen and API tests (the real API on tawsela_mobile_test) are in jest.config.e2e.js.
module.exports = {
  preset: 'jest-expo',
  testEnvironment: '<rootDir>/test/utils/environment.js',
  testTimeout: 20000,
  setupFiles: ['<rootDir>/jest.env.js', 'react-native-gesture-handler/jestSetup'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['/node_modules/'],
  transformIgnorePatterns: [
    'node_modules/(?!(?:.pnpm/[^/]+/node_modules/)?((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|react-native-svg|three|@tanstack/.*|zustand|lucide-react-native|standard-navigation))',
  ],
  testMatch: ['<rootDir>/test/unit/**/*.test.ts?(x)'],
  moduleNameMapper: {
    '^lucide-react-native$': '<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
  },
  resolver: 'react-native-reanimated/jest/resolver',
};
