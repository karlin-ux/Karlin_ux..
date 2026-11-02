# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: superadmin.spec.ts >> Super Admin E2E >> account suspension and reactivation
- Location: e2e/superadmin.spec.ts:10:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('text=Suspend')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - link "Karlin_ux" [ref=e6] [cursor=pointer]:
        - /url: /
      - navigation [ref=e7]:
        - link "Explore" [ref=e8] [cursor=pointer]:
          - /url: /explore
        - link "Customer" [ref=e9] [cursor=pointer]:
          - /url: /customer
        - link "Projects" [ref=e10] [cursor=pointer]:
          - /url: /projects
        - link "Technologies" [ref=e11] [cursor=pointer]:
          - /url: /technologies
        - link "About" [ref=e12] [cursor=pointer]:
          - /url: /about
        - link "Contact" [ref=e13] [cursor=pointer]:
          - /url: /contact
      - generic [ref=e14]:
        - button "Light" [ref=e15]
        - link "Sign In" [ref=e16] [cursor=pointer]:
          - /url: /signin
        - link "Register" [ref=e17] [cursor=pointer]:
          - /url: /register
  - main [ref=e18]:
    - generic [ref=e19]:
      - heading "Sign In" [level=1] [ref=e20]
      - generic [ref=e21]:
        - textbox "Email" [ref=e22]
        - textbox "Password" [ref=e23]
        - button "Sign In" [ref=e24]
  - button "Assistant" [ref=e25]
  - button "Voice nav" [ref=e27]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Super Admin E2E', () => {
  4  |   test('platform statistics', async ({ page }) => {
  5  |     await page.goto('/superadmin');
  6  |     await expect(page.locator('text=Registered accounts')).toBeVisible();
  7  |     await expect(page.locator('text=Security events')).toBeVisible();
  8  |   });
  9  | 
  10 |   test('account suspension and reactivation', async ({ page }) => {
  11 |     await page.goto('/superadmin');
  12 |     // Find a standard user and suspend
> 13 |     await page.click('text=Suspend');
     |                ^ Error: page.click: Test timeout of 30000ms exceeded.
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