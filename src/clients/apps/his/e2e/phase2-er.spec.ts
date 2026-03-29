import { test, expect } from '@playwright/test';
import { API_BASE_URL, TEST_USERS } from './helpers/constants';
import { loginViaAPI } from './helpers/auth';

/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  TEST SUITE: Phase 2 — Emergency Room (ER)              ║
 * ║  Coverage: ER Visit Workflow, Severity, Disposition     ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * Key API facts:
 *  POST /api/er/encounters with CreateErEncounterRequest:
 *    { patientId, chiefComplaint?, severity: int, arrivalMode: int,
 *      triageNotes?, triageBy? }
 *  GET /api/er/encounters
 */

let authToken: string;
let patientId: string;
let erEncounterId: string;

test.beforeAll(async ({ request }) => {
  const res = await request.post(`${API_BASE_URL}/api/auth/login`, {
    data: { username: TEST_USERS.nurse.username, password: TEST_USERS.nurse.password },
  });
  expect(res.ok()).toBeTruthy();
  authToken = (await res.json()).accessToken;

  // Use a patient from later in the list to avoid conflicts with other tests
  const pRes = await request.get(`${API_BASE_URL}/api/patients?pageNo=5&pageSize=1`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const pBody = await pRes.json();
  patientId = pBody.items[0]?.id;
  if (!patientId) {
    const p2 = await request.get(`${API_BASE_URL}/api/patients?pageNo=1&pageSize=1`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    patientId = (await p2.json()).items[0].id;
  }
});

// ──────────────────────────────────────────────
// ER-001: ER Visit API
// ──────────────────────────────────────────────
test.describe('ER-001: Emergency Room Visit API', () => {
  test('should list ER encounters (GET /api/er/encounters)', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/er/encounters`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('should create an ER encounter', async ({ request }) => {
    const res = await request.post(`${API_BASE_URL}/api/er/encounters`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        patientId,
        chiefComplaint: 'อุบัติเหตุ กระดูกหัก แขนขวา',
        severity: 2,        // 1=critical, 2=urgent, 3=less-urgent, 4=non-urgent, 5=minor
        arrivalMode: 2,     // 1=walk-in, 2=ambulance, 3=refer
        triageNotes: 'ปวดมาก อาการเร่งด่วน',
        triageBy: TEST_USERS.nurse.username,
      },
    });
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    erEncounterId = body.encounterId ?? body.id;
    expect(erEncounterId).toBeTruthy();
  });

  test('should get ER encounter — appears in list', async ({ request }) => {
    if (!erEncounterId) test.skip();
    const res = await request.get(`${API_BASE_URL}/api/er/encounters`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status()).toBe(200);
    const items = await res.json();
    const found = items.some(
      (e: { encounterId?: string; id?: string }) =>
        (e.encounterId ?? e.id) === erEncounterId,
    );
    expect(found).toBe(true);
  });

  test('should return 401 without token on er/encounters', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/er/encounters`);
    expect(res.status()).toBe(401);
  });
});

// ──────────────────────────────────────────────
// ER-002: ER Severity Levels
// ──────────────────────────────────────────────
test.describe('ER-002: ER Severity Levels (ESI 1-5)', () => {
  test('should accept severity=1 (immediate/critical)', async ({ request }) => {
    const res = await request.post(`${API_BASE_URL}/api/er/encounters`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        patientId,
        chiefComplaint: 'หมดสติ ไม่รู้สึกตัว',
        severity: 1,
        arrivalMode: 2,
        triageNotes: 'ฉุกเฉินวิกฤต — code blue',
      },
    });
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    expect(body.severity ?? body.Severity).toBe(1);
  });

  test('should accept severity=5 (non-urgent/minor)', async ({ request }) => {
    const res = await request.post(`${API_BASE_URL}/api/er/encounters`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        patientId,
        chiefComplaint: 'ปวดท้องเล็กน้อย',
        severity: 5,
        arrivalMode: 1,
        triageNotes: 'ไม่เร่งด่วน',
      },
    });
    expect([200, 201]).toContain(res.status());
  });
});

// ──────────────────────────────────────────────
// ER-003: ER Triage & Disposition
// ──────────────────────────────────────────────
test.describe('ER-003: ER Triage & Disposition', () => {
  test('should PATCH /api/er/encounters/{id}/triage', async ({ request }) => {
    if (!erEncounterId) test.skip();
    const res = await request.patch(
      `${API_BASE_URL}/api/er/encounters/${erEncounterId}/triage`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          severity: 2,
          triageNotes: 'ผู้ป่วยปวดมาก อาการเร่งด่วน ต้องการตรวจเร็ว',
          triageBy: TEST_USERS.nurse.username,
          temperature: 37.8,
          pulseRate: 95,
          bpSystolic: 135,
          bpDiastolic: 90,
        },
      },
    );
    expect([200, 204]).toContain(res.status());
  });

  test('should PATCH /api/er/encounters/{id}/disposition', async ({ request }) => {
    if (!erEncounterId) test.skip();
    const res = await request.patch(
      `${API_BASE_URL}/api/er/encounters/${erEncounterId}/disposition`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          dispositionType: 1,
          dispositionNotes: 'อาการดีขึ้น จำหน่ายกลับบ้าน',
        },
      },
    );
    expect([200, 204]).toContain(res.status());
  });

  test('should return 401 without token on ER triage', async ({ request }) => {
    const res = await request.patch(`${API_BASE_URL}/api/er/encounters/test-id/triage`, {
      data: { severity: 1 },
    });
    expect(res.status()).toBe(401);
  });
});

// ──────────────────────────────────────────────
// ER-UI-001: ER Frontend
// ──────────────────────────────────────────────
test.describe('ER-UI-001: Emergency Room Frontend', () => {
  test('should navigate to ER page', async ({ page }) => {
    await loginViaAPI(page, 'nurse');
    await page.goto('/er');
    await expect(page).not.toHaveURL(/sign-in/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('ER page should load content', async ({ page }) => {
    await loginViaAPI(page, 'nurse');
    await page.goto('/er');
    await page.waitForLoadState('networkidle');
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(5);
  });
});
