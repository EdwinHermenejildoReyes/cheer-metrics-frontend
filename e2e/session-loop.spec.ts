/**
 * Diagnóstico de ciclo infinito de carga/recarga.
 *
 * Verifica que ningún flujo de autenticación produce un bucle de navegaciones.
 * Un bucle se define como más de 3 navegaciones a la misma URL en < 10 s.
 */
import { test, expect, Browser } from '@playwright/test';
import { ADMIN, JUDGE_BUILDING } from './helpers';

const API = 'http://localhost:8002/api/v1';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Cuenta navegaciones a la misma URL en un intervalo dado. */
function watchNavigations(page: import('@playwright/test').Page) {
  const log: { url: string; ts: number }[] = [];
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) {
      log.push({ url: frame.url(), ts: Date.now() });
    }
  });
  return {
    count: (urlPattern: RegExp, windowMs = 10_000) => {
      const now = Date.now();
      return log.filter(e => urlPattern.test(e.url) && now - e.ts < windowMs).length;
    },
    all: () => log,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Sin bucle de navegación (session-loop diagnostics)', () => {

  // 1. Login fresco — sin cookies ni localStorage previo
  test('login fresco de admin no genera bucle', async ({ page }) => {
    const nav = watchNavigations(page);

    await page.goto('/login', { waitUntil: 'commit' });
    await page.getByLabel('Correo electrónico').fill(ADMIN.email);
    await page.getByLabel('Contraseña').fill(ADMIN.password);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page).toHaveURL(/\/(home|competitions)/, { timeout: 30_000 });

    // Esperar 4 s para detectar bucles de recarga post-login
    await page.waitForTimeout(4_000);

    const homeCount = nav.count(/\/home/);
    expect(homeCount, `Se detectaron ${homeCount} navegaciones a /home — posible bucle`).toBeLessThan(3);
  });

  // 2. Login fresco de juez
  test('login fresco de juez no genera bucle', async ({ page }) => {
    const nav = watchNavigations(page);

    await page.goto('/login', { waitUntil: 'commit' });
    await page.getByLabel('Correo electrónico').fill(JUDGE_BUILDING.email);
    await page.getByLabel('Contraseña').fill(JUDGE_BUILDING.password);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page).toHaveURL(/\/(home|assignments)/, { timeout: 30_000 });
    await page.waitForTimeout(4_000);

    const assignCount = nav.count(/\/(home|assignments)/);
    expect(assignCount, `Posible bucle: ${assignCount} navegaciones`).toBeLessThan(3);
  });

  // 3. Ruta protegida sin sesión → sólo un redireccionamiento a /login, no bucle
  test('ruta protegida sin cookies redirige a /login exactamente una vez', async ({ page }) => {
    const nav = watchNavigations(page);

    await page.goto('/home', { waitUntil: 'commit' });
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    await page.waitForTimeout(3_000);

    const loginCount = nav.count(/\/login/);
    expect(loginCount, `Más de 2 navegaciones a /login — posible bucle: ${loginCount}`).toBeLessThan(3);
  });

  // 4. Estado Redis-stale: localStorage dice isAuthenticated=true pero cookie ausente
  test('estado stale en localStorage sin cookie lleva al login sin bucle', async ({ browser }) => {
    const ctx  = await browser.newContext();
    const page = await ctx.newPage();
    const nav  = watchNavigations(page);

    // Escribir estado stale en localStorage (isAuthenticated=true, sin cookie JWT)
    await page.goto('/login', { waitUntil: 'commit' });
    await page.evaluate(() => {
      const stale = {
        auth:     JSON.stringify({ user: { id: 999, email: 'ghost@test.com', is_approved: true, is_staff: false }, isAuthenticated: true }),
        _persist: JSON.stringify({ version: -1, rehydrated: true }),
      };
      localStorage.setItem('persist:root', JSON.stringify(stale));
    });

    // Navegar a ruta protegida — sin cookie válida
    await page.goto('/home', { waitUntil: 'commit' });

    // Debe llegar a /login en menos de 15 s y no seguir rebotando
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    await page.waitForTimeout(5_000);

    const loginCount = nav.count(/\/login/, 15_000);
    expect(loginCount, `Posible bucle con estado stale: ${loginCount} veces en /login`).toBeLessThan(4);

    await ctx.close();
  });

  // 5. Sesión válida: el dashboard carga sin reiniciar la página
  test('sesión válida en dashboard no recarga la página', async ({ browser }) => {
    // Login vía API para obtener cookies reales
    const ctx  = await browser.newContext();
    const page = await ctx.newPage();
    const nav  = watchNavigations(page);

    const resp = await page.request.post(`${API}/auth/login/`, {
      data:    { email: ADMIN.email, password: ADMIN.password },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(resp.ok()).toBeTruthy();

    const me = await page.request.get(`${API}/auth/users/me/`);
    const userData = await me.json();

    // Establecer Redux state
    await page.goto('/login', { waitUntil: 'commit' });
    await page.evaluate((user) => {
      const state = {
        auth:     JSON.stringify({ user, isAuthenticated: true }),
        _persist: JSON.stringify({ version: -1, rehydrated: true }),
      };
      localStorage.setItem('persist:root', JSON.stringify(state));
    }, userData);

    // Navegar al dashboard
    await page.goto('/home', { waitUntil: 'commit' });
    await expect(page).toHaveURL(/\/home/, { timeout: 20_000 });
    await expect(page.getByText('Cheer Metrics').first()).toBeVisible({ timeout: 15_000 });

    // Esperar 6 s para detectar recargas periódicas
    await page.waitForTimeout(6_000);

    const homeCount = nav.count(/\/home/, 10_000);
    expect(homeCount, `Dashboard se recargó ${homeCount} veces en 10 s — posible bucle`).toBeLessThan(3);

    await ctx.close();
  });

});
