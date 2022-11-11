module.exports = {
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@lib/(.*)$': '<rootDir>/lib/$1',
    '^@config$': '<rootDir>/config.js',
    '^@resources/(.*)$': '<rootDir>/resources/$1',
    '^@models$': '<rootDir>/src/db/models/index.js',
    '^@models/(.*)$': '<rootDir>/src/db/models/$1',
    '^@routes/(.*)$': '<rootDir>/src/routes/$1',
    '^@tests/(_.*)$': '<rootDir>/tests/$1'
  },
  clearMocks: true,
  modulePathIgnorePatterns: [
    '<rootDir>/dist',
    '<rootDir>/node_modules',
    '<rootDir>/resources',
    '<rootDir>/scripts',
    '<rootDir>/templates',
    '<rootDir>/uploads'
  ],
  transformIgnorePatterns: ['/node_modules/'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: ['<rootDir>/**/tests/**/*.{spec,test}.js'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    './src/**/*.{ts,tsx,js,jsx}',
    '!./src/server.js',
    '!./src/config/**/*',
    '!src/**/*.d.ts',
    '!src/db/migrations/**/*',
    '!src/db/seeds/**/*',
    '!/dist',
    '!/tests',
    '!/node_modules',
    '!/scripts',
    '!/resources',
    '!/templates'
  ]
}
