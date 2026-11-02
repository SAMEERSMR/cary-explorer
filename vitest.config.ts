// Vitest config: unit tests run from tests/ only, in plain Node (no DOM, no app plugins).
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // The downloaded reference folder holds untrusted specs; it must never be discovered or run.
    exclude: ['cary-explorer-reference/**', 'node_modules/**', 'dist/**'],
  },
})
