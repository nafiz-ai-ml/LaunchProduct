module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  clearMocks: true,
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  forceExit: true,
};
