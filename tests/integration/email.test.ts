import { test, expect } from '@playwright/test';
import { createUserSession } from '~/utils/session.server';
import { prisma } from '~/db.server';

test.describe('Email Management', () => {
  test.beforeEach(async ({ page }) => {
    // Clean up database
    await prisma.email.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();

    // Create test user
    const user = await prisma.user.create({
      data: {
        name: 'John Doe',
        email: 'john@example.com',
      },
    });

    // Create test categories
    const categories = await Promise.all([
      prisma.category.create({
        data: {
          name: 'Newsletter',
          color: '#0000FF',
          userId: user.id,
        },
      }),
      prisma.category.create({
        data: {
          name: 'Promotion',
          color: '#FF0000',
          userId: user.id,
        },
      }),
    ]);

    // Create test emails
    await Promise.all([
      prisma.email.create({
        data: {
          messageId: 'msg1',
          subject: 'Weekly Newsletter',
          from: 'newsletter@example.com',
          to: 'john@example.com',
          date: new Date(),
          snippet: 'Check out our latest updates',
          categoryId: categories[0].id,
          userId: user.id,
        },
      }),
      prisma.email.create({
        data: {
          messageId: 'msg2',
          subject: 'Special Offer',
          from: 'marketing@example.com',
          to: 'john@example.com',
          date: new Date(),
          snippet: '50% off on all items',
          categoryId: categories[1].id,
          userId: user.id,
        },
      }),
    ]);

    // Create session
    const session = await createUserSession({
      request: new Request('http://test.com'),
      userId: user.id,
      remember: false,
      redirectTo: '/dashboard',
    });

    // Set session cookie
    await page.context().addCookies([
      {
        name: 'session',
        value: session.headers.get('Set-Cookie')?.split(';')[0].split('=')[1] || '',
        domain: 'localhost',
        path: '/',
      },
    ]);

    // Go to dashboard
    await page.goto('/dashboard');
  });

  test('user can view emails in different categories', async ({ page }) => {
    // Check Newsletter category
    await page.click('text=Newsletter');
    await expect(page.locator('text=Weekly Newsletter')).toBeVisible();
    await expect(page.locator('text=Special Offer')).not.toBeVisible();

    // Check Promotion category
    await page.click('text=Promotion');
    await expect(page.locator('text=Weekly Newsletter')).not.toBeVisible();
    await expect(page.locator('text=Special Offer')).toBeVisible();
  });

  test('user can change email category', async ({ page }) => {
    // Select email
    await page.click('text=Weekly Newsletter');

    // Open category dropdown
    await page.click('[data-testid="category-dropdown"]');

    // Select new category
    await page.click('text=Promotion');

    // Verify category change
    await expect(page.locator('text=Promotion')).toBeVisible();

    // Verify database update
    const email = await prisma.email.findFirst({
      where: { subject: 'Weekly Newsletter' },
    });
    expect(email?.categoryId).toBe(2); // Promotion category ID
  });

  test('user can unsubscribe from email', async ({ page }) => {
    // Mock unsubscribe API
    await page.route('**/api/emails/*/unsubscribe', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true }),
      });
    });

    // Select email
    await page.click('text=Weekly Newsletter');

    // Click unsubscribe button
    await page.click('[data-testid="unsubscribe-button"]');

    // Verify confirmation message
    await expect(page.locator('text=Successfully unsubscribed')).toBeVisible();

    // Verify database update
    const email = await prisma.email.findFirst({
      where: { subject: 'Weekly Newsletter' },
    });
    expect(email?.unsubscribed).toBe(true);
  });

  test('user can delete email', async ({ page }) => {
    // Mock delete API
    await page.route('**/api/emails/*', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true }),
      });
    });

    // Select email
    await page.click('text=Weekly Newsletter');

    // Click delete button
    await page.click('[data-testid="delete-button"]');

    // Confirm deletion
    await page.click('text=Confirm');

    // Verify email is removed from view
    await expect(page.locator('text=Weekly Newsletter')).not.toBeVisible();

    // Verify database update
    const email = await prisma.email.findFirst({
      where: { subject: 'Weekly Newsletter' },
    });
    expect(email).toBeNull();
  });

  test('user can sync new emails', async ({ page }) => {
    // Mock Gmail API response
    await page.route('**/api/emails/sync', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          count: 2,
        }),
      });
    });

    // Click sync button
    await page.click('[data-testid="sync-button"]');

    // Verify sync progress
    await expect(page.locator('text=Syncing emails...')).toBeVisible();

    // Verify success message
    await expect(page.locator('text=Successfully synced 2 emails')).toBeVisible();
  });

  test('user can search emails', async ({ page }) => {
    // Enter search query
    await page.fill('[data-testid="search-input"]', 'Weekly');

    // Verify search results
    await expect(page.locator('text=Weekly Newsletter')).toBeVisible();
    await expect(page.locator('text=Special Offer')).not.toBeVisible();

    // Clear search
    await page.fill('[data-testid="search-input"]', '');

    // Verify all emails are visible
    await expect(page.locator('text=Weekly Newsletter')).toBeVisible();
    await expect(page.locator('text=Special Offer')).toBeVisible();
  });
}); 