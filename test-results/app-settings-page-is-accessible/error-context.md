# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.ts >> settings page is accessible
- Location: e2e/app.spec.ts:58:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-testid="settings-view"]')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('[data-testid="settings-view"]')

```

```
"afterAll" hook timeout of 60000ms exceeded.
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
  11 |     timeout: 60000,
  12 |   });
  13 |   page = await app.firstWindow();
  14 |   await page.waitForLoadState('domcontentloaded');
  15 |   await page.waitForSelector('[data-testid="app"]', { timeout: 15000 });
  16 | });
  17 | 
> 18 | test.afterAll(async () => {
     |      ^ "afterAll" hook timeout of 60000ms exceeded.
  19 |   await app.close();
  20 | });
  21 | 
  22 | test('window opens and app is visible', async () => {
  23 |   const appEl = page.locator('[data-testid="app"]');
  24 |   await expect(appEl).toBeVisible();
  25 | });
  26 | 
  27 | test('sidebar is visible with New Chat and Settings buttons', async () => {
  28 |   const sidebar = page.locator('[data-testid="sidebar"]');
  29 |   await expect(sidebar).toBeVisible();
  30 | 
  31 |   const newChatBtn = page.locator('[data-testid="new-chat-button"]');
  32 |   await expect(newChatBtn).toBeVisible();
  33 |   await expect(newChatBtn).toContainText('New Chat');
  34 | 
  35 |   const settingsBtn = page.locator('[data-testid="settings-button"]');
  36 |   await expect(settingsBtn).toBeVisible();
  37 |   await expect(settingsBtn).toContainText('Settings');
  38 | });
  39 | 
  40 | test('can create conversation, type message, see it appear', async () => {
  41 |   const newChatBtn = page.locator('[data-testid="new-chat-button"]');
  42 |   await newChatBtn.click();
  43 | 
  44 |   await expect(page.locator('[data-testid="chat-view"]')).toBeVisible({ timeout: 10000 });
  45 |   await expect(page.locator('[data-testid="message-input"]')).toBeVisible();
  46 | 
  47 |   const input = page.locator('[data-testid="message-input"]');
  48 |   await input.fill('Hello from e2e test');
  49 |   await expect(input).toHaveValue('Hello from e2e test');
  50 | 
  51 |   await page.locator('[data-testid="send-button"]').click();
  52 | 
  53 |   const userMessage = page.locator('[data-testid="message-user"]').first();
  54 |   await expect(userMessage).toBeVisible();
  55 |   await expect(userMessage).toContainText('Hello from e2e test');
  56 | });
  57 | 
  58 | test('settings page is accessible', async () => {
  59 |   const settingsBtn = page.locator('[data-testid="settings-button"]');
  60 |   await settingsBtn.click();
  61 | 
  62 |   await expect(page.locator('[data-testid="settings-view"]')).toBeVisible();
  63 |   await expect(page.locator('[data-testid="settings-provider"]')).toBeVisible();
  64 |   await expect(page.locator('[data-testid="settings-model"]')).toBeVisible();
  65 |   await expect(page.locator('[data-testid="settings-theme"]')).toBeVisible();
  66 |   await expect(page.locator('[data-testid="settings-save"]')).toBeVisible();
  67 | 
  68 |   const backBtn = page.locator('[data-testid="settings-back"]');
  69 |   await backBtn.click();
  70 |   await expect(page.locator('[data-testid="settings-view"]')).not.toBeVisible();
  71 | });
  72 | 
  73 | test('tray is created', async () => {
  74 |   const isTrayCreated = await app.evaluate(async ({ Tray }) => {
  75 |     // Electron doesn't expose Tray.getAllTrays() but we can check the app didn't crash
  76 |     // and the main process is running
  77 |     return true;
  78 |   });
  79 |   expect(isTrayCreated).toBe(true);
  80 | });
  81 | 
```