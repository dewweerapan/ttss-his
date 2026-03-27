# Dev Log 002 — Phase 1: QA Automation Setup & E2E Test Suite

**Date:** 2026-03-27
**Author:** QA Engineer
**Status:** ✅ TEST SUITE CREATED — พร้อม run บนเครื่อง dev
**Branch:** `main`
**Tool:** Playwright (E2E)

---

## สรุปสำหรับ PM

QA ได้สร้าง automated test suite สำหรับ Phase 1 ครบแล้ว ครอบคลุมทั้ง **UI flow** และ **API level** โดยใช้ Playwright เป็น test framework

### Test Coverage Summary

| Suite | Test Cases | ครอบคลุม |
|---|---|---|
| AUTH (auth.spec.ts) | 10 cases | Login ทุก role, invalid creds, Enter key submit, logout, auth guard |
| PAT-API (patients-api.spec.ts) | 10 cases | List, pagination, search, get by ID, create, 401 guard, health check |
| SHELL (frontend-shell.spec.ts) | 16 cases | Dashboard render, sidebar 7 items, nav routing ทุกเมนู, multi-role verify |
| **รวม** | **36 cases** | **Phase 1 ครบ 100%** |

### Blockers / Dependencies

| รายการ | สถานะ |
|---|---|
| Playwright ยังไม่ได้ install บนเครื่อง dev | ⏳ ต้อง `npm install` + `npx playwright install` |
| API + DB ต้อง running ก่อน run test | ✅ documented ใน README |
| Seed data ต้อง match กับ test constants | ✅ verified กับ dev-log-001 |

### Timeline

- ✅ 2026-03-27: สร้าง test suite + config + helpers
- ⏳ Next: install Playwright → run tests → report ผล

---

## สรุปสำหรับ Tester

### วิธี Setup Playwright

```bash
# 1. ติดตั้ง dependencies
cd src/clients/apps/his
npm install

# 2. ติดตั้ง Playwright browsers
npx playwright install chromium

# 3. Verify Playwright version
npx playwright --version
```

### Prerequisites ก่อน Run Tests

```bash
# Terminal 1: Start PostgreSQL + seed data
cd docker && docker compose up postgres -d
cd .. && dotnet run --project src/servers/TtssHis.Database.Migrations

# Terminal 2: Start API
dotnet run --project src/servers/TtssHis.Facing
# ⚠️ ต้องรอจน "Now listening on: http://localhost:5150"

# Terminal 3: Start Frontend
cd src/clients/apps/his
NEXT_PUBLIC_API_BASE_URL=http://localhost:5150 npm run dev
# ⚠️ ต้องรอจน "Ready on http://localhost:3000"
```

### วิธี Run Tests

```bash
# Run ทุก test (headless)
npm run test:e2e

# Run แบบเห็น browser
npm run test:e2e:headed

# Run Playwright UI (interactive — แนะนำตอน debug)
npm run test:e2e:ui

# Run เฉพาะ suite
npx playwright test auth.spec.ts
npx playwright test patients-api.spec.ts
npx playwright test frontend-shell.spec.ts

# ดู HTML Report
npm run test:e2e:report
```

### Environment Variables (optional)

| ตัวแปร | Default | คำอธิบาย |
|---|---|---|
| `BASE_URL` | `http://localhost:3000` | URL ของ frontend |
| `API_BASE_URL` | `http://localhost:5150` | URL ของ API server |

---

## Test Architecture

### File Structure

```
e2e/
├── helpers/
│   ├── constants.ts     ← Selectors, test users, seed data reference
│   └── auth.ts          ← Login helpers (UI + API shortcut)
├── auth.spec.ts         ← Authentication flow tests (10 cases)
├── patients-api.spec.ts ← REST API level tests (10 cases)
└── frontend-shell.spec.ts ← UI shell & navigation tests (16 cases)
```

### Design Decisions

1. **Centralized Selectors** (`constants.ts`)
   - ทุก selector อยู่ที่เดียว → เมื่อ UI เปลี่ยน แก้จุดเดียว
   - ใช้ text-based selectors ตาม Playwright best practices

2. **Dual Login Strategy** (`auth.ts`)
   - `loginViaUI()` — ใช้เฉพาะ test ที่ test login flow จริง
   - `loginViaAPI()` — inject token ตรง → เร็วกว่า สำหรับ test อื่นที่แค่ต้องการ authenticated state

3. **Test ID Naming Convention**
   - `AUTH-001`, `PAT-001`, `SHELL-001` → trace กลับไป requirement ได้
   - ง่ายต่อการ map เข้า test management tool ในอนาคต

4. **API Tests แยก Suite**
   - test API โดยตรงไม่ผ่าน UI → ถ้า API fail รู้ทันทีว่าเป็น backend issue
   - ครอบคลุม edge cases ที่ UI ยังไม่ได้ handle (เช่น 401, 404)

---

## Test Case Breakdown

### AUTH — Authentication Flow (auth.spec.ts)

