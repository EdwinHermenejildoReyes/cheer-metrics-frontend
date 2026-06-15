'use client';

import {
  DEDUCTION_CODES,
  DEDUCTION_TYPE_LABELS,
  DEDUCTION_AMOUNTS,
  type DeductionType,
  type Deduction,
} from '@/types/competitions';

const FALLS:   DeductionType[] = ['x', 'ca', 'csa', 'ec', 'cc', 'csc'];
const TIME:    DeductionType[] = ['tiempo', 'tiempo_grave'];
const ILLEGAL: DeductionType[] = ['pi', 'eap', 'rg', 'gfn', 'bfn', 'seg'];
const ADMIN:   DeductionType[] = ['ad', 'div'];

const ZONE_ROWS = [
  { key: 'F', label: 'FRENTE' },
  { key: 'C', label: 'CENTRO' },
  { key: 'T', label: 'FONDO'  },
] as const;

const ZONE_COLS = [
  { key: 'IZQ', label: 'IZQ' },
  { key: 'CTR', label: 'CTR' },
  { key: 'DER', label: 'DER' },
] as const;

const TRACK_ZONES = ZONE_ROWS.flatMap(r =>
  ZONE_COLS.map(c => ({ key: `${r.key}·${c.key}` as string, rowKey: r.key, colKey: c.key }))
);

const TRACK_INTERVALS = [
  { key: '0 a 15',      label: '0 a 15'      },
  { key: '15 a 30',     label: '15 a 30'     },
  { key: '30 a 45',     label: '30 a 45'     },
  { key: '45 a 1',      label: '45 a 1'      },
  { key: '1 a 1:15',    label: '1 a 1:15'    },
  { key: '1:15 a 1:30', label: '1:15 a 1:30' },
  { key: '1:30 a 1:45', label: '1:30 a 1:45' },
  { key: '1:45 a 2:00', label: '1:45 a 2:00' },
  { key: '2:00 a 2:15', label: '2:00 a 2:15' },
  { key: '2:15 a 2:30', label: '2:15 a 2:30' },
];

type ColorKey = 'red' | 'orange' | 'amber' | 'zinc';

function colorFor(type: DeductionType): ColorKey {
  if (FALLS.includes(type))   return 'red';
  if (TIME.includes(type))    return 'orange';
  if (ILLEGAL.includes(type)) return 'amber';
  return 'zinc';
}

const BADGE_COLORS: Record<ColorKey, string> = {
  red:    'bg-red-100 text-red-700 border-red-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
  amber:  'bg-amber-100 text-amber-800 border-amber-200',
  zinc:   'bg-zinc-100 text-zinc-700 border-zinc-200',
};

function fmt(n: number | string) { return parseFloat(String(n)).toFixed(2); }

export interface DeduccionesSheetReadOnlyProps {
  deductions: Deduction[];
  totalDed: number;
  scaledScore: number;
  finalScore: number;
}

