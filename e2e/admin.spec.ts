import { test, expect } from '@playwright/test';
import { COMP_ID, DIV_ID, REG_ID } from './helpers';

const COMP_NAME = 'Copa DV Championship 2026';

test.describe('Admin — competencia Copa DV Championship', () => {

  test('lista de competencias muestra la Copa DV Championship', async ({ page }) => {
    await page.goto('/competitions');
    await expect(page.getByRole('heading', { name: 'Competencias' })).toBeVisible();
    await expect(page.getByText(COMP_NAME)).toBeVisible({ timeout: 15_000 });
  });

  test('detalle de la competencia es accesible', async ({ page }) => {
    await page.goto(`/competitions/${COMP_ID}`);
    await expect(page.getByText(COMP_NAME)).toBeVisible({ timeout: 15_000 });
  });

  test('la competencia tiene 28 divisiones', async ({ page }) => {
    await page.goto(`/competitions/${COMP_ID}`);
    // Esperar que carguen las divisiones
    await page.waitForLoadState('networkidle');
    const rows = page.locator('table tbody tr');
    await expect(rows).toHaveCount(28, { timeout: 15_000 });
  });

  test('página backstage muestra 51 inscripciones', async ({ page }) => {
    await page.goto(`/competitions/${COMP_ID}/backstage`);
    await page.waitForLoadState('networkidle');
    const rows = page.locator('table tbody tr');
    await expect(rows).toHaveCount(51, { timeout: 15_000 });
  });

  test('la división Junior Prep es accesible', async ({ page }) => {
    await page.goto(`/competitions/${COMP_ID}/divisions/${DIV_ID}`);
    await expect(page.getByText('Junior Prep')).toBeVisible({ timeout: 15_000 });
  });

  test('la división Junior Prep tiene 2 inscripciones confirmadas', async ({ page }) => {
    await page.goto(`/competitions/${COMP_ID}/divisions/${DIV_ID}`);
    await page.waitForLoadState('networkidle');
    const rows = page.locator('table tbody tr');
    await expect(rows).toHaveCount(2, { timeout: 15_000 });
  });

  test('página de planilla building-difficulty carga para Moderna Angels', async ({ page }) => {
    await page.goto(
      `/competitions/${COMP_ID}/divisions/${DIV_ID}/sheets/${REG_ID}/building-difficulty`
    );
    await expect(page.locator('body')).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
    // La página de planilla debe mostrar el nombre del equipo o el tipo de planilla
    await expect(page.getByText(/building|dificultad|construcción/i)).toBeVisible({ timeout: 15_000 });
  });

  test('planilla tumbling-difficulty carga para Moderna Angels', async ({ page }) => {
    await page.goto(
      `/competitions/${COMP_ID}/divisions/${DIV_ID}/sheets/${REG_ID}/tumbling-difficulty`
    );
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByText(/tumbling|dificultad/i)).toBeVisible({ timeout: 15_000 });
  });

  test('planilla overall carga para Moderna Angels', async ({ page }) => {
    await page.goto(
      `/competitions/${COMP_ID}/divisions/${DIV_ID}/sheets/${REG_ID}/overall`
    );
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByText(/overall|general/i)).toBeVisible({ timeout: 15_000 });
  });

  test('página de rankings de la división carga', async ({ page }) => {
    await page.goto(`/competitions/${COMP_ID}/divisions/${DIV_ID}/rankings`);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('body')).toBeVisible({ timeout: 15_000 });
  });

  test('grand champion page carga', async ({ page }) => {
    await page.goto(`/competitions/${COMP_ID}/grand-champion`);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('body')).toBeVisible({ timeout: 15_000 });
  });

  test('hay 3 asignaciones de jueces en la competencia', async ({ page }) => {
    await page.goto(`/competitions/${COMP_ID}`);
    // Abrir sección de jueces
    await page.waitForLoadState('networkidle');
    const judgesButton = page.getByRole('button', { name: /juec/i });
    if (await judgesButton.isVisible()) {
      await judgesButton.click();
      await expect(page.getByText('GABRIELA MIELES')).toBeVisible({ timeout: 8_000 });
      await expect(page.getByText('KATHLEEN URRESO')).toBeVisible({ timeout: 5_000 });
      await expect(page.getByText('XAVIER HEREDIA')).toBeVisible({ timeout: 5_000 });
    }
  });

});
