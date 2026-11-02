import { test, expect } from '@playwright/test';

test('customer registration and login', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Register');
  const email = `e2e_${Date.now()}@test.com`;
  await page.fill('input[placeholder="Email"]', email);
  await page.fill('input[type="password"]', 'TestPass123!');
  await page.click('button:has-text("Create Account")');
  await expect(page).toHaveURL(/localhost:5173\/?$/);
});

test('customer browse products', async ({ page }) => {
  await page.goto('/customer');
  await expect(page.locator('text=Customer Experience')).toBeVisible();
});

test('command palette opens', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })));
  await expect(page.locator('input[placeholder="Search commands…"]')).toBeVisible();
});

test('admin page loads', async ({ page }) => {
  await page.goto('/admin');
  // redirect to signin if not auth
  await expect(page).toHaveURL(/signin|admin/);
});
