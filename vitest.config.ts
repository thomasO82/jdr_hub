import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**',
      'apps/api/tests/integration/postgres-attendance-notifications.test.ts',
      'apps/api/tests/integration/postgres-dashboard-gm-management.test.ts',
    ],
  },
})
