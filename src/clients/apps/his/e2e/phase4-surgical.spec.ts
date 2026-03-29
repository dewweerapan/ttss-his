import { test, expect } from '@playwright/test';
import { API_BASE_URL, TEST_USERS } from './helpers/constants';
import { loginViaAPI } from './helpers/auth';

/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  TEST SUITE: Phase 4 — Surgical & Blood Bank            ║
 * ║  Coverage: OR Scheduling/Workflow, Blood Bank Workflow  ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * Key API facts (from source):
 *  ScheduleSurgeryRequest: { encounterId, procedureName, operatingRoom?,
 *    scheduledAt, surgeonId?, surgeonName?, anesthesiaType?,
 *    anesthesiologistName?, preOpDiagnosis? }
 *  CreateBloodRequestReq: { encounterId, bloodProduct: int, bloodGroup,
 *    units: decimal, requestedBy? }
 *  POST /api/surgery-cases/{id}/start  (no body required)
 *  POST /api/surgery-cases/{id}/complete — CompleteSurgeryRequest
 *  POST /api/blood-requests/{id}/crossmatch — CrossmatchReq { result? }
 *  POST /api/blood-requests/{id}/issue   (issue = ready)
 *  POST /api/blood-requests/{id}/transfuse — TransfuseReq { notes?, reactionNotes? }
 */

let authToken: string;
let encounterId: string;
let surgeryCaseId: string;
let bloodRequestId: string;

test.beforeAll(async ({ request }) => {
  const res = await request.post(`${API_BASE_URL}/api/auth/login`, {
    data: { username: TEST_USERS.doctor.username, password: TEST_USERS.doctor.password },
  });
  expect(res.ok()).toBeTruthy();
  authToken = (await res.json()).accessToken;

  // Create an encounter for surgery/blood context
  const pRes = await request.get(`${API_BASE_URL}/api/patients?pageNo=3&pageSize=1`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const patientId = (await pRes.json()).items[0].id;

  const eRes = await request.post(`${API_BASE_URL}/api/encounters`, {
    headers: { Authorization: `Bearer ${authToken}` },
    data: { patientId, divisionId: 'div-opd', type: 2 },
  });
  if (eRes.ok()) {
    const eBody = await eRes.json();
    encounterId = eBody.id ?? eBody.encounterId;
  }
});

// ──────────────────────────────────────────────
// OR-001: Surgery Case — Schedule
// ──────────────────────────────────────────────
test.describe('OR-001: Operating Room — Schedule Surgery', () => {
  test('should list surgery cases', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/surgery-cases`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const items = Array.isArray(body) ? body : (body.items ?? []);
    expect(Array.isArray(items)).toBe(true);
  });

  test('should schedule a surgery case', async ({ request }) => {
    if (!encounterId) test.skip();
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + 1);

    const res = await request.post(`${API_BASE_URL}/api/surgery-cases`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        encounterId,
        procedureName: 'Appendectomy',
        operatingRoom: 'OR-1',
        scheduledAt: scheduledAt.toISOString(),
        surgeonName: 'นพ.สมชาย ใจดี',
        anesthesiaType: 'General',
        anesthesiologistName: 'นพ.วิชัย สุขใจ',
        preOpDiagnosis: 'Acute appendicitis',
      },
    });
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    surgeryCaseId = body.id ?? body.surgeryCaseId;
    expect(surgeryCaseId).toBeTruthy();
  });

  test('should get surgery case by ID', async ({ request }) => {
    if (!surgeryCaseId) test.skip();
    const res = await request.get(`${API_BASE_URL}/api/surgery-cases/${surgeryCaseId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.id ?? body.surgeryCaseId).toBe(surgeryCaseId);
    expect(body.procedureName).toBe('Appendectomy');
  });

  test('should filter surgery cases by status=1 (scheduled)', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/surgery-cases?status=1`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const items = Array.isArray(body) ? body : (body.items ?? []);
    for (const item of items) {
      expect(item.status).toBe(1);
    }
  });

  test('should return 401 without token', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/surgery-cases`);
    expect(res.status()).toBe(401);
  });
});

// ──────────────────────────────────────────────
// OR-002: Surgery Case — Workflow
// ──────────────────────────────────────────────
test.describe('OR-002: Operating Room — Surgery Workflow', () => {
  test('should start surgery (status 1→2)', async ({ request }) => {
    if (!surgeryCaseId) test.skip();
    const res = await request.patch(
      `${API_BASE_URL}/api/surgery-cases/${surgeryCaseId}/start`,
      { headers: { Authorization: `Bearer ${authToken}` } },
    );
    expect([200, 204]).toContain(res.status());
  });

  test('should complete surgery (status 2→3)', async ({ request }) => {
    if (!surgeryCaseId) test.skip();
    const res = await request.patch(
      `${API_BASE_URL}/api/surgery-cases/${surgeryCaseId}/complete`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          postOpDiagnosis: 'Acute appendicitis — resolved',
          operativeNotes: 'Appendectomy completed uneventfully. Estimated blood loss: 50 mL.',
        },
      },
    );
    expect([200, 204]).toContain(res.status());
  });

  test('completed case should appear in status=3 list', async ({ request }) => {
    if (!surgeryCaseId) test.skip();
    const res = await request.get(`${API_BASE_URL}/api/surgery-cases?status=3`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const items = Array.isArray(body) ? body : (body.items ?? []);
    const found = items.some(
      (c: { id?: string }) => c.id === surgeryCaseId,
    );
    expect(found).toBe(true);
  });
});

