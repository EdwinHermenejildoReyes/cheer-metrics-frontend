/**
 * Pruebas E2E: Reasignación de planilla grupal → individual para una división específica.
 *
 * Escenario:
 *   1. Un juez (JUDGE_OVERALL) tiene la planilla `building` (grupal) asignada para
 *      TODAS las divisiones.
 *   2. Se edita esa asignación para restringirla a div1 únicamente (PATCH divisions=[div1]).
 *   3. Se crea una nueva asignación `building_difficulty` (individual) para div2 únicamente.
 *   4. Se verifica que ambas asignaciones coexisten sin conflicto de constraint único.
 *   5. Se verifica que cada asignación cubre exactamente las divisiones esperadas.
 *   6. UI: el selector de planillas habilita tipos individuales cuando scope='specific',
 *      aunque el juez ya tenga la planilla grupal equivalente.
 *
 * Diseño:
 *   - Usa JUDGE_OVERALL (kathleen) porque solo tiene `overall` — sin building previo.
 *   - Todos los tests son serial (estado compartido entre pasos).
 *   - El cleanup al inicio y al final garantiza idempotencia.
 */

import { test, expect, Browser } from '@playwright/test';
import path from 'path';
import { COMP_ID, ADMIN, JUDGE_OVERALL } from './helpers';

const API = 'http://localhost:8002/api/v1';

// ── Auth helpers ───────────────────────────────────────────────────────────────

async function adminContext(browser: Browser) {
  const bCtx = await browser.newContext();
  const ap   = await bCtx.newPage();
  const resp = await ap.request.post(`${API}/auth/login/`, {
    data:    { email: ADMIN.email, password: ADMIN.password },
    headers: { 'Content-Type': 'application/json' },
  });
  if (!resp.ok()) { await bCtx.close(); throw new Error(`Admin login failed: ${resp.status()}`); }
  return { bCtx, ap };
}

async function judgeContext(browser: Browser) {
  const bCtx = await browser.newContext();
  const jp   = await bCtx.newPage();
  const resp = await jp.request.post(`${API}/auth/login/`, {
    data:    { email: JUDGE_OVERALL.email, password: JUDGE_OVERALL.password },
    headers: { 'Content-Type': 'application/json' },
  });
  if (!resp.ok()) { await bCtx.close(); throw new Error(`Judge login failed: ${resp.status()}`); }
  return { bCtx, jp };
}

// ── Shared state ───────────────────────────────────────────────────────────────

let competitionIntId: number;
let div1IntId: number;  // División que mantiene planilla grupal
let div2IntId: number;  // División reasignada a planilla individual
let judgeUserId: number;
let buildingAssignmentId: number;       // ID de la asignación building creada en el test
let buildingDiffAssignmentId: number;   // ID de la asignación building_difficulty creada

// ── Suite serial ───────────────────────────────────────────────────────────────

