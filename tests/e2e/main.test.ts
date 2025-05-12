import { test, expect } from '@playwright/test';

test.describe('Main User Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the Google OAuth response
    await page.route('**/auth/google/callback*', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          user: {
            id: 1,
            name: 'John Doe',
            email: 'john@example.com',
          },
        }),
      });
    });

    // Start at the home page
    await page.goto('/');
  });

  test('user can log in and access dashboard', async ({ page }) => {
    // Click login button
    await page.click('text=Login with Google');

    // Wait for dashboard to load
    await page.waitForURL('**/dashboard');

    // Verify user info is displayed
    await expect(page.locator('text=Welcome, John Doe')).toBeVisible();
    await expect(page.locator('text=john@example.com')).toBeVisible();
  });

  test('user can add a new category', async ({ page }) => {
    // Login first
    await page.click('text=Login with Google');
    await page.waitForURL('**/dashboard');

    // Click add category button
    await page.click('text=Add Category');

    // Fill in category form
    await page.fill('input[name="name"]', 'Test Category');
    await page.fill('textarea[name="description"]', 'Test Description');
    await page.selectOption('select[name="color"]', 'blue');

    // Submit form
    await page.click('button[type="submit"]');

    // Verify category was added
    await expect(page.locator('text=Test Category')).toBeVisible();
  });

  test('user can sync emails', async ({ page }) => {
    // Login first
    await page.click('text=Login with Google');
    await page.waitForURL('**/dashboard');

    // Mock Gmail API response
    await page.route('**/api/gmail/messages*', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          messages: [
            {
              id: 'msg1',
              subject: 'Test Email',
              from: 'test@example.com',
              date: new Date().toISOString(),
              snippet: 'Test snippet',
            },
          ],
        }),
      });
    });

    // Click sync button
    await page.click('text=Sync Emails');

    // Verify sync progress
    await expect(page.locator('text=Processing Emails...')).toBeVisible();
    await expect(page.locator('role=progressbar')).toBeVisible();

    // Wait for sync to complete
    await expect(page.locator('text=Processing Emails...')).not.toBeVisible();
  });

  test('user can manage email categories', async ({ page }) => {
    // Login first
    await page.click('text=Login with Google');
    await page.waitForURL('**/dashboard');

    // Select an email
    await page.click('text=Weekly Tech Newsletter');

    // Click category dropdown
    await page.click('button[aria-label="Select category"]');

    // Select a category
    await page.click('text=Newsletter');

    // Verify category was assigned
    await expect(page.locator('text=Newsletter')).toBeVisible();
  });

  test('user can unsubscribe from emails', async ({ page }) => {
    // Login first
    await page.click('text=Login with Google');
    await page.waitForURL('**/dashboard');

    // Select an email with unsubscribe link
    await page.click('text=Weekly Tech Newsletter');

    // Click unsubscribe button
    await page.click('text=Unsubscribe');

    // Verify unsubscribe confirmation
    await expect(page.locator('text=Are you sure you want to unsubscribe?')).toBeVisible();

    // Confirm unsubscribe
    await page.click('text=Confirm');

    // Verify success message
    await expect(page.locator('text=Successfully unsubscribed')).toBeVisible();
  });

  test('user can delete emails', async ({ page }) => {
    // Login first
    await page.click('text=Login with Google');
    await page.waitForURL('**/dashboard');

    // Select an email
    await page.click('text=Weekly Tech Newsletter');

    // Click delete button
    await page.click('text=Delete');

    // Verify delete confirmation
    await expect(page.locator('text=Are you sure you want to delete this email?')).toBeVisible();

    // Confirm delete
    await page.click('text=Confirm');

    // Verify email was removed
    await expect(page.locator('text=Weekly Tech Newsletter')).not.toBeVisible();
  });

  test('user can add a new email account', async ({ page }) => {
    // Login first
    await page.click('text=Login with Google');
    await page.waitForURL('**/dashboard');

    // Click add account button
    await page.click('text=+ Add Account');

    // Mock Google OAuth popup
    const popupPromise = page.waitForEvent('popup');
    await page.click('text=Add Gmail Account');
    const popup = await popupPromise;

    // Mock successful account addition
    await popup.route('**/auth/google/callback*', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          email: 'new@example.com',
        }),
      });
    });

    // Wait for account to be added
    await expect(page.locator('text=new@example.com')).toBeVisible();
  });
}); 