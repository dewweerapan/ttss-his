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

// ──────────────────────────────────────────────
// REG-005: Masterdata API
// ──────────────────────────────────────────────
test.describe('REG-005: Masterdata API', () => {
  test('should GET /api/masterdata/icd10', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/masterdata/icd10`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('should GET /api/masterdata/products', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/masterdata/products`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('should GET /api/masterdata/doctors', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/masterdata/doctors`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('should GET /api/masterdata/divisions', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/masterdata/divisions`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('should return 401 without token on masterdata', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/masterdata/icd10`);
    expect(res.status()).toBe(401);
  });
});

// ──────────────────────────────────────────────
// REG-006: Patient History & Allergy API
// ──────────────────────────────────────────────
test.describe('REG-006: Patient History & Allergy API', () => {
  let patientIdReg6: string;

  test.beforeAll(async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/patients?pageNo=1&pageSize=1`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    patientIdReg6 = (await res.json()).items[0].id;
  });

  test('should GET /api/patients/{id}/history', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/patients/${patientIdReg6}/history`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('should PATCH /api/patients/{id}/allergy', async ({ request }) => {
    const res = await request.patch(`${API_BASE_URL}/api/patients/${patientIdReg6}/allergy`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        allergies: ['Penicillin', 'Aspirin'],
        allergyNotes: 'ผื่น ลมพิษ',
      },
    });
    expect([200, 204]).toContain(res.status());
  });

  test('should return 401 without token on patient history', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/patients/${patientIdReg6}/history`);
    expect(res.status()).toBe(401);
  });
});

// ──────────────────────────────────────────────
// REG-007: Admin Products CRUD
// ──────────────────────────────────────────────
test.describe('REG-007: Admin Products CRUD', () => {
  let adminToken: string;
  let productId: string;

  test.beforeAll(async ({ request }) => {
    const res = await request.post(`${API_BASE_URL}/api/auth/login`, {
      data: { username: TEST_USERS.admin.username, password: TEST_USERS.admin.password },
    });
    expect(res.ok()).toBeTruthy();
    adminToken = (await res.json()).accessToken;
  });

  test('should POST /api/admin/products', async ({ request }) => {
    const res = await request.post(`${API_BASE_URL}/api/admin/products`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        code: `DRUG-E2E-${Date.now()}`,
        name: 'Amoxicillin 500mg (E2E Test)',
        unit: 'เม็ด',
        type: 1,
        price: 5.0,
        costPrice: 2.5,
        stockQuantity: 100,
        reorderLevel: 20,
      },
    });
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    productId = body.id;
    expect(productId).toBeTruthy();
  });

  test('should PATCH /api/admin/products/{id}', async ({ request }) => {
    if (!productId) test.skip();
    const res = await request.patch(`${API_BASE_URL}/api/admin/products/${productId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { name: 'Amoxicillin 500mg (Updated)', price: 6.0 },
    });
    expect([200, 204]).toContain(res.status());
  });

  test('should PATCH /api/admin/products/{id}/stock', async ({ request }) => {
    if (!productId) test.skip();
    const res = await request.patch(`${API_BASE_URL}/api/admin/products/${productId}/stock`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { stockQuantity: 150 },
    });
    expect([200, 204]).toContain(res.status());
  });

  test('should DELETE /api/admin/products/{id}', async ({ request }) => {
    if (!productId) test.skip();
    const res = await request.delete(`${API_BASE_URL}/api/admin/products/${productId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect([200, 204]).toContain(res.status());
  });
});

