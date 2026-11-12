import { test, expect } from '@playwright/test';
import { REG_ID } from './helpers';

test.describe('Páginas públicas (sin autenticación)', () => {

  test('landing page carga', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('página de schedule carga sin auth', async ({ page }) => {
    await page.goto('/schedule');
    await expect(page).toHaveURL('/schedule');
    await expect(page.locator('body')).toBeVisible();
    // No debe redirigir a login
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('página de resultados públicos carga sin auth', async ({ page }) => {
    await page.goto(`/results/${REG_ID}`);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('página de login accesible sin auth', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
  });

});
