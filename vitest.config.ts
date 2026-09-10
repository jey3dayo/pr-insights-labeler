import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['__tests__/vitest.setup.ts'],
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
