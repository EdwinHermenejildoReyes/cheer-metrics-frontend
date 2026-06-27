import * as XLSX from 'xlsx';
import type { Registration } from '@/types/competitions';

// Timing constants (minutes)
const GAP_REGISTRO_FOTO    = 5;
const GAP_FOTO_WARMUP      = 5;
const GAP_WARMUP_BACKSTAGE = 6;
const GAP_BACKSTAGE_PRES   = 5;
const GAP_ENTRE_PRES       = 5;   // minutes between each presentation start

/** Total minutes before a team's presentation that registration opens */
const OFFSET_REGISTRO = GAP_REGISTRO_FOTO + GAP_FOTO_WARMUP + GAP_WARMUP_BACKSTAGE + GAP_BACKSTAGE_PRES; // 21

function parseStartTime(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function fmt(date: Date): string {
  return date.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function exportItinerary(
  competitionName: string,
  startTimeHHMM: string,
  registrations: Registration[],
) {
  const ordered = [...registrations]
    .filter((r) => r.performance_order != null)
    .sort((a, b) => (a.performance_order ?? 0) - (b.performance_order ?? 0));

  const basePresentation = parseStartTime(startTimeHHMM);

  const rows = ordered.map((reg, idx) => {
    const presTime       = addMinutes(basePresentation, idx * GAP_ENTRE_PRES);
    const backstageTime  = addMinutes(presTime,  -GAP_BACKSTAGE_PRES);
    const warmupTime     = addMinutes(backstageTime, -GAP_WARMUP_BACKSTAGE);
    const fotoTime       = addMinutes(warmupTime,    -GAP_FOTO_WARMUP);
    const registroTime   = addMinutes(fotoTime,      -GAP_REGISTRO_FOTO);

    return {
      '#':              reg.performance_order,
      'DIVISIÓN':       reg.division_name,
      'EQUIPO':         reg.team_name,
      'GIMNASIO':       reg.gym_name,
      'REGISTRO':       fmt(registroTime),
      'FOTO':           fmt(fotoTime),
      'WARM UP':        fmt(warmupTime),
      'BACKSTAGE':      fmt(backstageTime),
      'PRESENTACIÓN':   fmt(presTime),
      'DURACIÓN MÁX.':  '2:30 min',
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);

  // Column widths
  ws['!cols'] = [
    { wch: 4 },   // #
    { wch: 28 },  // División
    { wch: 24 },  // Equipo
    { wch: 20 },  // Gimnasio
    { wch: 9 },   // Registro
    { wch: 8 },   // Foto
    { wch: 9 },   // Warm up
    { wch: 10 },  // Backstage
    { wch: 12 },  // Presentación
    { wch: 12 },  // Duración
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Itinerario');

  const filename = `itinerario_${competitionName.replace(/\s+/g, '_').toLowerCase()}.xlsx`;
  XLSX.writeFile(wb, filename);
}
