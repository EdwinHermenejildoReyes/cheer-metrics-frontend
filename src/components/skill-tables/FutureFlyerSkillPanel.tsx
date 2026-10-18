'use client';

import { useState, useEffect } from 'react';
import { BookOpen, ChevronDown } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SkillCol   { header: string; items: string[] }
interface SkillTier  { title: string;  cols:  SkillCol[] }

interface LevelData {
  label:                string;
  elevaciones:          SkillTier[];
  lanzamientosSinGiro:  string[];
  lanzamientosConGiro:  string[];
}

// ── Column headers (Nivel 4 +) ────────────────────────────────────────────────

const COLS = [
  'ESTILO INVERSIÓN',
  'ESTILO SUELTO',
  'GIRO',
  'COMBINACIÓN / OTRAS HABILIDADES',
  'ESTILO COED',
  'DESMONTE',
];

// ── Skill data — source: Habilidades-N1-7-Adventure-Brands.pdf ───────────────

const LEVELS: Record<string, LevelData> = {

  // ── Nivel 4 ───────────────────────────────────────────────────────────────

  N4: {
    label: 'Future Flyer Nivel 4',
    elevaciones: [
      {
        title: 'HABILIDADES DEL NIVEL',
        cols: [
          { header: 'ESTILO INVERSIÓN', items: [
            'Inversión suelta hacia nivel prep o inferior',
            'Inversión suelta en nivel prep',
            'Inversión descendente desde nivel prep',
          ]},
          { header: 'ESTILO SUELTO', items: [
            'Tic toc desde nivel extendido hacia nivel prep o inferior (lib a 1 pierna)',
            'Movimiento suelto de helicóptero',
            'Soltar desde nivel prep hacia nivel prep',
            'Soltar hacia extensión',
          ]},
          { header: 'GIRO', items: [
            'Transición con 1 ½ giros hacia nivel inferior a prep',
            'Transición con 1 ½ giros hacia nivel prep',
            'Transición con ¾ hacia elevación extendida',
            'Transición con giro completo hacia nivel prep o inferior',
          ]},
          { header: 'COMBINACIÓN / OTRAS HABILIDADES', items: [] },
          { header: 'ESTILO COED', items: [
            'Asistido o No Asistido:',
            'Walk in / toss a manos',
            'Walk in / toss a manos, impulso hacia extensión',
            'Walk in / toss hacia extensión',
          ]},
          { header: 'DESMONTE', items: [] },
        ],
      },
      {
        title: 'HABILIDADES AVANZADAS',
        cols: [
          { header: 'ESTILO INVERSIÓN', items: [
            'Elevación invertida extendida',
            'Inversión suelta desde nivel de cintura hacia elevación extendida',
          ]},
          { header: 'ESTILO SUELTO', items: [
            'Soltar desde nivel de cintura hacia lib extendido',
            'Tic toc desde nivel extendido hacia nivel prep o inferior (posición del cuerpo a lib)',
            'Soltar desde nivel de suelo (switch up) hacia posición del cuerpo extendida',
          ]},
          { header: 'GIRO', items: [
            'Transición con 1 ½ giro hacia / en nivel prep a lib',
            'Transición con 1 ½ giro en nivel prep (lib a posición del cuerpo)',
            'Transición con giro completo hacia extensión',
          ]},
          { header: 'COMBINACIÓN / OTRAS HABILIDADES', items: [
            'Soltar con giro completo desde nivel de cintura hacia lib en nivel prep',
            'Soltar con giro completo desde nivel de suelo (switch up) hacia lib en nivel prep',
            'Soltar con giro completo en nivel prep (1 pierna a lib)',
            'Soltar con 1 ½ giro desde nivel de suelo (switch up) hacia lib en nivel prep',
          ]},
          { header: 'ESTILO COED', items: [
            'Asistido:',
            'Walk in a manos, impulso hacia 1 pierna extendida',
            'Toss a manos, impulso hacia 1 pierna extendida',
            'Walk in hacia 1 pierna / 1 brazo extendido',
            'Toss hacia 1 pierna / 1 brazo extendido',
          ]},
          { header: 'DESMONTE', items: [
            'Desmonte con giro completo desde 1 pierna extendida hacia cuna',
          ]},
        ],
      },
      {
        title: 'HABILIDADES ÉLITE',
        cols: [
          { header: 'ESTILO INVERSIÓN', items: [
            'Inversión suelta desde nivel prep o mano a mano desde nivel prep hacia elevación extendida',
            'Subida de flic flac hacia elevación extendida',
          ]},
          { header: 'ESTILO SUELTO', items: [
            'Soltar desde nivel de cintura hacia posición del cuerpo extendida',
            'Tic toc desde nivel extendido hacia nivel prep o inferior (posición del cuerpo a posición del cuerpo)',
            'Soltar desde nivel prep hacia posición del cuerpo extendida',
          ]},
          { header: 'GIRO', items: [
            'Transición con 1 ½ giro hacia / en nivel prep a posición del cuerpo',
            'Transición con 1 ½ giro en nivel prep (posición del cuerpo a posición del cuerpo)',
            'Transición con 1 ½ giro hacia extensión',
            'Transición con giro completo hacia 1 pierna extendida',
            'Transición con giro completo en nivel extendido',
          ]},
          { header: 'COMBINACIÓN / OTRAS HABILIDADES', items: [
            'Soltar con giro completo desde nivel de cintura hacia posición del cuerpo en prep',
            'Soltar con giro completo desde nivel de suelo (switch up) hacia posición del cuerpo en nivel prep',
            'Soltar con giro completo en nivel prep (1 pierna a posición del cuerpo)',
            'Soltar con 1 ½ giro desde nivel de suelo (switch up) hacia posición del cuerpo en nivel prep',
            'Inversión con giro completo hacia 1 pierna extendida',
          ]},
          { header: 'ESTILO COED', items: [
            'No Asistido:',
            'Walk in a manos, impulso hacia 1 pierna extendida',
            'Toss a manos, impulso hacia 1 pierna extendida',
            'Walk in hacia 1 pierna / 1 brazo extendido',
            'Toss hacia 1 pierna / 1 brazo extendido',
          ]},
          { header: 'DESMONTE', items: [
            'Desmonte con doble giro desde elevación prep/extensión hacia cuna',
            'Desmonte con pateo giro',
          ]},
        ],
      },
    ],
    lanzamientosSinGiro: ['Agrupado pateo', 'Carpado X', 'Gancho pateo', 'Doble pateo', 'Doble toe touch'],
    lanzamientosConGiro: ['Agrupado giro', 'Lib giro', 'Carpado giro', 'Pateo giro', 'Toe touch giro', 'Giro toe touch', 'Doble giro'],
  },

  // ── Nivel 5 ───────────────────────────────────────────────────────────────

  N5: {
    label: 'Future Flyer Nivel 5',
    elevaciones: [
      {
        title: 'HABILIDADES DEL NIVEL',
        cols: [
          { header: 'ESTILO INVERSIÓN', items: [
            'Inversión descendente desde elevación extendida',
            'Inversión descendente desde 1 pierna extendida',
          ]},
          { header: 'ESTILO SUELTO', items: [
            'Tic toc en nivel extendido (lib a lib)',
            'Tic toc desde nivel prep hacia nivel extendido (lib a lib)',
          ]},
          { header: 'GIRO', items: [
            'Transición con 1 ¼ giro hacia elevación extendida',
          ]},
          { header: 'COMBINACIÓN / OTRAS HABILIDADES', items: [
            'Soltar con 1/4 de giro desde nivel de suelo (switch up) hacia 1 pierna extendida',
            'Movimientos sueltos de helicóptero',
            'Entre 1 ½ y 2 giros hacia prono',
            'Soltar con 1/2 giro desde nivel de suelo (switch up) hacia lib extendido',
          ]},
          { header: 'ESTILO COED', items: [
            'Asistido o No Asistido:',
            'Walk in / toss a manos',
            'Walk in / toss a manos, impulso hacia extensión',
            'Walk in / toss hacia extensión',
          ]},
          { header: 'DESMONTE', items: [
            'Desmonte con doble giro desde 1 pierna en nivel prep hacia cuna',
          ]},
        ],
      },
      {
        title: 'HABILIDADES AVANZADAS',
        cols: [
          { header: 'ESTILO INVERSIÓN', items: [
            'Inversión suelta desde nivel prep o mano a mano en nivel prep hacia extensión',
            'Subida de flic flac hacia extensión',
          ]},
          { header: 'ESTILO SUELTO', items: [
            'Tic toc desde nivel prep hacia nivel extendido (lib a posición del cuerpo)',
          ]},
          { header: 'GIRO', items: [
            'Transición con giro completo hacia lib extendido',
            'Transición con 1 ½ giro hacia extensión',
            'Transición con doble giro hacia / en nivel prep',
          ]},
          { header: 'COMBINACIÓN / OTRAS HABILIDADES', items: [
            'Tic toc entre 1/4 y 3/4 de giro hacia lib extendido',
            'Soltar con 1/2 giro desde nivel de suelo (switch up) hacia posición del cuerpo extendido',
            'Soltar con 1/2 giro desde nivel de cintura (agrupado) hacia lib extendido',
            'Soltar con giro completo desde nivel de suelo (switch up) hacia lib extendido',
          ]},
          { header: 'ESTILO COED', items: [
            'Asistido:',
            'Walk in a manos, impulso hacia 1 pierna extendida',
            'Toss a manos, impulso hacia 1 pierna extendida',
            'Walk in hacia 1 pierna / 1 brazo extendido',
            'Toss hacia 1 pierna / 1 brazo extendido',
          ]},
          { header: 'DESMONTE', items: [
            'Desmonte con doble giro desde lib extendido hacia cuna',
          ]},
        ],
      },
      {
        title: 'HABILIDADES ÉLITE',
        cols: [
          { header: 'ESTILO INVERSIÓN', items: [
            'Inversión suelta desde nivel prep o mano a mano en nivel prep hacia lib extendido',
            'Subida de flic flac hacia lib extendido',
          ]},
          { header: 'ESTILO SUELTO', items: [
            'Tic toc en nivel extendido (lib a posición del cuerpo)',
            'Tic toc en nivel extendido (posición del cuerpo a posición del cuerpo)',
          ]},
          { header: 'GIRO', items: [
            'Transición con giro completo hacia posición del cuerpo extendido',
            'Transición con 1 ½ giro hacia 1 pierna extendida',
            'Transición con doble giro hacia / en extensión',
          ]},
          { header: 'COMBINACIÓN / OTRAS HABILIDADES', items: [
            'Tic toc entre 1/4 y 3/4 en nivel extendido (lib a posición del cuerpo)',
            'Soltar con 1/2 giro desde nivel de cintura (agrupado) hacia posición del cuerpo extendido',
            'Soltar con giro completo desde nivel de suelo (switch up) hacia posición del cuerpo extendido',
            'Tic toc con giro completo hacia nivel extendido (1 pierna a lib)',
            'Tic toc con giro completo en nivel extendido (1 pierna a lib)',
          ]},
          { header: 'ESTILO COED', items: [
            'No Asistido:',
            'Walk in a manos, impulso hacia 1 pierna extendida',
            'Toss a manos, impulso hacia 1 pierna extendida',
            'Walk in hacia 1 pierna / 1 brazo extendido',
            'Toss hacia 1 pierna / 1 brazo extendido',
          ]},
          { header: 'DESMONTE', items: [
            'Desmonte con doble giro desde posición del cuerpo extendido hacia cuna',
          ]},
        ],
      },
    ],
    lanzamientosSinGiro: ['Carpado gancho pateo', 'Carpado pateo chica linda', 'Carpado doble pateo', 'Gancho doble pateo'],
    lanzamientosConGiro: ['Gancho pateo giro', 'Doble pateo giro', 'Pateo pateo giro', 'Carpado pateo giro', 'Pateo giro pateo'],
  },

  // ── Nivel 6 ───────────────────────────────────────────────────────────────

  N6: {
    label: 'Future Flyer Nivel 6',
    elevaciones: [
      {
        title: 'HABILIDADES DEL NIVEL',
        cols: [
          { header: 'ESTILO INVERSIÓN', items: [
            'Inversión descendente desde nivel extendido',
            'Inversión descendente desde 1 pierna extendida',
            'Inversión suelta desde nivel prep o superior hacia extensión',
            'Inversión suelta desde nivel prep o superior hacia lib extendido',
            'Rewind hacia nivel de cintura (N6)',
          ]},
          { header: 'ESTILO SUELTO', items: [
            'Tic toc en nivel extendido (lib a lib)',
            'Tic toc desde nivel prep hacia nivel extendido (lib a lib)',
            'Tic toc desde nivel prep hacia nivel extendido (lib a posición del cuerpo)',
          ]},
          { header: 'GIRO', items: [
            'Transición con giro completo hacia posición del cuerpo extendido',
            'Transición entre 1 ¼ y 1 ¾ de giro hacia extensión',
            'Entre 1 ½ y 2 giros hacia prono',
            'Movimientos sueltos de helicóptero con giro',
          ]},
          { header: 'COMBINACIÓN / OTRAS HABILIDADES', items: [
            'Tic toc entre 1/4 y 3/4 de giro hacia 1 pierna extendida',
            'Soltar con 1/2 giro desde nivel de suelo (switch up) hacia 1 pierna extendida',
            'Soltar con 1/2 giro desde nivel de cintura (agrupado) hacia 1 pierna extendida',
            'Subida de flic flac entre 1/4 y 1/2 giro hacia elevación prep (N6)',
          ]},
          { header: 'ESTILO COED', items: [
            'Asistido o No Asistido:',
            'Walk in / toss hacia extensión',
            'Walk in / toss a manos, impulso hacia 1 pierna extendida',
            'Walk in hacia 1 pierna extendida',
          ]},
          { header: 'DESMONTE', items: [
            'Desmonte con doble giro desde lib extendido hacia cuna',
          ]},
        ],
      },
      {
        title: 'HABILIDADES AVANZADAS',
        cols: [
          { header: 'ESTILO INVERSIÓN', items: [
            'Rewind hacia elevación prep (N6)',
            'Inversión suelta desde mano a mano en nivel prep hacia lib extendido',
          ]},
          { header: 'ESTILO SUELTO', items: [
            'Tic toc en nivel extendido (lib a posición del cuerpo)',
          ]},
          { header: 'GIRO', items: [
            'Transición con 1 ½ giro hacia / en nivel extendido a lib',
            'Transición con 1 ¾ giro hacia / en nivel extendido a lib (N6)',
            'Transición con doble giro hacia / en extensión',
            'Transición con 2 ¼ giros hacia / en extensión (N6)',
          ]},
          { header: 'COMBINACIÓN / OTRAS HABILIDADES', items: [
            'Tic toc con giro completo hacia nivel extendido (1 pierna a lib)',
            'Soltar con giro completo desde nivel de suelo (switch up) hacia lib extendido',
            'Subida de flic flac con 1/4 de giro hacia posición del cuerpo extendida (N6)',
            'Inversión suelta entre 1/4 y 1/2 giro desde nivel prep hacia 1 pierna extendida (N6)',
            'Soltar con 1 ½ giro desde nivel de suelo (switch up) hacia lib extendido',
          ]},
          { header: 'ESTILO COED', items: [
            'Asistido:',
            'Toss hacia 1 pierna extendida',
            'Toss hacia 1 brazo extendido',
            'Toss con giro completo hacia elevación extendida',
            'Rewind hacia elevación prep (N6)',
          ]},
          { header: 'DESMONTE', items: [
            'Desmonte con doble giro desde posición del cuerpo extendido hacia cuna',
          ]},
        ],
      },
      {
        title: 'HABILIDADES ÉLITE',
        cols: [
          { header: 'ESTILO INVERSIÓN', items: [
            'Inversión suelta desde mano a mano en nivel prep hacia posición del cuerpo extendida',
            'Inversión suelta desde mano a mano extendido hacia extensión',
            'Rewind hacia elevación extendida (N6)',
          ]},
          { header: 'ESTILO SUELTO', items: [
            'Tic toc en nivel extendido (posición del cuerpo a posición del cuerpo)',
          ]},
          { header: 'GIRO', items: [
            'Transición con 1 ½ giro hacia / en nivel extendido a posición del cuerpo',
            'Transición con 1 ¾ giro hacia / en nivel extendido a posición del cuerpo (N6)',
            'Transición con doble giro hacia / en nivel extendido a 1 pierna (N6)',
          ]},
          { header: 'COMBINACIÓN / OTRAS HABILIDADES', items: [
            'Tic toc con giro completo en nivel extendido (lib a lib)',
            'Subida de flic flac con 1/2 de giro hacia elevación extendida (N6)',
            'Inversión suelta con 1/2 giro desde nivel prep o superior hacia posición del cuerpo extendida (N6)',
            'Subida de hand vault con 1/2 giro hacia elevación extendida (N6)',
            'Soltar entre 1 y 1 ½ giro desde nivel de suelo (switch up) hacia posición del cuerpo extendida',
            'Tic toc entre 1/4 y 3/4 de giro en nivel extendido (posición del cuerpo a posición del cuerpo)',
            'Soltar con giro completo desde nivel de cintura (agrupado) hacia posición del cuerpo extendida',
            'Tic toc con giro completo hacia nivel extendido (1 pierna a posición del cuerpo)',
          ]},
          { header: 'ESTILO COED', items: [
            'No Asistido:',
            'Toss hacia 1 pierna extendida',
            'Toss hacia 1 brazo extendido',
            'Toss con giro completo hacia elevación extendida',
            'Rewind hacia elevación extendida (N6)',
            'Subida de hand vault con 1/2 giro hacia elevación extendida (N6)',
            'Inversión suelta desde mano a mano extendido hacia elevación extendida',
          ]},
          { header: 'DESMONTE', items: [
            'Desmonte pateo giro pateo hacia cuna (N6)',
            'Desmonte pateo doble giro hacia cuna (N6)',
          ]},
        ],
      },
    ],
    lanzamientosSinGiro: ['Carpado gancho pateo', 'Carpado pateo chica linda', 'Carpado doble pateo', 'Gancho pateo pateo'],
    lanzamientosConGiro: [
      'Agrupado doble giro (N6)', 'Carpado doble giro (N6)', 'Pateo doble giro (N6)',
      'Toe touch doble giro (N6)', 'Doble giro toe touch (N6)',
      'Gancho pateo doble giro (N6)', 'Doble pateo doble giro (N6)', 'Pateo giro pateo giro (N6)',
    ],
  },

  // ── Nivel 7 ───────────────────────────────────────────────────────────────

  N7: {
    label: 'Future Flyer Nivel 7',
    elevaciones: [
      {
        title: 'HABILIDADES DEL NIVEL',
        cols: [
          { header: 'ESTILO INVERSIÓN', items: [
            'Mortal libre desde nivel de suelo hacia cuna (N7)',
            'Mortal libre desde nivel de suelo hacia nivel prep (N7) (excluyendo rewind)',
            'Mortal libre desde nivel de suelo hacia extensión (N7) (excluyendo rewind)',
            'Inversión suelta desde nivel prep o superior hacia extensión',
            'Inversión suelta desde nivel prep o superior hacia lib extendido',
            'Rewind con 1 ¼ rotación de mortal (N7)',
            'Rewind hacia elevación prep',
          ]},
          { header: 'ESTILO SUELTO', items: [
            'Tic toc en nivel extendido (lib a lib)',
            'Tic toc hacia nivel extendido (lib a lib)',
            'Tic toc hacia nivel extendido (1 pierna a posición del cuerpo)',
          ]},
          { header: 'GIRO', items: [
            'Transición entre 1 ¼ y 1 ¾ de giro hacia extensión',
            'Transición con doble giro hacia extensión',
          ]},
          { header: 'COMBINACIÓN / OTRAS HABILIDADES', items: [
            'Entre 1 ½ y 2 giros hacia prono',
            'Movimientos sueltos de helicóptero con giro',
            'Subida de hand vault con 1/2 giro hacia extensión',
            'Tic toc entre 1/4 y 3/4 de giro hacia 1 pierna extendida',
            'Soltar con 1/2 giro desde nivel de suelo (switch up) hacia 1 pierna extendida',
            'Mortal libre con giro desde nivel de suelo hacia cuna (N7)',
            'Soltar con 1/2 giro desde nivel de cintura (agrupado) hacia 1 pierna extendida',
          ]},
          { header: 'ESTILO COED', items: [
            'Asistido / No Asistido:',
            'Walk in / toss hacia extensión',
            'Walk in / toss hacia manos, impulso hacia 1 pierna extendida',
            'Walk in hacia 1 pierna extendida',
          ]},
          { header: 'DESMONTE', items: [
            'Mortal adelante libre hacia nivel de suelo (N7)',
            'Mortal libre desde nivel prep o inferior hacia cuna (N7)',
            'Desmonte con doble giro desde 1 pierna extendida hacia cuna',
          ]},
        ],
      },
      {
        title: 'HABILIDADES AVANZADAS',
        cols: [
          { header: 'ESTILO INVERSIÓN', items: [
            'Flic flac – rewind hacia nivel prep (N7)',
            'Media luna / Rondada – rewind hacia elevación prep (N7)',
            'Rewind hacia extensión',
            'Mortal libre desde nivel de suelo hacia extensión (N7) (excluyendo rewind)',
          ]},
          { header: 'ESTILO SUELTO', items: [
            'Tic toc en nivel extendido (lib a posición del cuerpo)',
          ]},
          { header: 'GIRO', items: [
            'Transición con 1 ½ giro hacia / en nivel extendido a lib',
            'Transición con 1 ¾ giro hacia / en nivel extendido a lib',
            'Transición con doble giro hacia / en extensión',
            'Transición con 2 ¼ de giro hacia / en extensión',
          ]},
          { header: 'COMBINACIÓN / OTRAS HABILIDADES', items: [
            'Tic toc con giro completo hacia nivel extendido (1 pierna a lib)',
            'Soltar con giro completo desde nivel de suelo (switch up) hacia lib extendido',
            'Subida de flic flac con 1/4 de giro hacia posición del cuerpo extendida',
            'Inversión suelta entre 1/4 y 1/2 giro desde nivel prep o superior hacia 1 pierna extendida',
            'Soltar con 1 ½ giro desde nivel de suelo (switch up) hacia 1 pierna extendida',
            'Mortal libre con giro desde nivel de suelo hacia elevación en prep (N7)',
            'Rewind entre 1/4 y 1 ¼ de giro hacia nivel prep (N7)',
            'Subida de flic flac con giro completo hacia nivel prep (N7)',
          ]},
          { header: 'ESTILO COED', items: [
            'Asistido:',
            'Toss hacia 1 pierna extendida',
            'Toss hacia 1 brazo extendido',
            'Toss con giro completo hacia elevación extendida',
            'No Asistido:',
            'Toss hacia 1 brazo extendido',
          ]},
          { header: 'DESMONTE', items: [] },
        ],
      },
      {
        title: 'HABILIDADES ÉLITE',
        cols: [
          { header: 'ESTILO INVERSIÓN', items: [
            'Soltar desde mano a mano en nivel prep hacia posición del cuerpo extendida',
            'Inversión suelta desde mano a mano extendido hacia extensión',
            'Rewind hacia 1 pierna extendida',
            'Flic flac – rewind hacia elevación extendida (N7)',
            'Media luna / Rondada – rewind hacia elevación extendida (N7)',
            'Mortal libre desde nivel de suelo hacia 1 pierna extendida (N7) (excluyendo rewind)',
          ]},
          { header: 'ESTILO SUELTO', items: [
            'Tic toc en nivel extendido (posición del cuerpo a posición del cuerpo)',
          ]},
          { header: 'GIRO', items: [
            'Transición con 1 ½ giro hacia / en nivel extendido a posición del cuerpo',
            'Transición con 1 ¾ de giro hacia / en nivel extendido a posición del cuerpo',
            'Transición con doble giro hacia / en nivel extendido a 1 pierna',
          ]},
          { header: 'COMBINACIÓN / OTRAS HABILIDADES', items: [
            'Tic toc con giro completo en nivel extendido (1 pierna a lib)',
            'Subida de flic flac con giro completo hacia elevación extendida (N7)',
            'Inversión suelta con 1/2 giro desde nivel prep o superior hacia posición de cuerpo extendida',
            'Subida de hand vault con 1 ½ giro hacia elevación extendida (N7)',
            'Soltar entre 1 y 1 ½ giro desde nivel de suelo (switch up) hacia posición del cuerpo extendida',
            'Tic toc entre 1/4 y 3/4 de giro en nivel extendido (posición del cuerpo a posición del cuerpo)',
            'Soltar con giro completo desde nivel de cintura (agrupado) hacia posición del cuerpo extendida',
            'Tic toc con giro completo hacia nivel extendido (1 pierna a posición del cuerpo)',
            'Mortal libre con giro desde nivel de suelo hacia elevación extendida (N7)',
            'Rewind entre 1/4 y 1 ¼ giro hacia elevación extendida (N7)',
          ]},
          { header: 'ESTILO COED', items: [
            'No Asistido:',
            'Toss con giro completo hacia elevación extendida',
            'Rewind hacia elevación extendida',
            'Subida de hand vault con 1/2 giro hacia elevación extendida',
            'Subida de flic flac con giro completo hacia elevación extendida (N7)',
            'Inversión suelta desde mano a mano extendido hacia elevación extendida',
          ]},
          { header: 'DESMONTE', items: [
            'Desmonte con giro pateo giro hacia cuna',
            'Desmonte con pateo doble giro hacia cuna',
            'Desmonte de mortal libre con 1/2 giro desde nivel prep hacia cuna (N7)',
          ]},
        ],
      },
    ],
    lanzamientosSinGiro: ['Mortal agrupado', 'Mortal X-out', 'Mortal carpado', 'Mortal extendido', 'Pateo triple giro (Sin Mortal)'],
    lanzamientosConGiro: [
      'Mortal extendido con giro', 'Mortal extendido con doble giro',
      'Mortal X-out con giro', 'Mortal pateo con giro',
      'Arabian con 1 ½ giro', 'Carpado a extendido con doble giro',
    ],
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  subGroup: string; // 'N4' | 'N5' | 'N6' | 'N7'
}

const TIER_BG = ['bg-white', 'bg-zinc-50', 'bg-white'];

export function FutureFlyerSkillPanel({ subGroup }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('skillPanel_futureFlyer');
      if (stored !== null) setOpen(stored === 'true');
    } catch { /* noop */ }
  }, []);

  const toggle = () => {
    setOpen(prev => {
      const next = !prev;
      try { localStorage.setItem('skillPanel_futureFlyer', String(next)); } catch { /* noop */ }
      return next;
    });
  };

  const data = LEVELS[subGroup];
  if (!data) return null;

  return (
    <div className="print:hidden mb-6">
      {/* ── Toggle button ─────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between gap-4 rounded-xl border border-blue-100 bg-blue-50 px-5 py-3 hover:bg-blue-100 transition-colors group"
      >
        <div className="flex items-center gap-2.5 text-left min-w-0">
          <BookOpen className="w-4 h-4 text-blue-500 shrink-0" />
          <div className="min-w-0">
            <span className="text-sm font-semibold text-blue-800 mr-2">
              Habilidades {data.label}
            </span>
            <span className="text-xs text-blue-500">— Elevaciones y Lanzamientos</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-medium text-blue-500">
            {open ? 'Ocultar' : 'Ver tabla'}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-blue-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* ── Expandable panel ──────────────────────────────────────────── */}
      {open && (
        <div className="mt-2 rounded-xl border border-blue-100 bg-white overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                Sistema de Calificación 2025
              </p>
              <p className="text-sm font-semibold text-zinc-800">
                {data.label} — Elevaciones y Lanzamientos
              </p>
            </div>
            <button
              type="button"
              onClick={toggle}
              className="text-[11px] font-medium text-zinc-400 hover:text-zinc-600 transition-colors px-2 py-1 rounded hover:bg-zinc-100"
            >
              ▲ Ocultar
            </button>
          </div>

          <div className="px-5 py-4 space-y-6">

            {/* ── ELEVACIONES table ──────────────────────────────────── */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">
                Elevaciones
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs min-w-[800px]">
                  <thead>
                    <tr>
                      {COLS.map(col => (
                        <th
                          key={col}
                          className="bg-zinc-800 text-white px-3 py-2 text-center font-semibold uppercase tracking-wide text-[10px] border border-zinc-700"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.elevaciones.map((tier, ti) => (
                      <>
                        <tr key={tier.title + '-h'}>
                          <td
                            colSpan={COLS.length}
                            className="bg-zinc-600 text-white text-center text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 border border-zinc-500"
                          >
                            {tier.title}
                          </td>
                        </tr>
                        <tr key={tier.title + '-c'} className={TIER_BG[ti]}>
                          {tier.cols.map(col => (
                            <td
                              key={col.header}
                              className="align-top px-3 py-2.5 border border-zinc-200"
                            >
                              {col.items.length === 0 ? (
                                <span className="text-zinc-300 italic">—</span>
                              ) : (
                                <ul className="space-y-1">
                                  {col.items.map((item, i) => (
                                    <li key={i} className="flex items-start gap-1.5 text-zinc-700">
                                      {item.endsWith(':') ? (
                                        <span className="font-semibold text-zinc-500 text-[10px] uppercase tracking-wide mt-0.5">{item}</span>
                                      ) : (
                                        <>
                                          <span className="mt-1 shrink-0 w-1 h-1 rounded-full bg-zinc-400" />
                                          <span className="leading-relaxed">{item}</span>
                                        </>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </td>
                          ))}
                        </tr>
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── LANZAMIENTOS table ─────────────────────────────────── */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">
                Lanzamientos
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs min-w-[400px]">
                  <thead>
                    <tr>
                      <th className="bg-zinc-800 text-white px-3 py-2 text-center font-semibold uppercase tracking-wide text-[10px] border border-zinc-700 w-1/2">
                        SIN GIRO
                      </th>
                      <th className="bg-zinc-800 text-white px-3 py-2 text-center font-semibold uppercase tracking-wide text-[10px] border border-zinc-700 w-1/2">
                        CON GIRO
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-white">
                      <td className="align-top px-3 py-2.5 border border-zinc-200">
                        <ul className="space-y-1">
                          {data.lanzamientosSinGiro.map((item, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-zinc-700">
                              <span className="mt-1 shrink-0 w-1 h-1 rounded-full bg-zinc-400" />
                              <span className="leading-relaxed">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="align-top px-3 py-2.5 border border-zinc-200">
                        <ul className="space-y-1">
                          {data.lanzamientosConGiro.map((item, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-zinc-700">
                              <span className="mt-1 shrink-0 w-1 h-1 rounded-full bg-zinc-400" />
                              <span className="leading-relaxed">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-zinc-400 mt-2">
                Cada habilidad separada por una viñeta es considerada una "habilidad diferente" y no recibirá crédito más de una vez.
              </p>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
