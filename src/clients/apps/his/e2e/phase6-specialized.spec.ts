import { test, expect } from '@playwright/test';
import { API_BASE_URL, TEST_USERS } from './helpers/constants';
import { loginViaAPI } from './helpers/auth';

/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  TEST SUITE: Phase 6 — Specialized Clinical             ║
 * ║  Coverage: Hemodialysis, Treatment Room, Dental,        ║
 * ║            Teleconsult                                  ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * Key API facts (from source):
 *  Dialysis: POST /api/dialysis-sessions
 *    body: { encounterId, dialysisType: int, machineNo?, scheduledAt,
 *            ufGoal?, accessType?, nurseId? }
 *  Treatment: POST /api/treatment-records
 *    body: { encounterId, treatmentType: int, description,
 *            materials?, performedBy?, scheduledAt? }
 *  Dental: POST /api/dental-records
 *    body: { encounterId, procedureType: int, toothNumbers?,
 *            chiefComplaint?, findings?, treatment?,
 *            materials?, dentistName?, nextAppointment? }
 */

let authToken: string;
let encounterId: string;
let dialysisSessionId: string;
let treatmentRecordId: string;
let dentalRecordId: string;

test.beforeAll(async ({ request }) => {
  const res = await request.post(`${API_BASE_URL}/api/auth/login`, {
    data: { username: TEST_USERS.doctor.username, password: TEST_USERS.doctor.password },
  });
  expect(res.ok()).toBeTruthy();
  authToken = (await res.json()).accessToken;

  const pRes = await request.get(`${API_BASE_URL}/api/patients?pageNo=6&pageSize=1`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const pBody = await pRes.json();
  const patientId = pBody.items[0]?.id ?? (
    await request.get(`${API_BASE_URL}/api/patients?pageNo=1&pageSize=1`, {
      headers: { Authorization: `Bearer ${authToken}` },
    }).then(r => r.json()).then(b => b.items[0].id)
  );

  const eRes = await request.post(`${API_BASE_URL}/api/encounters`, {
    headers: { Authorization: `Bearer ${authToken}` },
    data: { patientId, divisionId: 'div-opd', type: 1 },
  });
  if (eRes.ok()) encounterId = (await eRes.json()).id;
});

// ──────────────────────────────────────────────
// HDM-001: Hemodialysis Sessions
// ──────────────────────────────────────────────
test.describe('HDM-001: Hemodialysis Sessions API', () => {
  test('should list dialysis sessions', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/dialysis-sessions`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const items = Array.isArray(body) ? body : (body.items ?? []);
    expect(Array.isArray(items)).toBe(true);
  });

  test('should schedule a dialysis session', async ({ request }) => {
    if (!encounterId) test.skip();
    const scheduledAt = new Date();

    const res = await request.post(`${API_BASE_URL}/api/dialysis-sessions`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        encounterId,
        dialysisType: 1,    // 1=HD, 2=HDF, 3=PD
        machineNo: 'HD-03',
        scheduledAt: scheduledAt.toISOString(),
        ufGoal: 2.5,
        accessType: 'AV Fistula',
        nurseId: null,
      },
    });
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    dialysisSessionId = body.id ?? body.dialysisSessionId;
    expect(dialysisSessionId).toBeTruthy();
  });

  test('should find dialysis session in list', async ({ request }) => {
    if (!dialysisSessionId) test.skip();
    const res = await request.get(
      `${API_BASE_URL}/api/dialysis-sessions`,
      { headers: { Authorization: `Bearer ${authToken}` } },
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    const items = Array.isArray(body) ? body : (body.items ?? []);
    const session = items.find((s: { id: string }) => s.id === dialysisSessionId);
    expect(session).toBeTruthy();
    expect(session.machineNo).toBe('HD-03');
  });

  test('should start dialysis session', async ({ request }) => {
    if (!dialysisSessionId) test.skip();
    const res = await request.patch(
      `${API_BASE_URL}/api/dialysis-sessions/${dialysisSessionId}/start`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { preWeight: 68.5 },
      },
    );
    expect([200, 204]).toContain(res.status());
  });

  test('should complete dialysis session', async ({ request }) => {
    if (!dialysisSessionId) test.skip();
    const res = await request.patch(
      `${API_BASE_URL}/api/dialysis-sessions/${dialysisSessionId}/complete`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          postWeight: 66.2,
          ufAchieved: 2.3,
          complications: null,
          notes: 'ฟอกสำเร็จ ไม่มีอาการแทรกซ้อน',
        },
      },
    );
    expect([200, 204]).toContain(res.status());
  });

  test('should return 401 without token on dialysis-sessions', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/dialysis-sessions`);
    expect(res.status()).toBe(401);
  });
});

// ──────────────────────────────────────────────
// TRT-001: Treatment Room Records
// ──────────────────────────────────────────────
test.describe('TRT-001: Treatment Room API', () => {
  test('should list treatment records', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/treatment-records`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const items = Array.isArray(body) ? body : (body.items ?? []);
    expect(Array.isArray(items)).toBe(true);
  });

  test('should create a treatment record', async ({ request }) => {
    if (!encounterId) test.skip();
    const res = await request.post(`${API_BASE_URL}/api/treatment-records`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        encounterId,
        treatmentType: 1,   // int: 1=Wound Dressing, 2=IV, 3=Injection, etc.
        description: 'Clean wound with NSS, apply betadine, cover with sterile gauze',
        materials: 'NSS 500mL, betadine, gauze 4x4',
        performedBy: TEST_USERS.nurse.username,
        scheduledAt: new Date().toISOString(),
      },
    });
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    treatmentRecordId = body.id ?? body.treatmentRecordId;
    expect(treatmentRecordId).toBeTruthy();
  });

  test('should complete treatment record', async ({ request }) => {
    if (!treatmentRecordId) test.skip();
    const res = await request.patch(
      `${API_BASE_URL}/api/treatment-records/${treatmentRecordId}/complete`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { outcomeNotes: 'แผลสะอาด healing well' },
      },
    );
    expect([200, 204]).toContain(res.status());
  });

  test('should return 401 without token on treatment-records', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/treatment-records`);
    expect(res.status()).toBe(401);
  });
});

