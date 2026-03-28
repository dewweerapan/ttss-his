import { test, expect } from '@playwright/test';
import { API_BASE_URL, TEST_USERS, SEED_DATA } from './helpers/constants';

/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  TEST SUITE: Patients API (REST Level)                  ║
 * ║  Phase: 1 — Core Foundation                             ║
 * ║  Coverage: List, Search, Get by ID, Create, Auth guard  ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * หมายเหตุ: Suite นี้ test API โดยตรง (ไม่ผ่าน frontend)
 * เพื่อ verify ว่า backend behavior ถูกต้องก่อนที่ UI จะ consume
 */

let authToken: string;

test.beforeAll(async ({ request }) => {
  const res = await request.post(`${API_BASE_URL}/api/auth/login`, {
    data: {
      username: TEST_USERS.nurse.username,
      password: TEST_USERS.nurse.password,
    },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  authToken = body.accessToken;
});

// ──────────────────────────────────────────────
// PAT-001: List Patients
// ──────────────────────────────────────────────
test.describe('PAT-001: List Patients', () => {
  test('should return paginated patient list with default page size', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/patients?pageNo=1&pageSize=10`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body).toHaveProperty('items');
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('pageNo', 1);
    expect(body).toHaveProperty('pageSize', 10);
    expect(body.items.length).toBeLessThanOrEqual(10);
    expect(body.total).toBeGreaterThanOrEqual(100); // 100+ seeded patients
  });

  test('should return correct fields in patient summary', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/patients?pageNo=1&pageSize=1`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const body = await res.json();
    const patient = body.items[0];

    // Verify required fields in summary
    expect(patient).toHaveProperty('id');
    expect(patient).toHaveProperty('hn');
    expect(patient).toHaveProperty('firstName');
    expect(patient).toHaveProperty('lastName');
    expect(patient).toHaveProperty('gender');
    expect(patient.hn).toMatch(/^HN/); // HN format check
  });

  test('should paginate correctly — page 2', async ({ request }) => {
    const page1 = await request.get(`${API_BASE_URL}/api/patients?pageNo=1&pageSize=5`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const page2 = await request.get(`${API_BASE_URL}/api/patients?pageNo=2&pageSize=5`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const body1 = await page1.json();
    const body2 = await page2.json();

    // Different items on different pages
    expect(body1.items[0].id).not.toBe(body2.items[0].id);
    expect(body2.pageNo).toBe(2);
  });
});

// ──────────────────────────────────────────────
// PAT-002: Search Patients
// ──────────────────────────────────────────────
test.describe('PAT-002: Search Patients', () => {
  test('should search patients by name (Thai)', async ({ request }) => {
    // ดึง patient คนแรกเพื่อเอาชื่อมา search
    const listRes = await request.get(`${API_BASE_URL}/api/patients?pageNo=1&pageSize=1`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const listBody = await listRes.json();
    const firstName = listBody.items[0].firstName;

    const searchRes = await request.get(
      `${API_BASE_URL}/api/patients?search=${encodeURIComponent(firstName)}`,
      { headers: { Authorization: `Bearer ${authToken}` } },
    );

    expect(searchRes.status()).toBe(200);
    const searchBody = await searchRes.json();
    expect(searchBody.total).toBeGreaterThanOrEqual(1);

    // ทุก result ต้องมี firstName ที่ match
    for (const item of searchBody.items) {
      const matchesFirst = item.firstName.toLowerCase().includes(firstName.toLowerCase());
      const matchesLast = item.lastName.toLowerCase().includes(firstName.toLowerCase());
      const matchesHn = item.hn.toLowerCase().includes(firstName.toLowerCase());
      expect(matchesFirst || matchesLast || matchesHn).toBe(true);
    }
  });

  test('should return empty result for non-matching search', async ({ request }) => {
    const res = await request.get(
      `${API_BASE_URL}/api/patients?search=ZZZXXX_NONEXISTENT_99999`,
      { headers: { Authorization: `Bearer ${authToken}` } },
    );

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(0);
    expect(body.items).toHaveLength(0);
  });

  test('should search by HN using "hn" param', async ({ request }) => {
    // ดึง HN ของ patient คนแรก
    const listRes = await request.get(`${API_BASE_URL}/api/patients?pageNo=1&pageSize=1`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const hn = (await listRes.json()).items[0].hn;

    const res = await request.get(`${API_BASE_URL}/api/patients?hn=${hn}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.items[0].hn).toBe(hn);
  });
});

// ──────────────────────────────────────────────
// PAT-003: Get Patient by ID
// ──────────────────────────────────────────────
test.describe('PAT-003: Get Patient by ID', () => {
  test('should return full patient detail', async ({ request }) => {
    // Get first patient ID
    const listRes = await request.get(`${API_BASE_URL}/api/patients?pageNo=1&pageSize=1`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const patientId = (await listRes.json()).items[0].id;

    const res = await request.get(`${API_BASE_URL}/api/patients/${patientId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();

    // Verify detail fields (more than summary)
    expect(body).toHaveProperty('id', patientId);
    expect(body).toHaveProperty('hn');
    expect(body).toHaveProperty('firstName');
    expect(body).toHaveProperty('lastName');
    expect(body).toHaveProperty('gender');
    expect(body).toHaveProperty('citizenType');
    expect(body).toHaveProperty('nationalityCode');
    expect(body).toHaveProperty('isAlive');
    expect(body).toHaveProperty('createdDate');
  });

  test('should return 404 for non-existent patient ID', async ({ request }) => {
    const res = await request.get(
      `${API_BASE_URL}/api/patients/00000000-0000-0000-0000-000000000000`,
      { headers: { Authorization: `Bearer ${authToken}` } },
    );

    expect(res.status()).toBe(404);
  });
});

// ──────────────────────────────────────────────
// PAT-004: Create Patient
// ──────────────────────────────────────────────
test.describe('PAT-004: Create Patient', () => {
  test('should create a new patient and return detail with generated HN', async ({ request }) => {
    const newPatient = {
      preName: 'นาย',
      firstName: 'ทดสอบ',
      lastName: 'ระบบ',
      firstNameEn: 'Test',
      lastNameEn: 'System',
      gender: 1,
      birthdate: '1990-05-15',
      citizenNo: `1${Date.now().toString().slice(-12)}`, // unique 13-digit
      phoneNumber: '0891234567',
    };

    const res = await request.post(`${API_BASE_URL}/api/patients`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: newPatient,
    });

    expect(res.status()).toBe(201);
    const body = await res.json();

    expect(body.firstName).toBe('ทดสอบ');
    expect(body.lastName).toBe('ระบบ');
    expect(body.hn).toMatch(/^HN\d+/); // HN format: HN + year + sequential digits
    expect(body.id).toBeTruthy();
  });

  test('should reject patient with missing required fields', async ({ request }) => {
    const res = await request.post(`${API_BASE_URL}/api/patients`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: { firstName: '', lastName: '' },
    });

    expect(res.status()).toBe(400);
  });
});

// ──────────────────────────────────────────────
// PAT-005: Authorization Guard
// ──────────────────────────────────────────────
test.describe('PAT-005: Patients API — Auth Guard', () => {
  test('should return 401 when no token is provided', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/patients`);
    expect(res.status()).toBe(401);
  });

  test('should return 401 with invalid/expired token', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/patients`, {
      headers: { Authorization: 'Bearer invalid.fake.token' },
    });
    expect(res.status()).toBe(401);
  });
});

// ──────────────────────────────────────────────
// PAT-006: Health Check Endpoint
// ──────────────────────────────────────────────
test.describe('PAT-006: Health Check', () => {
  test('API health endpoint should return Healthy', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/health/ready`);
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain('Healthy');
  });
});
