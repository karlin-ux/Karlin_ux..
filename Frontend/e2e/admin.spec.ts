import { test, expect } from '@playwright/test';

test.describe('Workspace Admin E2E', () => {
  test('product creation and publishing', async ({ page }) => {
    await page.goto('/admin');
    await page.click('text=Products');
    await page.fill('input[name="name"]', 'E2E Product');
    await page.fill('input[name="price"]', '29.99');
    await page.fill('input[name="stock"]', '5');
    await page.click('text=Publish');
    await expect(page.locator('.alert')).toContainText('published');
  });

  test('3D model upload and replacement', async ({ page }) => {
    await page.goto('/admin');
    await page.click('text=Media Library');
    await page.setInputFiles('input[type="file"]', '/dev/null');
    await page.click('button:has-text("Upload")');
  });

  test('booking status management', async ({ page }) => {
    await page.goto('/admin');
    await page.click('text=Bookings');
    await page.click('text=Pending');
    await page.click('text=Confirm');
  });

  test('application status management', async ({ page }) => {
    await page.goto('/admin');
    await page.click('text=Applications');
    await page.click('text=Review');
  });

  test('website content editing and saving', async ({ page }) => {
    await page.goto('/admin');
    await page.click('text=Website Builder');
    await page.click('text=Save draft');
  });

  test('revision preview and restoration', async ({ page }) => {
    await page.goto('/admin');
    await page.click('text=Revisions');
    await page.click('text=Preview');
    await page.click('text=Restore');
  });

  test('CSV report export', async ({ page }) => {
    await page.goto('/admin');
    await page.click('text=Reports');
    await page.click('text=Export orders CSV');
    // Download should start
    await expect(page.locator('text:Download')).toBeVisible({ timeout: 5000 });
  });
});
