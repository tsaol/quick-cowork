import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  globalTimeout: 300000,
  retries: 0,
  use: {
    trace: 'on-first-retry',
  },
});