// ──────────────────────────────────────────────
// REG-008: Admin Stock Management
// ──────────────────────────────────────────────
test.describe('REG-008: Admin Stock Management', () => {
  let adminToken: string;

  test.beforeAll(async ({ request }) => {
    const res = await request.post(`${API_BASE_URL}/api/auth/login`, {
      data: { username: TEST_USERS.admin.username, password: TEST_USERS.admin.password },
    });
    expect(res.ok()).toBeTruthy();
    adminToken = (await res.json()).accessToken;
  });

  test('should GET /api/admin/stock/low', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/admin/stock/low`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('should POST /api/admin/stock/receive', async ({ request }) => {
    const prodRes = await request.get(`${API_BASE_URL}/api/admin/products`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const prodBody = await prodRes.json();
    const items = Array.isArray(prodBody) ? prodBody : (prodBody.items ?? []);
    if (items.length === 0) return;

    const res = await request.post(`${API_BASE_URL}/api/admin/stock/receive`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        productId: items[0].id,
        quantity: 50,
        lotNumber: `LOT-${Date.now()}`,
        expiryDate: new Date(Date.now() + 365 * 86400000).toISOString(),
        supplier: 'บริษัทยา ABC',
        costPrice: 2.5,
      },
    });
    expect([200, 201]).toContain(res.status());
  });

  test('should return 401 without token on stock/low', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/admin/stock/low`);
    expect(res.status()).toBe(401);
  });
});

// ──────────────────────────────────────────────
// REG-009: Admin Divisions CRUD
// ──────────────────────────────────────────────
test.describe('REG-009: Admin Divisions CRUD', () => {
  let adminToken: string;
  let divisionId: string;

  test.beforeAll(async ({ request }) => {
    const res = await request.post(`${API_BASE_URL}/api/auth/login`, {
      data: { username: TEST_USERS.admin.username, password: TEST_USERS.admin.password },
    });
    expect(res.ok()).toBeTruthy();
    adminToken = (await res.json()).accessToken;
  });

  test('should POST /api/admin/divisions', async ({ request }) => {
    const uid = Date.now();
    const res = await request.post(`${API_BASE_URL}/api/admin/divisions`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        id: `div-e2e-${uid}`,
        code: `E2E${uid.toString().slice(-6)}`,
        name: 'แผนกทดสอบ E2E',
        type: 1,
      },
    });
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    divisionId = body.id;
    expect(divisionId).toBeTruthy();
  });

  test('should PATCH /api/admin/divisions/{id}', async ({ request }) => {
    if (!divisionId) test.skip();
    const res = await request.patch(`${API_BASE_URL}/api/admin/divisions/${divisionId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { name: 'แผนกทดสอบ E2E (Updated)' },
    });
    expect([200, 204]).toContain(res.status());
  });
});

// ──────────────────────────────────────────────
// REG-010: Admin Users CRUD
// ──────────────────────────────────────────────
test.describe('REG-010: Admin Users CRUD', () => {
  let adminToken: string;
  let createdUserId: string;

  test.beforeAll(async ({ request }) => {
    const res = await request.post(`${API_BASE_URL}/api/auth/login`, {
      data: { username: TEST_USERS.admin.username, password: TEST_USERS.admin.password },
    });
    expect(res.ok()).toBeTruthy();
    adminToken = (await res.json()).accessToken;
  });

  test('should POST /api/admin/users (create)', async ({ request }) => {
    const res = await request.post(`${API_BASE_URL}/api/admin/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        username: `e2e_crud_${Date.now()}`,
        password: 'TestPass1!',
        firstName: 'E2E',
        lastName: 'CRUD',
        roleId: 'role-nurse',
      },
    });
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    createdUserId = body.id;
    expect(createdUserId).toBeTruthy();
  });

  test('should PATCH /api/admin/users/{id}', async ({ request }) => {
    if (!createdUserId) test.skip();
    const res = await request.patch(`${API_BASE_URL}/api/admin/users/${createdUserId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { firstName: 'E2E-Updated' },
    });
    expect([200, 204]).toContain(res.status());
  });

  test('should DELETE /api/admin/users/{id}', async ({ request }) => {
    if (!createdUserId) test.skip();
    const res = await request.delete(`${API_BASE_URL}/api/admin/users/${createdUserId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect([200, 204]).toContain(res.status());
  });
});
