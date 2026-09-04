// ── Types ─────────────────────────────────────────────────────────────────────

export type SkillTableType = 'building' | 'tumbling';

export interface SkillColumn {
  header: string;
  items: string[];
}

/** One tier row within the building table */
export interface BuildingSection {
  /** "HABILIDADES DEL NIVEL" | "HABILIDADES AVANZADAS" | "HABILIDADES ÉLITE" */
  title: string;
  columns: SkillColumn[];
}

export interface BuildingTableData {
  levelLabel: string;
  sections: BuildingSection[];
}

/** One sub-table (Estática / Con Carrera) within the gym table */
export interface GymSubTable {
  title: string;
  abbreviations?: string;
  /** Override column headers; empty string in slot 2 hides the third column */
  colLabels?: [string, string, string];
  delNivel:  string[];
  avanzadas: string[];
  elite:     string[];
}

export interface GymTableData {
  levelLabel: string;
  subTables: GymSubTable[];
  footer: string;
}

export interface TossTableData {
  levelLabel: string;
  sinGiro: string[];
  conGiro: string[];
  restrictionNote?: string;
}

export interface LevelSkillTables {
  building: BuildingTableData | null;
  gym:      GymTableData | null;
  tosses:   TossTableData | null;
}

// ── Shared footer ─────────────────────────────────────────────────────────────

const GYM_FOOTER =
  'Cada habilidad separada por una viñeta es considerada una "habilidad diferente" ' +
  'y no recibirá crédito más de una vez, incluso si hay múltiples habilidades o ' +
  'variaciones en esa misma viñeta.';

// ── Building column headers by level ─────────────────────────────────────────

const COLS_L1 = ['ESTILO SUELTO', 'GIRO', 'COMBINACIÓN / OTRAS HABILIDADES', 'DESMONTE'];
const COLS_L2 = ['ESTILO INVERSIÓN', 'ESTILO SUELTO', 'GIRO', 'COMBINACIÓN / OTRAS HABILIDADES', 'DESMONTE'];
const COLS_L3_PLUS = ['ESTILO INVERSIÓN', 'ESTILO SUELTO', 'GIRO', 'COMBINACIÓN / OTRAS HABILIDADES', 'ESTILO COED', 'DESMONTE'];

/** Builds an empty-content BuildingTableData (columns defined, items TBD by operator) */
function buildingShell(label: string, cols: string[]): BuildingTableData {
  const makeSection = (title: string): BuildingSection => ({
    title,
    columns: cols.map(h => ({ header: h, items: [] })),
  });
  return {
    levelLabel: label,
    sections: [
      makeSection('HABILIDADES DEL NIVEL'),
      makeSection('HABILIDADES AVANZADAS'),
      makeSection('HABILIDADES ÉLITE'),
    ],
  };
}

// ── SKILL DATA ────────────────────────────────────────────────────────────────

