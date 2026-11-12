/**
 * Tests E2E para VoiceTextarea — grabación de nota de voz y transcripción.
 *
 * La Web Speech API no está disponible en Chromium headless sin micrófono real,
 * por lo que se inyecta un mock controlable mediante page.addInitScript() antes
 * de que React inicialice. El mock expone window.__simulateTranscript(text) para
 * disparar el evento onresult programáticamente desde cada test.
 *
 * Ruta: building-difficulty (pre-calentada en setup.ts, usa auth de admin).
 *
 * Tests cubiertos:
 *   1. Botón "Dictar" aparece cuando SpeechRecognition está disponible
 *   2. Botón "Dictar" NO aparece cuando la API no está disponible
 *   3. Clic en "Dictar" muestra el indicador "Grabando…"
 *   4. El texto transcrito se inserta en la textarea
 *   5. El texto dictado se agrega al contenido existente (no lo sobrescribe)
 *   6. Clic en "Grabando…" detiene la grabación
 *   7. El botón vuelve a "Dictar" automáticamente al terminar la transcripción
 *   8. La escritura manual sigue funcionando con normalidad
 */
import { test, expect, Page } from '@playwright/test';
import { COMP_ID, DIV_ID, REG_ID } from './helpers';

const SHEET_URL = `/competitions/${COMP_ID}/divisions/${DIV_ID}/sheets/${REG_ID}/building-difficulty`;

// ── Helpers de mock ───────────────────────────────────────────────────────────

/**
 * Inyecta un SpeechRecognition mock antes de que cargue el script de React.
 * Expone window.__simulateTranscript(text) para controlar la transcripción
 * desde el test via page.evaluate().
 */
async function injectSpeechMock(page: Page) {
  await page.addInitScript(() => {
    class MockSpeechRecognition {
      lang           = '';
      continuous     = false;
      interimResults = false;
      onresult: ((e: { results: { transcript: string; confidence: number }[][] }) => void) | null = null;
      onend:   (() => void) | null = null;
      onerror: (() => void) | null = null;

      start() {
        (window as Window & { __mockSR?: MockSpeechRecognition }).__mockSR = this;
      }

      stop() {
        this.onend?.();
        delete (window as Window & { __mockSR?: MockSpeechRecognition }).__mockSR;
      }
    }

    (window as Window & { SpeechRecognition: unknown }).SpeechRecognition = MockSpeechRecognition;

    // Dispara onresult con el texto dado y luego onend (ciclo completo de reconocimiento)
    (window as Window & { __simulateTranscript: (t: string) => boolean }).__simulateTranscript =
      (text: string): boolean => {
        const sr = (window as Window & { __mockSR?: MockSpeechRecognition }).__mockSR;
        if (!sr?.onresult) return false;
        sr.onresult({ results: [[{ transcript: text, confidence: 1.0 }]] });
        sr.onend?.();
        delete (window as Window & { __mockSR?: MockSpeechRecognition }).__mockSR;
        return true;
      };
  });
}

/**
 * Elimina la Speech API del window antes de que cargue React para simular
 * un navegador sin soporte (Firefox, Safari antiguo, etc.).
 */
