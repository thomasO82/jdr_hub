import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    fileParallelism: false,
    include: ['apps/api/tests/integration/postgres-attendance-notifications.test.ts', 'apps/api/tests/integration/postgres-dashboard-gm-management.test.ts'],
  },
})
