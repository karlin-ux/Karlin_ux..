# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin.spec.ts >> Workspace Admin E2E >> revision preview and restoration
- Location: e2e/admin.spec.ts:40:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/admin
Call log:
  - navigating to "http://localhost:5173/admin", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Workspace Admin E2E', () => {
  4  |   test('product creation and publishing', async ({ page }) => {
  5  |     await page.goto('/admin');
  6  |     await page.click('text=Products');
  7  |     await page.fill('input[name="name"]', 'E2E Product');
  8  |     await page.fill('input[name="price"]', '29.99');
  9  |     await page.fill('input[name="stock"]', '5');
  10 |     await page.click('text=Publish');
  11 |     await expect(page.locator('.alert')).toContainText('published');
  12 |   });
  13 | 
  14 |   test('3D model upload and replacement', async ({ page }) => {
  15 |     await page.goto('/admin');
  16 |     await page.click('text=Media Library');
  17 |     await page.setInputFiles('input[type="file"]', '/dev/null');
  18 |     await page.click('button:has-text("Upload")');
  19 |   });
  20 | 
  21 |   test('booking status management', async ({ page }) => {
  22 |     await page.goto('/admin');
  23 |     await page.click('text=Bookings');
  24 |     await page.click('text=Pending');
  25 |     await page.click('text=Confirm');
  26 |   });
  27 | 
  28 |   test('application status management', async ({ page }) => {
  29 |     await page.goto('/admin');
  30 |     await page.click('text=Applications');
  31 |     await page.click('text=Review');
  32 |   });
  33 | 
  34 |   test('website content editing and saving', async ({ page }) => {
  35 |     await page.goto('/admin');
  36 |     await page.click('text=Website Builder');
  37 |     await page.click('text=Save draft');
  38 |   });
  39 | 
  40 |   test('revision preview and restoration', async ({ page }) => {
> 41 |     await page.goto('/admin');
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/admin
  42 |     await page.click('text=Revisions');
  43 |     await page.click('text=Preview');
  44 |     await page.click('text=Restore');
  45 |   });
  46 | 
  47 |   test('CSV report export', async ({ page }) => {
  48 |     await page.goto('/admin');
  49 |     await page.click('text=Reports');
  50 |     await page.click('text=Export orders CSV');
  51 |     // Download should start
  52 |     await expect(page.locator('text:Download')).toBeVisible({ timeout: 5000 });
  53 |   });
  54 | });
  55 | 
```