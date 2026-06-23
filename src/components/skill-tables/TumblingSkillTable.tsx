'use client';

import type { GymTableData, GymSubTable, TossTableData } from '@/lib/skillTables';

// ── Tosses sub-component ──────────────────────────────────────────────────────

function TossTable({ data }: { data: TossTableData }) {
  const hasTosses = data.sinGiro.length > 0 || data.conGiro.length > 0;

  return (
    <div className="mb-5">
      <h4 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
        Lanzamientos
      </h4>

      {data.restrictionNote && (
        <div className="mb-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-800 leading-relaxed">
          <strong>Restricción:</strong> {data.restrictionNote}
        </div>
      )}

      {hasTosses ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs min-w-[480px]">
            <thead>
              <tr>
                <th className="bg-zinc-800 text-white px-3 py-2 font-semibold uppercase tracking-wide text-[10px] border border-zinc-700 w-1/2">
                  SIN GIRO
                </th>
                <th className="bg-zinc-800 text-white px-3 py-2 font-semibold uppercase tracking-wide text-[10px] border border-zinc-700 w-1/2">
                  CON GIRO
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="align-top px-3 py-2.5 border border-zinc-200 bg-white">
                  {data.sinGiro.length === 0 ? (
                    <span className="text-zinc-300 italic">—</span>
                  ) : (
                    <ul className="space-y-1">
                      {data.sinGiro.map((item, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-zinc-700">
                          <span className="mt-1 shrink-0 w-1 h-1 rounded-full bg-zinc-400" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="align-top px-3 py-2.5 border border-zinc-200 bg-zinc-50">
                  {data.conGiro.length === 0 ? (
                    <span className="text-zinc-300 italic">—</span>
                  ) : (
                    <ul className="space-y-1">
                      {data.conGiro.map((item, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-zinc-700">
                          <span className="mt-1 shrink-0 w-1 h-1 rounded-full bg-zinc-400" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-zinc-400 italic">No aplica para este nivel.</p>
      )}
    </div>
  );
}

// ── Gym sub-table ─────────────────────────────────────────────────────────────

function GymSubTableView({ sub }: { sub: GymSubTable }) {
  const hasContent = sub.delNivel.length > 0 || sub.avanzadas.length > 0 || sub.elite.length > 0;

  return (
    <div className="mb-5">
      <h4 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
        {sub.title}
      </h4>

      {sub.abbreviations && (
        <p className="mb-2 text-[10px] text-zinc-500 italic">
          {sub.abbreviations}
        </p>
      )}

      {!hasContent ? (
        <div className="rounded-lg bg-zinc-50 border border-dashed border-zinc-200 px-4 py-4 text-center text-xs text-zinc-400">
          Habilidades pendientes de carga para este nivel.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs min-w-[480px]">
            <thead>
              <tr>
                <th className="bg-zinc-800 text-white px-3 py-2 font-semibold uppercase tracking-wide text-[10px] border border-zinc-700 w-1/3">
                  HABILIDADES DEL NIVEL
                </th>
                <th className="bg-zinc-800 text-white px-3 py-2 font-semibold uppercase tracking-wide text-[10px] border border-zinc-700 w-1/3">
                  HABILIDADES AVANZADAS
                </th>
                <th className="bg-zinc-800 text-white px-3 py-2 font-semibold uppercase tracking-wide text-[10px] border border-zinc-700 w-1/3">
                  HABILIDADES ÉLITE
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {[sub.delNivel, sub.avanzadas, sub.elite].map((items, ci) => (
                  <td
                    key={ci}
                    className={`align-top px-3 py-2.5 border border-zinc-200 ${ci % 2 === 0 ? 'bg-white' : 'bg-zinc-50'}`}
                  >
                    {items.length === 0 ? (
                      <span className="text-zinc-300 italic">—</span>
                    ) : (
                      <ul className="space-y-1">
                        {items.map((item, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-zinc-700">
                            <span className="mt-1 shrink-0 w-1 h-1 rounded-full bg-zinc-400" />
                            <span className="leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  gym:    GymTableData | null;
  tosses: TossTableData | null;
}

export function TumblingSkillTable({ gym, tosses }: Props) {
  if (!gym && !tosses) return null;

  return (
    <div className="space-y-1">
      {tosses && <TossTable data={tosses} />}

      {gym && (
        <>
          {gym.subTables.map((sub, i) => (
            <GymSubTableView key={i} sub={sub} />
          ))}
          <p className="text-[10px] text-zinc-400 leading-relaxed pt-1 border-t border-zinc-100">
            {gym.footer}
          </p>
        </>
      )}
    </div>
  );
}