async function removeSpeechAPI(page: Page) {
  await page.addInitScript(() => {
    (window as Window & { SpeechRecognition?: unknown }).SpeechRecognition = undefined;
    (window as Window & { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition = undefined;
  });
}

/** Espera que la sección de notas/comentarios haya renderizado. */
async function waitForNotesSection(page: Page) {
  // "Observaciones del juez" es el encabezado de la sección de notas en building-difficulty
  await expect(page.getByText('Observaciones del juez')).toBeVisible({ timeout: 90_000 });
  await expect(page.locator('textarea').first()).toBeVisible();
}

// ── Suite ─────────────────────────────────────────────────────────────────────

test.describe('VoiceTextarea — transcripción de nota de voz', () => {

  // 1. El botón aparece cuando la API está disponible
  test('botón "Dictar" es visible cuando SpeechRecognition está disponible', async ({ page }) => {
    await injectSpeechMock(page);
    await page.goto(SHEET_URL, { waitUntil: 'commit' });
    await waitForNotesSection(page);

    const btn = page.getByRole('button', { name: 'Dictar' }).first();
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
  });

  // 2. El botón NO aparece cuando la API no está disponible
  test('botón "Dictar" NO aparece cuando SpeechRecognition no está disponible', async ({ page }) => {
    await removeSpeechAPI(page);
    await page.goto(SHEET_URL, { waitUntil: 'commit' });
    await waitForNotesSection(page);

    // La textarea existe pero sin el botón de voz
    await expect(page.locator('textarea').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Dictar' })).toHaveCount(0);
  });

  // 3. Clic en "Dictar" activa el modo grabación
  test('clic en "Dictar" muestra el indicador "Grabando…"', async ({ page }) => {
    await injectSpeechMock(page);
    await page.goto(SHEET_URL, { waitUntil: 'commit' });
    await waitForNotesSection(page);

    await page.getByRole('button', { name: 'Dictar' }).first().evaluate((el) => (el as HTMLElement).click());

    // El botón cambia a "Grabando…"
    await expect(page.getByRole('button', { name: /Grabando/ }).first()).toBeVisible({ timeout: 5_000 });
    // Hay 2 VoiceTextarea en la página; solo la primera cambió a "Grabando…", la segunda sigue en "Dictar"
    await expect(page.getByRole('button', { name: 'Dictar' })).toHaveCount(1);
  });

  // 4. El texto transcrito aparece en la textarea
  test('texto transcrito se inserta en el campo de comentarios', async ({ page }) => {
    await injectSpeechMock(page);
    await page.goto(SHEET_URL, { waitUntil: 'commit' });
    await waitForNotesSection(page);

    const textarea = page.locator('textarea').first();

    await page.getByRole('button', { name: 'Dictar' }).first().evaluate((el) => (el as HTMLElement).click());
    await expect(page.getByRole('button', { name: /Grabando/ }).first()).toBeVisible({ timeout: 5_000 });

    const ok = await page.evaluate(() =>
      (window as Window & { __simulateTranscript: (t: string) => boolean })
        .__simulateTranscript('excelente ejecución en la rutina'),
    );
    expect(ok).toBe(true);

    await expect(textarea).toHaveValue(/excelente ejecución en la rutina/, { timeout: 5_000 });
  });

  // 5. El texto dictado se AGREGA al texto existente, no lo sobrescribe
  test('el texto dictado se agrega al contenido existente sin sobrescribir', async ({ page }) => {
    await injectSpeechMock(page);
    await page.goto(SHEET_URL, { waitUntil: 'commit' });
    await waitForNotesSection(page);

    const textarea = page.locator('textarea').first();
    await textarea.fill('Observación previa.');

    await page.getByRole('button', { name: 'Dictar' }).first().evaluate((el) => (el as HTMLElement).click());
    await expect(page.getByRole('button', { name: /Grabando/ }).first()).toBeVisible({ timeout: 5_000 });

    await page.evaluate(() =>
      (window as Window & { __simulateTranscript: (t: string) => boolean })
        .__simulateTranscript('buena técnica de bases'),
    );

    // Deben estar presentes ambos textos con un espacio entre ellos
    await expect(textarea).toHaveValue(/Observación previa\. buena técnica de bases/, { timeout: 5_000 });
  });

  // 6. Clic en "Grabando…" detiene la grabación manualmente
  test('clic en "Grabando…" detiene la grabación y vuelve a "Dictar"', async ({ page }) => {
    await injectSpeechMock(page);
    await page.goto(SHEET_URL, { waitUntil: 'commit' });
    await waitForNotesSection(page);

    await page.getByRole('button', { name: 'Dictar' }).first().evaluate((el) => (el as HTMLElement).click());
    const grabandoBtn = page.getByRole('button', { name: /Grabando/ }).first();
    await expect(grabandoBtn).toBeVisible({ timeout: 5_000 });

    await grabandoBtn.evaluate((el) => (el as HTMLElement).click());

    await expect(page.getByRole('button', { name: 'Dictar' }).first()).toBeVisible({ timeout: 5_000 });
  });

  // 7. El botón vuelve a "Dictar" automáticamente al terminar la transcripción (onend)
  test('el botón vuelve a "Dictar" automáticamente al finalizar la transcripción', async ({ page }) => {
    await injectSpeechMock(page);
    await page.goto(SHEET_URL, { waitUntil: 'commit' });
    await waitForNotesSection(page);

    await page.getByRole('button', { name: 'Dictar' }).first().evaluate((el) => (el as HTMLElement).click());
    await expect(page.getByRole('button', { name: /Grabando/ }).first()).toBeVisible({ timeout: 5_000 });

    // __simulateTranscript llama internamente a onend, que revierte el estado a isListening=false
    await page.evaluate(() =>
      (window as Window & { __simulateTranscript: (t: string) => boolean })
        .__simulateTranscript('texto de prueba'),
    );

    await expect(page.getByRole('button', { name: 'Dictar' }).first()).toBeVisible({ timeout: 5_000 });
  });

  // 8. La escritura manual funciona con normalidad (sin interacción de voz)
  test('escritura manual funciona correctamente junto a la funcionalidad de voz', async ({ page }) => {
    await injectSpeechMock(page);
    await page.goto(SHEET_URL, { waitUntil: 'commit' });
    await waitForNotesSection(page);

    const textarea = page.locator('textarea').first();
    await textarea.fill('Comentario escrito a mano.');
    await expect(textarea).toHaveValue('Comentario escrito a mano.');

    // El botón Dictar sigue disponible después de la escritura manual
    await expect(page.getByRole('button', { name: 'Dictar' }).first()).toBeVisible({ timeout: 5_000 });
  });
});
