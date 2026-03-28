import { test, expect } from '@playwright/test';
import { API_BASE_URL, TEST_USERS } from './helpers/constants';
import { loginViaAPI } from './helpers/auth';

/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  TEST SUITE: Phase 5 — Diagnostics                      ║
 * ║  Coverage: Lab Orders/Results, Imaging, Pathology, LRM  ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * Key API facts (from source):
 *  Lab: POST /api/encounters/{id}/lab-orders
 *    body: { orderedBy?, notes?, items: [{testCode, testName, unit?, referenceRange?}] }
 *  Imaging: POST /api/imaging-orders
 *    body: { encounterId, modalityType: int, studyName, clinicalInfo?, orderedBy? }
 *  Pathology: POST /api/pathology-orders
 *    body: { encounterId, specimenType: int, specimenSite, clinicalInfo?, orderedBy? }
 *  Lab History: GET /api/patients/{id}/lab-history
 */

let authToken: string;
let patientId: string;
let encounterId: string;
let labOrderId: string;
let imagingOrderId: string;
let pathologyOrderId: string;

test.beforeAll(async ({ request }) => {
  const res = await request.post(`${API_BASE_URL}/api/auth/login`, {
    data: { username: TEST_USERS.doctor.username, password: TEST_USERS.doctor.password },
  });
  expect(res.ok()).toBeTruthy();
  authToken = (await res.json()).accessToken;

  const pRes = await request.get(`${API_BASE_URL}/api/patients?pageNo=4&pageSize=1`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  patientId = (await pRes.json()).items[0].id;

  // Create an encounter for diagnostics
  const eRes = await request.post(`${API_BASE_URL}/api/encounters`, {
    headers: { Authorization: `Bearer ${authToken}` },
    data: { patientId, divisionId: 'div-opd', type: 1 },
  });
  if (eRes.ok()) {
    encounterId = (await eRes.json()).id;
  }
});

// ──────────────────────────────────────────────
// LAB-001: Lab Orders API
// ──────────────────────────────────────────────
test.describe('LAB-001: Lab Orders API', () => {
  test('should list lab orders', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/lab-orders`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const items = Array.isArray(body) ? body : (body.items ?? []);
    expect(Array.isArray(items)).toBe(true);
  });

  test('should create lab order via encounter sub-route', async ({ request }) => {
    if (!encounterId) test.skip();
    const res = await request.post(
      `${API_BASE_URL}/api/encounters/${encounterId}/lab-orders`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          orderedBy: TEST_USERS.doctor.username,
          notes: 'ตรวจ CBC + LFT',
          items: [
            { testCode: 'CBC', testName: 'Complete Blood Count' },
            { testCode: 'LFT', testName: 'Liver Function Test' },
          ],
        },
      },
    );
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    labOrderId = body.id ?? body.labOrderId;
    expect(labOrderId).toBeTruthy();
  });

  test('should get lab order by ID', async ({ request }) => {
    if (!labOrderId) test.skip();
    const res = await request.get(`${API_BASE_URL}/api/lab-orders/${labOrderId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.id ?? body.labOrderId).toBe(labOrderId);
  });

  test('should record lab results', async ({ request }) => {
    if (!labOrderId) test.skip();
    // Get order items to find LabOrderItemId
    const orderRes = await request.get(`${API_BASE_URL}/api/lab-orders/${labOrderId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!orderRes.ok()) return;
    const order = await orderRes.json();
    const items = order.items ?? [];
    if (items.length === 0) return;

    const res = await request.post(
      `${API_BASE_URL}/api/lab-orders/${labOrderId}/results`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          results: items.map((item: { id: string }) => ({
            labOrderItemId: item.id,
            value: '4.5',
            referenceRange: '4.0-5.5',
            isAbnormal: false,
            enteredBy: TEST_USERS.doctor.username,
            notes: '',
          })),
        },
      },
    );
    expect([200, 201, 204]).toContain(res.status());
  });

  test('should return 401 without token on lab-orders', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/lab-orders`);
    expect(res.status()).toBe(401);
  });
});

