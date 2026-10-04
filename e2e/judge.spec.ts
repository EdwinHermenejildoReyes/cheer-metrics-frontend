import { test, expect } from '@playwright/test';
import { COMP_ID, DIV_ID, REG_ID } from './helpers';

// Logged in as GABRIELA MIELES (building_difficulty judge)

test.describe('Juez — acceso a planillas asignadas', () => {

  test('juez ve la competencia en la lista', async ({ page }) => {
    await page.goto('/competitions');
    await expect(page.getByText('Copa DV Championship 2026')).toBeVisible({ timeout: 15_000 });
  });

  test('página de asignaciones muestra la competencia', async ({ page }) => {
    await page.goto('/assignments');
    await expect(page.getByText('Copa DV Championship 2026')).toBeVisible({ timeout: 15_000 });
  });

  test('juez accede a la planilla building-difficulty asignada', async ({ page }) => {
    await page.goto(
      `/competitions/${COMP_ID}/divisions/${DIV_ID}/sheets/${REG_ID}/building-difficulty`
    );
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('body')).toBeVisible();
    // No debe mostrar mensaje de acceso denegado
    await expect(page.getByText(/403|forbidden|no autorizado|sin permiso/i)).not.toBeVisible({ timeout: 5_000 });
  });

  test('juez NO puede acceder a tumbling-difficulty (no asignado)', async ({ page }) => {
    await page.goto(
      `/competitions/${COMP_ID}/divisions/${DIV_ID}/sheets/${REG_ID}/tumbling-difficulty`
    );
    // Debe redirigir o mostrar error de acceso
    const url = page.url();
    const isBlocked =
      url.includes('/login') ||
      url.includes('/assignments') ||
      (await page.getByText(/sin acceso|no autorizado|forbidden|403|no tienes/i).isVisible().catch(() => false));
    expect(isBlocked).toBe(true);
  });

  test('juez NO puede acceder a overall (no asignado)', async ({ page }) => {
    await page.goto(
      `/competitions/${COMP_ID}/divisions/${DIV_ID}/sheets/${REG_ID}/overall`
    );
    const url = page.url();
    const isBlocked =
      url.includes('/login') ||
      url.includes('/assignments') ||
      (await page.getByText(/sin acceso|no autorizado|forbidden|403|no tienes/i).isVisible().catch(() => false));
    expect(isBlocked).toBe(true);
  });

  test('juez puede ver el detalle de la competencia', async ({ page }) => {
    await page.goto(`/competitions/${COMP_ID}`);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByText('Copa DV Championship 2026')).toBeVisible({ timeout: 15_000 });
  });

  test('juez puede ver la división Junior Prep', async ({ page }) => {
    await page.goto(`/competitions/${COMP_ID}/divisions/${DIV_ID}`);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByText('Junior Prep')).toBeVisible({ timeout: 15_000 });
  });

});
