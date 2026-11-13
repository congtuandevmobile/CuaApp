const path = require('path');

module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // The linked SDKs would otherwise pull their own copy of react-native from their monorepo.
    '^react-native-nitro-modules$': '<rootDir>/test/mocks/nitro-modules.ts',
    '^react-native-mmkv$': '<rootDir>/test/mocks/mmkv.ts',
    '^expo-location$': '<rootDir>/test/mocks/expo-location.ts',
    '^react-native$': path.join(__dirname, 'node_modules/react-native'),
    '^react$': path.join(__dirname, 'node_modules/react'),
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-unistyles|react-native-(apple-health-sync|gps-tracking|live-activity-tracking)|mobx|mobx-react-lite|inversiland)/)',
  ],
};
