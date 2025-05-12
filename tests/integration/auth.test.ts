import { test, expect } from '@playwright/test';
import { createUserSession } from '~/utils/session.server';
import { prisma } from '~/db.server';

test.describe('Authentication', () => {
  test.beforeEach(async () => {
    // Clean up database before each test
    await prisma.user.deleteMany();
  });

  test('user can log in with Google', async ({ page }) => {
    // Mock Google OAuth response
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

    // Start at home page
    await page.goto('/');

    // Click login button
    await page.click('text=Login with Google');

    // Wait for dashboard to load
    await page.waitForURL('**/dashboard');

    // Verify user is logged in
    await expect(page.locator('text=Welcome, John Doe')).toBeVisible();
    await expect(page.locator('text=john@example.com')).toBeVisible();

    // Verify user was created in database
    const user = await prisma.user.findUnique({
      where: { email: 'john@example.com' },
    });
    expect(user).toBeTruthy();
    expect(user?.name).toBe('John Doe');
  });

  test('user can log out', async ({ page }) => {
    // Create a test user
    const user = await prisma.user.create({
      data: {
        name: 'John Doe',
        email: 'john@example.com',
      },
    });

    // Create a session
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

    // Click logout button
    await page.click('text=Logout');

    // Verify user is logged out
    await expect(page.locator('text=Welcome, John Doe')).not.toBeVisible();
    await expect(page.locator('text=Login with Google')).toBeVisible();

    // Verify session was destroyed
    const sessionCookie = await page.context().cookies();
    expect(sessionCookie.find(c => c.name === 'session')).toBeUndefined();
  });

  test('user can add a new email account', async ({ page }) => {
    // Create a test user
    const user = await prisma.user.create({
      data: {
        name: 'John Doe',
        email: 'john@example.com',
      },
    });

    // Create a session
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

    // Mock Google OAuth popup
    const popupPromise = page.waitForEvent('popup');
    await page.click('text=+ Add Account');
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

    // Verify account was added to database
    const connectedAccount = await prisma.connectedEmail.findFirst({
      where: { email: 'new@example.com' },
    });
    expect(connectedAccount).toBeTruthy();
    expect(connectedAccount?.userId).toBe(user.id);
  });

  test('user cannot access dashboard without authentication', async ({ page }) => {
    // Try to access dashboard directly
    await page.goto('/dashboard');

    // Should be redirected to home page
    await expect(page).toHaveURL('/');

    // Should see login button
    await expect(page.locator('text=Login with Google')).toBeVisible();
  });

  test('user session persists after page reload', async ({ page }) => {
    // Create a test user
    const user = await prisma.user.create({
      data: {
        name: 'John Doe',
        email: 'john@example.com',
      },
    });

    // Create a session
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

    // Verify user is logged in
    await expect(page.locator('text=Welcome, John Doe')).toBeVisible();

    // Reload page
    await page.reload();

    // Verify user is still logged in
    await expect(page.locator('text=Welcome, John Doe')).toBeVisible();
  });
}); 