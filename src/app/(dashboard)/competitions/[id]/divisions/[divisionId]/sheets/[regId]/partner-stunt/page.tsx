'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageSpinner } from '@/components/ui/spinner';
import { PrintButton } from '@/components/print/PrintButton';
import { PartnerStuntSheetPrintView } from '@/components/print/PartnerStuntSheetPrintView';
import competitionsRepository from '@/repositories/competitionsRepository';
import { useJudge } from '@/hooks/useJudge';
import { useBranding } from '@/contexts/BrandingContext';
import { toastApiError } from '@/utils/apiErrors';
import type { ScoreSheet, UnpaidAthlete } from '@/types/competitions';
import { PaymentWarningBanner } from '@/components/competitions/PaymentWarningBanner';

// ── Per-category config (regulation: UCA National Experience 2025) ────────────

type Band = { label: string; range: string; min: number; max: number; color: 'red' | 'amber' | 'emerald' };

const CATEGORIES: {
  key: keyof Pick<ScoreSheet,
    'pg_technique' | 'pg_difficulty' | 'pg_form_appearance' |
    'pg_transitions' | 'pg_expressiveness'
  >;
  label: string;
  description: string;
  max: number;
  bands: Band[];
}[] = [
  {
    key: 'pg_technique',
    label: 'Ejecución de Técnica',
    max: 30,
    description: 'Ejecución técnica correcta de las elevaciones, que parezcan fáciles',
    bands: [
      { label: 'Bajo el promedio',  range: '0 – 10',  min: 0,  max: 10,  color: 'red' },
      { label: 'Promedio',          range: '10 – 20', min: 10, max: 20,  color: 'amber' },
      { label: 'Sobre el promedio', range: '20 – 30', min: 20, max: 30,  color: 'emerald' },
    ],
  },
  {
    key: 'pg_difficulty',
    label: 'Dificultad',
    max: 25,
    description: 'Dificultad y capacidad para realizar las elevaciones en la rutina',
    bands: [
      { label: '3 habilidades del nivel', range: '0 – 10',  min: 0,  max: 10, color: 'red' },
      { label: '4 habilidades del nivel', range: '15 – 20', min: 15, max: 20, color: 'amber' },
      { label: '5+ habilidades del nivel', range: '20 – 25', min: 20, max: 25, color: 'emerald' },
    ],
  },
  {
    key: 'pg_form_appearance',
    label: 'Forma y Apariencia',
    max: 20,
    description: 'Brazos rectos, flexibilidad, inmovilidad, línea base-flyer, expresiones',
    bands: [
      { label: 'Le cuesta mucho mostrar', range: '0 – 7',   min: 0,  max: 7,  color: 'red' },
      { label: 'Le cuesta mostrar',       range: '7 – 15',  min: 7,  max: 15, color: 'amber' },
      { label: 'No le cuesta mostrar',    range: '15 – 20', min: 15, max: 20, color: 'emerald' },
    ],
  },
  {
    key: 'pg_transitions',
    label: 'Transiciones',
    max: 15,
    description: 'Ritmo, efecto visual, creatividad, menor cantidad de pausas',
    bands: [
      { label: 'Múltiples problemas / pausas', range: '0 – 7',   min: 0,  max: 7,  color: 'red' },
      { label: 'Pocos problemas',              range: '8 – 12',  min: 8,  max: 12, color: 'amber' },
      { label: 'Sin problemas',                range: '12 – 15', min: 12, max: 15, color: 'emerald' },
    ],
  },
  {
    key: 'pg_expressiveness',
    label: 'Expresividad / Showmanship',
    max: 10,
    description: 'Energía, coreografía adaptada a la música, expresiones faciales',
    bands: [
      { label: 'Reducido',  range: '0 – 4',  min: 0, max: 4,  color: 'red' },
      { label: 'Moderado',  range: '4 – 7',  min: 4, max: 7,  color: 'amber' },
      { label: 'Elevado',   range: '7 – 10', min: 7, max: 10, color: 'emerald' },
    ],
  },
];

const MAX_TOTAL = CATEGORIES.reduce((s, c) => s + c.max, 0); // 100

