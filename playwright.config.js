import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  globalSetup: './tests/e2e/fixtures/auth.setup.js',
  use: { baseURL: process.env.TEST_APP_URL || 'http://localhost:3000' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
  },
  projects: [
    { name: 'unauthenticated', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'authenticated',
      use: { ...devices['Desktop Chrome'], storageState: 'tests/e2e/fixtures/owner-session.json' },
      dependencies: ['unauthenticated'],
    },
  ],
})
