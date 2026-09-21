import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@naming': path.resolve(import.meta.dirname, 'src'),
    },
  },
  test: {
    name: '@naming',
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
    root: import.meta.dirname,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
      reportsDirectory: './coverage',
      reporter: ['text', 'html', 'lcov'],
    },
  },
})
