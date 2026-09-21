import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@dns': path.resolve(import.meta.dirname, 'src'),
    },
  },
  test: {
    name: '@dns',
    include: ['src/**/*.test.ts'],
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