export function DeduccionesSheetReadOnly({ deductions, totalDed, scaledScore, finalScore }: DeduccionesSheetReadOnlyProps) {
  const dedsByZone: Record<string, Deduction[]> = {};
  for (const d of deductions) {
    const k = d.routine_time || 'sin tiempo';
    if (!dedsByZone[k]) dedsByZone[k] = [];
    dedsByZone[k].push(d);
  }

  const zoneKey = (intervalKey: string, zKey: string) => `${intervalKey} / ${zKey}`;

  return (
    <div className="bg-zinc-50 rounded-2xl overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-6 pointer-events-none select-none">

        {/* 2-column layout: track + reference */}
        <div className="grid grid-cols-[1fr_152px] gap-4 items-start">

          {/* CENTER — Track grid */}
          <div className="flex flex-col rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
            {/* Track header */}
            <div className="flex items-stretch border-b border-zinc-200 bg-zinc-50">
              <div className="w-20 shrink-0 flex items-center justify-center px-2 border-r border-zinc-200">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-700">Tiempo</p>
              </div>
              <div className="flex-1 grid grid-cols-3">
                {ZONE_COLS.map((col, ci) => (
                  <div key={col.key} className={`py-2 text-center ${ci < 2 ? 'border-r border-zinc-200' : ''}`}>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-700">{col.label}</p>
                  </div>
                ))}
              </div>
              <div className="w-20 shrink-0 flex items-center justify-center px-2 border-l border-zinc-200">
                <p className="text-[10px] text-zinc-700">2:30 min</p>
              </div>
            </div>

            {/* Time rows */}
            <div className="divide-y divide-zinc-200">
              {TRACK_INTERVALS.map(({ key, label }) => {
                const isMidpoint = key === '1 a 1:15' || key === '2:00 a 2:15';
                return (
                  <div key={key} className={`flex items-stretch min-h-[80px] ${isMidpoint ? 'bg-zinc-50/60' : ''}`}>
                    {/* Left label */}
                    <div className={`flex flex-col items-end justify-center shrink-0 w-20 px-2.5 py-2 self-stretch border-r ${isMidpoint ? 'border-zinc-400 bg-zinc-100' : 'border-zinc-200'}`}>
                      <span className={`text-[12px] font-mono font-bold tabular-nums leading-snug text-right ${isMidpoint ? 'text-zinc-700' : 'text-zinc-500'}`}>{label.split(' a ')[0]}</span>
                      <span className="text-[9px] font-mono text-zinc-300 leading-none">a</span>
                      <span className={`text-[12px] font-mono font-bold tabular-nums leading-snug text-right ${isMidpoint ? 'text-zinc-700' : 'text-zinc-500'}`}>{label.split(' a ')[1]}</span>
                    </div>

                    {/* 3×3 grid */}
                    <div className="flex-1 grid grid-cols-3 grid-rows-3 divide-x divide-y divide-zinc-100">
                      {TRACK_ZONES.map((zone, zi) => {
                        const fullKey  = zoneKey(key, zone.key);
                        const zoneDeds = dedsByZone[fullKey] ?? [];
                        const isRowLabel = zi % 3 === 0;
                        const rowIdx     = Math.floor(zi / 3);
                        return (
                          <div key={zone.key} className="relative flex flex-col items-center justify-center gap-1 p-1 min-h-[26px]">
                            {isRowLabel && (
                              <span className="absolute left-1 top-1 text-[8px] font-bold uppercase tracking-widest text-zinc-200">{ZONE_ROWS[rowIdx].label[0]}</span>
                            )}
                            {zoneDeds.length > 0 && (
                              <div className="relative z-10 flex flex-wrap gap-1 justify-center">
                                {zoneDeds.map(ded => {
                                  const ck = colorFor(ded.deduction_type);
                                  return (
                                    <div key={ded.id} title={`${DEDUCTION_TYPE_LABELS[ded.deduction_type]}${ded.count > 1 ? ` ×${ded.count}` : ''} = −${ded.total_amount}`}
                                      className={`flex items-center gap-0.5 rounded px-1.5 py-0.5 border text-[10px] font-bold ${BADGE_COLORS[ck]}`}>
                                      {DEDUCTION_CODES[ded.deduction_type]}
                                      {ded.count > 1 && <span className="font-normal opacity-70">×{ded.count}</span>}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {zoneDeds.length === 0 && (
                              <div className="w-1 h-1 rounded-full bg-zinc-200 opacity-40" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Right label */}
                    <div className={`flex flex-col items-start justify-center shrink-0 w-20 px-2.5 py-2 self-stretch border-l ${isMidpoint ? 'border-zinc-400 bg-zinc-100' : 'border-zinc-200'}`}>
                      <span className={`text-[12px] font-mono font-bold tabular-nums leading-snug ${isMidpoint ? 'text-zinc-700' : 'text-zinc-500'}`}>{label.split(' a ')[0]}</span>
                      <span className="text-[9px] font-mono text-zinc-300 leading-none">a</span>
                      <span className={`text-[12px] font-mono font-bold tabular-nums leading-snug ${isMidpoint ? 'text-zinc-700' : 'text-zinc-500'}`}>{label.split(' a ')[1]}</span>
                    </div>
                  </div>
                );
              })}

              {/* Sin tiempo row */}
              {dedsByZone['sin tiempo'] && (
                <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 border-t border-zinc-200">
                  <span className="text-[10px] text-zinc-400 w-20 text-right pr-2 shrink-0">Sin tiempo</span>
                  <div className="flex flex-wrap gap-1.5">
                    {dedsByZone['sin tiempo'].map(ded => {
                      const ck = colorFor(ded.deduction_type);
                      return (
                        <div key={ded.id} className={`flex items-center gap-1 rounded-md px-2 py-0.5 border text-xs font-bold ${BADGE_COLORS[ck]}`}>
                          {DEDUCTION_CODES[ded.deduction_type]}
                          {ded.count > 1 && <span className="font-normal opacity-70">×{ded.count}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="px-4 py-2 border-t border-zinc-100 bg-zinc-50">
              <p className="text-[9px] text-zinc-400 text-center">F = Frente · C = Centro · T = Fondo</p>
            </div>
          </div>

          {/* RIGHT — Reference table */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-bold uppercase tracking-widest text-zinc-700 px-1">Referencia</p>
            {([
              { title: 'CAÍDAS',          types: FALLS,   color: 'red'    as ColorKey },
              { title: 'TIEMPO',          types: TIME,    color: 'orange' as ColorKey },
              { title: 'ILEGALIDADES',    types: ILLEGAL, color: 'amber'  as ColorKey },
              { title: 'ADMINISTRATIVAS', types: ADMIN,   color: 'zinc'   as ColorKey },
            ] as const).map(({ title, types, color }) => (
              <div key={title} className="rounded-lg border border-zinc-100 bg-white overflow-hidden">
                <div className={`px-2.5 py-1 text-[8px] font-bold uppercase tracking-widest ${color === 'red' ? 'bg-red-50 text-red-500' : color === 'orange' ? 'bg-orange-50 text-orange-500' : color === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-zinc-50 text-zinc-500'}`}>{title}</div>
                <div className="divide-y divide-zinc-50">
                  {types.map(type => (
                    <div key={type} className="flex items-center justify-between px-2.5 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black text-zinc-800 w-9">{DEDUCTION_CODES[type]}</span>
                        <span className="text-[8px] text-zinc-400 leading-tight">{DEDUCTION_TYPE_LABELS[type].split(' ').slice(0, 2).join(' ')}</span>
                      </div>
                      <span className="text-[10px] font-bold tabular-nums text-red-500">−{DEDUCTION_AMOUNTS[type]}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* DEDUCTIONS LIST */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-700">
            Descuentos registrados{deductions.length > 0 && ` (${deductions.length})`}
          </h2>
          {deductions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-5 py-8 text-center">
              <p className="text-sm text-zinc-400">Sin descuentos registrados</p>
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <div className="grid grid-cols-[7rem_4.5rem_1fr_5rem] gap-0 border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                <span>Tiempo / Zona</span>
                <span>Código</span>
                <span>Descripción</span>
                <span className="text-right">Monto</span>
              </div>
              <div className="divide-y divide-zinc-100">
                {[...deductions].sort((a, b) => (a.routine_time || 'z').localeCompare(b.routine_time || 'z')).map(ded => {
                  const ck = colorFor(ded.deduction_type);
                  return (
                    <div key={ded.id} className="grid grid-cols-[7rem_4.5rem_1fr_5rem] gap-0 items-center px-3 py-2.5">
                      <span className="text-xs tabular-nums text-zinc-500 font-mono leading-tight">{ded.routine_time || '—'}</span>
                      <span className={`inline-flex items-center justify-center self-center rounded-md px-2 py-0.5 text-xs font-black w-fit ${BADGE_COLORS[ck]}`}>{DEDUCTION_CODES[ded.deduction_type]}</span>
                      <div className="min-w-0 pr-2">
                        <p className="text-xs text-zinc-700 truncate">{ded.notes || DEDUCTION_TYPE_LABELS[ded.deduction_type]}</p>
                        {ded.count > 1 && <p className="text-[10px] text-zinc-400">{ded.count} × −{ded.unit_amount}</p>}
                        {ded.hit_zero && <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide">Hit Zero</p>}
                      </div>
                      <span className="text-sm font-bold tabular-nums text-red-600 text-right">−{ded.total_amount}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TOTALS */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between rounded-xl bg-red-600 px-5 py-3 text-white">
              <span className="text-sm font-semibold uppercase tracking-wide">Total Descuentos</span>
              <span className="text-2xl font-bold tabular-nums">−{fmt(totalDed)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl px-5 py-3" style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)' }}>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-xs uppercase tracking-wide opacity-60">Score final</span>
                <span>Escalado: <strong className="tabular-nums">{fmt(scaledScore)}</strong></span>
                <span>−<strong className="opacity-70 tabular-nums">{fmt(totalDed)}</strong></span>
              </div>
              <span className="text-2xl font-bold tabular-nums">{fmt(finalScore)}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
