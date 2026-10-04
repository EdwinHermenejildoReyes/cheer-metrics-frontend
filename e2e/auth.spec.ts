import { test, expect } from '@playwright/test';
import { ADMIN, JUDGE_BUILDING } from './helpers';

test.describe('Autenticación', () => {

  test('página de login carga correctamente', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Cheer Metrics' })).toBeVisible();
    await expect(page.getByLabel('Correo electrónico')).toBeVisible();
    await expect(page.getByLabel('Contraseña')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
  });

  test('ruta protegida redirige a /login sin sesión', async ({ page }) => {
    await page.goto('/competitions');
    await expect(page).toHaveURL(/\/login/);
  });

  test('credenciales inválidas muestran error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill('noexiste@test.com');
    await page.getByLabel('Contraseña').fill('wrongpassword');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page.getByText('Correo o contraseña incorrectos.')).toBeVisible({ timeout: 12_000 });
  });

  test('admin inicia sesión y llega al dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill(ADMIN.email);
    await page.getByLabel('Contraseña').fill(ADMIN.password);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page).toHaveURL(/\/home/, { timeout: 30_000 });
  });

  test('juez inicia sesión y llega al dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill(JUDGE_BUILDING.email);
    await page.getByLabel('Contraseña').fill(JUDGE_BUILDING.password);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page).toHaveURL(/\/(home|assignments)/, { timeout: 30_000 });
  });

});
