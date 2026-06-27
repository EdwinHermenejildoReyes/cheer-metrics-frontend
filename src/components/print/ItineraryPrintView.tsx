import type { Organization } from '@/types/competitions';
import type { Registration } from '@/types/competitions';

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

function buildRows(registrations: Registration[], startTimeHHMM: string): ItineraryRow[] {
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
      foto: fmt(foto),
      warmup: fmt(warmup),
      backstage: fmt(backstage),
      presentacion: fmt(pres),
    };
  });
}

interface Props {
  competition: { name: string; date: string; venue: string; city: string };
  organization?: Organization | null;
  registrations: Registration[];
  startTime: string;
}

export function ItineraryPrintView({ competition, organization, registrations, startTime }: Props) {
  const primary     = organization?.primary_color  ?? '#18181b';
  const primaryText = organization?.text_on_primary ?? '#ffffff';
  const today       = new Date().toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' });
  const rows        = buildRows(registrations, startTime);

  const ROW_BG_EVEN = '#f9f9fb';

  return (
    <div className="hidden print:block text-black font-sans" style={{ fontSize: '10px', lineHeight: '1.4' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-5 py-2.5"
        style={{ backgroundColor: primary, color: primaryText }}
      >
        <div className="flex items-center gap-3">
          {organization?.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={organization.logo}
              alt=""
              style={{ height: '32px', width: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
            />
          )}
          <div>
            {organization?.name && (
              <p style={{ fontSize: '13px', fontWeight: 700, color: primaryText, lineHeight: 1.2 }}>
                {organization.name}
              </p>
            )}
            <p style={{ fontSize: '10px', color: primaryText, opacity: 0.75, marginTop: '1px' }}>
              Itinerario de Presentaciones · Cheer Metrics
            </p>
          </div>
        </div>
        <div className="text-right" style={{ fontSize: '10px', color: primaryText, opacity: 0.75 }}>
          <p>Fecha de impresión</p>
          <p style={{ fontWeight: 600, opacity: 1, marginTop: '1px' }}>{today}</p>
        </div>
      </div>

      {/* ── Competition info ────────────────────────────────────────────────── */}
      <div
        className="px-5 pt-3 pb-2"
        style={{ borderBottom: `2px solid ${primary}`, marginBottom: '10px' }}
      >
        <p style={{ fontSize: '14px', fontWeight: 700 }}>{competition.name}</p>
        <p style={{ fontSize: '10px', color: '#52525b', marginTop: '2px' }}>
          {new Date(competition.date + 'T00:00:00').toLocaleDateString('es-EC', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          {' · '}{competition.venue}, {competition.city}
          {' · '}<strong>Inicio: {startTime}</strong>
        </p>
      </div>

      {/* ── Timing legend ───────────────────────────────────────────────────── */}
      <div className="px-5 mb-3 flex gap-5" style={{ fontSize: '9px', color: '#71717a' }}>
        <span>Registro→Foto: <strong>5 min</strong></span>
        <span>Foto→Warm Up: <strong>5 min</strong></span>
        <span>Warm Up→Backstage: <strong>6 min</strong></span>
        <span>Backstage→Presentación: <strong>5 min</strong></span>
        <span>Entre presentaciones: <strong>5 min</strong></span>
        <span>Duración máx.: <strong>2:30 min</strong></span>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="px-5">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px' }}>
          <thead>
            <tr style={{ backgroundColor: primary, color: primaryText }}>
              {['#', 'División', 'Equipo', 'Gimnasio', 'REGISTRO', 'FOTO', 'WARM UP', 'BACKSTAGE', 'PRESENTACIÓN', 'DUR. MÁX.'].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '5px 6px',
                    textAlign: h === '#' ? 'center' : 'left',
                    fontWeight: 600,
                    fontSize: '8.5px',
                    letterSpacing: '0.04em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.slot} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : ROW_BG_EVEN }}>
                <td style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 700, color: primary }}>{row.slot}</td>
                <td style={{ padding: '4px 6px', maxWidth: '120px' }}>{row.division}</td>
                <td style={{ padding: '4px 6px', fontWeight: 600 }}>{row.team}</td>
                <td style={{ padding: '4px 6px', color: '#52525b' }}>{row.gym}</td>
                <td style={{ padding: '4px 6px', fontFamily: 'monospace', textAlign: 'center' }}>{row.registro}</td>
                <td style={{ padding: '4px 6px', fontFamily: 'monospace', textAlign: 'center' }}>{row.foto}</td>
                <td style={{ padding: '4px 6px', fontFamily: 'monospace', textAlign: 'center' }}>{row.warmup}</td>
                <td style={{ padding: '4px 6px', fontFamily: 'monospace', textAlign: 'center' }}>{row.backstage}</td>
                <td style={{ padding: '4px 6px', fontFamily: 'monospace', textAlign: 'center', fontWeight: 700, color: primary }}>{row.presentacion}</td>
                <td style={{ padding: '4px 6px', textAlign: 'center', color: '#71717a' }}>2:30 min</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ marginTop: '12px', fontSize: '8px', color: '#a1a1aa', textAlign: 'right' }}>
          Generado por Cheer Metrics · {rows.length} equipos
        </p>
      </div>
    </div>
  );
}
