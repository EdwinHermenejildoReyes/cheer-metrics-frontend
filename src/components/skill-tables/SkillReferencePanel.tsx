'use client';

import { useState, useEffect } from 'react';
import { BookOpen, ChevronDown } from 'lucide-react';
import { getSkillTables } from '@/lib/skillTables';
import type { SkillTableType } from '@/lib/skillTables';
import { BuildingSkillTable } from './BuildingSkillTable';
import { TumblingSkillTable, TossTable } from './TumblingSkillTable';

interface Props {
  skillLevel: string | undefined;
  sheetType:  SkillTableType;
}

const LEVEL_LABELS: Record<string, string> = {
  L1: 'Nivel 1', L2: 'Nivel 2', L3: 'Nivel 3',
  L4: 'Nivel 4', L5: 'Nivel 5', L6: 'Nivel 6', L7: 'Nivel 7',
};

const SHEET_LABELS: Record<SkillTableType, string> = {
  building: 'Elevaciones y Lanzamientos',
  tumbling: 'Gimnasia',
};

function storageKey(sheetType: SkillTableType) {
  return `skillPanel_${sheetType}`;
}

export function SkillReferencePanel({ skillLevel, sheetType }: Props) {
  const [open, setOpen] = useState(false);

  // Restore persisted state
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey(sheetType));
      if (stored !== null) setOpen(stored === 'true');
    } catch { /* noop */ }
  }, [sheetType]);

  const toggle = () => {
    setOpen(prev => {
      const next = !prev;
      try { localStorage.setItem(storageKey(sheetType), String(next)); } catch { /* noop */ }
      return next;
    });
  };

  const tables = getSkillTables(skillLevel);
  // Don't render for non-L1..L7 levels (Novice, Prep, etc.)
  if (!tables) return null;

  const levelLabel  = LEVEL_LABELS[skillLevel ?? ''] ?? skillLevel ?? '';
  const sheetLabel  = SHEET_LABELS[sheetType];

  return (
    <div className="print:hidden mb-6">
      {/* ── Toggle button ──────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between gap-4 rounded-xl border border-blue-100 bg-blue-50 px-5 py-3 hover:bg-blue-100 transition-colors group"
      >
        <div className="flex items-center gap-2.5 text-left min-w-0">
          <BookOpen className="w-4 h-4 text-blue-500 shrink-0" />
          <div className="min-w-0">
            <span className="text-sm font-semibold text-blue-800 mr-2">
              Habilidades {levelLabel}
            </span>
            <span className="text-xs text-blue-500">— {sheetLabel}</span>
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

      {/* ── Expandable panel ───────────────────────────────────────────── */}
      {open && (
        <div className="mt-2 rounded-xl border border-blue-100 bg-white overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                Sistema de Calificación 2026
              </p>
              <p className="text-sm font-semibold text-zinc-800">
                Habilidades {levelLabel} — {sheetLabel}
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

          <div className="px-5 py-4">
            {sheetType === 'building' && tables.building && (
              <>
                <BuildingSkillTable data={tables.building} />
                {tables.tosses && (
                  <div className="mt-6">
                    <TossTable data={tables.tosses} />
                  </div>
                )}
              </>
            )}
            {sheetType === 'tumbling' && (
              <TumblingSkillTable gym={tables.gym} tosses={null} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
