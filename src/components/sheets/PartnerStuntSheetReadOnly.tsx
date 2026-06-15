'use client';

type Band = { label: string; range: string; min: number; max: number; color: 'red' | 'amber' | 'emerald' };

const CATEGORIES: { key: string; label: string; description: string; max: number; bands: Band[] }[] = [
  { key: 'pg_technique',       label: 'Ejecución de Técnica',       max: 30, description: 'Ejecución técnica correcta de las elevaciones, que parezcan fáciles', bands: [{ label: 'Bajo el promedio', range: '0 – 10', min: 0, max: 10, color: 'red' }, { label: 'Promedio', range: '10 – 20', min: 10, max: 20, color: 'amber' }, { label: 'Sobre el promedio', range: '20 – 30', min: 20, max: 30, color: 'emerald' }] },
  { key: 'pg_difficulty',      label: 'Dificultad',                 max: 25, description: 'Dificultad y capacidad para realizar las elevaciones en la rutina', bands: [{ label: '3 habilidades del nivel', range: '0 – 10', min: 0, max: 10, color: 'red' }, { label: '4 habilidades del nivel', range: '15 – 20', min: 15, max: 20, color: 'amber' }, { label: '5+ habilidades del nivel', range: '20 – 25', min: 20, max: 25, color: 'emerald' }] },
  { key: 'pg_form_appearance', label: 'Forma y Apariencia',         max: 20, description: 'Brazos rectos, flexibilidad, inmovilidad, línea base-flyer, expresiones', bands: [{ label: 'Le cuesta mucho mostrar', range: '0 – 7', min: 0, max: 7, color: 'red' }, { label: 'Le cuesta mostrar', range: '7 – 15', min: 7, max: 15, color: 'amber' }, { label: 'No le cuesta mostrar', range: '15 – 20', min: 15, max: 20, color: 'emerald' }] },
  { key: 'pg_transitions',     label: 'Transiciones',               max: 15, description: 'Ritmo, efecto visual, creatividad, menor cantidad de pausas', bands: [{ label: 'Múltiples problemas / pausas', range: '0 – 7', min: 0, max: 7, color: 'red' }, { label: 'Pocos problemas', range: '8 – 12', min: 8, max: 12, color: 'amber' }, { label: 'Sin problemas', range: '12 – 15', min: 12, max: 15, color: 'emerald' }] },
  { key: 'pg_expressiveness',  label: 'Expresividad / Showmanship', max: 10, description: 'Energía, coreografía adaptada a la música, expresiones faciales', bands: [{ label: 'Reducido', range: '0 – 4', min: 0, max: 4, color: 'red' }, { label: 'Moderado', range: '4 – 7', min: 4, max: 7, color: 'amber' }, { label: 'Elevado', range: '7 – 10', min: 7, max: 10, color: 'emerald' }] },
];

const MAX_TOTAL = CATEGORIES.reduce((s, c) => s + c.max, 0);

const BAND_COLORS: Record<Band['color'], { chip: string; bar: string }> = {
  red:     { chip: 'bg-red-50 text-red-700 border-red-300',              bar: 'bg-red-400' },
  amber:   { chip: 'bg-amber-50 text-amber-700 border-amber-300',        bar: 'bg-amber-400' },
  emerald: { chip: 'bg-emerald-50 text-emerald-700 border-emerald-300',  bar: 'bg-emerald-500' },
};

function fmt(n: number) { return n.toFixed(0); }

