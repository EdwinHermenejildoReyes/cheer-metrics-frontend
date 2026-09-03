'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import type { Division } from '@/types/competitions';

interface Props {
  divisions: Division[];
  value: number[];
  onChange: (ids: number[]) => void;
}

export function DivisionMultiSelect({ divisions, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (id: number) => {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const divMap = Object.fromEntries(divisions.map((d) => [d.id, d.name]));

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <div
        onClick={() => setOpen((v) => !v)}
        className={[
          'min-h-9 rounded-lg border bg-white px-2 py-1 flex flex-wrap items-center gap-1 cursor-pointer transition-shadow',
          open ? 'border-zinc-900 ring-2 ring-zinc-900' : 'border-zinc-300 hover:border-zinc-400',
        ].join(' ')}
      >
        {value.length === 0 ? (
          <span className="text-sm text-zinc-400 px-1 py-0.5 select-none">— Todas las divisiones —</span>
        ) : (
          value.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700"
            >
              {divMap[id] ?? String(id)}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggle(id); }}
                className="text-zinc-400 hover:text-zinc-700"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))
        )}
        <div className="ml-auto flex items-center gap-1 pl-1 shrink-0">
          {value.length > 0 && (
            <button type="button" onClick={clearAll} className="text-zinc-300 hover:text-zinc-500">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 bottom-full mb-1 w-full min-w-[220px] rounded-lg border border-zinc-200 bg-white shadow-lg overflow-y-auto max-h-64">
          {divisions.length === 0 ? (
            <p className="px-3 py-2 text-xs text-zinc-400">No hay divisiones en esta competencia.</p>
          ) : (
            divisions.map((div) => {
              const selected = value.includes(div.id);
              return (
                <button
                  key={div.id}
                  type="button"
                  onClick={() => toggle(div.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-zinc-50 ${selected ? 'bg-zinc-50/60' : ''}`}
                >
                  <div className={`h-4 w-4 rounded border shrink-0 flex items-center justify-center transition-colors ${selected ? 'bg-zinc-900 border-zinc-900' : 'border-zinc-300 bg-white'}`}>
                    {selected && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                  </div>
                  <span className={`flex-1 text-xs ${selected ? 'text-zinc-900 font-medium' : 'text-zinc-700'}`}>
                    {div.name}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
