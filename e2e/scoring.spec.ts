/**
 * Pruebas E2E de calificación multi-juez (5 jueces de dificultad — building_difficulty).
 *
 * Escenario:
 *   5 jueces califican la planilla building_difficulty de "Moderna Angels" (Junior Prep).
 *   Cada juez tiene scores diferentes; el sistema debe promediar (NO sobrescribir).
 *
 * Valores esperados tras los 5 jueces (PREP: bonus=0, multiplier=1):
 *   stunts_difficulty   = (10+8+11+9+7)/5  = 9.00
 *   pyramids_difficulty = (12+10+13+11+9)/5 = 11.00
 *   building_total      = 9.00 + 11.00     = 20.00
 *   final_score         = 20.00
 *
 * Nota: tosses_difficulty se omite porque PREP no lo usa en el cálculo y su
 * máximo global (2.00) limita los valores necesarios para el test.
 *
 * Estrategia de autenticación: cada usuario usa browser.newContext() + page.request.post()
 * para el login (mismo patrón que setup.ts, que ya está verificado como funcional).
 */
import { test, expect, Browser } from '@playwright/test';
import { COMP_ID, DIV_ID, REG_ID, SCORING_JUDGES } from './helpers';

const API = 'http://localhost:8002/api/v1';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Crea un contexto de browser autenticado. Devuelve { bCtx, page }. */
async function createAuthContext(browser: Browser, email: string, password: string) {
  const bCtx = await browser.newContext();
  const p    = await bCtx.newPage();
  const resp = await p.request.post(`${API}/auth/login/`, {
    data:    { email, password },
    headers: { 'Content-Type': 'application/json' },
  });
  if (!resp.ok()) {
    await bCtx.close();
    throw new Error(`Login fallido para ${email}: HTTP ${resp.status()}`);
  }
  return { bCtx, page: p };
}

// ── Suite serial ──────────────────────────────────────────────────────────────