function ScoreDisplay({ category, value }: { category: typeof CATEGORIES[number]; value: number }) {
  const pct = (value / category.max) * 100;
  const activeBand = [...category.bands].reverse().find(b => value >= b.min) ?? category.bands[0];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="flex items-start justify-between px-4 py-3 bg-zinc-50 border-b border-zinc-200">
        <div>
          <span className="text-sm font-semibold text-zinc-900">{category.label}</span>
          <p className="text-xs text-zinc-500 mt-0.5">{category.description}</p>
        </div>
        <div className="text-right ml-4 shrink-0">
          <span className="text-2xl font-bold tabular-nums text-zinc-900">{fmt(value)}</span>
          <p className="text-[10px] text-zinc-400">/ {category.max}</p>
        </div>
      </div>
      <div className="px-4 pt-2.5 pb-1 flex flex-wrap gap-1.5">
        {category.bands.map(b => {
          const isActive = activeBand === b;
          const colors = BAND_COLORS[b.color];
          return (
            <span key={b.label} className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${isActive ? colors.chip : 'text-zinc-400 border-zinc-200'}`}>
              {b.range} · {b.label}
            </span>
          );
        })}
      </div>
      <div className="px-4 pb-4 flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1">
            <div className="px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-600 bg-zinc-100 opacity-30">−5</div>
            <div className="px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-600 bg-zinc-100 opacity-30">−1</div>
          </div>
          <div className="text-4xl font-bold tabular-nums text-zinc-900 w-16 text-center">{value}</div>
          <div className="flex gap-1">
            <div className="px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-600 bg-zinc-100 opacity-30">+1</div>
            <div className="px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-600 bg-zinc-100 opacity-30">+5</div>
          </div>
        </div>
        <input type="range" min={0} max={category.max} step={1} value={value} readOnly className="w-full accent-zinc-900" onChange={() => {}} />
        <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-200 ${BAND_COLORS[activeBand.color].bar}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

export interface PartnerStuntSheetReadOnlyProps {
  scores: Record<string, number>;
  notes: string;
  total: number;
  rawScore?: number;
  totalDeductions?: number;
  finalScore?: number;
  percentage?: string;
}

export function PartnerStuntSheetReadOnly({ scores, notes, total, rawScore, totalDeductions, finalScore, percentage }: PartnerStuntSheetReadOnlyProps) {
  const pct = MAX_TOTAL > 0 ? (total / MAX_TOTAL) * 100 : 0;
  const hasStats = rawScore != null && finalScore != null;

  return (
    <div className="bg-zinc-50 rounded-2xl overflow-hidden">
      <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-6 pointer-events-none select-none">

        {/* OVERVIEW BAR */}
        <div className="rounded-xl bg-white border border-zinc-200 p-4 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs text-zinc-500 mb-1.5">
              <span>Progreso total</span>
              <span className="tabular-nums font-medium">{pct.toFixed(1)}%</span>
            </div>
            <div className="h-3 rounded-full bg-zinc-100 overflow-hidden">
              <div className={`h-full rounded-full ${pct >= 90 ? 'bg-emerald-500' : pct >= 70 ? 'bg-blue-500' : pct >= 50 ? 'bg-amber-500' : pct >= 30 ? 'bg-red-500' : 'bg-zinc-300'}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-3xl font-bold tabular-nums text-zinc-900">{fmt(total)}</p>
            <p className="text-xs text-zinc-400">de {MAX_TOTAL} pts</p>
          </div>
        </div>

        {/* CATEGORY SCORES */}
        {CATEGORIES.map(cat => (
          <ScoreDisplay key={cat.key} category={cat} value={scores[cat.key] ?? 0} />
        ))}

        {/* NOTES */}
        {notes && (
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
              <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Comentarios del juez</span>
            </div>
            <div className="p-4 text-sm text-zinc-700 whitespace-pre-wrap">{notes}</div>
          </div>
        )}

        {/* SCORE SUMMARY */}
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden text-sm">
          <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
            <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Resumen de puntajes</span>
          </div>
          <table className="w-full">
            <tbody className="divide-y divide-zinc-100">
              {CATEGORIES.map(cat => {
                const v = scores[cat.key] ?? 0;
                const catPct = (v / cat.max) * 100;
                const activeBand = [...cat.bands].reverse().find(b => v >= b.min) ?? cat.bands[0];
                return (
                  <tr key={cat.key}>
                    <td className="px-4 py-3 text-zinc-700 font-medium">{cat.label}</td>
                    <td className="px-4 py-3">
                      <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                        <div className={`h-full rounded-full ${BAND_COLORS[activeBand.color].bar}`} style={{ width: `${catPct}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-zinc-900 w-24">{fmt(v)} <span className="text-zinc-400 font-normal">/ {cat.max}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-4 py-4 rounded-b-xl" style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)' }}>
            <div>
              <p className="text-base uppercase tracking-wide font-bold">TOTAL Partner Stunt</p>
              <p className="text-xs opacity-70 mt-0.5">{pct.toFixed(1)}% de {MAX_TOTAL} puntos</p>
            </div>
            <span className="text-3xl font-bold tabular-nums">{fmt(total)}</span>
          </div>
        </div>

        {/* COMPETITION STATS */}
        {hasStats && (
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
              <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Puntaje final de competencia</span>
            </div>
            <div className="grid grid-cols-3 divide-x divide-zinc-100 text-center">
              <div className="px-4 py-4"><p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-1">Puntaje Bruto</p><p className="text-2xl font-bold tabular-nums text-zinc-900">{rawScore!.toFixed(0)}</p></div>
              <div className="px-4 py-4"><p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-1">Descuentos</p><p className="text-2xl font-bold tabular-nums text-red-600">−{(totalDeductions ?? 0).toFixed(2)}</p></div>
              <div className="px-4 py-4"><p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-1">% Perfección</p><p className="text-2xl font-bold tabular-nums text-zinc-900">{percentage}%</p></div>
            </div>
            <div className="border-t border-zinc-100 flex items-center justify-between px-6 py-4 rounded-b-xl" style={{ backgroundColor: 'var(--brand-primary)' }}>
              <p className="text-base font-bold" style={{ color: 'var(--brand-primary-text)' }}>Puntaje Final</p>
              <span className="text-3xl font-bold tabular-nums" style={{ color: 'var(--brand-primary-text)' }}>{finalScore!.toFixed(0)}</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
