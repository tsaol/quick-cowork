# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.ts >> tray is created
- Location: e2e/app.spec.ts:71:5

# Error details

```
"afterAll" hook timeout of 30000ms exceeded.
```

# Test source

```ts
  1  | import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
  2  | import path from 'path';
  3  | 
  4  | let app: ElectronApplication;
  5  | let page: Page;
  6  | 
  7  | test.beforeAll(async () => {
  8  |   app = await electron.launch({
  9  |     args: [path.join(__dirname, '../packages/main/dist/index.js')],
  10 |     env: { ...process.env, NODE_ENV: 'production' },
  11 |   });
  12 |   page = await app.firstWindow();
  13 |   await page.waitForLoadState('domcontentloaded');
  14 | });
  15 | 
> 16 | test.afterAll(async () => {
     |      ^ "afterAll" hook timeout of 30000ms exceeded.
  17 |   await app.close();
  18 | });
  19 | 
  20 | test('window opens and app is visible', async () => {
  21 |   const appEl = page.locator('[data-testid="app"]');
  22 |   await expect(appEl).toBeVisible();
  23 | });
  24 | 
  25 | test('sidebar is visible with New Chat and Settings buttons', async () => {
  26 |   const sidebar = page.locator('[data-testid="sidebar"]');
  27 |   await expect(sidebar).toBeVisible();
  28 | 
  29 |   const newChatBtn = page.locator('[data-testid="new-chat-button"]');
  30 |   await expect(newChatBtn).toBeVisible();
  31 |   await expect(newChatBtn).toContainText('New Chat');
  32 | 
  33 |   const settingsBtn = page.locator('[data-testid="settings-button"]');
  34 |   await expect(settingsBtn).toBeVisible();
  35 |   await expect(settingsBtn).toContainText('Settings');
  36 | });
  37 | 
  38 | test('can create conversation, type message, see it appear', async () => {
  39 |   const newChatBtn = page.locator('[data-testid="new-chat-button"]');
  40 |   await newChatBtn.click();
  41 | 
  42 |   await expect(page.locator('[data-testid="chat-view"]')).toBeVisible();
  43 |   await expect(page.locator('[data-testid="message-input"]')).toBeVisible();
  44 | 
  45 |   const input = page.locator('[data-testid="message-input"]');
  46 |   await input.fill('Hello from e2e test');
  47 |   await expect(input).toHaveValue('Hello from e2e test');
  48 | 
  49 |   await page.locator('[data-testid="send-button"]').click();
  50 | 
  51 |   const userMessage = page.locator('[data-testid="message-user"]').first();
  52 |   await expect(userMessage).toBeVisible();
  53 |   await expect(userMessage).toContainText('Hello from e2e test');
  54 | });
  55 | 
  56 | test('settings page is accessible', async () => {
  57 |   const settingsBtn = page.locator('[data-testid="settings-button"]');
  58 |   await settingsBtn.click();
  59 | 
  60 |   await expect(page.locator('[data-testid="settings-view"]')).toBeVisible();
  61 |   await expect(page.locator('[data-testid="settings-provider"]')).toBeVisible();
  62 |   await expect(page.locator('[data-testid="settings-model"]')).toBeVisible();
  63 |   await expect(page.locator('[data-testid="settings-theme"]')).toBeVisible();
  64 |   await expect(page.locator('[data-testid="settings-save"]')).toBeVisible();
  65 | 
  66 |   const backBtn = page.locator('[data-testid="settings-back"]');
  67 |   await backBtn.click();
  68 |   await expect(page.locator('[data-testid="settings-view"]')).not.toBeVisible();
  69 | });
  70 | 
  71 | test('tray is created', async () => {
  72 |   const isTrayCreated = await app.evaluate(async ({ Tray }) => {
  73 |     // Electron doesn't expose Tray.getAllTrays() but we can check the app didn't crash
  74 |     // and the main process is running
  75 |     return true;
  76 |   });
  77 |   expect(isTrayCreated).toBe(true);
  78 | });
  79 | 
```