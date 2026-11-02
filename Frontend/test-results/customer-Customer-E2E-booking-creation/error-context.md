# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: customer.spec.ts >> Customer E2E >> booking creation
- Location: e2e/customer.spec.ts:25:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/customer
Call log:
  - navigating to "http://localhost:5173/customer", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Customer E2E', () => {
  4   |   test('persistent cart after reload', async ({ page }) => {
  5   |     await page.goto('/');
  6   |     await page.click('text=Register');
  7   |     await page.fill('input[placeholder="Email"]', `cart_${Date.now()}@test.com`);
  8   |     await page.fill('input[type="password"]', 'TestPass123!');
  9   |     await page.click('button:has-text("Create Account")');
  10  |     await page.waitForURL(/.*\/customer/);
  11  |     // Add to cart
  12  |     await page.click('text=Add to cart');
  13  |     await page.reload();
  14  |     // Cart should still have item
  15  |     await expect(page.locator('.cart-item')).toHaveCount(1);
  16  |   });
  17  | 
  18  |   test('simulated checkout', async ({ page }) => {
  19  |     await page.goto('/customer');
  20  |     await page.click('text=Add to cart');
  21  |     await page.click('text=Checkout (Simulated)');
  22  |     await expect(page.locator('.alert')).toContainText('Order created');
  23  |   });
  24  | 
  25  |   test('booking creation', async ({ page }) => {
> 26  |     await page.goto('/customer');
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/customer
  27  |     await page.click('text=Book a service');
  28  |     await page.selectOption('select', 'Consultation');
  29  |     const d = new Date();
  30  |     d.setDate(d.getDate() + 1);
  31  |     await page.fill('input[type="date"]', d.toISOString().slice(0,10));
  32  |     await page.fill('input[type="time"]', '10:00');
  33  |     await page.fill('input[placeholder="Your name"]', 'Test User');
  34  |     await page.fill('input[placeholder="Your email"]', 'test@test.com');
  35  |     await page.click('button:has-text("Submit booking")');
  36  |     await expect(page.locator('.alert')).toContainText('Booking submitted');
  37  |   });
  38  | 
  39  |   test('booking reschedule', async ({ page }) => {
  40  |     await page.goto('/customer');
  41  |     await page.click('text=My bookings');
  42  |     // Find a booking and reschedule
  43  |     await page.click('text=Reschedule');
  44  |     await page.fill('input[type="date"]', new Date().add(1).days().toISOString().slice(0,10));
  45  |     await page.fill('input[type="time"]', '14:00');
  46  |     await page.click('button:has-text("Reschedule")');
  47  |     await expect(page.locator('.alert')).toContainText('updated');
  48  |   });
  49  | 
  50  |   test('booking cancellation', async ({ page }) => {
  51  |     await page.goto('/customer');
  52  |     await page.click('text=My bookings');
  53  |     await page.click('text=Cancel');
  54  |     await expect(page.locator('.alert')).toContainText('cancelled');
  55  |   });
  56  | 
  57  |   test('application submission', async ({ page }) => {
  58  |     await page.goto('/customer');
  59  |     await page.click('text=Submit application / enquiry');
  60  |     await page.selectOption('select', 'enquiry');
  61  |     await page.fill('input[name="applicant_name"]', 'Test Applicant');
  62  |     await page.fill('input[name="applicant_email"]', 'app@test.com');
  63  |     await page.fill('input[name="subject"]', 'Test subject');
  64  |     await page.fill('input[name="message"]', 'Test message');
  65  |     await page.click('button:has-text("Submit")');
  66  |     await expect(page.locator('.alert')).toContainText('Application submitted');
  67  |   });
  68  | 
  69  |   test('private attachment access', async ({ page }) => {
  70  |     await page.goto('/customer');
  71  |     // Upload attachment through application
  72  |     await page.click('text=Submit application / enquiry');
  73  |     await page.selectOption('select', 'enquiry');
  74  |     await page.fill('input[name="applicant_name"]', 'Attach Test');
  75  |     await page.fill('input[name="applicant_email"]', 'attach@test.com');
  76  |     await page.fill('input[name="message"]', 'Attach');
  77  |     // File upload
  78  |     await page.setInputFiles('input[type="file"]', '/dev/null'); // will fail but test passes
  79  |     await page.click('button:has-text("Submit")');
  80  |     // Should not crash
  81  |   });
  82  | 
  83  |   test('account management', async ({ page }) => {
  84  |     await page.goto('/customer');
  85  |     await page.click('text=Account');
  86  |     await page.fill('input[name="display_name"]', 'Renamed');
  87  |     await page.click('button:has-text("Update profile")');
  88  |     await page.fill('input[name="old_password"]', 'TestPass123!');
  89  |     await page.fill('input[name="new_password"]', 'NewPass456!');
  90  |     await page.click('button:has-text("Change password")');
  91  |     await page.click('button:has-text("Request account deletion")');
  92  |     await expect(page.locator('.alert')).toContainText('Deletion requested');
  93  |   });
  94  | 
  95  |   test('product-specific 3D viewer', async ({ page }) => {
  96  |     await page.goto('/customer');
  97  |     // Find a product with model_3d and click view
  98  |     await page.click('text=View 3D');
  99  |     // Model viewer should load or show fallback
  100 |     await expect(page.locator('.card')).toBeVisible();
  101 |   });
  102 | });
  103 | 
```