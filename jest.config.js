/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['/node_modules/', '/tests/discovery/', '/tests/storage/', '/tests/integration/'],
  collectCoverageFrom: ['src/lib/**/*.ts', 'src/features/**/transferMachine.ts'],
};
