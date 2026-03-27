import { type Page, expect } from '@playwright/test';
import { SEL, TEST_USERS, API_BASE_URL } from './constants';

type UserKey = keyof typeof TEST_USERS;

/**
 * Login ผ่าน UI — ใช้ใน test ที่ต้องการ verify login flow จริง
 */
export async function loginViaUI(page: Page, userKey: UserKey = 'nurse') {
  const user = TEST_USERS[userKey];
  await page.goto('/sign-in');
  await page.fill(SEL.usernameInput, user.username);
  await page.fill(SEL.passwordInput, user.password);
  await page.click(SEL.loginButton);
  await expect(page).toHaveURL('/dashboard', { timeout: 10_000 });
}

/**
 * Login ผ่าน API แล้ว inject token เข้า localStorage
 * — ใช้ใน test ที่ไม่ได้ test login flow แต่ต้องการ authenticated state
 * — เร็วกว่า loginViaUI มาก
 */
export async function loginViaAPI(page: Page, userKey: UserKey = 'nurse') {
  const user = TEST_USERS[userKey];

  const response = await page.request.post(`${API_BASE_URL}/api/auth/login`, {
    data: { username: user.username, password: user.password },
  });

  expect(response.ok()).toBeTruthy();
  const data = await response.json();

  // Inject token + user info into localStorage before navigating
  await page.addInitScript((authData) => {
    window.localStorage.setItem('his_token', authData.accessToken);
    window.localStorage.setItem('his_user', JSON.stringify(authData));
  }, data);

  return data;
}

/**
 * Get raw JWT token สำหรับ API-level tests
 */
export async function getAuthToken(page: Page, userKey: UserKey = 'nurse'): Promise<string> {
  const user = TEST_USERS[userKey];
  const response = await page.request.post(`${API_BASE_URL}/api/auth/login`, {
    data: { username: user.username, password: user.password },
  });
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  return data.accessToken;
}