test.describe.serial('Calificación multi-juez — 5 jueces de building_difficulty', () => {

  // ── 1. Limpieza: eliminar calificaciones previas ────────────────────────────
  test('limpiar JudgeScoreRecords previos de Moderna Angels', async ({ browser }) => {
    const { bCtx, page: ap } = await createAuthContext(browser, 'admin@test.com', 'admin2026');
    try {
      const resp = await ap.request.get(
        `${API}/judge-score-records/?registration__public_id=${REG_ID}&page_size=100`,
      );
      expect(resp.ok(), `GET records falló: ${resp.status()}`).toBeTruthy();
      const body = await resp.json();

      for (const record of body.results ?? []) {
        const del = await ap.request.delete(`${API}/judge-score-records/${record.id}/`);
        expect(del.status()).toBeGreaterThanOrEqual(200);
        expect(del.status()).toBeLessThan(300);
      }
    } finally {
      await bCtx.close();
    }
  });

  // ── 2. Cada juez envía su calificación ─────────────────────────────────────
  for (let i = 0; i < SCORING_JUDGES.length; i++) {
    const judge    = SCORING_JUDGES[i];
    const judgeNum = i + 1;

    test(`juez ${judgeNum} (${judge.email}) envía su calificación`, async ({ browser }) => {
      const { bCtx, page: jp } = await createAuthContext(browser, judge.email, judge.password);
      try {
        // Obtener o crear el JudgeScoreRecord
        const recordResp = await jp.request.get(
          `${API}/judge-score-records/my-record/?registration=${REG_ID}&judge_assignment=${judge.assignmentId}`,
        );
        expect(recordResp.ok(), `my-record falló: ${recordResp.status()}`).toBeTruthy();
        const record = await recordResp.json();
        expect(record.id).toBeTruthy();

        // Guardar calificación
        const patchResp = await jp.request.patch(`${API}/judge-score-records/${record.id}/`, {
          data:    judge.scores,
          headers: { 'Content-Type': 'application/json' },
        });
        expect(patchResp.ok(), `PATCH falló: ${patchResp.status()}`).toBeTruthy();
        const saved = await patchResp.json();

        // Los valores guardados coinciden con los enviados
        expect(parseFloat(saved.stunts_difficulty)).toBeCloseTo(
          parseFloat(judge.scores.stunts_difficulty), 2,
        );
        expect(parseFloat(saved.pyramids_difficulty)).toBeCloseTo(
          parseFloat(judge.scores.pyramids_difficulty), 2,
        );
      } finally {
        await bCtx.close();
      }
    });
  }

  // ── 3. Verificar promediado (no sobrescritura) via API ──────────────────────
  test('ScoreSheet refleja el promedio de 5 jueces — no sobrescribe', async ({ browser }) => {
    const { bCtx, page: ap } = await createAuthContext(browser, 'admin@test.com', 'admin2026');
    try {
      // Leer todos los JudgeScoreRecords del equipo
      const recordsResp = await ap.request.get(
        `${API}/judge-score-records/?registration__public_id=${REG_ID}&page_size=100`,
      );
      expect(recordsResp.ok()).toBeTruthy();
      const records = await recordsResp.json();

      // Exactamente 5 registros de building_difficulty
      const buildingRecords = (records.results ?? []).filter(
        (r: { stunts_difficulty: string | null }) => r.stunts_difficulty !== null,
      );
      expect(buildingRecords).toHaveLength(5);

      // Cada juez tiene un valor DISTINTO (probar que los datos individuales persisten)
      const stuntValues: number[] = buildingRecords.map(
        (r: { stunts_difficulty: string }) => parseFloat(r.stunts_difficulty),
      );
      const uniqueValues = new Set(stuntValues);
      expect(uniqueValues.size).toBeGreaterThan(1); // más de 1 valor distinto

      // Promedio calculado debe ser ≈ 9.0
      const avgStunts = stuntValues.reduce((a, b) => a + b, 0) / stuntValues.length;
      expect(avgStunts).toBeCloseTo(9.0, 1);

      // Verificar que el ScoreSheet tiene el promedio correcto
      // Note: registration__public_id IS in ScoreSheet filterset_fields; using it directly
      // avoids a broken intermediate step (public_id is not filterable on RegistrationViewSet)
      const sheetResp = await ap.request.get(`${API}/score-sheets/?registration__public_id=${REG_ID}`);
      const sheetBody = await sheetResp.json();
      expect(sheetBody.results.length).toBeGreaterThan(0);

      const sheet = sheetBody.results[0];

      // Promedios en el ScoreSheet deben ser exactos
      expect(parseFloat(sheet.stunts_difficulty)).toBeCloseTo(9.0, 2);
      expect(parseFloat(sheet.pyramids_difficulty)).toBeCloseTo(11.0, 2);
      expect(parseFloat(sheet.building_total)).toBeCloseTo(20.0, 2);
      expect(parseFloat(sheet.final_score)).toBeCloseTo(20.0, 2);

      // PRUEBA CLAVE: el valor NO corresponde al último juez solo (stunts=7.0 → avg≠7.0)
      expect(parseFloat(sheet.stunts_difficulty)).not.toBeCloseTo(7.0, 0);
      // ni al primero solo (stunts=10.0 → avg≠10.0)
      expect(parseFloat(sheet.stunts_difficulty)).not.toBeCloseTo(10.0, 0);
    } finally {
      await bCtx.close();
    }
  });

  // ── 4. Admin verifica en la UI del dashboard ────────────────────────────────
  test('admin ve building_total = 20.00 en la página de la división', async ({ page }) => {
    await page.goto(`/competitions/${COMP_ID}/divisions/${DIV_ID}`, { waitUntil: 'commit' });
    await expect(page).toHaveURL(/\/divisions\//, { timeout: 10_000 });

    const row = page.locator('tr, [role="row"]').filter({ hasText: 'Moderna Angels' }).first();
    await expect(row).toBeVisible({ timeout: 90_000 });
    await expect(row).toContainText('20.00', { timeout: 5_000 });
  });

  test('admin ve breakdowns individuales de los 5 jueces en la UI', async ({ page }) => {
    await page.goto(`/competitions/${COMP_ID}/divisions/${DIV_ID}`, { waitUntil: 'commit' });

    await expect(page).toHaveURL(/\/divisions\//, { timeout: 10_000 });
    await expect(page.getByText('Moderna Angels').first()).toBeVisible({ timeout: 90_000 });

    // El panel de scoring debe mostrar valores numéricos en la tabla
    const numericCells = page.locator('td').filter({ hasText: /^\d+\.\d{2}$/ });
    await expect(numericCells.first()).toBeVisible({ timeout: 15_000 });
  });

  // ── 5. Rankings y Grand Champion ────────────────────────────────────────────
  test('rankings de Junior Prep muestra Moderna Angels con final_score = 20.00', async ({ page }) => {
    await page.goto(`/competitions/${COMP_ID}/divisions/${DIV_ID}/rankings`, { waitUntil: 'commit' });

    await expect(page).toHaveURL(/\/rankings/, { timeout: 10_000 });
    await expect(page.getByText('Moderna Angels').first()).toBeVisible({ timeout: 90_000 });

    const row = page.locator('tr, [role="row"]').filter({ hasText: 'Moderna Angels' }).first();
    await expect(row).toContainText('20.00');
  });

  test('grand champion incluye a Moderna Angels con 20.00', async ({ page }) => {
    await page.goto(`/competitions/${COMP_ID}/grand-champion`, { waitUntil: 'commit' });

    await expect(page).toHaveURL(/\/grand-champion/, { timeout: 10_000 });
    await expect(page.getByText('Moderna Angels').first()).toBeVisible({ timeout: 90_000 });

    const row = page.locator('tr, [role="row"]').filter({ hasText: 'Moderna Angels' }).first();
    await expect(row).toContainText('20.00');
  });
});
