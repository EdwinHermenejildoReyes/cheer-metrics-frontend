import { test as setup, expect } from '@playwright/test';
import { ADMIN, JUDGE_BUILDING, COMP_ID, DIV_ID, REG_ID } from './helpers';
import path from 'path';
import fs from 'fs';

const API = 'http://localhost:8002/api/v1';
const authDir = path.join(__dirname, '.auth');
if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

async function apiLogin(page: import('@playwright/test').Page, email: string, password: string) {
  const resp = await page.request.post(`${API}/auth/login/`, {
    data: { email, password },
    headers: { 'Content-Type': 'application/json' },
  });
  expect(resp.status()).toBe(200);
}

async function warmRoute(page: import('@playwright/test').Page, url: string) {
  // 'commit' resolves on the first byte of the response — enough to trigger
  // Next.js route compilation without waiting for the full JS bundle to load.
  // This avoids the 120s test-timeout that 'load' can hit in dev mode when
  // compilation is slow or HMR fires mid-request.
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      await page.goto(url, { waitUntil: 'commit' });
      return;
    } catch (e: unknown) {
      const msg = String(e);
      if (msg.includes('ERR_ABORTED') || msg.includes('net::ERR') || msg.includes('interrupted by another navigation')) {
        if (attempt < 3) {
          await page.waitForTimeout(3_000);
          continue;
        }
        return; // after 4 attempts, compilation was triggered — move on
      }
      throw e;
    }
  }
}

/**
 * Sets the redux-persist auth state in localStorage for the http://localhost:3000 origin
 * by navigating to /login (waitUntil: 'commit' to avoid HMR abort) and then calling
 * localStorage.setItem via page.evaluate. This bypasses the UI login form entirely,
 * eliminating ERR_ABORTED and form-interaction timing issues.
 */
async function setAuthInLocalStorage(
  page: import('@playwright/test').Page,
  userData: Record<string, unknown>,
) {
  // 'commit' resolves as soon as the server sends the first byte — fast and HMR-safe.
  await page.goto('/login', { waitUntil: 'commit' });
  await page.evaluate((user) => {
    const persistState = {
      auth:     JSON.stringify({ user, isAuthenticated: true }),
      _persist: JSON.stringify({ version: -1, rehydrated: true }),
    };
    localStorage.setItem('persist:root', JSON.stringify(persistState));
  }, userData);
}

setup('guardar sesión admin', async ({ page }) => {
  // 1. Set auth cookies via raw API request
  await apiLogin(page, ADMIN.email, ADMIN.password);

  // 2. Fetch user data while cookies are fresh
  const meResp = await page.request.get(`${API}/auth/users/me/`);
  expect(meResp.ok(), `GET /me failed: ${meResp.status()}`).toBeTruthy();
  const userData = await meResp.json();

  // 3. Write Redux isAuthenticated=true to localStorage (no form interaction)
  await setAuthInLocalStorage(page, userData);

  // 4. Pre-warm routes now that the user is authenticated in localStorage.
  //    DashboardShell sees isAuthenticated=true → no redirect to /login → routes compile cleanly.
  for (const url of [
    '/home',
    '/competitions',
    `/competitions/${COMP_ID}`,
    `/competitions/${COMP_ID}/backstage`,
    `/competitions/${COMP_ID}/divisions/${DIV_ID}`,
    `/competitions/${COMP_ID}/divisions/${DIV_ID}/sheets/${REG_ID}/building-difficulty`,
    `/competitions/${COMP_ID}/divisions/${DIV_ID}/sheets/${REG_ID}/tumbling-difficulty`,
    `/competitions/${COMP_ID}/divisions/${DIV_ID}/sheets/${REG_ID}/overall`,
    `/competitions/${COMP_ID}/divisions/${DIV_ID}/rankings`,
    `/competitions/${COMP_ID}/grand-champion`,
  ]) {
    await warmRoute(page, url);
  }

  await page.context().storageState({ path: path.join(authDir, 'admin.json') });
});

setup('guardar sesión juez', async ({ page }) => {
  await apiLogin(page, JUDGE_BUILDING.email, JUDGE_BUILDING.password);

  const meResp = await page.request.get(`${API}/auth/users/me/`);
  expect(meResp.ok(), `GET /me failed: ${meResp.status()}`).toBeTruthy();
  const userData = await meResp.json();

  await setAuthInLocalStorage(page, userData);

  for (const url of [
    '/assignments',
    `/competitions/${COMP_ID}/divisions/${DIV_ID}/sheets/${REG_ID}/building-difficulty`,
    `/competitions/${COMP_ID}/divisions/${DIV_ID}/sheets/${REG_ID}/tumbling-difficulty`,
  ]) {
    await warmRoute(page, url);
  }

  await page.context().storageState({ path: path.join(authDir, 'judge.json') });
});
