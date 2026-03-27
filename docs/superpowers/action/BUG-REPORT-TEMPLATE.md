# Bug Report Template — TTSS HIS QA

> **สำหรับ Tester:** Copy template ด้านล่าง แล้วสร้างไฟล์ใหม่ตาม naming convention
>
> **สำหรับ Dev:** เมื่อแก้เสร็จ → update Status เป็น `✅ FIXED` พร้อมใส่ commit hash

---

## Naming Convention

```
bug-{SUITE_ID}-{running_number}.md
```

ตัวอย่าง:
- `bug-AUTH-001.md` — Bug ตัวแรกจาก Auth suite
- `bug-PAT-003.md` — Bug ตัวที่สามจาก Patients API suite
- `bug-SHELL-002.md` — Bug ตัวที่สองจาก Frontend Shell suite
- `bug-MANUAL-001.md` — Bug จากการ test มือ (ไม่ได้มาจาก automated test)

---

## Severity Levels

| Level | Label | ความหมาย |
|---|---|---|
| 🔴 | **Critical** | ระบบใช้งานไม่ได้ / data loss / security breach |
| 🟠 | **High** | Feature หลัก broken — block การทำงานของ user |
| 🟡 | **Medium** | Feature ทำงานได้ แต่ผิด spec หรือ UX ไม่ดี |
| 🟢 | **Low** | Cosmetic, typo, minor UI glitch |

---

## Template — เริ่ม copy จากตรงนี้

```markdown
# BUG-{SUITE}-{NNN}: {ชื่อ Bug สั้นๆ}

**Date:** YYYY-MM-DD
**Reporter:** QA Engineer
**Status:** 🐛 OPEN
**Severity:** 🔴 Critical / 🟠 High / 🟡 Medium / 🟢 Low
**Test Case:** {TEST_ID เช่น AUTH-002-3 หรือ PAT-001-1}
**Spec File:** {ชื่อไฟล์ .spec.ts ที่ fail}

---

## สิ่งที่เกิดขึ้น (Actual)

อธิบายสั้นๆ ว่าเกิดอะไร — ติด error อะไร

## สิ่งที่ควรเกิด (Expected)

อธิบายว่า spec กำหนดไว้ว่าต้องเป็นยังไง

## ขั้นตอน Reproduce

1. ...
2. ...
3. ...

## Playwright Error Output

\```
วาง error log จาก terminal ตรงนี้
\```

## Screenshot / Trace (ถ้ามี)

- screenshot: `test-results/{test-name}/test-failed-1.png`
- trace: `test-results/{test-name}/trace.zip`

วิธีเปิด trace:
\```bash
npx playwright show-trace test-results/{test-name}/trace.zip
\```

## Environment

- OS: macOS / Windows / Linux
- Node: vXX.X.X
- Playwright: vX.XX.X
- Browser: Chromium
- API URL: http://localhost:5150
- Frontend URL: http://localhost:3000

---

## สำหรับ Dev (กรอกเมื่อแก้เสร็จ)

**Status:** ✅ FIXED
**Fixed by:** {ชื่อ dev}
**Commit:** {commit hash}
**Branch:** {branch name}
**Root Cause:** {อธิบายสั้นๆ ว่าสาเหตุคืออะไร}
**Verified by QA:** ⬜ ยังไม่ verify / ✅ verified
```

---

## Workflow: Tester → Dev → Verify

```
┌─────────┐     สร้าง bug-XXX.md      ┌─────────┐
│  Tester  │ ──────────────────────────▶│   Dev   │
│          │   Status: 🐛 OPEN         │         │
└─────────┘                            └────┬────┘
                                            │
                                       แก้ code
                                       commit + push
                                            │
┌─────────┐     update Status           ┌───▼─────┐
│  Tester  │ ◀─────────────────────────│   Dev   │
│          │   Status: ✅ FIXED         │         │
└────┬────┘   + commit hash            └─────────┘
     │
  re-run test
  verify fix
     │
     ▼
  update: Verified by QA ✅
```

### ขั้นตอนละเอียด

**Tester พบ bug:**
1. Run `npm run test:e2e` → เจอ test fail
2. Copy error output จาก terminal
3. สร้างไฟล์ `bug-{SUITE}-{NNN}.md` ตาม template ด้านบน
4. ใส่ screenshot/trace path (Playwright สร้างอัตโนมัติใน `test-results/`)
5. Save ไฟล์ใน `docs/superpowers/action/`
6. แจ้ง Dev ว่ามี bug report ใหม่

**Dev รับ bug:**
1. อ่าน bug report → ดู error output + reproduce steps
2. เปิด trace ดู (ถ้ามี): `npx playwright show-trace test-results/.../trace.zip`
3. แก้ code → commit → push
4. update bug report: เปลี่ยน Status เป็น `✅ FIXED`, ใส่ commit hash + root cause
5. แจ้ง Tester ว่าแก้แล้ว

**Tester verify:**
1. Pull code ล่าสุด
2. Run test ที่ fail ใหม่: `npx playwright test {spec-file} --grep "{test name}"`
3. ถ้า pass → update `Verified by QA: ✅`
4. ถ้ายัง fail → reopen bug → เพิ่ม comment ใน bug report

---

## Quick Commands สำหรับ Tester

```bash
# Run ทุก test — ดู summary
npm run test:e2e

# Run เฉพาะ suite ที่ fail
npx playwright test auth.spec.ts
npx playwright test patients-api.spec.ts
npx playwright test frontend-shell.spec.ts

# Run เฉพาะ test case เดียว (by name)
npx playwright test --grep "should login as Doctor"

# ดู HTML report (มี screenshot + trace link)
npm run test:e2e:report

# เปิด trace ของ test ที่ fail
npx playwright show-trace test-results/{folder}/trace.zip

# Run แบบเห็น browser (debug)
npm run test:e2e:headed

# Run Playwright UI (interactive — ดีมากตอน debug)
npm run test:e2e:ui
```
