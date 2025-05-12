import { test, expect } from '@playwright/test';
import { createUserSession } from '~/utils/session.server';
import { prisma } from '~/db.server';

test.describe('Category Management', () => {
  test.beforeEach(async ({ page }) => {
    // Clean up database
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();

    // Create test user
    const user = await prisma.user.create({
      data: {
        name: 'John Doe',
        email: 'john@example.com',
      },
    });

    // Create test category
    await prisma.category.create({
      data: {
        name: 'Newsletter',
        color: '#0000FF',
        userId: user.id,
      },
    });

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

  test('user can create new category', async ({ page }) => {
    // Click add category button
    await page.click('[data-testid="add-category-button"]');

    // Fill category form
    await page.fill('[data-testid="category-name-input"]', 'Promotion');
    await page.fill('[data-testid="category-color-input"]', '#FF0000');

    // Submit form
    await page.click('text=Create Category');

    // Verify category is created
    await expect(page.locator('text=Promotion')).toBeVisible();

    // Verify database update
    const category = await prisma.category.findFirst({
      where: { name: 'Promotion' },
    });
    expect(category).toBeTruthy();
    expect(category?.color).toBe('#FF0000');
  });

  test('user cannot create duplicate category', async ({ page }) => {
    // Click add category button
    await page.click('[data-testid="add-category-button"]');

    // Fill category form with existing name
    await page.fill('[data-testid="category-name-input"]', 'Newsletter');
    await page.fill('[data-testid="category-color-input"]', '#FF0000');

    // Submit form
    await page.click('text=Create Category');

    // Verify error message
    await expect(page.locator('text=Category name already exists')).toBeVisible();

    // Verify no new category was created
    const categories = await prisma.category.findMany({
      where: { name: 'Newsletter' },
    });
    expect(categories.length).toBe(1);
  });

  test('user can edit category', async ({ page }) => {
    // Click edit button for Newsletter category
    await page.click('[data-testid="edit-category-button"]');

    // Update category
    await page.fill('[data-testid="category-name-input"]', 'Weekly Newsletter');
    await page.fill('[data-testid="category-color-input"]', '#00FF00');

    // Submit form
    await page.click('text=Save Changes');

    // Verify category is updated
    await expect(page.locator('text=Weekly Newsletter')).toBeVisible();

    // Verify database update
    const category = await prisma.category.findFirst({
      where: { name: 'Weekly Newsletter' },
    });
    expect(category).toBeTruthy();
    expect(category?.color).toBe('#00FF00');
  });

  test('user can delete category', async ({ page }) => {
    // Click delete button for Newsletter category
    await page.click('[data-testid="delete-category-button"]');

    // Confirm deletion
    await page.click('text=Confirm');

    // Verify category is removed
    await expect(page.locator('text=Newsletter')).not.toBeVisible();

    // Verify database update
    const category = await prisma.category.findFirst({
      where: { name: 'Newsletter' },
    });
    expect(category).toBeNull();
  });

  test('user can reorder categories', async ({ page }) => {
    // Create another category
    await prisma.category.create({
      data: {
        name: 'Promotion',
        color: '#FF0000',
        userId: 1,
      },
    });

    // Refresh page to see new category
    await page.reload();

    // Drag and drop to reorder
    const source = page.locator('text=Newsletter');
    const target = page.locator('text=Promotion');
    await source.dragTo(target);

    // Verify order in database
    const categories = await prisma.category.findMany({
      orderBy: { order: 'asc' },
    });
    expect(categories[0].name).toBe('Promotion');
    expect(categories[1].name).toBe('Newsletter');
  });

  test('user can filter emails by category', async ({ page }) => {
    // Create test email
    await prisma.email.create({
      data: {
        messageId: 'msg1',
        subject: 'Weekly Update',
        from: 'newsletter@example.com',
        to: 'john@example.com',
        date: new Date(),
        snippet: 'Check out our latest updates',
        categoryId: 1,
        userId: 1,
      },
    });

    // Click on Newsletter category
    await page.click('text=Newsletter');

    // Verify only emails in this category are shown
    await expect(page.locator('text=Weekly Update')).toBeVisible();

    // Create another category and email
    const promotionCategory = await prisma.category.create({
      data: {
        name: 'Promotion',
        color: '#FF0000',
        userId: 1,
      },
    });

    await prisma.email.create({
      data: {
        messageId: 'msg2',
        subject: 'Special Offer',
        from: 'marketing@example.com',
        to: 'john@example.com',
        date: new Date(),
        snippet: '50% off on all items',
        categoryId: promotionCategory.id,
        userId: 1,
      },
    });

    // Click on Promotion category
    await page.click('text=Promotion');

    // Verify only emails in this category are shown
    await expect(page.locator('text=Weekly Update')).not.toBeVisible();
    await expect(page.locator('text=Special Offer')).toBeVisible();
  });
}); 