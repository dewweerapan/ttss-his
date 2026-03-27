import { test, expect } from '@playwright/test';
import { TEST_USERS, SEL } from './helpers/constants';
import { loginViaUI } from './helpers/auth';

/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  TEST SUITE: Authentication Flow                        ║
 * ║  Phase: 1 — Core Foundation                             ║
 * ║  Coverage: Login (all roles), Invalid creds, Logout     ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * Preconditions:
 *   - API server running on :5150 with seeded database
 *   - Frontend running on :3000
 *   - 5 seeded users (doctor1, doctor2, nurse1, pharmacist1, finance1)
 */

test.describe('AUTH-001: Sign-in Page Rendering', () => {
  test('should display login form with all required elements', async ({ page }) => {
    await page.goto('/sign-in');

    // Verify page title & subtitle
    await expect(page.locator('h2:has-text("TTSS HIS")')).toBeVisible();
    await expect(page.locator('text=ระบบสารสนเทศโรงพยาบาล')).toBeVisible();

    // Verify form fields exist
    await expect(page.locator(SEL.usernameInput)).toBeVisible();
    await expect(page.locator(SEL.passwordInput)).toBeVisible();
    await expect(page.locator(SEL.loginButton)).toBeVisible();
    await expect(page.locator(SEL.loginButton)).toBeEnabled();

    // Verify hint credentials are displayed
    await expect(page.locator('text=doctor1/doctor1234')).toBeVisible();
  });

  test('should redirect root "/" to "/sign-in"', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/sign-in/);
  });
});

test.describe('AUTH-002: Successful Login — All Roles', () => {
  const roles: Array<{ key: keyof typeof TEST_USERS; label: string }> = [
    { key: 'doctor', label: 'Doctor' },
    { key: 'nurse', label: 'Nurse' },
    { key: 'pharmacist', label: 'Pharmacist' },
    { key: 'finance', label: 'Finance' },
  ];

  for (const { key, label } of roles) {
    test(`should login as ${label} and reach dashboard`, async ({ page }) => {
      const user = TEST_USERS[key];

      await page.goto('/sign-in');
      await page.fill(SEL.usernameInput, user.username);
      await page.fill(SEL.passwordInput, user.password);
      await page.click(SEL.loginButton);

      // Verify redirect to dashboard
      await expect(page).toHaveURL('/dashboard', { timeout: 10_000 });

      // Verify welcome message contains user info
      await expect(page.locator(SEL.welcomeText)).toBeVisible();

      // Verify token was stored
      const token = await page.evaluate(() => localStorage.getItem('his_token'));
      expect(token).toBeTruthy();
      expect(token!.split('.').length).toBe(3); // JWT format: header.payload.signature
    });
  }
});

test.describe('AUTH-003: Login via Enter Key', () => {
  test('should submit form when pressing Enter in password field', async ({ page }) => {
    const user = TEST_USERS.nurse;
    await page.goto('/sign-in');

    await page.fill(SEL.usernameInput, user.username);
    await page.fill(SEL.passwordInput, user.password);
    await page.press(SEL.passwordInput, 'Enter');

    await expect(page).toHaveURL('/dashboard', { timeout: 10_000 });
  });
});

test.describe('AUTH-004: Invalid Credentials', () => {
  test('should show error for wrong password', async ({ page }) => {
    await page.goto('/sign-in');
    await page.fill(SEL.usernameInput, 'doctor1');
    await page.fill(SEL.passwordInput, 'wrongpassword');
    await page.click(SEL.loginButton);

    await expect(page.locator(SEL.loginError)).toBeVisible({ timeout: 5_000 });

    // Should stay on sign-in page
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('should show error for non-existent user', async ({ page }) => {
    await page.goto('/sign-in');
    await page.fill(SEL.usernameInput, 'nonexistent_user');
    await page.fill(SEL.passwordInput, 'any_password');
    await page.click(SEL.loginButton);

    await expect(page.locator(SEL.loginError)).toBeVisible({ timeout: 5_000 });
  });

  test('should show error for empty credentials', async ({ page }) => {
    await page.goto('/sign-in');
    await page.click(SEL.loginButton);

    // API returns BadRequest for empty fields — frontend should show error
    await expect(page.locator(SEL.loginError).or(page.locator(SEL.connectionError))).toBeVisible({
      timeout: 5_000,
    });
  });
});

test.describe('AUTH-005: Logout', () => {
  test('should logout and redirect to sign-in', async ({ page }) => {
    // Login first
    await loginViaUI(page, 'doctor');

    // Click logout
    await page.click(SEL.logoutButton);

    // Should redirect to sign-in
    await expect(page).toHaveURL(/\/sign-in/);

    // Token should be cleared
    const token = await page.evaluate(() => localStorage.getItem('his_token'));
    expect(token).toBeNull();
  });
});

test.describe('AUTH-006: Auth Guard — Protected Routes', () => {
  test('should redirect to sign-in when accessing /dashboard without token', async ({ page }) => {
    // Clear any stored token
    await page.addInitScript(() => {
      window.localStorage.removeItem('his_token');
      window.localStorage.removeItem('his_user');
    });

    await page.goto('/dashboard');

    // Should redirect to sign-in
    await expect(page).toHaveURL(/\/sign-in/, { timeout: 10_000 });
  });
});