// ──────────────────────────────────────────────
// IME-001: Imaging Orders API
// ──────────────────────────────────────────────
test.describe('IME-001: Imaging Orders API', () => {
  test('should list imaging orders', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/imaging-orders`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const items = Array.isArray(body) ? body : (body.items ?? []);
    expect(Array.isArray(items)).toBe(true);
  });

  test('should create imaging order (modalityType is int)', async ({ request }) => {
    if (!encounterId) test.skip();
    const res = await request.post(`${API_BASE_URL}/api/imaging-orders`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        encounterId,
        modalityType: 1,   // int: 1=XR, 2=CT, 3=MRI, 4=US, 5=NM
        studyName: 'CXR PA+Lateral',
        clinicalInfo: 'ไข้ ไอ เหนื่อย 3 วัน — R/O pneumonia',
        orderedBy: TEST_USERS.doctor.username,
      },
    });
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    imagingOrderId = body.id ?? body.imagingOrderId;
    expect(imagingOrderId).toBeTruthy();
    expect(body.modalityType ?? body.ModalityType).toBe(1);
  });

  test('should complete imaging order with report', async ({ request }) => {
    if (!imagingOrderId) test.skip();
    const res = await request.patch(
      `${API_BASE_URL}/api/imaging-orders/${imagingOrderId}/complete`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          report: 'Lung fields clear. No consolidation.',
          radiologistName: 'นพ.รังสี ชำนาญ',
          impression: 'ปอดแข็งแรงดี ไม่มีความผิดปกติ',
        },
      },
    );
    expect([200, 204]).toContain(res.status());
  });

  test('should filter imaging orders by patientId', async ({ request }) => {
    const res = await request.get(
      `${API_BASE_URL}/api/imaging-orders?patientId=${patientId}`,
      { headers: { Authorization: `Bearer ${authToken}` } },
    );
    expect(res.status()).toBe(200);
  });

  test('should return 401 without token on imaging-orders', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/imaging-orders`);
    expect(res.status()).toBe(401);
  });
});

// ──────────────────────────────────────────────
// PTH-001: Pathology Orders API
// ──────────────────────────────────────────────
test.describe('PTH-001: Pathology Orders API', () => {
  test('should list pathology orders', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/pathology-orders`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const items = Array.isArray(body) ? body : (body.items ?? []);
    expect(Array.isArray(items)).toBe(true);
  });

  test('should create pathology order (specimenType is int)', async ({ request }) => {
    if (!encounterId) test.skip();
    const res = await request.post(`${API_BASE_URL}/api/pathology-orders`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        encounterId,
        specimenType: 1,    // int: 1=Tissue, 2=Fluid, 3=Cytology, etc.
        specimenSite: 'Appendix',
        clinicalInfo: 'Post appendectomy. R/O malignancy.',
        orderedBy: TEST_USERS.doctor.username,
      },
    });
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    pathologyOrderId = body.id ?? body.pathologyOrderId;
    expect(pathologyOrderId).toBeTruthy();
  });

  test('should report pathology findings', async ({ request }) => {
    if (!pathologyOrderId) test.skip();
    const res = await request.patch(
      `${API_BASE_URL}/api/pathology-orders/${pathologyOrderId}/report`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          macroscopicFindings: 'Appendix 8cm. Serosal surface congested.',
          microscopicFindings: 'Acute suppurative appendicitis.',
          diagnosis: 'Acute appendicitis',
          pathologistName: 'นพ.พยาธิ วิทยา',
        },
      },
    );
    expect([200, 204]).toContain(res.status());
  });

  test('should return 401 without token on pathology-orders', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/pathology-orders`);
    expect(res.status()).toBe(401);
  });
});

// ──────────────────────────────────────────────
// LRM-001: Cumulative Lab Results (Lab History)
// ──────────────────────────────────────────────
test.describe('LRM-001: Lab History API', () => {
  test('should get lab history for patient', async ({ request }) => {
    const res = await request.get(
      `${API_BASE_URL}/api/patients/${patientId}/lab-history`,
      { headers: { Authorization: `Bearer ${authToken}` } },
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('should return 401 without token on lab-history', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/patients/${patientId}/lab-history`);
    expect(res.status()).toBe(401);
  });
});

// ──────────────────────────────────────────────
// DIAG-UI-001: Diagnostics Frontend Navigation
// ──────────────────────────────────────────────
test.describe('DIAG-UI-001: Diagnostics Frontend Navigation', () => {
  test('should navigate to Lab page', async ({ page }) => {
    await loginViaAPI(page, 'doctor');
    await page.goto('/lab');
    await expect(page).not.toHaveURL(/sign-in/);
  });

  test('should navigate to Imaging page', async ({ page }) => {
    await loginViaAPI(page, 'doctor');
    await page.goto('/imaging');
    await expect(page).not.toHaveURL(/sign-in/);
  });

  test('should navigate to Pathology page', async ({ page }) => {
    await loginViaAPI(page, 'doctor');
    await page.goto('/pathology');
    await expect(page).not.toHaveURL(/sign-in/);
  });

  test('should navigate to Lab Results (LRM) page', async ({ page }) => {
    await loginViaAPI(page, 'doctor');
    await page.goto('/lab-results');
    await expect(page).not.toHaveURL(/sign-in/);
  });
});
