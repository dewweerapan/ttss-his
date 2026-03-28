import { test, expect } from '@playwright/test';
import { API_BASE_URL, TEST_USERS, SEED_DATA } from './helpers/constants';
import { loginViaAPI } from './helpers/auth';

/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  TEST SUITE: Phase 1 — Patient Registration (REG)       ║
 * ║  Coverage: Registration UI, Divisions, Doctors          ║
 * ╚══════════════════════════════════════════════════════════╝
 */

let authToken: string;

test.beforeAll(async ({ request }) => {
  const res = await request.post(`${API_BASE_URL}/api/auth/login`, {
    data: { username: TEST_USERS.nurse.username, password: TEST_USERS.nurse.password },
  });
  expect(res.ok()).toBeTruthy();
  authToken = (await res.json()).accessToken;
});

// ──────────────────────────────────────────────
// REG-001: Registration Page UI
// ──────────────────────────────────────────────
test.describe('REG-001: Registration Page UI', () => {
  test('should render registration page after login', async ({ page }) => {
    await loginViaAPI(page, 'nurse');
    await page.goto('/registration');
    await expect(page).not.toHaveURL(/sign-in/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('should redirect unauthenticated user to sign-in', async ({ page }) => {
    await page.goto('/registration');
    await expect(page).toHaveURL(/sign-in/);
  });

  test('registration page loads with content', async ({ page }) => {
    await loginViaAPI(page, 'nurse');
    await page.goto('/registration');
    await page.waitForLoadState('networkidle');
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(10);
  });
});

// ──────────────────────────────────────────────
// REG-002: Admin Divisions API
// ──────────────────────────────────────────────
test.describe('REG-002: Admin Divisions API', () => {
  test('should list divisions via admin endpoint', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/admin/divisions`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const items = Array.isArray(body) ? body : (body.items ?? []);
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThanOrEqual(SEED_DATA.divisions);
  });

  test('should include required fields in division', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/admin/divisions`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const body = await res.json();
    const items = Array.isArray(body) ? body : (body.items ?? []);
    if (items.length > 0) {
      const div = items[0];
      expect(div).toHaveProperty('id');
      expect(div).toHaveProperty('name');
      expect(div).toHaveProperty('code');
      // DivisionId should be a string like "div-gen"
      expect(typeof div.id).toBe('string');
    }
  });

  test('should return 401 without token on admin/divisions', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/admin/divisions`);
    expect(res.status()).toBe(401);
  });
});

// ──────────────────────────────────────────────
// REG-003: Admin Products API
// ──────────────────────────────────────────────
test.describe('REG-003: Admin Products API', () => {
  test('should list products via admin endpoint', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/admin/products`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const items = Array.isArray(body) ? body : (body.items ?? []);
    expect(Array.isArray(items)).toBe(true);
  });

  test('should include required fields in product', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/admin/products`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const body = await res.json();
    const items = Array.isArray(body) ? body : (body.items ?? []);
    if (items.length > 0) {
      const p = items[0];
      expect(p).toHaveProperty('id');
      expect(p).toHaveProperty('name');
    }
  });

  test('should return 401 without token on admin/products', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/admin/products`);
    expect(res.status()).toBe(401);
  });
});

// ──────────────────────────────────────────────
// REG-004: Patient HN format
// ──────────────────────────────────────────────
test.describe('REG-004: Patient HN Format', () => {
  test('HN should start with "HN" followed by digits', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/patients?pageNo=1&pageSize=1`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const body = await res.json();
    const hn = body.items[0].hn;
    expect(hn).toMatch(/^HN\d+/);
  });

  test('should create patient with valid HN', async ({ request }) => {
    const res = await request.post(`${API_BASE_URL}/api/patients`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        preName: 'นาย',
        firstName: 'ทดสอบ',
        lastName: 'สเปก',
        firstNameEn: 'Test',
        lastNameEn: 'Spec',
        gender: 1,
        birthdate: '1990-05-15',
        citizenNo: `2${Date.now().toString().slice(-12)}`, // unique 13-digit
        phoneNumber: '0891234567',
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.firstName).toBe('ทดสอบ');
    expect(body.hn).toMatch(/^HN\d+/);
    expect(body.id).toBeTruthy();
  });
});