const SKILL_TABLES: Record<string, LevelSkillTables> = {

  // ── L1 ────────────────────────────────────────────────────────────────────

  L1: {
    building: {
      levelLabel: 'Nivel 1',
      sections: [
        {
          title: 'HABILIDADES DEL NIVEL',
          columns: [
            {
              header: 'ESTILO SUELTO',
              items: [
                'Estilo Release desde nivel del suelo (switch up) hacia lib debajo del nivel prep',
                'Tic toc debajo del nivel prep (lib a lib)',
              ],
            },
            {
              header: 'GIRO',
              items: [
                'Transición con 1/4 de giro hacia debajo del nivel prep',
                'Transición con 1/4 de giro hacia nivel de suelo',
                'Transición con 1/4 de giro desde nivel prep',
              ],
            },
            {
              header: 'COMBINACIÓN / OTRAS HABILIDADES',
              items: [
                'Parado en espalda',
                'Show & go por nivel prep',
                'Escuadra',
                'Acostado de espalda',
                'Escuadra extendida',
                'Elevación en 1 pierna bajo nivel prep',
                'Acostado de espalda extendido',
                'Elevación en 1 pierna a nivel prep',
                'Sentado en hombros',
                'Silla',
                'Parado en hombros',
                'Prono',
              ],
            },
            {
              header: 'DESMONTE',
              items: ['Bajarse con paso'],
            },
          ],
        },
        {
          title: 'HABILIDADES AVANZADAS',
          columns: [
            {
              header: 'ESTILO SUELTO',
              items: [
                'Estilo Release desde nivel del suelo (switch up) hacia posición corporal debajo del nivel prep',
                'Tic Tic toc debajo del nivel prep (lib a posición corporal)',
                'Tic toc en nivel prep (lib a posición corporal) con un conector',
                'Estilo Release desde nivel de cintura hacia lib en nivel prep con conector',
                'Estilo Release desde nivel de suelo (switch up) hacia lib en nivel prep con conector',
              ],
            },
            {
              header: 'GIRO',
              items: [
                'Transición con 1/4 de giro desde nivel prep hacia nivel prep',
                'Transición con 1/4 desde nivel inferior a prep hacia lib en nivel prep con conector',
              ],
            },
            {
              header: 'COMBINACIÓN / OTRAS HABILIDADES',
              items: [
                'Tic toc con 1/4 de giro en nivel prep (lib a lib) con conector',
                'Tic toc con 1/4 de giro debajo del nivel prep (lib a posición corporal)',
                'Transición desde nivel inferior a prep hacia posición corporal en nivel prep con conector',
              ],
            },
            {
              header: 'DESMONTE',
              items: [],
            },
          ],
        },
        {
          title: 'HABILIDADES ÉLITE',
          columns: [
            {
              header: 'ESTILO SUELTO',
              items: [
                'Estilo Release desde nivel de suelo (switch up) hacia posición corporal en nivel prep con conector',
                'Tic Tic toc debajo del nivel prep (posición corporal a posición corporal)',
                'Tic toc en nivel prep (posición corporal a posición corporal) con conector',
                'Estilo Release desde nivel de cintura hacia posición corporal en nivel prep con conector',
              ],
            },
            {
              header: 'GIRO',
              items: [
                'Transición con 1/4 de giro desde nivel inferior a prep hacia elevación prep',
                'Transición con 1/4 desde nivel inferior a prep hacia posición corporal en nivel prep con conector',
              ],
            },
            {
              header: 'COMBINACIÓN / OTRAS HABILIDADES',
              items: [
                'Tic toc con 1/4 de giro en nivel prep (posición corporal a posición corporal) con conector',
                'Estilo Release con 1/4 de giro desde nivel del suelo (switch up) hacia lib en nivel prep con conector',
                'Estilo Release con 1/4 de giro desde nivel de cintura hacia lib en nivel prep con conector',
                'Tic toc con 1/4 de giro debajo del nivel prep (posición corporal a posición corporal)',
              ],
            },
            {
              header: 'DESMONTE',
              items: ['Cuna recta desde elevación prep'],
            },
          ],
        },
      ],
    },

    gym: {
      levelLabel: 'Nivel 1',
      subTables: [
        {
          title: 'GIMNASIA ESTÁTICA',
          delNivel: [
            'ROL ADELANTE',
            'ROL EN ESCUADRA',
            'ARCO DESDE EL SUELO',
            'ROL ATRÁS (VAT)',
            'PARADO DE MANOS (INVERTIDA)',
            'ARCO CON PATEO ATRÁS',
            'ARCO DESDE PARADA DE MANOS',
            'CAMINO ADELANTE / ATRÁS CON PIERNAS JUNTAS',
          ],
          avanzadas: [
            'CAMINO ATRÁS (BACKWALKOVER)',
            'CAMINO ATRÁS – VOLTEO ATRÁS – CAMINO ATRÁS',
            'ROL ATRÁS A INVERTIDA',
          ],
          elite: [
            'SERIE DE CAMINOS ATRÁS',
            'CAMINO ATRÁS CAMBIANDO PIERNA',
            'ROL ATRÁS HACIA INVERTIDA – CAMINO ATRÁS / SERIE DE CAMINOS ATRÁS',
            'VALDEZ',
          ],
        },
        {
          title: 'GIMNASIA CON CARRERA',
          delNivel: [
            'MEDIA LUNA',
            'MEDIA LUNA – ROL ATRÁS',
            'PARADO DE MANOS (INVERTIDA) – ROL ADELANTE',
          ],
          avanzadas: [
            'MEDIA LUNA – CAMINO ATRÁS / CAMINO ATRÁS CAMBIANDO PIERNA',
            'RONDADA (RO)',
            'CAMINO ADELANTE (IAD) / SERIE DE CAMINO ADELANTE',
            'INVERTIDA – ROL ADELANTE – MEDIA LUNA',
          ],
          elite: [
            'MEDIA LUNA – SERIE DE INVERSIONES ATRÁS',
            'CAMINO ADELANTE – MEDIA LUNA / RONDADA',
            'CAMINO ADELANTE – MEDIA LUNA – CAMINO ATRÁS / SERIE DE C.ATRÁS',
            'CAMINO ADELANTE – MEDIA LUNA – CAMINO ATRÁS CAMBIANDO PIERNA',
            'INVERTIDA – ROL ADELANTE – MEDIA LUNA – CAMINO ATRÁS / SERIE DE C.ATRÁS',
          ],
        },
      ],
      footer: GYM_FOOTER,
    },

    tosses: null,
  },

  // ── L2 ────────────────────────────────────────────────────────────────────

  L2: {
    building: {
      levelLabel: 'Nivel 2',
      sections: [
        {
          title: 'HABILIDADES DEL NIVEL',
          columns: [
            {
              header: 'ESTILO INVERSIÓN',
              items: [
                'Inversión desde nivel de suelo hacia nivel inferior a prep',
                'Inversión desde el nivel de suelo hacia nivel prep',
              ],
            },
            {
              header: 'ESTILO SUELTO',
              items: ['Tic toc en nivel prep (lib a lib)'],
            },
            {
              header: 'GIRO',
              items: [
                'Transición con 1/2 giro hacia nivel inferior a prep',
                'Transición con 1/2 giro hacia nivel prep',
                'Transición con 1/4 de giro hacia 1 pierna en nivel prep',
                'Transición con 1/4 de giro hacia extensión',
              ],
            },
            {
              header: 'COMBINACIÓN / OTRAS HABILIDADES',
              items: [
                'Elevación en 1 pierna a nivel prep',
                'Extensión',
                'Giro de barril/tronco',
                'Variaciones de salto de rana',
                'Subida de Walk in a prep, empuje a extensión',
                'Transición con 1/2 hacia prono',
              ],
            },
            {
              header: 'DESMONTE',
              items: ['Cuna recta desde posición corporal en nivel prep'],
            },
          ],
        },
        {
          title: 'HABILIDADES AVANZADAS',
          columns: [
            {
              header: 'ESTILO INVERSIÓN',
              items: [
                'Inversión desde nivel de suelo hacia elevación prep',
                'Inversión desde nivel de suelo hacia lib en nivel prep',
              ],
            },
            {
              header: 'ESTILO SUELTO',
              items: [
                'Tic toc en nivel prep (lib a posición corporal)',
                'Estilo Release desde nivel de suelo (switch up) hacia lib en nivel prep',
                'Estilo Release desde nivel de cintura hacia lib en nivel prep',
              ],
            },
            {
              header: 'GIRO',
              items: [
                'Transición con 1/2 giro en nivel prep hacia posición corporal en nivel prep',
                'Transición con 1/2 giro hacia lib en nivel prep',
              ],
            },
            {
              header: 'COMBINACIÓN / OTRAS HABILIDADES',
              items: [
                'Tic toc con 1/2 giro hacia nivel prep (1 pierna a lib)',
                'Inversión con 1/2 giro desde nivel de suelo hacia lib en nivel prep',
                'Transición con 1/2 giro desde extensión hacia posición de cuna',
              ],
            },
            {
              header: 'DESMONTE',
              items: ['Cuna recta desde extensión'],
            },
          ],
        },
        {
          title: 'HABILIDADES ÉLITE',
          columns: [
            {
              header: 'ESTILO INVERSIÓN',
              items: [
                'Inversión desde nivel de suelo hacia extensión',
                'Inversión desde nivel de suelo hacia posición corporal en nivel prep',
              ],
            },
            {
              header: 'ESTILO SUELTO',
              items: [
                'Tic toc en nivel prep (posición corporal a posición corporal)',
                'Estilo Release desde nivel de suelo (switch up) hacia posición corporal en nivel prep',
                'Estilo Release desde nivel de cintura hacia posición corporal en nivel prep',
              ],
            },
            {
              header: 'GIRO',
              items: [
                'Transición con 1/2 giro hacia extensión',
                'Transición con 1/2 giro hacia posición corporal en nivel prep',
              ],
            },
            {
              header: 'COMBINACIÓN / OTRAS HABILIDADES',
              items: [
                'Inversión con 1/2 giro desde nivel de suelo hacia extensión',
                'Inversión con 1/2 giro desde nivel de suelo hacia posición corporal en nivel prep',
                'Tic toc con 1/2 giro en nivel prep (1 pierna a posición corporal)',
              ],
            },
            {
              header: 'DESMONTE',
              items: ['Desmonte con 1/4 de giro desde elevación prep o extensión hacia cuna'],
            },
          ],
        },
      ],
    },

    gym: {
      levelLabel: 'Nivel 2',
      subTables: [
        {
          title: 'GIMNASIA ESTÁTICA',
          delNivel: ['FLIC FLAC (FF)', 'FLIC FLAC A UNA PIERNA'],
          avanzadas: [
            'CAMINO ATRÁS – FLIC FLAC',
            'CAMINO ATRÁS – FLIC FLAC A UNA PIERNA',
            'FLIC FLAC A UNA PIERNA – C.ATRÁS',
            'VALDEZ – CAMINO ATRÁS – FF',
          ],
          elite: [
            'C.ATRÁS – FF A UNA PIERNA – FF',
            'C.ATRÁS CAMBIANDO PIERNA – FF',
            'FF A UNA PIERNA – C.ATRÁS – FF',
            'VALDEZ – FF / FF A UNA PIERNA',
            'ROL ATRÁS A INVERTIDA – FF / FF A UNA PIERNA',
          ],
        },
        {
          title: 'GIMNASIA CON CARRERA',
          delNivel: ['MEDIA LUNA – FLIC FLAC', 'RONDADA (RO) – FLIC FLAC'],
          avanzadas: [
            'RONDADA – FLIC FLAC A UNA PIERNA',
            'MEDIA LUNA – FLIC FLAC A UNA PIERNA',
            'HAND VAULT (HV)',
            'CAMINO ADELANTE – HAND VAULT',
          ],
          elite: [
            'SERIE DE HAND VAULTS',
            'HV DOS A DOS / UNA PIERNA',
            'MEDIA LUNA – SERIE DE FLIC FLACS',
            'RONDADA – SERIE DE FLIC FLACS',
            'CAMINO ADELANTE – RONDADA – FF / SERIE DE FF',
            'MEDIA LUNA – FF A UNA PIERNA – C.ATRÁS – FF / SERIE DE FF',
          ],
        },
      ],
      footer: GYM_FOOTER,
    },

    tosses: {
      levelLabel: 'Nivel 2',
      sinGiro: ['Lanzamiento recto'],
      conGiro: [],
      restrictionNote:
        'En All Star Novice, Novice Plus y Prep no se permite: lanzamientos, cunas desde nivel de cintura en elevaciones, cunas desde nivel de cintura con conector en pirámides.',
    },
  },

  // ── L3 ────────────────────────────────────────────────────────────────────

  L3: {
    building: {
      levelLabel: 'Nivel 3',
      sections: [
        {
          title: 'HABILIDADES DEL NIVEL',
          columns: [
            {
              header: 'ESTILO INVERSIÓN',
              items: [
                'Invertida debajo del nivel prep',
                'Invertida en nivel prep',
                'Inversión descendente debajo del nivel prep',
              ],
            },
            {
              header: 'ESTILO SUELTO',
              items: [
                'Soltar hacia nivel prep o inferior',
                'Tic toc debajo del nivel prep (lib a lib)',
                'Tic toc debajo del nivel prep hacia nivel prep (lib a lib)',
              ],
            },
            {
              header: 'GIRO',
              items: [
                'Transición con 3/4 de giro hacia 1 pierna en nivel prep',
                'Transición con giro completo debajo del nivel prep',
                'Transición con giro completo hacia nivel prep',
                'Transición con giro completo hacia/en lib en nivel prep',
                'Transición con 1/4 de giro hacia 1 pierna extendida',
              ],
            },
            {
              header: 'COMBINACIÓN / OTRAS HABILIDADES',
              items: [
                'Volteo adelante suspendido',
                'Transición con giro completo desde nivel prep hacia prono',
                'Lib extendido',
              ],
            },
            {
              header: 'ESTILO COED',
              items: [
                'Asistido or No Asistido:',
                'Walk in / toss a manos',
                'Walk in / toss a manos impulso hacia extensión',
                'Walk in hacia extensión',
              ],
            },
            {
              header: 'DESMONTE',
              items: [
                'Cuna recta desde 1 pierna extendida',
                'Desmonte con 1/4 de giro desde 1 pierna extendida',
              ],
            },
          ],
        },
        {
          title: 'HABILIDADES AVANZADAS',
          columns: [
            {
              header: 'ESTILO INVERSIÓN',
              items: [
                'Inversión desde nivel de cintura/prep hacia 1 pierna en nivel extendido',
                'Inversión desde nivel de suelo hacia lib extendido',
              ],
            },
            {
              header: 'ESTILO SUELTO',
              items: [
                'Soltar desde nivel de suelo (switch up) hacia lib en nivel prep',
                'Soltar desde nivel de cintura (agrupado, posición X, etc.) hacia lib en nivel prep',
                'Tic toc desde lib en nivel prep hacia posición corporal extendido',
              ],
            },
            {
              header: 'GIRO',
              items: [
                'Transición con giro completo hacia posición corporal en nivel prep',
                'Transición con giro completo en nivel prep (lib a lib)',
                'Transición con 1/2 giro hacia lib extendido',
                'Transición con giro completo en nivel prep hacia posición corporal en nivel prep',
              ],
            },
            {
              header: 'COMBINACIÓN / OTRAS HABILIDADES',
              items: [
                'Tic toc con giro completo en nivel prep (lib a lib)',
                'Inversión con giro completo hacia elevación prep',
                'Inversión con 1/2 giro hacia lib extendido',
                'Volteo Adelante suspendido con 1/2 giro',
              ],
            },
            {
              header: 'ESTILO COED',
              items: [
                'Asistido:',
                'Walk in a manos, impulso hacia 1 pierna extendida',
                'Toss a manos, impulso hacia 1 pierna extendida',
                'Walk in hacia 1 pierna / 1 brazo extendido',
              ],
            },
            {
              header: 'DESMONTE',
              items: [],
            },
          ],
        },
        {
          title: 'HABILIDADES ÉLITE',
          columns: [
            {
              header: 'ESTILO INVERSIÓN',
              items: ['Inversión desde nivel de suelo hacia posición corporal extendido'],
            },
            {
              header: 'ESTILO SUELTO',
              items: [
                'Soltar desde nivel de suelo (switch up) hacia posición corporal en nivel prep',
                'Soltar desde nivel de cintura (agrupado, posición X, etc.) hacia posición corporal en nivel prep',
              ],
            },
            {
              header: 'GIRO',
              items: [
                'Transición con giro completo en nivel prep (posición corporal a posición corporal)',
                'Transición con giro completo hacia extensión',
                'Transición con 1/2 giro hacia posición corporal extendido',
              ],
            },
            {
              header: 'COMBINACIÓN / OTRAS HABILIDADES',
              items: [
                'Tic toc con giro completo en nivel prep (lib a posición corporal)',
                'Inversión con giro completo desde nivel prep o inferior hacia 1 pierna en nivel prep',
                'Inversión con 1/2 giro desde nivel de suelo hacia posición corporal extendido',
                'Volteo adelante suspendido con giro completo',
              ],
            },
            {
              header: 'ESTILO COED',
              items: [
                'No Asistido:',
                'Walk in a manos, impulso hacia 1 pierna extendida',
                'Toss a manos, impulso hacia 1 pierna extendida',
                'Walk in hacia 1 pierna / 1 brazo extendido',
              ],
            },
            {
              header: 'DESMONTE',
              items: [
                'Desmonte con giro completo desde nivel prep hacia cuna o desmonte con giro desde extensión hacia cuna',
              ],
            },
          ],
        },
      ],
    },

    gym: {
      levelLabel: 'Nivel 3',
      subTables: [
        {
          title: 'GIMNASIA ESTÁTICA',
          abbreviations: 'C.ATRÁS = CAMINO ATRÁS  •  FF = FLIC FLAC',
          delNivel: [
            'FF / FF A UNA PIERNA – FF / FF A UNA PIERNA',
            'SALTO AVANZADO – FF / FF A UNA PIERNA',
            'FF / SERIE DE FF – SALTO AVANZADO',
          ],
          avanzadas: [
            'C.ATRÁS – SERIE DE FF',
            'FF – FF A UNA PIERNA – FF',
            'FF – FF – FF O MÁS',
            'SALTO AVANZADO – SERIE DE FF',
          ],
          elite: [
            'FF / SERIE DE FF – SALTO AVANZADO – FF / SERIE DE FF',
            'SALTO AVANZADO – FF – SALTO AVANZADO – FF',
            'FF A UNA PIERNA – SERIE DE FF',
            'FF A UNA PIERNA – C.ATRÁS – SERIE DE FF',
            'C.ATRÁS – FF – SALTO AVANZADO – FF / SERIE DE FF',
          ],
        },
        {
          title: 'GIMNASIA CON CARRERA',
          abbreviations: 'HAND VAULT = HV  •  MORTAL ADELANTE = MAD',
          delNivel: ['RONDADA (RO) – AGRUPADO', 'AERIAL'],
          avanzadas: [
            'MORTAL ADELANTE (MAD)',
            'RONDADA (RO) – SERIE DE FF – AGRUPADO',
            'CAMINO ADELANTE – AERIAL',
            'HV DOS A DOS / UNA PIERNA – AERIAL',
            'RONDADA – FLIC FLAC – AGRUPADO',
          ],
          elite: [
            'RO – FF A UNA PIERNA – ½ GIRO – RO – A – AGRUPADO',
            'CAMINO ADELANTE – RO – A – AGRUPADO',
            'HV DOS A DOS / UNA PIERNA – RO – A – AGRUPADO',
            'HV – MAD',
          ],
        },
      ],
      footer: GYM_FOOTER,
    },

    tosses: {
      levelLabel: 'Nivel 3',
      sinGiro: ['Agrupado Arco', 'Lib arco', 'Carpado arco', 'Patada arco', 'Agrupado-X', 'Toe touch'],
      conGiro: ['Giro completo'],
    },
  },

  // ── L4 ────────────────────────────────────────────────────────────────────

  L4: {
    building: {
      levelLabel: 'Nivel 4',
      sections: [
        {
          title: 'HABILIDADES DEL NIVEL',
          columns: [
            {
              header: 'ESTILO INVERSIÓN',
              items: [
                'Inversión suelta hacia nivel prep o inferior',
                'Inversión suelta en nivel prep',
                'Inversión descendente desde nivel prep',
              ],
            },
            {
              header: 'ESTILO SUELTO',
              items: [
                'Tic toc desde nivel extendido hacia nivel prep o inferior (lib a 1 pierna)',
                'Movimiento suelto de helicóptero',
                'Soltar desde nivel prep hacia nivel prep',
                'Soltar hacia extensión',
              ],
            },
            {
              header: 'GIRO',
              items: [
                'Transición con 1½ giros hacia nivel inferior a prep',
                'Transición con 1½ giros hacia nivel prep',
                'Transición con 3/4 hacia elevación extendida',
              ],
            },
            {
              header: 'COMBINACIÓN / OTRAS HABILIDADES',
              items: ['Transición con giro completo hacia nivel prep o inferior'],
            },
            {
              header: 'ESTILO COED',
              items: [
                'Asistido o No Asistido:',
                'Walk in / toss a manos',
                'Walk in / toss a manos, impulso hacia extensión',
                'Walk in / toss hacia extensión',
              ],
            },
            {
              header: 'DESMONTE',
              items: [],
            },
          ],
        },
        {
          title: 'HABILIDADES AVANZADAS',
          columns: [
            {
              header: 'ESTILO INVERSIÓN',
              items: [
                'Elevación invertida extendida',
                'Inversión suelta desde nivel de cintura hacia elevación extendida',
              ],
            },
            {
              header: 'ESTILO SUELTO',
              items: [
                'Soltar desde nivel de cintura hacia lib extendido',
                'Tic toc desde nivel extendido hacia nivel prep o inferior (posición corporal a lib)',
                'Soltar desde nivel de suelo (switch up) hacia posición corporal extendida',
              ],
            },
            {
              header: 'GIRO',
              items: [
                'Transición con 1½ giro hacia / en nivel prep a lib',
                'Transición con 1½ giro en nivel prep (lib a posición corporal)',
                'Transición con giro completo hacia extensión',
              ],
            },
            {
              header: 'COMBINACIÓN / OTRAS HABILIDADES',
              items: [
                'Con giro completo desde nivel de cintura (tic toc, agrupado o posición X) hacia lib en nivel prep',
                'Soltar con giro completo desde nivel de suelo (switch up) hacia lib en nivel prep',
                'Soltar con giro completo en nivel prep (1 pierna a lib)',
                'Soltar con 1½ giro desde nivel de suelo (switch up) hacia lib en nivel prep',
              ],
            },
            {
              header: 'ESTILO COED',
              items: [
                'Asistido:',
                'Walk in a manos, impulso hacia 1 pierna extendida',
                'Toss a manos, impulso hacia 1 pierna extendida',
                'Walk in hacia 1 pierna / 1 brazo extendido',
                'Toss hacia 1 pierna / 1 brazo extendido',
              ],
            },
            {
              header: 'DESMONTE',
              items: ['Desmonte con giro completo desde 1 pierna extendida hacia cuna'],
            },
          ],
        },
        {
          title: 'HABILIDADES ÉLITE',
          columns: [
            {
              header: 'ESTILO INVERSIÓN',
              items: [
                'Inversión suelta desde nivel prep o mano a mano desde nivel prep hacia elevación extendida',
                'Subida de flic flac hacia elevación extendida',
              ],
            },
            {
              header: 'ESTILO SUELTO',
              items: [
                'Soltar desde nivel de cintura hacia posición corporal extendida',
                'Tic toc desde nivel extendido hacia nivel prep o inferior (posición corporal a posición corporal)',
                'Soltar desde nivel prep hacia posición corporal extendida',
              ],
            },
            {
              header: 'GIRO',
              items: [
                'Transición con 1½ giro hacia / en nivel prep a posición corporal',
                'Transición con 1½ giro en nivel prep (posición corporal a posición corporal)',
                'Transición con 1½ giro hacia extensión',
                'Transición con giro completo hacia 1 pierna extendida',
                'Transición con giro completo en nivel extendido',
              ],
            },
            {
              header: 'COMBINACIÓN / OTRAS HABILIDADES',
              items: [
                'Soltar con giro completo desde nivel de cintura (tic toc, agrupado o posición X) hacia posición corporal en prep',
                'Soltar con giro completo desde nivel de suelo (switch up) hacia posición corporal en nivel prep',
                'Soltar con giro completo en nivel prep (1 pierna a posición corporal)',
                'Soltar con 1½ giro desde nivel de suelo (switch up) hacia posición corporal en nivel prep',
                'Soltar con 1½ giro desde nivel de cintura/prep (tic toc, agrupado o posición X) hacia lib en nivel prep',
                'Inversión con giro completo hacia 1 pierna extendida',
              ],
            },
            {
              header: 'ESTILO COED',
              items: [
                'No Asistido:',
                'Walk in a manos, impulso hacia 1 pierna extendida',
                'Toss a manos, impulso hacia 1 pierna extendida',
                'Walk in hacia 1 pierna / 1 brazo extendido',
                'Toss hacia 1 pierna / 1 brazo extendido',
              ],
            },
            {
              header: 'DESMONTE',
              items: [
                'Desmonte con doble giro desde elevación prep/extensión hacia cuna',
                'Desmonte con pateo giro',
              ],
            },
          ],
        },
      ],
    },

    gym: {
      levelLabel: 'Nivel 4',
      subTables: [
        {
          title: 'GIMNASIA ESTÁTICA',
          abbreviations: 'MORTAL ATRÁS AGRUPADO = AGRUPADO',
          delNivel: [
            'ONODI',
            'ROL ATRÁS – AGRUPADO',
          ],
          avanzadas: [
            'SERIE DE FLIC FLACS – AGRUPADO',
            'MORTAL AGRUPADO',
            'CAMINO ATRÁS – AGRUPADO',
            'ROL A INVERTIDA – AGRUPADO',
            'VALDEZ – AGRUPADO',
          ],
          elite: [
            'FLIC FLAC / FLIC FLAC A 1 PIERNA – AGRUPADO',
            'SALTO AVANZADO – SERIE DE FLIC FLACS – AGRUPADO',
            'SALTO AVANZADO – FLIC FLAC – AGRUPADO',
          ],
        },
        {
          title: 'GIMNASIA CON CARRERA',
          abbreviations: 'MORTAL ATRÁS EXTENDIDO = EXTENDIDO',
          delNivel: [
            'MEDIA LUNA – AGRUPADO',
            'CAMINO ADELANTE – MEDIA LUNA – AGRUPADO',
            'RONDADA – EXTENDIDO',
            'RONDADA – ONODI',
            'AERIAL ADELANTE',
            'AERIAL ADELANTE – RONDADA – A – AGRUPADO',
            'HAND VAULT – MORTAL ADELANTE',
          ],
          avanzadas: [
            'MORTAL ADELANTE – MORTAL ADELANTE',
            'MORTAL ADELANTE A 1 PIERNA – AERIAL',
            'RONDADA – SERIE DE FLIC FLACS – EXTENDIDO',
            'RONDADA – ONODI – A – AGRUPADO',
            'MORTAL ADELANTE A 1 PIERNA – RONDADA – A – AGRUPADO',
            'AERIAL – AGRUPADO / EXTENDIDO / EXTENDIDO A 1 PIERNA',
            'CAMINO ADELANTE – AERIAL – AGRUPADO',
            'RONDADA – A – TEMPO / AGRUPADO – A – AGRUPADO',
            'AERIAL ADELANTE – RO – A – TEMPO – A – AGRUPADO',
            'CAMINO ADELANTE – RONDADA – A – TEMPO / AGRUPADO – A – AGRUPADO',
            'MORTAL ADELANTE A 1 PIERNA – RONDADA – A – TEMPO / AGRUPADO – A – AGRUPADO',
            'HAND VAULT – MORTAL ADELANTE A 1 PIERNA – RONDADA – A – AGRUPADO',
          ],
          elite: [
            'HAND VAULT – MORTAL ADELANTE A 1 PIERNA – RONDADA – A – TEMPO / AGRUPADO – A – AGRUPADO',
            'RONDADA – FLIC FLAC – EXTENDIDO / EXTENDIDO A 1 PIERNA / X-OUT / PATEO',
            'RONDADA – ONODI – A – EXTENDIDO',
            'CAMINO ADELANTE – RONDADA – A – EXTENDIDO',
            'AERIAL ADELANTE – RONDADA – A – TEMPO – A – EXTENDIDO',
            'MORTAL ADELANTE A 1 PIERNA – RONDADA – A – TEMPO / AGRUPADO – A – EXTENDIDO',
            'RONDADA – A – TEMPO / AGRUPADO – A – EXTENDIDO',
            'HAND VAULT – MORTAL ADELANTE A 1 PIERNA – RONDADA – A – EXTENDIDO',
            'MORTAL ADELANTE A 1 PIERNA – RONDADA – A – EXTENDIDO / AGRUPADO – A – EXTENDIDO',
          ],
        },
      ],
      footer: GYM_FOOTER,
    },

    tosses: {
      levelLabel: 'Nivel 4',
      sinGiro: ['Agrupado Pateo', 'Carpado X', 'Gancho pateo', 'Doble pateo', 'Doble toe touch'],
      conGiro: ['Agrupado giro', 'Lib giro', 'Carpado giro', 'Pateo giro', 'Toe touch giro', 'Giro toe touch', 'Doble giro'],
    },
  },

  // ── L5 ────────────────────────────────────────────────────────────────────

  L5: {
    building: {
      levelLabel: 'Nivel 5',
      sections: [
        {
          title: 'HABILIDADES DEL NIVEL',
          columns: [
            {
              header: 'ESTILO INVERSIÓN',
              items: [
                'Inversión descendente desde elevación extendida',
                'Inversión descendente desde 1 pierna extendida',
              ],
            },
            {
              header: 'ESTILO SUELTO',
              items: [
                'Tic toc en nivel extendido (lib a lib)',
                'Tic toc desde nivel prep hacia nivel extendido (lib a lib)',
              ],
            },
            {
              header: 'GIRO',
              items: ['Transición con 1¼ giro hacia elevación extendida'],
            },
            {
              header: 'COMBINACIÓN / OTRAS HABILIDADES',
              items: [
                'Soltar con 1/4 de giro desde nivel de suelo (switch up) hacia 1 pierna extendida',
                'Movimientos sueltos de helicóptero',
                'Entre 1½ y 2 giros hacia prono',
                'Soltar con 1/2 giro desde nivel de suelo (switch up) hacia lib extendido',
              ],
            },
            {
              header: 'ESTILO COED',
              items: [
                'Asistido o No Asistido:',
                'Walk in / toss a manos',
                'Walk in / toss a manos, impulso hacia extensión',
                'Walk in / toss hacia extensión',
              ],
            },
            {
              header: 'DESMONTE',
              items: ['Desmonte con doble giro desde 1 pierna en nivel prep hacia cuna'],
            },
          ],
        },
        {
          title: 'HABILIDADES AVANZADAS',
          columns: [
            {
              header: 'ESTILO INVERSIÓN',
              items: [
                'Inversión suelta desde nivel prep o mano a mano en nivel prep hacia extensión',
                'Subida de flic flac hacia extensión',
              ],
            },
            {
              header: 'ESTILO SUELTO',
              items: ['Tic toc desde nivel prep hacia nivel extendido (lib a posición corporal)'],
            },
            {
              header: 'GIRO',
              items: [
                'Transición con giro completo hacia lib extendido',
                'Transición con 1½ giro hacia extensión',
                'Transición con doble giro hacia / en nivel prep',
              ],
            },
            {
              header: 'COMBINACIÓN / OTRAS HABILIDADES',
              items: [
                'Tic toc entre 1/4 y 3/4 de giro hacia lib extendido',
                'Soltar con 1/2 giro desde nivel de suelo (switch up) hacia posición corporal extendido',
                'Soltar con 1/2 giro desde nivel de cintura (agrupado) hacia lib extendido',
                'Soltar con giro completo desde nivel de suelo (switch up) hacia lib extendido',
              ],
            },
            {
              header: 'ESTILO COED',
              items: [
                'Asistido:',
                'Walk in a manos, impulso hacia 1 pierna extendida',
                'Toss a manos, impulso hacia 1 pierna extendida',
                'Walk in hacia 1 pierna / 1 brazo extendido',
                'Toss hacia 1 pierna / 1 brazo extendido',
              ],
            },
            {
              header: 'DESMONTE',
              items: ['Desmonte con doble giro desde lib extendido hacia cuna'],
            },
          ],
        },
        {
          title: 'HABILIDADES ÉLITE',
          columns: [
            {
              header: 'ESTILO INVERSIÓN',
              items: [
                'Inversión suelta desde nivel prep o mano a mano en nivel prep hacia lib extendido',
                'Subida de flic flac hacia lib extendido',
              ],
            },
            {
              header: 'ESTILO SUELTO',
              items: [
                'Tic toc en nivel extendido (lib a posición corporal)',
                'Tic toc en nivel extendido (posición corporal a posición corporal)',
              ],
            },
            {
              header: 'GIRO',
              items: [
                'Transición con giro completo hacia posición corporal extendido',
                'Transición con 1½ giro hacia 1 pierna extendida',
                'Transición con doble giro hacia / en extensión',
              ],
            },
            {
              header: 'COMBINACIÓN / OTRAS HABILIDADES',
              items: [
                'Tic toc entre 1/4 y 3/4 en nivel extendido (lib a posición corporal)',
                'Soltar con 1/2 giro desde nivel de cintura (agrupado) hacia posición corporal extendido',
                'Soltar con giro completo desde nivel de suelo (switch up) hacia posición corporal extendido',
                'Tic toc con giro completo hacia nivel extendido (1 pierna a lib)',
                'Tic toc con giro completo en nivel extendido (1 pierna a lib)',
              ],
            },
            {
              header: 'ESTILO COED',
              items: [
                'No Asistido:',
                'Walk in a manos, impulso hacia 1 pierna extendida',
                'Toss a manos, impulso hacia 1 pierna extendida',
                'Walk in hacia 1 pierna / 1 brazo extendido',
                'Toss hacia 1 pierna / 1 brazo extendido',
              ],
            },
            {
              header: 'DESMONTE',
              items: ['Desmonte con doble giro desde posición corporal extendido hacia cuna'],
            },
          ],
        },
      ],
    },

    gym: {
      levelLabel: 'Nivel 5',
      subTables: [
        {
          title: 'GIMNASIA ESTÁTICA',
          abbreviations: 'MORTAL ATRÁS AGRUPADO = AGRUPADO  •  MORTAL ATRÁS EXTENDIDO = EXTENDIDO',
          delNivel: [
            'AGRUPADO – FLIC FLAC – AGRUPADO',
            'AGRUPADO – SERIE DE FLIC FLACS – AGRUPADO',
            'FLIC FLAC / SERIE DE FLIC FLACS – AGRUPADO – AGRUPADO',
          ],
          avanzadas: [
            'SALTO AVANZADO – AGRUPADO ADELANTE / ATRÁS',
            'SERIE DE FLIC FLACS – TEMPO / AGRUPADO – FLIC FLAC – AGRUPADO',
            'FLIC FLAC – TEMPO / AGRUPADO – FLIC FLAC – AGRUPADO',
            'SALTO AVANZADO – SERIE DE FLIC FLACS – TEMPO – FLIC FLAC – AGRUPADO',
            'SALTO AVANZADO – SERIE DE FLIC FLACS – TEMPO – AGRUPADO',
            'SERIE DE FLIC FLACS – EXTENDIDO',
            'SERIE DE FLIC FLACS – TEMPO – AGRUPADO',
          ],
          elite: [
            'FLIC FLAC – TEMPO – AGRUPADO',
            'FLIC FLAC – EXTENDIDO',
            'SALTO AVANZADO – FLIC FLAC / SERIE DE FLIC FLACS – EXTENDIDO',
            'SALTO AVANZADO – FLIC FLAC – TEMPO – AGRUPADO',
            'FLIC FLAC – TEMPO / AGRUPADO – EXTENDIDO',
            'SERIE DE FLIC FLACS – TEMPO – EXTENDIDO / EXTENDIDO A 1 PIERNA',
            'SALTO AVANZADO – FLIC FLAC / SERIE DE FLIC FLACS – TEMPO – A – EXTENDIDO',
          ],
        },
        {
          title: 'GIMNASIA CON CARRERA',
          abbreviations: 'MORTAL ATRÁS CON GIRO (360 GRADOS) = GIRO',
          delNivel: [
            'BARANI',
            'RONDADA – AGRUPADO CON 1/2 GIRO',
            'RONDADA – GIRO',
          ],
          avanzadas: [
            'HAND VAULT – BARANI',
            'RONDADA – SERIE DE FLIC FLACS – GIRO',
            'ROUND OFF – ARABIAN',
            'AERIAL LATERAL (MEDIA LUNA SIN MANOS) – A – GIRO',
            'BARANI – A – EXTENDIDO',
          ],
          elite: [
            'MORTAL ADELANTE CON GIRO',
            'RONDADA – FLIC FLAC – GIRO',
            'CAMINO ADELANTE – RONDADA – A – GIRO',
            'RONDADA – A – TEMPO – A – GIRO',
            'BARANI – A – GIRO',
            'AERIAL FRONTAL (CAMINO ADELANTE SIN MANOS) – A – GIRO',
            'MORTAL ADELANTE A 1 PIERNA – RONDADA – A – GIRO',
            'HAND VAULT – MORTAL ADELANTE A 1 PIERNA – RONDADA – A – GIRO',
            'HAND VAULT – MORTAL ADELANTE CON GIRO',
            'MORTAL ADELANTE A 1 PIERNA – RONDADA – A – TEMPO – A – GIRO',
            'HAND VAULT – MORTAL ADELANTE A 1 PIERNA – RONDADA – A – TEMPO – A – GIRO',
            'RONDADA – ARABIAN / MORTAL CON 1/2 GIRO A 1 PIERNA – A – EXTENDIDO / GIRO',
          ],
        },
      ],
      footer: GYM_FOOTER,
    },

    tosses: {
      levelLabel: 'Nivel 5',
      sinGiro: ['Carpado gancho pateo', 'Carpado pateo chica linda', 'Carpado doble pateo', 'Gancho doble pateo'],
      conGiro: ['Gancho pateo giro', 'Doble pateo giro', 'Pateo pateo giro', 'Carpado pateo giro', 'Pateo giro pateo'],
    },
  },

  // ── L6 ────────────────────────────────────────────────────────────────────

  L6: {
    building: {
      levelLabel: 'Nivel 6',
      sections: [
        {
          title: 'HABILIDADES DEL NIVEL',
          columns: [
            {
              header: 'ESTILO INVERSIÓN',
              items: [
                'Inversión suelta desde nivel prep o mano a mano hacia extensión',
                'Subida de flic flac hacia extensión',
              ],
            },
            {
              header: 'ESTILO SUELTO',
              items: ['Tic toc en nivel extendido (lib a lib)'],
            },
            {
              header: 'GIRO',
              items: [
                'Transición con giro completo hacia posición corporal extendido',
                'Transición con 1¼ giro hacia lib extendido',
                'Transición con 1½ giro hacia/en extensión',
              ],
            },
            {
              header: 'COMBINACIÓN / OTRAS HABILIDADES',
              items: [
                'Tic toc con giro completo en nivel extendido (1 pierna a lib)',
                'Soltar con 1/2 giro desde nivel de suelo (switch up) hacia lib extendido',
                'Entre 1½ y 2 giros hacia lib extendido',
              ],
            },
            {
              header: 'ESTILO COED',
              items: [
                'Asistido o No Asistido:',
                'Toss hacia 1 pierna extendida',
                'Toss hacia 1 brazo extendido',
                'Walk in / toss hacia extensión',
              ],
            },
            {
              header: 'DESMONTE',
              items: ['Desmonte con doble giro desde lib extendido hacia cuna'],
            },
          ],
        },
        {
          title: 'HABILIDADES AVANZADAS',
          columns: [
            {
              header: 'ESTILO INVERSIÓN',
              items: [
                'Rewind hacia elevación prep (N6)',
                'Inversión suelta desde mano a mano en nivel prep hacia lib extendido',
              ],
            },
            {
              header: 'ESTILO SUELTO',
              items: ['Tic toc en nivel extendido (lib a posición corporal)'],
            },
            {
              header: 'GIRO',
              items: [
                'Transición con 1½ giro hacia/en nivel extendido a lib',
                'Transición con 1¾ giro hacia/en nivel extendido a lib (N6)',
                'Transición con doble giro hacia/en extensión',
                'Transición con 2¼ giros hacia/en extensión (N6)',
              ],
            },
            {
              header: 'COMBINACIÓN / OTRAS HABILIDADES',
              items: [
                'Tic toc con giro completo hacia nivel extendido (1 pierna a lib)',
                'Soltar con giro completo desde nivel de suelo (switch up) hacia lib extendido',
                'Subida de flic flac con 1/4 de giro hacia posición corporal extendida (N6)',
                'Inversión suelta entre 1/4 y 1/2 giro desde nivel prep hacia 1 pierna extendida (N6)',
                'Soltar con 1½ giro desde nivel de suelo (switch up) hacia lib extendido',
              ],
            },
            {
              header: 'ESTILO COED',
              items: [
                'Asistido:',
                'Toss hacia 1 pierna extendida',
                'Toss hacia 1 brazo extendido',
                'Toss con giro completo hacia elevación extendida',
                'Rewind hacia elevación prep (N6)',
              ],
            },
            {
              header: 'DESMONTE',
              items: ['Desmonte con doble giro desde posición corporal extendido hacia cuna'],
            },
          ],
        },
        {
          title: 'HABILIDADES ÉLITE',
          columns: [
            {
              header: 'ESTILO INVERSIÓN',
              items: [
                'Inversión suelta desde mano a mano en nivel prep hacia posición corporal extendida (N6)',
                'Rewind hacia extensión (N6)',
              ],
            },
            {
              header: 'ESTILO SUELTO',
              items: ['Tic toc en nivel extendido (posición corporal a lib)'],
            },
            {
              header: 'GIRO',
              items: [
                'Transición con 1¾ giro hacia posición corporal extendido (N6)',
                'Transición con 2¼ giros hacia posición corporal extendido (N6)',
                'Transición con doble giro hacia posición corporal extendido',
              ],
            },
            {
              header: 'COMBINACIÓN / OTRAS HABILIDADES',
              items: [
                'Tic toc con giro completo hacia nivel extendido (1 pierna a posición corporal) (N6)',
                'Soltar con giro completo desde nivel de suelo (switch up) hacia posición corporal extendido',
                'Soltar con 1½ giro desde nivel de suelo (switch up) hacia posición corporal extendido (N6)',
                'Inversión suelta entre 1/4 y 1/2 giro desde nivel prep hacia posición corporal extendida (N6)',
              ],
            },
            {
              header: 'ESTILO COED',
              items: [
                'No Asistido:',
                'Toss hacia 1 pierna extendida',
                'Toss hacia 1 brazo extendido',
                'Toss con giro completo hacia elevación extendida',
                'Las siguientes habilidades recibirán crédito de Estilo Coed siempre y cuando la habilidad sea Sin Asistencia desde el inicio hasta el desmonte hacia la superficie de presentación o hacia posición de cuna',
                'No Asistido:',
                'Rewind hacia elevación extendida (N6)',
                'Subida de hand vault con 1/2 giro hacia elevación extendida (N6)',
                'Inversión suelta desde mano a mano extendido hacia elevación extendida',
              ],
            },
            {
              header: 'DESMONTE',
              items: [
                'Desmonte pateo giro pateo hacia cuna (N6)',
                'Desmonte pateo doble giro hacia cuna (N6)',
              ],
            },
          ],
        },
      ],
    },

    gym: {
      levelLabel: 'Nivel 6 / Nivel 7',
      subTables: [
        {
          title: 'GIMNASIA ESTÁTICA',
          abbreviations: 'MORTAL ATRÁS AGRUPADO = AGRUPADO  •  MORTAL CON 360° = GIRO  •  MORTAL CON 720° = DOBLE GIRO',
          delNivel: [
            'SALTO AVANZADO – AGRUPADO',
          ],
          avanzadas: [
            'SERIE DE FLIC FLACS – GIRO',
            'SALTO AVANZADO – SERIE DE FLIC FLACS – GIRO',
            'FLIC FLAC – TEMPO – SERIE DE FLIC FLACS – GIRO',
            'SERIE DE FLIC FLACS – TEMPO – GIRO',
            'FLIC FLAC – TEMPO – A – GIRO',
          ],
          elite: [
            'FLIC FLAC – GIRO',
            'SALTO AVANZADO – FLIC FLAC – GIRO',
            'AGRUPADO CON GIRO',
            'SALTO AVANZADO – AGRUPADO CON GIRO',
            'FLIC FLAC – TEMPO – GIRO',
            'SALTO AVANZADO – FLIC FLAC – TEMPO – GIRO',
            'SERIE DE FLIC FLACS – DOBLE GIRO',
            'SALTO AVANZADO – SERIE DE FLIC FLACS – DOBLE GIRO',
            'FLIC FLAC – TEMPO – SERIE DE FLIC FLACS – DOBLE GIRO',
            'SERIE DE FLIC FLACS – TEMPO – DOBLE GIRO',
            'FLIC FLAC – TEMPO – DOBLE GIRO',
            'SALTO AVANZADO – FLIC FLAC / SERIE DE FLIC FLACS – TEMPO – DOBLE GIRO',
            'SERIE DE FLIC FLACS – GIRO / DOBLE GIRO – TEMPO – GIRO / DOBLE GIRO',
          ],
        },
        {
          title: 'GIMNASIA CON CARRERA',
          abbreviations: 'FF = FLIC FLAC  •  MORTAL CON 540° = 1.5 GIRO  •  MORTAL CON 720° = DOBLE GIRO',
          delNivel: [
            'MEDIA LUNA – MORTAL CON 360° (GIRO)',
            'RONDADA (RO) – GIRO',
            'RONDADA – FF / SERIE DE FF – GIRO',
            'CAMINO ADELANTE – A – GIRO',
            'AERIAL LATERAL / ADELANTE – GIRO',
            'RONDADA – A – ONODI – A – GIRO',
            'MORTAL ADELANTE CON GIRO',
          ],
          avanzadas: [
            'RONDADA – FF – PATEO GIRO / GIRO A 1 PIERNA',
            'MORTAL ADELANTE A 1 PIERNA – A – GIRO',
            'RONDADA – TEMPO – GIRO',
            'RONDADA – A – TEMPO – A – GIRO',
            'EXTENDIDO ADELANTE CON 1.5 GIRO',
          ],
          elite: [
            'RONDADA (RO) – ARABIAN / 1/2 GIRO A 1 PIERNA – RO – A – GIRO',
            'HAND VAULT – MORTAL ADELANTE CON GIRO',
            'RONDADA – FLIC FLAC – GIRO',
            'RONDADA – A – GIRO',
            'CAMINO ADELANTE – A – GIRO',
            'RO – A – 1.5 GIRO – A – GIRO / DOBLE GIRO',
            'EXTENDIDO ADELANTE CON 1.5 GIRO – A – GIRO / DOBLE GIRO',
            'RONDADA – A – DOBLE GIRO',
            'CAMINO ADELANTE – A – DOBLE GIRO',
            'RONDADA – A – TEMPO – A – DOBLE GIRO',
            'RONDADA – ARABIAN – A – DOBLE GIRO',
            'RONDADA – A – GIRO – A – TEMPO – DOBLE GIRO',
            'RONDADA – A – 1.5 GIRO A 1 PIERNA – A – DOBLE GIRO',
            'MORTAL ADELANTE A 1 PIERNA – RO – ARABIAN – A – TEMPO – A – DOBLE GIRO',
            'MORTAL ADELANTE A 1 PIERNA – RO – ARABIAN – A – TEMPO – DOBLE GIRO',
          ],
        },
      ],
      footer: GYM_FOOTER,
    },

    tosses: {
      levelLabel: 'Nivel 6',
      sinGiro: ['Carpado gancho pateo', 'Carpado pateo chica linda', 'Carpado doble pateo', 'Gancho pateo pateo'],
      conGiro: [
        'Agrupado doble giro (N6)', 'Carpado doble giro (N6)', 'Pateo doble giro (N6)',
        'Toe touch doble giro (N6)', 'Doble giro toe touch (N6)',
        'Gancho pateo doble giro (N6)', 'Doble pateo doble giro (N6)', 'Pateo giro pateo giro (N6)',
      ],
    },
  },

  // ── NOVICE ────────────────────────────────────────────────────────────────

  NOVICE: {
    building: {
      levelLabel: 'All Star Novice',
      sections: [
        {
          title: 'HABILIDADES DEL NIVEL',
          columns: [
            {
              header: 'ESTILO RELEASE',
              items: [
                'Estilo Release desde nivel del suelo (switch up) hacia lib debajo del nivel prep',
                'Tic toc debajo del nivel prep (lib a lib)',
              ],
            },
            {
              header: 'GIRO',
              items: [
                'Transición con 1/4 de giro hacia debajo del nivel prep',
                'Transición con 1/4 de giro hacia nivel de suelo',
                'Transición con 1/4 de giro desde nivel prep',
              ],
            },
            {
              header: 'COMBINACIÓN / OTRAS HABILIDADES',
              items: [
                'Parado en espalda',
                'Acostado de espalda',
                'Escuadra',
                'Escuadra extendida',
                'Elevación en 1 pierna',
                'Silla',
                'Prono',
                'Acostado de espalda prep',
                'Sentado en hombros',
                'Parado en hombros',
                'Elevación en 1 pierna a nivel',
              ],
            },
            {
              header: 'DESMONTE',
              items: [
                'Bajarse con paso',
                'Show & go por nivel prep extendido',
              ],
            },
          ],
        },
        {
          title: 'HABILIDADES RESTRINGIDAS (−0.50 por ocurrencia)',
          columns: [
            {
              header: 'ESTILO RELEASE',
              items: [
                'Estilo Release desde nivel del suelo (switch up) hacia posición corporal debajo del nivel prep',
                'Tic Tic toc debajo del nivel prep (lib a posición corporal)',
                'Tic toc en nivel prep (lib a posición corporal) con un conector hacia lib en nivel prep con conector',
                'Estilo Release desde nivel de cintura hacia lib en nivel prep con conector',
                'Estilo Release desde nivel de suelo (switch up) hacia lib en nivel prep con conector',
                'Estilo Release desde nivel de suelo (switch up) hacia posición corporal en nivel prep con conector',
                'Tic Tic toc debajo del nivel prep (posición corporal a posición corporal)',
                'Tic toc en nivel prep (posición corporal a posición corporal) con conector',
                'Estilo Release desde nivel de cintura hacia posición corporal en nivel prep con conector',
              ],
            },
            {
              header: 'GIRO',
              items: [
                'Transición con 1/4 de giro desde nivel prep hacia nivel prep',
                'Transición con 1/4 desde nivel inferior a prep hacia lib en nivel prep con conector',
                'Transición con 1/4 desde nivel inferior a prep hacia elevación prep',
                'Transición con 1/4 desde nivel inferior a prep hacia posición corporal en nivel prep con conector',
              ],
            },
            {
              header: 'COMBINACIÓN / OTRAS HABILIDADES',
              items: [
                'Tic toc con 1/4 de giro en nivel prep (lib a lib) con conector',
                'Tic toc con 1/4 de giro debajo del nivel prep (lib a posición corporal)',
                'Transición desde nivel inferior a prep hacia posición corporal en nivel prep con conector',
                'Tic toc con 1/4 de giro en nivel prep (posición corporal a posición corporal) con conector',
                'Estilo Release con 1/4 de giro desde nivel del suelo (switch up) hacia lib en nivel prep con conector',
                'Estilo Release con 1/4 de giro desde nivel de cintura hacia lib en nivel prep con conector',
                'Tic toc con 1/4 de giro debajo del nivel prep (posición corporal a posición corporal)',
              ],
            },
            {
              header: 'DESMONTE',
              items: ['Cuna recta desde elevación prep'],
            },
          ],
        },
      ],
    },

    gym: {
      levelLabel: 'All Star Novice',
      subTables: [
        {
          title: 'GIMNASIA ESTÁTICA',
          colLabels: ['RECOMENDADAS DEL NIVEL', 'RESTRINGIDAS (−0.05 c/u)', ''],
          delNivel: [
            'ROL ADELANTE',
            'ROL EN ESCUADRA',
            'ARCO DESDE EL SUELO',
            'ARCO DESDE PARADO (STANDING BACKBEND)',
            'ROL ATRÁS',
          ],
          avanzadas: [
            'PARADO DE MANOS (INVERTIDA)',
            'CAMINO ADELANTE/ATRÁS CON PIERNAS JUNTAS',
            'CAMINO ATRÁS O ADELANTE',
            'ROL ATRÁS A PARADO DE MANOS (INVERTIDA)',
            'ARCO A PASAR',
            'CUALQUIER COMBINACIÓN O VARIACIÓN DE LAS ANTERIORES',
            'TINY NOVICE: NINGUNA HABILIDAD CON LA ESPALDA ARQUEADA (PUENTE)',
          ],
          elite: [],
        },
        {
          title: 'GIMNASIA CON CARRERA',
          colLabels: ['RECOMENDADAS DEL NIVEL', 'RESTRINGIDAS (−0.05 c/u)', ''],
          delNivel: [
            'MEDIA LUNA',
            'MEDIA LUNA – ROL ATRÁS',
            'PARADO DE MANOS (INVERTIDA) – ROL ADELANTE',
            'PARADA DE MANOS – ARCO',
          ],
          avanzadas: [
            'MEDIA LUNA – CAMINO ATRÁS RONDADA (RO)',
            'CAMINO ADELANTE',
            'CUALQUIER COMBINACIÓN O VARIACIÓN DE LAS ANTERIORES',
            'TINY NOVICE: NINGUNA HABILIDAD CON LA ESPALDA ARQUEADA (PUENTE)',
          ],
          elite: [],
        },
      ],
      footer: GYM_FOOTER,
    },

    tosses: null,
  },

  // ── L7 ────────────────────────────────────────────────────────────────────

  L7: {
    building: {
      levelLabel: 'Nivel 7',
      sections: [
        {
          title: 'HABILIDADES DEL NIVEL',
          columns: [
            {
              header: 'ESTILO INVERSIÓN',
              items: [
                'Mortal libre desde nivel de suelo hacia cuna (N7)',
                'Mortal libre desde nivel de suelo hacia nivel prep (N7) (excluyendo rewind)',
                'Mortal libre desde nivel de suelo hacia extensión (N7) (excluyendo rewind)',
                'Inversión suelta desde nivel prep o superior hacia extensión',
                'Inversión suelta desde nivel prep o superior hacia lib extendido',
                'Rewind con 1¾ rotación de mortal (N7)',
                'Rewind hacia elevación prep',
              ],
            },
            {
              header: 'ESTILO SUELTO',
              items: [
                'Tic toc en nivel extendido (lib a lib)',
                'Tic toc a nivel extendido (1 pierna a posición corporal)',
              ],
            },
            {
              header: 'GIRO',
              items: [
                'Transición entre 1¼ y 1¾ de giro hacia extensión',
                'Transición con doble giro hacia extensión',
              ],
            },
            {
              header: 'COMBINACIÓN / OTRAS HABILIDADES',
              items: [
                'Entre 1½ y 2 giros hacia prono',
                'Movimientos de inversiones sueltas de prep/prep con giro',
                'Subida de hand vault con 1/2 giro hacia extensión',
                'Tic toc entre 1/4 y 3/4 de giro hacia 1 pierna extendida',
                'Soltar con 1/2 giro desde nivel de suelo (switch up) hacia 1 pierna extendida',
                'Mortal libre con giro desde nivel de suelo hacia cuna (N7)',
                'Soltar con 1/2 giro desde nivel de cintura (agrupado) hacia 1 pierna extendida',
              ],
            },
            {
              header: 'ESTILO COED',
              items: [
                'Asistido / No Asistido:',
                'Walk in / toss hacia extensión',
                'Walk in / toss hacia manos, impulso hacia 1 pierna extendida',
                'Walk in hacia 1 pierna extendida',
              ],
            },
            {
              header: 'DESMONTE',
              items: [
                'Mortal adelante libre hacia nivel de suelo (N7)',
                'Mortal libre desde nivel prep o inferior hacia cuna (N7)',
                'Desmonte con doble giro desde 1 pierna extendida hacia cuna',
              ],
            },
          ],
        },
        {
          title: 'HABILIDADES AVANZADAS',
          columns: [
            {
              header: 'ESTILO INVERSIÓN',
              items: [
                'Flic flac – rewind hacia nivel prep (N7)',
                'MEDIA LUNA / RONDADA – rewind hacia elevación prep (N7)',
                'Rewind hacia extensión',
                'Mortal libre desde nivel de suelo hacia extensión (N7) (excluyendo rewind)',
              ],
            },
            {
              header: 'ESTILO SUELTO',
              items: ['Tic toc en nivel extendido (lib a posición corporal)'],
            },
            {
              header: 'GIRO',
              items: [
                'Transición con 1½ giro hacia/en nivel extendido a lib',
                'Transición con 1¾ giro hacia/en nivel extendido a lib',
                'Transición con doble giro hacia/en extensión',
                'Transición con 2¼ de giro hacia/en extensión',
              ],
            },
            {
              header: 'COMBINACIÓN / OTRAS HABILIDADES',
              items: [
                'Tic toc con giro completo hacia nivel extendido (1 pierna a lib)',
                'Soltar con giro completo desde nivel de suelo (switch up) hacia lib extendido',
                'Subida de flic flac con 1/4 de giro hacia posición corporal extendida',
                'Inversión suelta entre 1/4 y 1/2 giro desde nivel prep o superior hacia 1 pierna extendida',
                'Soltar con 1½ giro desde nivel de suelo (switch up) hacia 1 pierna extendida',
                'Mortal libre con giro desde nivel de suelo hacia elevación en prep (N7)',
                'Rewind entre 1/4 y 1¼ de giro hacia nivel prep (N7)',
                'Subida de flic flac con giro completo hacia nivel prep (N7)',
              ],
            },
            {
              header: 'ESTILO COED',
              items: [
                'Asistido:',
                'Toss hacia 1 pierna extendida',
                'Toss hacia 1 brazo extendido',
                'Toss con giro completo hacia elevación extendida',
                'No Asistido:',
                'Toss hacia 1 brazo extendido',
              ],
            },
            {
              header: 'DESMONTE',
              items: [],
            },
          ],
        },
        {
          title: 'HABILIDADES ÉLITE',
          columns: [
            {
              header: 'ESTILO INVERSIÓN',
              items: [
                'Soltar desde mano a mano en nivel prep hacia posición corporal extendida',
                'Inversión suelta desde mano a mano extendido hacia extensión',
                'Rewind hacia 1 pierna extendida',
                'Flic flac – rewind hacia elevación extendida (N7)',
                'MEDIA LUNA / RONDADA – rewind hacia elevación extendida (N7)',
                'Mortal libre desde nivel de suelo hacia 1 pierna extendida (N7) (excluyendo rewind)',
              ],
            },
            {
              header: 'ESTILO SUELTO',
              items: ['Tic toc en nivel extendido (posición corporal a posición corporal)'],
            },
            {
              header: 'GIRO',
              items: [
                'Transición con 1½ giro hacia/en nivel extendido a posición corporal',
                'Transición con 1¾ de giro hacia/en nivel extendido a posición corporal',
                'Transición con doble giro hacia/en nivel extendido a 1 pierna',
              ],
            },
            {
              header: 'COMBINACIÓN / OTRAS HABILIDADES',
              items: [
                'Tic toc con giro completo en nivel extendido (1 pierna a lib)',
                'Subida de flic flac con giro completo hacia elevación extendida (N7)',
                'Inversión suelta con 1/2 giro desde nivel prep o superior hacia posición corporal extendida',
                'Soltar con 1½ giro hacia elevación extendida (N7)',
                'Soltar entre 1 y 1½ giro desde nivel de suelo (switch up) hacia posición corporal',
                'Tic toc entre 1/4 y 3/4 de giro en nivel extendido (posición corporal a posición corporal)',
                'Tic toc con giro completo desde nivel de cintura (agrupado) hacia posición corporal extendida',
                'Tic toc con giro completo hacia nivel extendido (1 pierna a posición corporal)',
                'Mortal libre con giro desde nivel de suelo hacia elevación en prep (N7)',
                'Rewind entre 1/4 y 1¼ giro hacia elevación extendida (N7)',
              ],
            },
            {
              header: 'ESTILO COED',
              items: [
                'Las siguientes habilidades recibirán crédito de Estilo Coed siempre y cuando la habilidad sea Sin Asistencia desde el inicio hasta el desmonte hacia la superficie de presentación o hacia posición de cuna',
                'No Asistido:',
                'Rewind hacia elevación extendida',
                'Subida de hand vault con 1/2 giro hacia elevación extendida',
                'Subida de flic flac con giro completo hacia elevación extendida',
                'Inversión suelta desde mano a mano extendido hacia extensión',
              ],
            },
            {
              header: 'DESMONTE',
              items: [
                'Desmonte con giro pateo giro hacia cuna',
                'Desmonte con pateo doble giro hacia cuna',
                'Desmonte de mortal libre con 1/2 giro desde nivel prep hacia cuna (N7)',
              ],
            },
          ],
        },
      ],
    },

    // Shares the L6/L7 combined gym table
    gym: {
      levelLabel: 'Nivel 6 / Nivel 7',
      subTables: [
        {
          title: 'GIMNASIA ESTÁTICA',
          abbreviations: 'MORTAL ATRÁS AGRUPADO = AGRUPADO  •  MORTAL CON 360° = GIRO  •  MORTAL CON 720° = DOBLE GIRO',
          delNivel: [
            'SALTO AVANZADO – AGRUPADO',
          ],
          avanzadas: [
            'SERIE DE FLIC FLACS – GIRO',
            'SALTO AVANZADO – SERIE DE FLIC FLACS – GIRO',
            'FLIC FLAC – TEMPO – SERIE DE FLIC FLACS – GIRO',
            'SERIE DE FLIC FLACS – TEMPO – GIRO',
            'FLIC FLAC – TEMPO – A – GIRO',
          ],
          elite: [
            'FLIC FLAC – GIRO',
            'SALTO AVANZADO – FLIC FLAC – GIRO',
            'AGRUPADO CON GIRO',
            'SALTO AVANZADO – AGRUPADO CON GIRO',
            'FLIC FLAC – TEMPO – GIRO',
            'SALTO AVANZADO – FLIC FLAC – TEMPO – GIRO',
            'SERIE DE FLIC FLACS – DOBLE GIRO',
            'SALTO AVANZADO – SERIE DE FLIC FLACS – DOBLE GIRO',
            'FLIC FLAC – TEMPO – SERIE DE FLIC FLACS – DOBLE GIRO',
            'SERIE DE FLIC FLACS – TEMPO – DOBLE GIRO',
            'FLIC FLAC – TEMPO – DOBLE GIRO',
            'SALTO AVANZADO – FLIC FLAC / SERIE DE FLIC FLACS – TEMPO – DOBLE GIRO',
            'SERIE DE FLIC FLACS – GIRO / DOBLE GIRO – TEMPO – GIRO / DOBLE GIRO',
          ],
        },
        {
          title: 'GIMNASIA CON CARRERA',
          abbreviations: 'FF = FLIC FLAC  •  MORTAL CON 540° = 1.5 GIRO  •  MORTAL CON 720° = DOBLE GIRO',
          delNivel: [
            'MEDIA LUNA – MORTAL CON 360° (GIRO)',
            'RONDADA (RO) – GIRO',
            'RONDADA – FF / SERIE DE FF – GIRO',
            'CAMINO ADELANTE – A – GIRO',
            'AERIAL LATERAL / ADELANTE – GIRO',
            'RONDADA – A – ONODI – A – GIRO',
            'MORTAL ADELANTE CON GIRO',
          ],
          avanzadas: [
            'RONDADA – FF – PATEO GIRO / GIRO A 1 PIERNA',
            'MORTAL ADELANTE A 1 PIERNA – A – GIRO',
            'RONDADA – TEMPO – GIRO',
            'RONDADA – A – TEMPO – A – GIRO',
            'EXTENDIDO ADELANTE CON 1.5 GIRO',
          ],
          elite: [
            'RONDADA (RO) – ARABIAN / 1/2 GIRO A 1 PIERNA – RO – A – GIRO',
            'HAND VAULT – MORTAL ADELANTE CON GIRO',
            'RONDADA – FLIC FLAC – GIRO',
            'RONDADA – A – GIRO',
            'CAMINO ADELANTE – A – GIRO',
            'RO – A – 1.5 GIRO – A – GIRO / DOBLE GIRO',
            'EXTENDIDO ADELANTE CON 1.5 GIRO – A – GIRO / DOBLE GIRO',
            'RONDADA – A – DOBLE GIRO',
            'CAMINO ADELANTE – A – DOBLE GIRO',
            'RONDADA – A – TEMPO – A – DOBLE GIRO',
            'RONDADA – ARABIAN – A – DOBLE GIRO',
            'RONDADA – A – GIRO – A – TEMPO – DOBLE GIRO',
            'RONDADA – A – 1.5 GIRO A 1 PIERNA – A – DOBLE GIRO',
            'MORTAL ADELANTE A 1 PIERNA – RO – ARABIAN – A – TEMPO – A – DOBLE GIRO',
            'MORTAL ADELANTE A 1 PIERNA – RO – ARABIAN – A – TEMPO – DOBLE GIRO',
          ],
        },
      ],
      footer: GYM_FOOTER,
    },

    tosses: {
      levelLabel: 'Nivel 7',
      sinGiro: [
        'Mortal agrupado', 'Mortal X-out', 'Mortal carpado', 'Mortal extendido',
        'Pateo triple giro (Sin Mortal)',
      ],
      conGiro: [
        'Mortal extendido con giro', 'Mortal extendido con doble giro', 'Mortal X-out con giro',
        'Mortal pateo con giro', 'Arabian con 1 ½ giro', 'Carpado a extendido con doble giro',
      ],
    },
  },

  // ── Escolar Nivel 1 — FECU Ecuador 2026 ──────────────────────────────────────
  ESCOLAR_L1: {
    building: {
      levelLabel: 'Nivel 1 Escolar',
      sections: [
        {
          title: 'HABILIDADES DEL NIVEL',
          columns: [
            {
              header: 'ESTILO SUELTO',
              items: [
                'Estilo suelto desde nivel del suelo (switch up) hacia lib debajo del nivel prep',
                'Tic toc debajo del nivel prep (lib a lib)',
              ],
            },
            {
              header: 'GIRO',
              items: [
                'Transición con 1/4 de giro hacia debajo del nivel prep',
                'Transición con 1/4 de giro hacia nivel de suelo',
                'Transición con 1/4 de giro desde nivel prep',
              ],
            },
            {
              header: 'COMBINACIÓN / OTRAS HABILIDADES',
              items: [
                'Parado en espalda',
                'Show & go por nivel prep',
                'Escuadra',
                'Acostado de espalda',
                'Escuadra extendida',
                'Elevación en 1 pierna bajo nivel prep',
                'Acostado de espalda extendido',
                'Elevación en 1 pierna a nivel prep',
                'Sentado en hombros',
                'Silla',
                'Parado en hombros',
                'Prono',
              ],
            },
            {
              header: 'DESMONTE',
              items: ['Bajarse con paso'],
            },
          ],
        },
        {
          title: 'HABILIDADES AVANZADAS',
          columns: [
            {
              header: 'ESTILO SUELTO',
              items: [
                'Estilo suelto desde nivel del suelo (switch up) hacia posición del cuerpo debajo del nivel prep',
                'Tic Tic toc debajo del nivel prep (lib a posición del cuerpo)',
                'Tic toc en nivel prep (lib a posición del cuerpo) con un conector',
                'Estilo suelto desde nivel de cintura hacia lib en nivel prep con conector',
                'Estilo suelto desde nivel de suelo (switch up) hacia lib en nivel prep con conector',
              ],
            },
            {
              header: 'GIRO',
              items: [
                'Transición con 1/4 de giro desde nivel prep hacia nivel prep',
                'Transición con 1/4 desde nivel inferior a prep hacia lib en nivel prep con conector',
                'Tictoc con 1/4 de giro en nivel prep (lib a lib) con conector',
                'Tictoc con 1/4 de giro debajo del nivel prep (lib a posición del cuerpo)',
                'Transición desde nivel inferior a prep hacia posición del cuerpo en nivel prep con conector',
              ],
            },
            { header: 'COMBINACIÓN / OTRAS HABILIDADES', items: [] },
            { header: 'DESMONTE', items: [] },
          ],
        },
        {
          title: 'HABILIDADES ÉLITE — MÁX 1 POR GRAN PARTE/MÁX (−0.50 por élite adicional)',
          columns: [
            {
              header: 'ESTILO SUELTO',
              items: [
                'Estilo suelto desde nivel de suelo (switch up) hacia posición del cuerpo en nivel prep con conector',
                'Tic Tic toc debajo del nivel prep (posición del cuerpo a posición del cuerpo)',
                'Tic toc en nivel prep (posición del cuerpo a posición del cuerpo) con conector',
                'Estilo suelto desde nivel de cintura hacia posición del cuerpo en nivel prep con conector',
              ],
            },
            {
              header: 'GIRO',
              items: [
                'Transición con 1/4 de giro desde nivel inferior a prep hacia elevación prep',
                'Transición con 1/4 desde nivel inferior a prep hacia posición del cuerpo en nivel prep con conector',
                'Tictoc con 1/4 de giro en nivel prep (posición del cuerpo a posición del cuerpo) con conector',
                'Estilo suelto con 1/4 de giro desde nivel del suelo (switch up) hacia lib en nivel prep con conector',
                'Estilo suelto con 1/4 de giro desde nivel de cintura hacia lib en nivel prep con conector',
                'Tictoc con 1/4 de giro debajo del nivel prep (posición del cuerpo a posición del cuerpo)',
                'Cuna recta desde elevación prep',
              ],
            },
            { header: 'COMBINACIÓN / OTRAS HABILIDADES', items: [] },
            { header: 'DESMONTE', items: [] },
          ],
        },
      ],
    },

    gym: {
      levelLabel: 'Nivel 1 Escolar',
      subTables: [
        {
          title: 'GIMNASIA ESTÁTICA',
          colLabels: ['HABILIDADES DEL NIVEL', 'HABILIDADES AVANZADAS', 'RESTRINGIDAS (ILEGALES) −0.05 c/u'],
          delNivel: [
            'Rol adelante',
            'Rol en escuadra',
            'Arco desde el suelo',
            'Rola atrás',
            'Parado de manos (invertida)',
            'Arco con pateo atrás',
            'Arco desde parada de manos',
            'Inversión adelante/atrás con piernas juntas',
          ],
          avanzadas: [
            'Camino atrás',
            'Camino atrás – Rola atrás – Camino atrás',
            'Rola atrás a invertida',
          ],
          elite: [
            'Serie de camino atrás',
            'Camino atrás cambiando pierna',
            'Rola atrás hacia invertida – Camino atrás / Serie de caminos atrás',
            'Valdez',
            'Cualquier combinación o variación de las anteriores',
          ],
        },
        {
          title: 'GIMNASIA CON CARRERA',
          colLabels: ['HABILIDADES DEL NIVEL', 'HABILIDADES AVANZADAS', 'RESTRINGIDAS (ILEGALES) −0.05 c/u'],
          delNivel: [
            'Media luna',
            'Media luna – Rola atrás',
            'Parado de manos (invertida) – Rol adelante',
          ],
          avanzadas: [
            'Media luna – Camino atrás / Camino atrás cambiando pierna',
            'Rondada (RO)',
            'Camino adelante / Serie de caminos adelante',
            'Invertida – Rol adelante – Media luna',
            'Cualquier combinación o variación de las anteriores',
          ],
          elite: [
            'Media luna – Serie de caminos atrás',
            'Camino adelante – Media luna / Rondada',
            'Camino adelante – Media luna – Camino atrás / Serie de C. Atrás',
            'Camino adelante – Media luna – Camino atrás cambiando pierna',
            'Invertida – Rol adelante – Media luna – Camino atrás / Serie de C. Atrás',
            'Cualquier combinación o variación de las anteriores',
          ],
        },
      ],
      footer: GYM_FOOTER,
    },

    tosses: null,
  },
};

// ── Skill-level → table key ───────────────────────────────────────────────────

const LEVEL_KEY_MAP: Record<string, string> = {
  novice:  'NOVICE',
  prep:    'L1',
  escolar: 'ESCOLAR_L1',
  L1: 'L1', L2: 'L2', L3: 'L3', L4: 'L4', L5: 'L5', L6: 'L6', L7: 'L7',
};

export function getSkillTables(skillLevel: string | undefined): LevelSkillTables | null {
  if (!skillLevel) return null;
  const key = LEVEL_KEY_MAP[skillLevel];
  return key ? (SKILL_TABLES[key] ?? null) : null;
}