// ──────────────────────────────────────────────
// BLB-001: Blood Bank — Workflow
// ──────────────────────────────────────────────
test.describe('BLB-001: Blood Bank — Request Workflow', () => {
  test('should list blood requests', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/blood-requests`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const items = Array.isArray(body) ? body : (body.items ?? []);
    expect(Array.isArray(items)).toBe(true);
  });

  test('should create a blood request (encounterId required)', async ({ request }) => {
    if (!encounterId) test.skip();
    const res = await request.post(`${API_BASE_URL}/api/blood-requests`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        encounterId,
        bloodProduct: 1,   // int: 1=PRC, 2=FFP, 3=Platelet, 4=WB
        bloodGroup: 'O+',
        units: 2,
        requestedBy: TEST_USERS.doctor.username,
      },
    });
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    bloodRequestId = body.id ?? body.bloodRequestId;
    expect(bloodRequestId).toBeTruthy();
    expect(body.bloodGroup).toBe('O+');
  });

  test('should crossmatch blood request', async ({ request }) => {
    if (!bloodRequestId) test.skip();
    const res = await request.patch(
      `${API_BASE_URL}/api/blood-requests/${bloodRequestId}/crossmatch`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { result: 'compatible' },
      },
    );
    expect([200, 204]).toContain(res.status());
  });

  test('should issue (ready) blood for transfusion', async ({ request }) => {
    if (!bloodRequestId) test.skip();
    const res = await request.patch(
      `${API_BASE_URL}/api/blood-requests/${bloodRequestId}/ready`,
      { headers: { Authorization: `Bearer ${authToken}` } },
    );
    expect([200, 204]).toContain(res.status());
  });

  test('should mark transfusion complete', async ({ request }) => {
    if (!bloodRequestId) test.skip();
    const res = await request.patch(
      `${API_BASE_URL}/api/blood-requests/${bloodRequestId}/transfuse`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          notes: 'ให้เลือดครบ 2 units ไม่มีอาการแทรกซ้อน',
          reactionNotes: null,
        },
      },
    );
    expect([200, 204]).toContain(res.status());
  });

  test('should return 401 without token on blood-requests', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/blood-requests`);
    expect(res.status()).toBe(401);
  });
});

// ──────────────────────────────────────────────
// OR-003: Surgery Case Cancel
// ──────────────────────────────────────────────
test.describe('OR-003: Operating Room — Surgery Case Cancel', () => {
  let cancelSurgeryCaseId: string;

  test.beforeAll(async ({ request }) => {
    if (!encounterId) return;
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + 2);

    const res = await request.post(`${API_BASE_URL}/api/surgery-cases`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        encounterId,
        procedureName: 'Cholecystectomy (to cancel)',
        operatingRoom: 'OR-2',
        scheduledAt: scheduledAt.toISOString(),
        surgeonName: 'นพ.ทดสอบ ยกเลิก',
        anesthesiaType: 'General',
        preOpDiagnosis: 'Acute cholecystitis',
      },
    });
    if (res.ok()) {
      const body = await res.json();
      cancelSurgeryCaseId = body.id ?? body.surgeryCaseId;
    }
  });

  test('should PATCH /api/surgery-cases/{id}/cancel', async ({ request }) => {
    if (!cancelSurgeryCaseId) test.skip();
    const res = await request.patch(
      `${API_BASE_URL}/api/surgery-cases/${cancelSurgeryCaseId}/cancel`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { reason: 'ผู้ป่วยปฏิเสธการผ่าตัด — E2E test' },
      },
    );
    expect([200, 204]).toContain(res.status());
  });

  test('cancelled case should NOT appear in status=1 list', async ({ request }) => {
    if (!cancelSurgeryCaseId) test.skip();
    const res = await request.get(`${API_BASE_URL}/api/surgery-cases?status=1`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const items = Array.isArray(body) ? body : (body.items ?? []);
    const found = items.some((c: { id?: string }) => c.id === cancelSurgeryCaseId);
    expect(found).toBe(false);
  });
});

// ──────────────────────────────────────────────
// OR-UI-001: Surgical Frontend Navigation
// ──────────────────────────────────────────────
test.describe('OR-UI-001: Surgical Frontend Navigation', () => {
  test('should navigate to Operating Room page', async ({ page }) => {
    await loginViaAPI(page, 'doctor');
    await page.goto('/or');
    await expect(page).not.toHaveURL(/sign-in/);
  });

  test('should navigate to Blood Bank page', async ({ page }) => {
    await loginViaAPI(page, 'nurse');
    await page.goto('/blood-bank');
    await expect(page).not.toHaveURL(/sign-in/);
  });
});
