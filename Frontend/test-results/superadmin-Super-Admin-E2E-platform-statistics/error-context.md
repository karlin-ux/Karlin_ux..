# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: superadmin.spec.ts >> Super Admin E2E >> platform statistics
- Location: e2e/superadmin.spec.ts:4:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Registered accounts')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('text=Registered accounts') with timeout 5000ms
  - waiting for locator('text=Registered accounts')

```

```yaml
- banner:
  - link "Karlin_ux":
    - /url: /
  - navigation:
    - link "Explore":
      - /url: /explore
    - link "Customer":
      - /url: /customer
    - link "Projects":
      - /url: /projects
    - link "Technologies":
      - /url: /technologies
    - link "About":
      - /url: /about
    - link "Contact":
      - /url: /contact
  - button "Light"
  - link "Sign In":
    - /url: /signin
  - link "Register":
    - /url: /register
- main:
  - heading "Sign In" [level=1]
  - textbox "Email"
  - textbox "Password"
  - button "Sign In"
- button "Assistant"
- button "Voice nav"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Super Admin E2E', () => {
  4  |   test('platform statistics', async ({ page }) => {
  5  |     await page.goto('/superadmin');
> 6  |     await expect(page.locator('text=Registered accounts')).toBeVisible();
     |                                                            ^ Error: expect(locator).toBeVisible() failed
  7  |     await expect(page.locator('text=Security events')).toBeVisible();
  8  |   });
  9  | 
  10 |   test('account suspension and reactivation', async ({ page }) => {
  11 |     await page.goto('/superadmin');
  12 |     // Find a standard user and suspend
  13 |     await page.click('text=Suspend');
  14 |     await page.click('text=Reactivate');
  15 |   });
  16 | 
  17 |   test('audit records', async ({ page }) => {
  18 |     await page.goto('/superadmin');
  19 |     await page.click('text=Audit');
  20 |     await expect(page.locator('text=action')).toBeVisible();
  21 |   });
  22 | 
  23 |   test('security events', async ({ page }) => {
  24 |     await page.goto('/superadmin');
  25 |     await page.click('text=Security events');
  26 |     await expect(page.locator('text=event_type')).toBeVisible();
  27 |   });
  28 | 
  29 |   test('platform health', async ({ page }) => {
  30 |     await page.goto('/superadmin');
  31 |     await page.click('text=Health');
  32 |     await expect(page.locator('.status')).toBeVisible();
  33 |   });
  34 | 
  35 |   test('unauthorized access rejection', async ({ page }) => {
  36 |     await page.goto('/superadmin/accounts');
  37 |     await expect(page.locator('.alert')).toContainText('Forbidden or 403');
  38 |   });
  39 | });
  40 | 
```