test.describe.serial('Reasignación grupal → individual por división', () => {

  // ── 0. Preparación: obtener IDs y limpiar asignaciones previas ─────────────

  test('preparación: obtener IDs de competencia, divisiones y juez', async ({ browser }) => {
    const { bCtx: aBCtx, ap } = await adminContext(browser);
    const { bCtx: jBCtx, jp } = await judgeContext(browser);
    try {
      // Competition int ID
      const compResp = await ap.request.get(`${API}/competitions/${COMP_ID}/`);
      expect(compResp.ok(), `GET competition failed: ${compResp.status()}`).toBeTruthy();
      const comp = await compResp.json();
      competitionIntId = comp.id;
      expect(typeof competitionIntId).toBe('number');

      // Two division int IDs
      const divResp = await ap.request.get(
        `${API}/divisions/?competition__public_id=${COMP_ID}&page_size=5`,
      );
      expect(divResp.ok()).toBeTruthy();
      const divBody = await divResp.json();
      expect(divBody.results.length, 'Se necesitan al menos 2 divisiones').toBeGreaterThanOrEqual(2);
      div1IntId = divBody.results[0].id;
      div2IntId = divBody.results[1].id;
      expect(div1IntId).not.toBe(div2IntId);

      // Judge user ID (get via /me/ while logged in as judge)
      const meResp = await jp.request.get(`${API}/auth/users/me/`);
      expect(meResp.ok()).toBeTruthy();
      judgeUserId = (await meResp.json()).id;
      expect(typeof judgeUserId).toBe('number');
    } finally {
      await aBCtx.close();
      await jBCtx.close();
    }
  });

  test('preparación: eliminar asignaciones building/building_difficulty previas del juez', async ({ browser }) => {
    const { bCtx, ap } = await adminContext(browser);
    try {
      const resp = await ap.request.get(
        `${API}/judge-assignments/?competition__public_id=${COMP_ID}&page_size=100`,
      );
      expect(resp.ok()).toBeTruthy();
      const body = await resp.json();
      const targets: { id: number }[] = (body.results ?? []).filter(
        (a: { user: number; sheet_type: string }) =>
          a.user === judgeUserId &&
          ['building', 'building_difficulty'].includes(a.sheet_type),
      );
      for (const a of targets) {
        const del = await ap.request.delete(`${API}/judge-assignments/${a.id}/`);
        expect(del.status()).toBeLessThan(300);
      }
    } finally {
      await bCtx.close();
    }
  });

  // ── 1. Crear asignación building para TODAS las divisiones ─────────────────

  test('crear asignación building (grupal) para todas las divisiones', async ({ browser }) => {
    const { bCtx, ap } = await adminContext(browser);
    try {
      const now   = Date.now();
      const from  = new Date(now - 3_600_000).toISOString();
      const until = new Date(now + 86_400_000).toISOString();

      const resp = await ap.request.post(`${API}/judge-assignments/`, {
        data: {
          user:        judgeUserId,
          competition: competitionIntId,
          sheet_type:  'building',
          divisions:   [],           // vacío = todas las divisiones
          access_from:  from,
          access_until: until,
        },
      });
      expect(resp.ok(), `POST judge-assignments: ${resp.status()} — ${await resp.text()}`).toBeTruthy();
      const body = await resp.json();
      buildingAssignmentId = body.id;
      expect(body.sheet_type).toBe('building');
      expect(body.divisions).toHaveLength(0);
    } finally {
      await bCtx.close();
    }
  });

  test('la asignación building cubre todas las divisiones inicialmente', async ({ browser }) => {
    const { bCtx, ap } = await adminContext(browser);
    try {
      const resp = await ap.request.get(`${API}/judge-assignments/${buildingAssignmentId}/`);
      expect(resp.ok()).toBeTruthy();
      const body = await resp.json();
      expect(body.divisions).toHaveLength(0);
      expect(body.user).toBe(judgeUserId);
      expect(body.sheet_type).toBe('building');
    } finally {
      await bCtx.close();
    }
  });

  // ── 2. UI: selector permite individual cuando scope='specific' ─────────────

  async function openJudgePanelAndSelectJudge(browser: Browser) {
    const adminState = path.join(__dirname, '.auth/admin.json');
    const bCtx = await browser.newContext({ storageState: adminState });
    const page = await bCtx.newPage();

    // 'commit' evita el timeout infinito del WebSocket HMR que bloquea 'networkidle'
    await page.goto(`/competitions/${COMP_ID}`, { waitUntil: 'commit', timeout: 90_000 });
    await page.waitForLoadState('domcontentloaded');

    // Esperar y hacer clic en el panel de jueces — buscar por texto parcial "Jueces asignados"
    const judgesBtn = page.locator('button').filter({ hasText: 'Jueces asignados' }).first();
    await judgesBtn.waitFor({ state: 'visible', timeout: 30_000 });
    await judgesBtn.click();

    // Esperar que la API de usuarios cargue antes de intentar seleccionar
    await page.waitForResponse(
      (r) => r.url().includes('/users/') && r.status() === 200,
      { timeout: 20_000 },
    ).catch(() => { /* puede que ya cargó antes del waitFor */ });

    // Esperar el <select> de usuarios y seleccionar el juez
    const userSelect = page.locator('select').first();
    await userSelect.waitFor({ state: 'visible', timeout: 15_000 });
    await userSelect.selectOption({ value: String(judgeUserId) }, { timeout: 15_000 });

    // Esperar a que el dropdown de planillas aparezca (confirma que el form terminó de renderizar)
    const dropdownTrigger = page.locator('text=— Seleccionar planillas —');
    await dropdownTrigger.waitFor({ state: 'visible', timeout: 10_000 });

    return { bCtx, page, dropdownTrigger };
  }

  test('UI: building_difficulty aparece deshabilitado con scope=all', async ({ browser }) => {
    const { bCtx, page, dropdownTrigger } = await openJudgePanelAndSelectJudge(browser);
    try {
      // Abrir dropdown de planillas
      await dropdownTrigger.click();

      // Building (Dificultad) debe estar deshabilitado (scope=all, 'building' ya existe)
      const buildingDiffBtn = page.locator('button').filter({ hasText: 'Building (Dificultad)' }).first();
      await expect(buildingDiffBtn).toBeVisible({ timeout: 10_000 });
      await expect(buildingDiffBtn).toBeDisabled();
    } finally {
      await bCtx.close();
    }
  });

  test('UI: building_difficulty se habilita al cambiar a divisiones específicas', async ({ browser }) => {
    const { bCtx, page, dropdownTrigger } = await openJudgePanelAndSelectJudge(browser);
    try {
      // Cambiar a scope "específicas" — buscar por texto parcial sin acentos problemáticos
      const specificBtn = page.locator('button').filter({ hasText: 'específicas' }).first();
      await specificBtn.waitFor({ state: 'visible', timeout: 10_000 });
      await specificBtn.click();

      // Abrir dropdown de planillas
      await dropdownTrigger.click();

      // Building (Dificultad) debe estar HABILITADO con scope=specific
      const buildingDiffBtn = page.locator('button').filter({ hasText: 'Building (Dificultad)' }).first();
      await expect(buildingDiffBtn).toBeVisible({ timeout: 10_000 });
      await expect(buildingDiffBtn).toBeEnabled();

      // Building (Elevaciones) también debe estar habilitado con scope=specific
      // (la competencia usa sheet_mode=individual, así que grupal 'Building' no aparece)
      const buildingExecBtn = page.locator('button').filter({ hasText: 'Building (Elevaciones)' }).first();
      await expect(buildingExecBtn).toBeVisible({ timeout: 10_000 });
      await expect(buildingExecBtn).toBeEnabled();
    } finally {
      await bCtx.close();
    }
  });

  // ── 3. PATCH: restringir building a div1 únicamente ───────────────────────

  test('editar asignación building para restringirla a div1 únicamente', async ({ browser }) => {
    const { bCtx, ap } = await adminContext(browser);
    try {
      const resp = await ap.request.patch(`${API}/judge-assignments/${buildingAssignmentId}/`, {
        data: { divisions: [div1IntId] },
      });
      expect(resp.ok(), `PATCH failed: ${resp.status()} — ${await resp.text()}`).toBeTruthy();
      const body = await resp.json();
      expect(body.divisions).toHaveLength(1);
      expect(body.divisions).toContain(div1IntId);
      expect(body.divisions).not.toContain(div2IntId);
    } finally {
      await bCtx.close();
    }
  });

  test('tras el PATCH, building solo cubre div1 y NO div2', async ({ browser }) => {
    const { bCtx, ap } = await adminContext(browser);
    try {
      const resp = await ap.request.get(`${API}/judge-assignments/${buildingAssignmentId}/`);
      expect(resp.ok()).toBeTruthy();
      const body = await resp.json();
      expect(body.divisions).toEqual([div1IntId]);
    } finally {
      await bCtx.close();
    }
  });

  // ── 4. Crear building_difficulty para div2 (sin conflicto de constraint) ──

  test('crear building_difficulty para div2 junto a building existente — sin error 400', async ({ browser }) => {
    const { bCtx, ap } = await adminContext(browser);
    try {
      const now   = Date.now();
      const from  = new Date(now - 3_600_000).toISOString();
      const until = new Date(now + 86_400_000).toISOString();

      const resp = await ap.request.post(`${API}/judge-assignments/`, {
        data: {
          user:        judgeUserId,
          competition: competitionIntId,
          sheet_type:  'building_difficulty',
          divisions:   [div2IntId],
          access_from:  from,
          access_until: until,
        },
      });
      // Debe crearse sin conflicto: building y building_difficulty son sheet_types distintos
      expect(
        resp.ok(),
        `POST building_difficulty falló inesperadamente: ${resp.status()} — ${await resp.text()}`,
      ).toBeTruthy();
      const body = await resp.json();
      buildingDiffAssignmentId = body.id;
      expect(body.sheet_type).toBe('building_difficulty');
      expect(body.divisions).toHaveLength(1);
      expect(body.divisions).toContain(div2IntId);
    } finally {
      await bCtx.close();
    }
  });

  // ── 5. Verificar estado final: dos asignaciones independientes ─────────────

  test('building_difficulty cubre div2 y NO div1', async ({ browser }) => {
    const { bCtx, ap } = await adminContext(browser);
    try {
      const resp = await ap.request.get(`${API}/judge-assignments/${buildingDiffAssignmentId}/`);
      expect(resp.ok()).toBeTruthy();
      const body = await resp.json();
      expect(body.divisions).toEqual([div2IntId]);
      expect(body.divisions).not.toContain(div1IntId);
    } finally {
      await bCtx.close();
    }
  });

  test('el juez tiene exactamente dos asignaciones building en la competencia', async ({ browser }) => {
    const { bCtx, ap } = await adminContext(browser);
    try {
      const resp = await ap.request.get(
        `${API}/judge-assignments/?competition__public_id=${COMP_ID}&page_size=100`,
      );
      expect(resp.ok()).toBeTruthy();
      const body = await resp.json();
      const judgeBuilding = (body.results ?? []).filter(
        (a: { user: number; sheet_type: string }) =>
          a.user === judgeUserId &&
          ['building', 'building_difficulty'].includes(a.sheet_type),
      );
      expect(judgeBuilding).toHaveLength(2);
      const buildingTypes = judgeBuilding.map((a: { sheet_type: string }) => a.sheet_type).sort();
      expect(buildingTypes).toEqual(['building', 'building_difficulty']);
    } finally {
      await bCtx.close();
    }
  });

  test('div1 solo tiene cobertura building (grupal), NO building_difficulty', async ({ browser }) => {
    const { bCtx, ap } = await adminContext(browser);
    try {
      const resp = await ap.request.get(
        `${API}/judge-assignments/?competition__public_id=${COMP_ID}&page_size=100`,
      );
      expect(resp.ok()).toBeTruthy();
      const body = await resp.json();
      const forDiv1 = (body.results ?? []).filter(
        (a: { user: number; divisions: number[]; sheet_type: string }) =>
          a.user === judgeUserId && a.divisions.includes(div1IntId),
      );
      const typesForDiv1 = forDiv1.map((a: { sheet_type: string }) => a.sheet_type);
      expect(typesForDiv1).toContain('building');
      expect(typesForDiv1).not.toContain('building_difficulty');
    } finally {
      await bCtx.close();
    }
  });

  test('div2 solo tiene cobertura building_difficulty (individual), NO building grupal', async ({ browser }) => {
    const { bCtx, ap } = await adminContext(browser);
    try {
      const resp = await ap.request.get(
        `${API}/judge-assignments/?competition__public_id=${COMP_ID}&page_size=100`,
      );
      expect(resp.ok()).toBeTruthy();
      const body = await resp.json();
      const forDiv2 = (body.results ?? []).filter(
        (a: { user: number; divisions: number[]; sheet_type: string }) =>
          a.user === judgeUserId && a.divisions.includes(div2IntId),
      );
      const typesForDiv2 = forDiv2.map((a: { sheet_type: string }) => a.sheet_type);
      expect(typesForDiv2).toContain('building_difficulty');
      expect(typesForDiv2).not.toContain('building');
    } finally {
      await bCtx.close();
    }
  });

  // ── 6. Cleanup ────────────────────────────────────────────────────────────

  test('limpiar: eliminar las dos asignaciones creadas por la prueba', async ({ browser }) => {
    const { bCtx, ap } = await adminContext(browser);
    try {
      for (const id of [buildingAssignmentId, buildingDiffAssignmentId]) {
        if (!id) continue;
        const del = await ap.request.delete(`${API}/judge-assignments/${id}/`);
        expect(del.status(), `DELETE ${id} falló`).toBeLessThan(300);
      }
      // Verificar que no quedan asignaciones building del juez de prueba
      const resp = await ap.request.get(
        `${API}/judge-assignments/?competition__public_id=${COMP_ID}&page_size=100`,
      );
      const body = await resp.json();
      const remaining = (body.results ?? []).filter(
        (a: { user: number; sheet_type: string }) =>
          a.user === judgeUserId &&
          ['building', 'building_difficulty'].includes(a.sheet_type),
      );
      expect(remaining).toHaveLength(0);
    } finally {
      await bCtx.close();
    }
  });

});
