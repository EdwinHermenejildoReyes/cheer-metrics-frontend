'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import {
  GRUPAL_SHEET_TYPES,
  SHEET_TYPE_GROUPS,
  SHEET_TYPE_LABELS,
  type SheetType,
} from '@/types/competitions';

interface Props {
  value: SheetType[];
  onChange: (value: SheetType[]) => void;
}

export function SheetTypeMultiSelect({ value, onChange }: Props) {
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

  const toggle = (st: SheetType) => {
    onChange(value.includes(st) ? value.filter((s) => s !== st) : [...value, st]);
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

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
          <span className="text-sm text-zinc-400 px-1 py-0.5 select-none">— Seleccionar planillas —</span>
        ) : (
          value.map((st) => (
            <span
              key={st}
              className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700"
            >
              {SHEET_TYPE_LABELS[st]}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggle(st); }}
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
        <div className="absolute z-50 mt-1 w-full min-w-[220px] rounded-lg border border-zinc-200 bg-white shadow-lg overflow-y-auto max-h-64">
          {SHEET_TYPE_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400 bg-zinc-50 sticky top-0 border-b border-zinc-100">
                {group.label}
              </p>
              {group.types.map((st) => {
                const selected = value.includes(st);
                const isGrupal = GRUPAL_SHEET_TYPES.includes(st);
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => toggle(st)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-zinc-50 transition-colors ${selected ? 'bg-zinc-50/60' : ''}`}
                  >
                    <div className={`h-4 w-4 rounded border shrink-0 flex items-center justify-center transition-colors ${selected ? 'bg-zinc-900 border-zinc-900' : 'border-zinc-300 bg-white'}`}>
                      {selected && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                    </div>
                    <span className={`flex-1 text-xs ${selected ? 'text-zinc-900 font-medium' : 'text-zinc-700'}`}>
                      {SHEET_TYPE_LABELS[st]}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${isGrupal ? 'bg-blue-50 text-blue-600' : 'bg-violet-50 text-violet-600'}`}>
                      {isGrupal ? 'G' : 'I'}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