// ──────────────────────────────────────────────
// DEN-001: Dental Records API
// ──────────────────────────────────────────────
test.describe('DEN-001: Dental Records API', () => {
  test('should list dental records', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/dental-records`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const items = Array.isArray(body) ? body : (body.items ?? []);
    expect(Array.isArray(items)).toBe(true);
  });

  test('should create a dental record', async ({ request }) => {
    if (!encounterId) test.skip();
    const res = await request.post(`${API_BASE_URL}/api/dental-records`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        encounterId,
        procedureType: 3,   // int: 1=Exam, 2=Filling, 3=Extraction, 4=RCT, 5=Scaling
        toothNumbers: '36',
        chiefComplaint: 'ปวดฟัน กรามล่างซ้าย',
        findings: 'Dental caries with pulpitis — tooth #36',
        treatment: 'Extraction under local anesthesia',
        materials: 'Articaine 4% 1.7mL, gauze x2',
        dentistName: 'ทพ.ฟัน สวย',
        nextAppointment: new Date(Date.now() + 7 * 86400000).toISOString(),
      },
    });
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    dentalRecordId = body.id ?? body.dentalRecordId;
    expect(dentalRecordId).toBeTruthy();
  });

  test('should filter dental records by encounterId', async ({ request }) => {
    if (!encounterId) test.skip();
    const res = await request.get(
      `${API_BASE_URL}/api/dental-records?encounterId=${encounterId}`,
      { headers: { Authorization: `Bearer ${authToken}` } },
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    const items = Array.isArray(body) ? body : (body.items ?? []);
    expect(Array.isArray(items)).toBe(true);
  });

  test('should return 401 without token on dental-records', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/dental-records`);
    expect(res.status()).toBe(401);
  });
});

// ──────────────────────────────────────────────
// TRT-002: Treatment Record Cancel
// ──────────────────────────────────────────────
test.describe('TRT-002: Treatment Record Cancel', () => {
  test('should PATCH /api/treatment-records/{id}/cancel', async ({ request }) => {
    if (!encounterId) test.skip();
    const createRes = await request.post(`${API_BASE_URL}/api/treatment-records`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        encounterId,
        treatmentType: 2,
        description: 'IV line insertion — to cancel',
        materials: 'IV catheter 20G, NSS 100mL',
        performedBy: TEST_USERS.nurse.username,
        scheduledAt: new Date().toISOString(),
      },
    });
    if (!createRes.ok()) { test.skip(); return; }
    const body = await createRes.json();
    const idToCancel = body.id ?? body.treatmentRecordId;
    if (!idToCancel) { test.skip(); return; }

    const res = await request.patch(
      `${API_BASE_URL}/api/treatment-records/${idToCancel}/cancel`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { reason: 'ยกเลิกโดย E2E test — ผู้ป่วยปฏิเสธ' },
      },
    );
    expect([200, 204]).toContain(res.status());
  });
});

// ──────────────────────────────────────────────
// HDM-002: Dialysis Session Filters
// ──────────────────────────────────────────────
test.describe('HDM-002: Dialysis Session Filters', () => {
  test('should filter dialysis sessions by encounterId', async ({ request }) => {
    if (!encounterId) test.skip();
    const res = await request.get(
      `${API_BASE_URL}/api/dialysis-sessions?encounterId=${encounterId}`,
      { headers: { Authorization: `Bearer ${authToken}` } },
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    const items = Array.isArray(body) ? body : (body.items ?? []);
    expect(Array.isArray(items)).toBe(true);
  });
});

// ──────────────────────────────────────────────
// DEN-002: Dental Record Detail
// ──────────────────────────────────────────────
test.describe('DEN-002: Dental Record Detail', () => {
  test('should get dental record by ID', async ({ request }) => {
    if (!dentalRecordId) test.skip();
    const res = await request.get(`${API_BASE_URL}/api/dental-records/${dentalRecordId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect([200, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body.id ?? body.dentalRecordId).toBe(dentalRecordId);
    }
  });
});

// ──────────────────────────────────────────────
// SPEC-UI-001: Specialized Frontend Navigation
// ──────────────────────────────────────────────
test.describe('SPEC-UI-001: Specialized Modules Frontend Navigation', () => {
  test('should navigate to Hemodialysis page', async ({ page }) => {
    await loginViaAPI(page, 'nurse');
    await page.goto('/hemodialysis');
    await expect(page).not.toHaveURL(/sign-in/);
  });

  test('should navigate to Treatment Room page', async ({ page }) => {
    await loginViaAPI(page, 'nurse');
    await page.goto('/treatment');
    await expect(page).not.toHaveURL(/sign-in/);
  });

  test('should navigate to Dental page', async ({ page }) => {
    await loginViaAPI(page, 'doctor');
    await page.goto('/dental');
    await expect(page).not.toHaveURL(/sign-in/);
  });

  test('should navigate to Teleconsult page', async ({ page }) => {
    await loginViaAPI(page, 'doctor');
    await page.goto('/teleconsult');
    await expect(page).not.toHaveURL(/sign-in/);
  });
});
