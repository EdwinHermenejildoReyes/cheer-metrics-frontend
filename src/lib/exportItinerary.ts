import type { Registration } from '@/types/competitions';
import type { Organization } from '@/types/competitions';

const GAP_REGISTRO_FOTO    = 5;
const GAP_FOTO_WARMUP      = 5;
const GAP_WARMUP_BACKSTAGE = 6;
const GAP_BACKSTAGE_PRES   = 5;
const GAP_ENTRE_PRES       = 5;

function parseStartTime(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function addMin(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function fmt(date: Date): string {
  return date.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false });
}

interface ItineraryRow {
  slot: number;
  division: string;
  team: string;
  gym: string;
  registro: string;
  foto: string;
  warmup: string;
  backstage: string;
  presentacion: string;
}

export function buildItineraryRows(registrations: Registration[], startTimeHHMM: string): ItineraryRow[] {
  const ordered = [...registrations]
    .filter((r) => r.performance_order != null)
    .sort((a, b) => (a.performance_order ?? 0) - (b.performance_order ?? 0));

  const base = parseStartTime(startTimeHHMM);

  return ordered.map((reg, idx) => {
    const pres      = addMin(base, idx * GAP_ENTRE_PRES);
    const backstage = addMin(pres,  -GAP_BACKSTAGE_PRES);
    const warmup    = addMin(backstage, -GAP_WARMUP_BACKSTAGE);
    const foto      = addMin(warmup,    -GAP_FOTO_WARMUP);
    const registro  = addMin(foto,      -GAP_REGISTRO_FOTO);
    return {
      slot: reg.performance_order!,
      division: reg.division_name,
      team: reg.team_name,
      gym: reg.gym_name,
      registro: fmt(registro),
      foto:     fmt(foto),
      warmup:   fmt(warmup),
      backstage: fmt(backstage),
      presentacion: fmt(pres),
    };
  });
}

export async function fetchItineraryRegistrations(
  competitionsRepository: { listRegistrations: (p: Record<string, string>) => Promise<{ data: { results: Registration[]; next: string | null } }> },
  competitionPublicId: string,
): Promise<Registration[]> {
  const all: Registration[] = [];
  let page = 1;
  while (true) {
    const res = await competitionsRepository.listRegistrations({
      division__competition__public_id: competitionPublicId,
      page_size: '200',
      page: String(page),
    });
    all.push(...res.data.results);
    if (!res.data.next) break;
    page++;
  }
  return all.filter((r) => r.performance_order != null);
}

export function printItineraryPdf(
  competition: { name: string; date: string; venue: string; city: string },
  organization: Organization | null | undefined,
  registrations: Registration[],
  startTimeHHMM: string,
) {
  const rows    = buildItineraryRows(registrations, startTimeHHMM);
  const primary = organization?.primary_color  ?? '#18181b';
  const primTxt = organization?.text_on_primary ?? '#ffffff';
  const today   = new Date().toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' });
  const compDate = new Date(competition.date + 'T00:00:00').toLocaleDateString('es-EC', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });

  const logoHtml = organization?.logo
    ? `<img src="${organization.logo}" alt="" style="height:32px;width:auto;object-fit:contain;filter:brightness(0) invert(1);margin-right:10px;">`
    : '';

  const rowsHtml = rows.map((r, i) => `
    <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f9f9fb'};">
      <td style="padding:4px 6px;text-align:center;font-weight:700;color:${primary};">${r.slot}</td>
      <td style="padding:4px 6px;max-width:130px;">${r.division}</td>
      <td style="padding:4px 6px;font-weight:600;">${r.team}</td>
      <td style="padding:4px 6px;color:#52525b;">${r.gym}</td>
      <td style="padding:4px 6px;font-family:monospace;text-align:center;">${r.registro}</td>
      <td style="padding:4px 6px;font-family:monospace;text-align:center;">${r.foto}</td>
      <td style="padding:4px 6px;font-family:monospace;text-align:center;">${r.warmup}</td>
      <td style="padding:4px 6px;font-family:monospace;text-align:center;">${r.backstage}</td>
      <td style="padding:4px 6px;font-family:monospace;text-align:center;font-weight:700;color:${primary};">${r.presentacion}</td>
      <td style="padding:4px 6px;text-align:center;color:#71717a;">2:30 min</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Itinerario – ${competition.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 10px; color: #18181b; }
    @media print {
      @page { margin: 10mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
    th { padding: 5px 6px; font-size: 8.5px; font-weight: 600; letter-spacing: 0.04em; white-space: nowrap; }
  </style>
</head>
<body>
  <!-- Header -->
  <div style="background:${primary};color:${primTxt};display:flex;align-items:center;justify-content:space-between;padding:10px 20px;">
    <div style="display:flex;align-items:center;">
      ${logoHtml}
      <div>
        ${organization?.name ? `<p style="font-size:13px;font-weight:700;line-height:1.2;">${organization.name}</p>` : ''}
        <p style="font-size:10px;opacity:0.75;margin-top:2px;">Itinerario de Presentaciones · Cheer Metrics</p>
      </div>
    </div>
    <div style="text-align:right;font-size:10px;opacity:0.75;">
      <p>Fecha de impresión</p>
      <p style="font-weight:600;opacity:1;margin-top:1px;">${today}</p>
    </div>
  </div>

  <!-- Competition info -->
  <div style="padding:10px 20px 8px;border-bottom:2px solid ${primary};margin-bottom:8px;">
    <p style="font-size:14px;font-weight:700;">${competition.name}</p>
    <p style="font-size:10px;color:#52525b;margin-top:2px;">
      ${compDate} · ${competition.venue}, ${competition.city} · <strong>Inicio: ${startTimeHHMM}</strong>
    </p>
  </div>

  <!-- Timing legend -->
  <div style="padding:0 20px 8px;display:flex;gap:16px;font-size:9px;color:#71717a;flex-wrap:wrap;">
    <span>Registro→Foto: <strong>5 min</strong></span>
    <span>Foto→Warm Up: <strong>5 min</strong></span>
    <span>Warm Up→Backstage: <strong>6 min</strong></span>
    <span>Backstage→Presentación: <strong>5 min</strong></span>
    <span>Entre presentaciones: <strong>5 min</strong></span>
    <span>Duración máx.: <strong>2:30 min</strong></span>
  </div>

  <!-- Table -->
  <div style="padding:0 20px;">
    <table>
      <thead>
        <tr style="background:${primary};color:${primTxt};">
          <th style="text-align:center;">#</th>
          <th style="text-align:left;">División</th>
          <th style="text-align:left;">Equipo</th>
          <th style="text-align:left;">Gimnasio</th>
          <th style="text-align:center;">REGISTRO</th>
          <th style="text-align:center;">FOTO</th>
          <th style="text-align:center;">WARM UP</th>
          <th style="text-align:center;">BACKSTAGE</th>
          <th style="text-align:center;">PRESENTACIÓN</th>
          <th style="text-align:center;">DUR. MÁX.</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <p style="margin-top:10px;font-size:8px;color:#a1a1aa;text-align:right;">
      Generado por Cheer Metrics · ${rows.length} equipos
    </p>
  </div>
</body>
</html>`;

  const printEl = document.createElement('div');
  printEl.id = 'cheer-itinerary-print';
  printEl.innerHTML = html;
  document.body.appendChild(printEl);

  const style = document.createElement('style');
  style.textContent = `@media print { body > *:not(#cheer-itinerary-print) { display: none !important; } #cheer-itinerary-print { display: block !important; } }`;
  document.head.appendChild(style);

  const cleanup = () => {
    printEl.remove();
    style.remove();
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  window.print();
}