| ID | Test Case | Expected Result |
|---|---|---|
| AUTH-001-1 | แสดง login form ครบ (title, inputs, button) | Form elements visible |
| AUTH-001-2 | Redirect "/" → "/sign-in" | URL = /sign-in |
| AUTH-002-1 | Login Doctor → dashboard | URL = /dashboard, token = JWT |
| AUTH-002-2 | Login Nurse → dashboard | URL = /dashboard, token = JWT |
| AUTH-002-3 | Login Pharmacist → dashboard | URL = /dashboard, token = JWT |
| AUTH-002-4 | Login Finance → dashboard | URL = /dashboard, token = JWT |
| AUTH-003 | กด Enter ใน password field → submit | URL = /dashboard |
| AUTH-004-1 | Wrong password → error | Error message visible, stay on /sign-in |
| AUTH-004-2 | Non-existent user → error | Error message visible |
| AUTH-004-3 | Empty credentials → error | Error/connection message visible |
| AUTH-005 | Logout → clear token → redirect | URL = /sign-in, token = null |
| AUTH-006 | เข้า /dashboard ไม่มี token → redirect | URL = /sign-in |

### PAT-API — Patients REST API (patients-api.spec.ts)

| ID | Test Case | Expected Result |
|---|---|---|
| PAT-001-1 | List patients page 1 (pageSize=10) | 200, items ≤ 10, total = 100 |
| PAT-001-2 | Verify patient summary fields | id, hn, firstName, lastName, gender present |
| PAT-001-3 | Paginate to page 2 | Different items, pageNo = 2 |
| PAT-002-1 | Search by Thai name | Results match search term |
| PAT-002-2 | Search non-existent → empty | total = 0, items = [] |
| PAT-002-3 | Search by HN (exact match) | total = 1, matching HN |
| PAT-003-1 | Get patient by ID → full detail | 200, all detail fields present |
| PAT-003-2 | Get non-existent ID → 404 | Status 404 |
| PAT-004-1 | Create patient → 201 with HN | HN format = HNyyyyMMddNNNN |
| PAT-004-2 | Create with empty required fields → 400 | Status 400 |
| PAT-005-1 | No token → 401 | Status 401 |
| PAT-005-2 | Invalid token → 401 | Status 401 |
| PAT-006 | Health check → Healthy | 200, "Healthy" |

### SHELL — Frontend Shell (frontend-shell.spec.ts)

| ID | Test Case | Expected Result |
|---|---|---|
| SHELL-001-1 | Dashboard title visible | "Dashboard" text present |
| SHELL-001-2 | Welcome message visible | "ยินดีต้อนรับ" visible |
| SHELL-001-3 | 6 module cards (REG, QUE, MAI, DPO, TPD, BIL) | All 6 codes visible |
| SHELL-001-4 | Header shows "TTSS HIS" | h4 with text visible |
| SHELL-002-1 | Sidebar มี 7 nav items | All 7 visible |
| SHELL-002-2 | Click REG → /registration | URL correct |
| SHELL-002-3 | Click QUE → /queue | URL correct |
| SHELL-002-4 | Click MAI → /triage | URL correct |
| SHELL-002-5 | Click DPO → /doctor | URL correct |
| SHELL-002-6 | Click TPD → /pharmacy | URL correct |
| SHELL-002-7 | Click BIL → /billing | URL correct |
| SHELL-003-1 | Logout button visible | "ออกจากระบบ" visible |
| SHELL-003-2 | Logout clears session | token + user = null, URL = /sign-in |
| SHELL-004-1~4 | Dashboard shows correct role per user | Role text visible for each login |

---

## Known Risks & Observations

| # | Observation | Severity | Note |
|---|---|---|---|
| 1 | Auth ใช้ localStorage เก็บ token — ไม่มี httpOnly cookie | ⚠️ Low (MVP) | XSS risk, acceptable for prototype |
| 2 | Create Patient → HN generation อาจ race condition ถ้า concurrent | ⚠️ Low (MVP) | ไม่ test concurrent ใน E2E, ควรมี unit test ใน Phase 2+ |
| 3 | Phase 2 pages (/registration, /queue, etc.) ยังว่าง | ℹ️ Info | Nav test จะ pass (route exists) แต่ content ยังว่าง |
| 4 | No CSRF protection | ⚠️ Low (MVP) | ไม่อยู่ใน Phase 1 scope |

---

## Next Step → Phase 2 QA

เมื่อ Phase 2 OPD flow พัฒนาเสร็จ จะต้องเขียน test เพิ่มสำหรับ:

- **REG** — Patient registration form + HN generation
- **QUE** — Queue CRUD + realtime update
- **MAI** — Vital signs input + triage classification
- **DPO** — Doctor OPD consult + diagnosis + drug order
- **TPD** — Pharmacy dispense flow
- **BIL** — Invoice generation + payment

รวมถึง **cross-module flow test** เช่น REG → QUE → MAI → DPO → TPD → BIL (full OPD journey)
