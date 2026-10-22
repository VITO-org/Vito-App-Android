module.exports = {
  preset: 'react-native',
  transform: {
    '^.+\\.(ts|tsx)$': 'babel-jest',
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    // `expo/virtual` se transforma porque babel-preset-expo reescribe
    // process.env.EXPO_PUBLIC_* como `env.EXPO_PUBLIC_*` (import de
    // expo/virtual/env) cuando NO está en modo producción. Sin esta
    // excepción el módulo ESM queda sin transformar y Jest no lo puede cargar.
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|expo/virtual)/)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: ['**/__tests__/**/*.(ts|tsx)', '**/?(*.)+(spec|test).(ts|tsx)'],
  clearMocks: true,
};