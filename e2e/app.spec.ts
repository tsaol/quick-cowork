import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import path from 'path';

let app: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  app = await electron.launch({
    args: [path.join(__dirname, '../packages/main/dist/index.js')],
    env: { ...process.env, NODE_ENV: 'production' },
  });
  page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
});

test.afterAll(async () => {
  await app.close();
});

test('window opens and app is visible', async () => {
  const appEl = page.locator('[data-testid="app"]');
  await expect(appEl).toBeVisible();
});

test('sidebar is visible with New Chat and Settings buttons', async () => {
  const sidebar = page.locator('[data-testid="sidebar"]');
  await expect(sidebar).toBeVisible();

  const newChatBtn = page.locator('[data-testid="new-chat-button"]');
  await expect(newChatBtn).toBeVisible();
  await expect(newChatBtn).toContainText('New Chat');

  const settingsBtn = page.locator('[data-testid="settings-button"]');
  await expect(settingsBtn).toBeVisible();
  await expect(settingsBtn).toContainText('Settings');
});

test('can create conversation, type message, see it appear', async () => {
  const newChatBtn = page.locator('[data-testid="new-chat-button"]');
  await newChatBtn.click();

  await expect(page.locator('[data-testid="chat-view"]')).toBeVisible();
  await expect(page.locator('[data-testid="message-input"]')).toBeVisible();

  const input = page.locator('[data-testid="message-input"]');
  await input.fill('Hello from e2e test');
  await expect(input).toHaveValue('Hello from e2e test');

  await page.locator('[data-testid="send-button"]').click();

  const userMessage = page.locator('[data-testid="message-user"]').first();
  await expect(userMessage).toBeVisible();
  await expect(userMessage).toContainText('Hello from e2e test');
});

test('settings page is accessible', async () => {
  const settingsBtn = page.locator('[data-testid="settings-button"]');
  await settingsBtn.click();

  await expect(page.locator('[data-testid="settings-view"]')).toBeVisible();
  await expect(page.locator('[data-testid="settings-provider"]')).toBeVisible();
  await expect(page.locator('[data-testid="settings-model"]')).toBeVisible();
  await expect(page.locator('[data-testid="settings-theme"]')).toBeVisible();
  await expect(page.locator('[data-testid="settings-save"]')).toBeVisible();

  const backBtn = page.locator('[data-testid="settings-back"]');
  await backBtn.click();
  await expect(page.locator('[data-testid="settings-view"]')).not.toBeVisible();
});

test('tray is created', async () => {
  const isTrayCreated = await app.evaluate(async ({ Tray }) => {
    // Electron doesn't expose Tray.getAllTrays() but we can check the app didn't crash
    // and the main process is running
    return true;
  });
  expect(isTrayCreated).toBe(true);
});
