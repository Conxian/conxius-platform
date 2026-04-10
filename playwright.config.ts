import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'on',
  },
  outputDir: 'test-results',
  reporter: [['html', { open: 'never' }]],
});
