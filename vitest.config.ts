import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['__tests__/vitest.setup.ts'],
    hidePassedTests: true,
    // integration テストは実 ESLint を起動して複雑度を解析するため、
    // cold cache では既定の 5s に収まらない
    testTimeout: 30000,
    // CI環境での出力抑制
    silent: process.env.CI ? 'passed-only' : false,
    reporters: process.env.CI ? ['dot'] : ['default'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['dist', 'coverage', '__tests__', '*.config.*'],
    },
  },
});
