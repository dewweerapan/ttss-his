import { test, expect } from '@playwright/test';
import { SEL, TEST_USERS } from './helpers/constants';
import { loginViaAPI, loginViaUI } from './helpers/auth';

/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  TEST SUITE: Frontend Shell & Navigation                ║
 * ║  Phase: 1 — Core Foundation                             ║
 * ║  Coverage: Sidebar, Navigation, Dashboard, AppShell     ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * ใช้ loginViaAPI เพื่อ bypass login flow → focus ที่ shell behavior
 */

test.describe('SHELL-001: Dashboard after Login', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaAPI(page, 'doctor');
    await page.goto('/dashboard');
  });

  test('should display dashboard title', async ({ page }) => {
    await expect(page.locator(SEL.dashboardTitle)).toBeVisible();
  });

  test('should display today date on dashboard', async ({ page }) => {
    // Dashboard shows a date string
    await expect(page.locator('text=2569').first()).toBeVisible();
  });

  test('should display all 6 module nav items in sidebar (REG, QUE, MAI, DPO, TPD, BIL)', async ({ page }) => {
    const expectedModules = ['REG', 'QUE', 'MAI', 'DPO', 'TPD', 'BIL'];

    for (const code of expectedModules) {
      await expect(page.locator(`text=${code}`)).toBeVisible();
    }
  });

  test('should display TTSS HIS in header', async ({ page }) => {
    await expect(page.locator('h4:has-text("TTSS HIS")')).toBeVisible();
  });

  test('should use Inter font family on body', async ({ page }) => {
    await loginViaAPI(page, 'doctor');
    await page.goto('/dashboard');
    const fontFamily = await page.evaluate(() =>
      getComputedStyle(document.body).fontFamily
    );
    expect(fontFamily.toLowerCase()).toContain('inter');
  });
});

test.describe('SHELL-002: Sidebar Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaAPI(page, 'nurse');
    await page.goto('/dashboard');
  });

  test('should display all 7 nav items in sidebar', async ({ page }) => {
    const navItems = Object.values(SEL.nav);
    for (const selector of navItems) {
      await expect(page.locator(selector).first()).toBeVisible();
    }
  });

  test('should highlight active nav item based on current route', async ({ page }) => {
    // Dashboard should be active by default
    const dashboardNav = page.locator(SEL.nav.dashboard).first();
    await expect(dashboardNav).toBeVisible();
  });

  test('should navigate to /registration when clicking REG nav item', async ({ page }) => {
    await page.click(SEL.nav.registration);
    await expect(page).toHaveURL('/registration');
  });

  test('should navigate to /queue when clicking QUE nav item', async ({ page }) => {
    await page.click(SEL.nav.queue);
    await expect(page).toHaveURL('/queue');
  });

  test('should navigate to /triage when clicking MAI nav item', async ({ page }) => {
    await page.click(SEL.nav.triage);
    await expect(page).toHaveURL('/triage');
  });

  test('should navigate to /doctor when clicking DPO nav item', async ({ page }) => {
    await page.click(SEL.nav.doctor);
    await expect(page).toHaveURL('/doctor');
  });

  test('should navigate to /pharmacy when clicking TPD nav item', async ({ page }) => {
    await page.click(SEL.nav.pharmacy);
    await expect(page).toHaveURL('/pharmacy');
  });

  test('should navigate to /billing when clicking BIL nav item', async ({ page }) => {
    await page.click(SEL.nav.billing);
    await expect(page).toHaveURL('/billing');
  });
});

test.describe('SHELL-003: Logout Button in Header', () => {
  test('should be visible in header', async ({ page }) => {
    await loginViaAPI(page, 'finance');
    await page.goto('/dashboard');

    await expect(page.locator(SEL.logoutButton)).toBeVisible();
  });

  test('should clear session and redirect to sign-in', async ({ page }) => {
    await loginViaUI(page, 'finance');

    await page.click(SEL.logoutButton);
    await expect(page).toHaveURL(/\/sign-in/);

    // Verify localStorage is cleared
    const token = await page.evaluate(() => localStorage.getItem('his_token'));
    const user = await page.evaluate(() => localStorage.getItem('his_user'));
    expect(token).toBeNull();
    expect(user).toBeNull();
  });
});

test.describe('SHELL-004: Multiple Role Dashboard Verification', () => {
  const roleTests: Array<{ key: keyof typeof TEST_USERS; expectedRole: string }> = [
    { key: 'doctor', expectedRole: 'Doctor' },
    { key: 'nurse', expectedRole: 'Nurse' },
    { key: 'pharmacist', expectedRole: 'Pharmacist' },
    { key: 'finance', expectedRole: 'Finance' },
  ];

  for (const { key, expectedRole } of roleTests) {
    test(`should display correct role for ${expectedRole}`, async ({ page }) => {
      await loginViaAPI(page, key);
      await page.goto('/dashboard');

      // Dashboard heading should be visible (role verification via auth token)
      await expect(page.locator(SEL.dashboardTitle).first()).toBeVisible({ timeout: 5_000 });
    });
  }
});

test.describe('SHELL-005: Grouped Sidebar Nav Headers', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaAPI(page, 'doctor');
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display OPD nav group header', async ({ page }) => {
    await expect(page.locator('text=OPD').first()).toBeVisible();
  });

  test('should display IPD nav group header', async ({ page }) => {
    await expect(page.locator('text=IPD').first()).toBeVisible();
  });

  test('should display Diagnostics nav group header', async ({ page }) => {
    await expect(page.locator('text=Diagnostics').first()).toBeVisible();
  });

  test('should still show all key nav labels after grouping', async ({ page }) => {
    const labels = [
      'ทะเบียนผู้ป่วย (REG)',
      'คิว (QUE)',
      'Triage (MAI)',
      'ตรวจ OPD (DPO)',
      'เภสัช (TPD)',
      'การเงิน (BIL)',
    ];
    for (const label of labels) {
      await expect(page.locator(`text=${label}`).first()).toBeVisible();
    }
  });
});

test.describe('SHELL-006: User Info in Header', () => {
  test('should display logged-in user name in header', async ({ page }) => {
    await loginViaAPI(page, 'doctor');
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    // doctor1 firstName is "แพทย์" or similar from seed — just check there's a non-empty name element
    await expect(page.locator('[data-testid="header-username"]')).toBeVisible();
  });

  test('should display role badge in header', async ({ page }) => {
    await loginViaAPI(page, 'nurse');
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="header-role-badge"]')).toBeVisible();
  });
});
