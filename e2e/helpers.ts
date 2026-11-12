import { Page } from '@playwright/test';

export const COMP_ID = '429b9322-729d-46fd-bd27-717076dbf6c2';
export const DIV_ID  = '5e693da5-826c-4537-b54f-92a4f39ae240'; // Junior Prep
export const REG_ID  = 'be38241e-0756-46a4-848a-2c2203dddae4'; // Moderna Angels

export const ADMIN = { email: 'admin@test.com', password: 'admin2026' };
export const JUDGE_BUILDING = { email: 'gemielesanton@gmail.com', password: 'juez2026' };   // building_difficulty
export const JUDGE_OVERALL  = { email: 'kathleen_1396@hotmail.com', password: 'juez2026' };  // overall
export const JUDGE_TUMBLING = { email: 'xavier.herediam10@gmail.com', password: 'juez2026' }; // tumbling_difficulty

// 5 jueces de dificultad (building_difficulty) para pruebas de promediado multi-juez
// assignment IDs: 44–48 (Copa DV Championship 2026)
// tosses_difficulty is not included: PREP system doesn't use it and its global max (2.00)
// conflicts with values needed to demonstrate non-trivial averages.
export const SCORING_JUDGES = [
  { email: 'juez_dif1@test.com', password: 'juez2026', assignmentId: 44,
    scores: { stunts_difficulty: '10.00', pyramids_difficulty: '12.00' } },
  { email: 'juez_dif2@test.com', password: 'juez2026', assignmentId: 45,
    scores: { stunts_difficulty: '8.00',  pyramids_difficulty: '10.00' } },
  { email: 'juez_dif3@test.com', password: 'juez2026', assignmentId: 46,
    scores: { stunts_difficulty: '11.00', pyramids_difficulty: '13.00' } },
  { email: 'juez_dif4@test.com', password: 'juez2026', assignmentId: 47,
    scores: { stunts_difficulty: '9.00',  pyramids_difficulty: '11.00' } },
  { email: 'juez_dif5@test.com', password: 'juez2026', assignmentId: 48,
    scores: { stunts_difficulty: '7.00',  pyramids_difficulty: '9.00'  } },
];
// Promedios esperados: stunts=9.0, pyramids=11.0
// building_total (PREP: stunts_diff + pyramids_diff) = 20.00
// final_score (bonus=0, multiplier=1) = 20.00

export async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.waitForURL(/\/(home|assignments)/, { timeout: 90_000 });
}
