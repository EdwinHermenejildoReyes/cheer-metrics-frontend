'use client';

import type { BuildingTableData } from '@/lib/skillTables';

interface Props {
  data: BuildingTableData;
}

export function BuildingSkillTable({ data }: Props) {
  const hasContent = data.sections.some(s =>
    s.columns.some(c => c.items.length > 0)
  );

  if (!hasContent) {
    return (
      <div className="px-6 py-8 text-center text-sm text-zinc-400">
        Las habilidades de elevaciones para este nivel están pendientes de carga.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs min-w-[640px]">
        <thead>
          <tr>
            {data.sections[0].columns.map(col => (
              <th
                key={col.header}
                className="bg-zinc-800 text-white px-3 py-2 text-center font-semibold uppercase tracking-wide text-[10px] border border-zinc-700"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.sections.map((section, si) => (
            <>
              <tr key={`${section.title}-header`}>
                <td
                  colSpan={section.columns.length}
                  className="bg-zinc-600 text-white text-center text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 border border-zinc-500"
                >
                  {section.title}
                </td>
              </tr>
              <tr key={`${section.title}-content`} className={si % 2 === 0 ? 'bg-white' : 'bg-zinc-50'}>
                {section.columns.map(col => (
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
                            <span className="mt-1 shrink-0 w-1 h-1 rounded-full bg-zinc-400" />
                            <span className="leading-relaxed">{item}</span>
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
  );
}
