import { test, expect } from '@playwright/test';

test.describe('Super Admin E2E', () => {
  test('platform statistics', async ({ page }) => {
    await page.goto('/superadmin');
    await expect(page.locator('text=Registered accounts')).toBeVisible();
    await expect(page.locator('text=Security events')).toBeVisible();
  });

  test('account suspension and reactivation', async ({ page }) => {
    await page.goto('/superadmin');
    // Find a standard user and suspend
    await page.click('text=Suspend');
    await page.click('text=Reactivate');
  });

  test('audit records', async ({ page }) => {
    await page.goto('/superadmin');
    await page.click('text=Audit');
    await expect(page.locator('text=action')).toBeVisible();
  });

  test('security events', async ({ page }) => {
    await page.goto('/superadmin');
    await page.click('text=Security events');
    await expect(page.locator('text=event_type')).toBeVisible();
  });

  test('platform health', async ({ page }) => {
    await page.goto('/superadmin');
    await page.click('text=Health');
    await expect(page.locator('.status')).toBeVisible();
  });

  test('unauthorized access rejection', async ({ page }) => {
    await page.goto('/superadmin/accounts');
    await expect(page.locator('.alert')).toContainText('Forbidden or 403');
  });
});
