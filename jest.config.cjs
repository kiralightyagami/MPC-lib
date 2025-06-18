module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts'
  ],
  modulePathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/pkg/'],
  testTimeout: 10000,
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  moduleNameMapper: {
    '^../../pkg/ed25519_tss_wasm$': '<rootDir>/tests/__mocks__/wasm.ts'
  }
}; 