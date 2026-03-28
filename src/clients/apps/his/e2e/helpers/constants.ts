/**
 * ======================================================
 * TTSS HIS — Test Constants & Seed Data Reference
 * ======================================================
 * ⚠️  ค่าทั้งหมดต้อง match กับ seed data ใน MasterDataSeeder / MockDataSeeder
 *     ถ้า seed เปลี่ยน → ต้องอัปเดตที่นี่ด้วย
 */

export const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:8080';

// ──────────────────────────────────────────────
// Test Credentials (from Phase 1 seed data)
// ──────────────────────────────────────────────
export const TEST_USERS = {
  admin: { username: 'admin', password: 'Admin1234!', role: 'Admin' },
  doctor: { username: 'doctor1', password: 'doctor1234', role: 'Doctor' },
  doctor2: { username: 'doctor2', password: 'doctor1234', role: 'Doctor' },
  nurse: { username: 'nurse1', password: 'nurse1234', role: 'Nurse' },
  pharmacist: { username: 'pharmacist1', password: 'pharma1234', role: 'Pharmacist' },
  finance: { username: 'finance1', password: 'finance1234', role: 'Finance' },
} as const;

// ──────────────────────────────────────────────
// Selectors — centralized เพื่อลด maintenance cost
// ──────────────────────────────────────────────
export const SEL = {
  // Sign-in page
  usernameInput: 'input[placeholder="username"]',
  passwordInput: 'input[placeholder="password"]',
  loginButton: 'button:has-text("เข้าสู่ระบบ")',
  loginError: 'text=ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง',
  connectionError: 'text=ไม่สามารถเชื่อมต่อ server ได้',

  // Main layout
  appTitle: 'text=TTSS HIS',
  logoutButton: 'text=ออกจากระบบ',

  // Dashboard — page shows h3 heading "Dashboard"
  dashboardTitle: 'h3:has-text("Dashboard")',
  welcomeText: 'h3:has-text("Dashboard")', // dashboard shows "Dashboard" heading, not a welcome msg

  // Sidebar nav items
  nav: {
    dashboard: 'text=Dashboard',
    registration: 'text=ทะเบียนผู้ป่วย (REG)',
    queue: 'text=คิว (QUE)',
    triage: 'text=Triage (MAI)',
    doctor: 'text=ตรวจ OPD (DPO)',
    pharmacy: 'text=เภสัช (TPD)',
    billing: 'text=การเงิน (BIL)',
    ward: 'text=Ward Board (IPD)',
    admissions: 'text=รับผู้ป่วยใน (IPD)',
    ipdChart: 'text=IPD Chart',
    or: 'text=ห้องผ่าตัด (ORM)',
    bloodBank: 'text=คลังโลหิต (BLB)',
    er: 'text=ห้องฉุกเฉิน (ER)',
    lab: 'text=ห้องปฏิบัติการ (LAB)',
    imaging: 'text=รังสีวิทยา (IME)',
    pathology: 'text=พยาธิวิทยา (PTH)',
    labResults: 'text=ผลแลบสะสม (LRM)',
    hemodialysis: 'text=ฟอกไต (HDM)',
    treatment: 'text=ห้องหัตถการ (TRT)',
    dental: 'text=ทันตกรรม (DEN)',
    teleconsult: 'text=โทรเวช (TEC)',
    claims: 'text=เคลมประกัน (CLM)',
    infectionControl: 'text=ควบคุมการติดเชื้อ (INF)',
    referring: 'text=ส่งต่อ (AGN)',
    phr: 'text=บันทึกสุขภาพ (PHR)',
    preRegistration: 'text=ลงทะเบียนล่วงหน้า (PRP)',
    appointments: 'text=นัดหมาย (APP)',
    reports: 'text=รายงาน (RPT)',
    admin: 'text=Admin',
  },
} as const;

// ──────────────────────────────────────────────
// Expected seed data counts
// ──────────────────────────────────────────────
export const SEED_DATA = {
  totalPatients: 101, // 100 seeded + 1 created by E2E suite (or >= 100)
  defaultPageSize: 20,
  divisions: 7,
  doctors: 3,
  coverages: 4,
} as const;