function fmt(n: number) { return n.toFixed(0); }

// ── Score selector (slider + ±buttons, per-category max) ─────────────────────

const BAND_COLORS: Record<Band['color'], { chip: string; bar: string }> = {
  red:     { chip: 'bg-red-50 text-red-700 border-red-300',       bar: 'bg-red-400' },
  amber:   { chip: 'bg-amber-50 text-amber-700 border-amber-300', bar: 'bg-amber-400' },
  emerald: { chip: 'bg-emerald-50 text-emerald-700 border-emerald-300', bar: 'bg-emerald-500' },
};

function ScoreSelector({
  category, value, onChange,
}: {
  category: typeof CATEGORIES[number];
  value: number;
  onChange: (v: number) => void;
}) {
  const pct = (value / category.max) * 100;
  const activeBand = [...category.bands].reverse().find(b => value >= b.min) ?? category.bands[0];

  const adjust = (delta: number) => {
    onChange(Math.min(category.max, Math.max(0, value + delta)));
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      {/* Header */}
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

      {/* Band reference chips */}
      <div className="px-4 pt-2.5 pb-1 flex flex-wrap gap-1.5">
        {category.bands.map(b => {
          const isActive = activeBand === b;
          const colors = BAND_COLORS[b.color];
          return (
            <span key={b.label} className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors ${
              isActive ? colors.chip : 'text-zinc-400 border-zinc-200'
            }`}>
              {b.range} · {b.label}
            </span>
          );
        })}
      </div>

      {/* Controls */}
      <div className="px-4 pb-4 flex flex-col gap-2.5">
        {/* Adjust buttons + score display */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1">
            <button type="button" onClick={() => adjust(-5)} disabled={value <= 0}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-30 transition-colors">
              −5
            </button>
            <button type="button" onClick={() => adjust(-1)} disabled={value <= 0}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-30 transition-colors">
              −1
            </button>
          </div>

          <div className="text-4xl font-bold tabular-nums text-zinc-900 w-16 text-center select-none">
            {value}
          </div>

          <div className="flex gap-1">
            <button type="button" onClick={() => adjust(+1)} disabled={value >= category.max}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-30 transition-colors">
              +1
            </button>
            <button type="button" onClick={() => adjust(+5)} disabled={value >= category.max}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-30 transition-colors">
              +5
            </button>
          </div>
        </div>

        {/* Slider */}
        <input
          type="range"
          min={0}
          max={category.max}
          step={1}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full accent-zinc-900 cursor-pointer"
        />

        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-200 ${BAND_COLORS[activeBand.color].bar}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PartnerStuntSheetPage() {
  const router  = useRouter();
  const { id, divisionId, regId } = useParams<{ id: string; divisionId: string; regId: string }>();
  const competitionId  = Number(id);
  const divId          = Number(divisionId);
  const registrationId = Number(regId);

  const { isJudge, isCompetitionActive } = useJudge();
  const readOnly = !isJudge;
  const { organization } = useBranding();

  useEffect(() => {
    if (isJudge && !isCompetitionActive(competitionId)) {
      toast.error('El evento ha finalizado. Ya no puedes acceder a las planillas.');
      router.replace(`/competitions/${competitionId}`);
    }
  }, [isJudge, competitionId, isCompetitionActive, router]);

  const [teamName,       setTeamName]       = useState<string>('');
  const [existingSheet,  setExistingSheet]  = useState<ScoreSheet | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [unpaidAthletes, setUnpaidAthletes] = useState<UnpaidAthlete[]>([]);
  const [requirePayment, setRequirePayment] = useState(false);
  const [saving,        setSaving]        = useState(false);

  const [scores, setScores] = useState<Record<string, number>>({
    pg_technique:       0,
    pg_difficulty:      0,
    pg_form_appearance: 0,
    pg_transitions:     0,
    pg_expressiveness:  0,
  });

  const [notes, setNotes] = useState('');

  const total = Object.values(scores).reduce((s, v) => s + v, 0);
  const pct   = MAX_TOTAL > 0 ? (total / MAX_TOTAL) * 100 : 0;

  const setScore = (key: string, value: number) => {
    setScores(prev => ({ ...prev, [key]: value }));
  };

  const load = useCallback(async () => {
    try {
      const [sheetRes, regRes] = await Promise.all([
        competitionsRepository.listScoreSheets({ registration: String(registrationId) }),
        competitionsRepository.listRegistrations({ division: String(divId), page_size: '100' }),
      ]);

      const reg = regRes.data.results.find(r => r.id === registrationId);
      if (reg) {
        setTeamName(reg.team_name);
        setUnpaidAthletes(reg.unpaid_athletes);
        setRequirePayment(reg.competition_require_payment);
      }

      if (sheetRes.data.results.length > 0) {
        const sheet = sheetRes.data.results[0];
        setExistingSheet(sheet);
        if (!reg) setTeamName(sheet.team_name);
        setScores({
          pg_technique:       sheet.pg_technique       ? parseFloat(sheet.pg_technique)       : 0,
          pg_difficulty:      sheet.pg_difficulty      ? parseFloat(sheet.pg_difficulty)      : 0,
          pg_form_appearance: sheet.pg_form_appearance ? parseFloat(sheet.pg_form_appearance) : 0,
          pg_transitions:     sheet.pg_transitions     ? parseFloat(sheet.pg_transitions)     : 0,
          pg_expressiveness:  sheet.pg_expressiveness  ? parseFloat(sheet.pg_expressiveness)  : 0,
        });
        if (sheet.notes) setNotes(sheet.notes);
      }
    } finally {
      setLoading(false);
    }
  }, [registrationId, divId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Partial<ScoreSheet> = {
        pg_technique:       String(scores.pg_technique),
        pg_difficulty:      String(scores.pg_difficulty),
        pg_form_appearance: String(scores.pg_form_appearance),
        pg_transitions:     String(scores.pg_transitions),
        pg_expressiveness:  String(scores.pg_expressiveness),
        notes,
      };

      let saved: ScoreSheet;
      if (existingSheet) {
        const res = await competitionsRepository.updateScoreSheet(existingSheet.id, payload);
        saved = res.data;
      } else {
        const res = await competitionsRepository.createScoreSheet({
          registration: registrationId as unknown as number,
          ...payload,
        } as Partial<ScoreSheet>);
        saved = res.data;
      }
      setExistingSheet(saved);
      toast.success('Planilla guardada');
    } catch (err) {
      toastApiError(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="min-h-screen bg-zinc-50 pb-16">

      {/* ── Sticky top bar ─────────────────────────────────────────────── */}
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between gap-4 bg-white border-b border-zinc-200 px-6 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/competitions/${competitionId}/divisions/${divId}`)}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-400 font-medium">Planilla — Partner Stunt</p>
            <p className="text-sm font-semibold text-zinc-900 leading-tight">
              {teamName || `Inscripción #${registrationId}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right print:hidden">
            <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Total</p>
            <p className="text-2xl font-bold tabular-nums text-zinc-900">
              {fmt(total)}
              <span className="text-sm font-normal text-zinc-400 ml-1">/ {MAX_TOTAL}</span>
            </p>
          </div>
          <PrintButton />
          {readOnly ? (
            <span className="print:hidden text-xs font-medium text-zinc-400 px-3 py-1.5 rounded-lg bg-zinc-100 border border-zinc-200">
              Solo lectura
            </span>
          ) : (
            <Button onClick={handleSave} loading={saving} disabled={requirePayment && unpaidAthletes.length > 0} className="print:hidden">
              <Save className="h-4 w-4" />
              Guardar
            </Button>
          )}
        </div>
      </div>
      {readOnly && (
        <div className="print:hidden bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center gap-2">
          <Eye className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-700 font-medium">Solo lectura — solo los jueces asignados pueden calificar.</p>
        </div>
      )}
      <PaymentWarningBanner unpaidAthletes={unpaidAthletes} requirePayment={requirePayment} />

      <PartnerStuntSheetPrintView
        data={{
          teamName: teamName || `Inscripción #${registrationId}`,
          organization: organization ?? undefined,
          scores,
          notes,
          total,
          rawScore:         existingSheet ? parseFloat(existingSheet.raw_score)         : undefined,
          totalDeductions:  existingSheet ? parseFloat(existingSheet.total_deductions)  : undefined,
          finalScore:       existingSheet ? parseFloat(existingSheet.final_score)        : undefined,
          percentage:       existingSheet?.percentage,
        }}
      />

      <div className={`print:hidden max-w-2xl mx-auto px-6 py-8 flex flex-col gap-6${readOnly ? ' pointer-events-none select-none opacity-75' : ''}`}>

        {/* ── Overview bar ─────────────────────────────────────────────── */}
        <div className="rounded-xl bg-white border border-zinc-200 p-4 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs text-zinc-500 mb-1.5">
              <span>Progreso total</span>
              <span className="tabular-nums font-medium">{pct.toFixed(1)}%</span>
            </div>
            <div className="h-3 rounded-full bg-zinc-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  pct >= 90 ? 'bg-emerald-500' :
                  pct >= 70 ? 'bg-blue-500' :
                  pct >= 50 ? 'bg-amber-500' :
                  pct >= 30 ? 'bg-red-500' : 'bg-zinc-300'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-3xl font-bold tabular-nums text-zinc-900">{fmt(total)}</p>
            <p className="text-xs text-zinc-400">de {MAX_TOTAL} pts</p>
          </div>
        </div>

        {/* ── Category scorers ─────────────────────────────────────────── */}
        {CATEGORIES.map(cat => (
          <ScoreSelector
            key={cat.key}
            category={cat}
            value={scores[cat.key] ?? 0}
            onChange={v => setScore(cat.key, v)}
          />
        ))}

        {/* ── Notes ────────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
            <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Comentarios del juez</span>
          </div>
          <div className="p-4">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Observaciones sobre el desempeño de la pareja/trío..."
              rows={3}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>
        </div>

        {/* ── Score summary ─────────────────────────────────────────────── */}
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden text-sm">
          <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
            <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Resumen de puntajes</span>
          </div>
          <table className="w-full">
            <tbody className="divide-y divide-zinc-100">
              {CATEGORIES.map(cat => {
                const v   = scores[cat.key] ?? 0;
                const catPct = (v / cat.max) * 100;
                const activeBand = [...cat.bands].reverse().find(b => v >= b.min) ?? cat.bands[0];
                return (
                  <tr key={cat.key}>
                    <td className="px-4 py-3 text-zinc-700 font-medium">{cat.label}</td>
                    <td className="px-4 py-3">
                      <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${BAND_COLORS[activeBand.color].bar}`}
                          style={{ width: `${catPct}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-zinc-900 w-24">
                      {fmt(v)} <span className="text-zinc-400 font-normal">/ {cat.max}</span>
                    </td>
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

        {/* ── Competition stats after save ─────────────────────────────── */}
        {existingSheet && (
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
              <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Puntaje final de competencia</span>
            </div>
            <div className="grid grid-cols-3 divide-x divide-zinc-100 text-center">
              <div className="px-4 py-4">
                <p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-1">Puntaje Bruto</p>
                <p className="text-2xl font-bold tabular-nums text-zinc-900">
                  {parseFloat(existingSheet.raw_score).toFixed(0)}
                </p>
              </div>
              <div className="px-4 py-4">
                <p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-1">Descuentos</p>
                <p className="text-2xl font-bold tabular-nums text-red-600">
                  −{parseFloat(existingSheet.total_deductions).toFixed(2)}
                </p>
              </div>
              <div className="px-4 py-4">
                <p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-1">% Perfección</p>
                <p className="text-2xl font-bold tabular-nums text-zinc-900">{existingSheet.percentage}%</p>
              </div>
            </div>
            <div className="border-t border-zinc-100 flex items-center justify-between px-6 py-4 rounded-b-xl" style={{ backgroundColor: 'var(--brand-primary)' }}>
              <p className="text-base font-bold">Puntaje Final</p>
              <span className="text-3xl font-bold tabular-nums" style={{ color: 'var(--brand-primary-text)' }}>
                {parseFloat(existingSheet.final_score).toFixed(0)}
              </span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
