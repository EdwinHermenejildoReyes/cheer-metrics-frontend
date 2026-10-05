import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 1,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: [['html', { open: 'never', outputFolder: 'playwright-report' }], ['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: '**/setup.ts' },
    {
      name: 'auth-tests',
      testMatch: '**/auth.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'public-tests',
      testMatch: '**/public.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'admin-tests',
      testMatch: '**/admin.spec.ts',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/admin.json',
      },
    },
    {
      name: 'judge-tests',
      testMatch: '**/judge.spec.ts',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/judge.json',
      },
    },
    {
      name: 'scoring-tests',
      testMatch: '**/scoring.spec.ts',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/admin.json',
      },
    },
    {
      name: 'session-loop-tests',
      testMatch: '**/session-loop.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
