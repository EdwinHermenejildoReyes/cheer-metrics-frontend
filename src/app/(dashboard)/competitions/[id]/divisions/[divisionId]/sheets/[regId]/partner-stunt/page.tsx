'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageSpinner } from '@/components/ui/spinner';
import { PrintButton } from '@/components/print/PrintButton';
import { ScoreSheetPrintView } from '@/components/print/ScoreSheetPrintView';
import competitionsRepository from '@/repositories/competitionsRepository';
import { useJudge } from '@/hooks/useJudge';
import { useBranding } from '@/contexts/BrandingContext';
import { toastApiError } from '@/utils/apiErrors';
import type { ScoreSheet } from '@/types/competitions';

// ── Each category scores 0–5 (max 25 total) ──────────────────────────────────
const FIELD_MAX = 5;

// Score steps shown as button grid: 0.0 → 5.0 in 0.5 increments
const SCORE_STEPS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

// ── Category definitions ──────────────────────────────────────────────────────
const CATEGORIES: {
  key: keyof Pick<ScoreSheet,
    'pg_technique' | 'pg_difficulty' | 'pg_form_appearance' |
    'pg_transitions' | 'pg_expressiveness'
  >;
  label: string;
  description: string;
  criteria: string[];
}[] = [
  {
    key: 'pg_technique',
    label: 'Técnica',
    description: 'Calidad técnica de las habilidades ejecutadas',
    criteria: [
      'Posición de base y cargadores',
      'Control del volante en el aire',
      'Alineación y postura corporal',
      'Seguridad y estabilidad',
    ],
  },
  {
    key: 'pg_difficulty',
    label: 'Dificultad',
    description: 'Nivel de complejidad de las habilidades y construcciones',
    criteria: [
      'Variedad de habilidades',
      'Nivel de construcciones y elevaciones',
      'Conexiones y pirámides',
      'Lanzamientos y salidas',
    ],
  },
  {
    key: 'pg_form_appearance',
    label: 'Forma y Apariencia',
    description: 'Presentación visual y uniformidad del equipo',
    criteria: [
      'Forma y extensión en el aire',
      'Uniformidad entre pareja/trío',
      'Presencia escénica',
      'Apariencia general',
    ],
  },
  {
    key: 'pg_transitions',
    label: 'Transiciones',
    description: 'Fluidez y coreografía entre habilidades',
    criteria: [
      'Conexión entre elementos',
      'Fluidez del movimiento',
      'Creatividad coreográfica',
      'Uso del espacio',
    ],
  },
  {
    key: 'pg_expressiveness',
    label: 'Expresividad',
    description: 'Energía, emoción y valor de entretenimiento',
    criteria: [
      'Confianza y carisma',
      'Energía y dinamismo',
      'Conexión con la música',
      'Entretenimiento al público',
    ],
  },
];

function fmt(n: number) { return n.toFixed(2); }

// ── Score selector per category ───────────────────────────────────────────────
function ScoreSelector({
  category, value, onChange,
}: {
  category: typeof CATEGORIES[number];
  value: number;
  onChange: (v: number) => void;
}) {
  const pct = (value / FIELD_MAX) * 100;

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
          <p className="text-[10px] text-zinc-400">/ {FIELD_MAX}.00</p>
        </div>
      </div>

      {/* Criteria */}
      <div className="px-4 pt-3 flex flex-wrap gap-x-4 gap-y-0.5">
        {category.criteria.map((c) => (
          <span key={c} className="text-[10px] text-zinc-400">· {c}</span>
        ))}
      </div>

      {/* Score grid */}
      <div className="p-4 flex flex-col gap-2">
        <div className="grid grid-cols-11 gap-1">
          {SCORE_STEPS.map((step) => {
            const active = value === step;
            const quality =
              step >= 4.5 ? 'elite' :
              step >= 3.5 ? 'high' :
              step >= 2.5 ? 'mid' :
              step >= 1.5 ? 'low' : 'none';
            const colorMap = {
              none:  active ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-zinc-100 text-zinc-400 border-zinc-200 hover:border-zinc-400',
              low:   active ? 'bg-red-600 text-white border-red-600'   : 'bg-red-50 text-red-500 border-red-200 hover:border-red-400',
              mid:   active ? 'bg-amber-500 text-white border-amber-500' : 'bg-amber-50 text-amber-600 border-amber-200 hover:border-amber-400',
              high:  active ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-50 text-blue-600 border-blue-200 hover:border-blue-400',
              elite: active ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:border-emerald-400',
            };
            return (
              <button
                key={step}
                type="button"
                onClick={() => onChange(step)}
                className={`rounded-lg py-2 text-xs font-bold transition-colors border ${colorMap[quality]}`}
              >
                {step % 1 === 0 ? step.toFixed(0) : step.toFixed(1)}
              </button>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-200 ${
              pct >= 90 ? 'bg-emerald-500' :
              pct >= 70 ? 'bg-blue-500' :
              pct >= 50 ? 'bg-amber-500' :
              pct >= 30 ? 'bg-red-500' : 'bg-zinc-300'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Level label */}
        <p className={`text-xs font-medium ${
          pct >= 90 ? 'text-emerald-600' :
          pct >= 70 ? 'text-blue-600' :
          pct >= 50 ? 'text-amber-600' :
          pct > 0   ? 'text-red-500' : 'text-zinc-400'
        }`}>
          {pct >= 90 ? 'Elite' :
           pct >= 70 ? 'Elevado / Sobre el Promedio' :
           pct >= 50 ? 'Moderado / Promedio' :
           pct > 0   ? 'Reducido / Bajo el Promedio' : '—'}
        </p>
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
  const { organization } = useBranding();

  useEffect(() => {
    if (isJudge && !isCompetitionActive(competitionId)) {
      toast.error('El evento ha finalizado. Ya no puedes acceder a las planillas.');
      router.replace(`/competitions/${competitionId}`);
    }
  }, [isJudge, competitionId, isCompetitionActive, router]);

  const [teamName,      setTeamName]      = useState<string>('');
  const [existingSheet, setExistingSheet] = useState<ScoreSheet | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);

  // ── Scores ────────────────────────────────────────────────────────────────
  const [scores, setScores] = useState<Record<string, number>>({
    pg_technique:       0,
    pg_difficulty:      0,
    pg_form_appearance: 0,
    pg_transitions:     0,
    pg_expressiveness:  0,
  });

  const [notes, setNotes] = useState('');

  // ── Computed ──────────────────────────────────────────────────────────────
  const total    = Object.values(scores).reduce((s, v) => s + v, 0);
  const maxTotal = CATEGORIES.length * FIELD_MAX; // 25
  const pct      = maxTotal > 0 ? (total / maxTotal) * 100 : 0;

  const setScore = (key: string, value: number) => {
    setScores((prev) => ({ ...prev, [key]: value }));
  };

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const [sheetRes, regRes] = await Promise.all([
        competitionsRepository.listScoreSheets({ registration: String(registrationId) }),
        competitionsRepository.listRegistrations({ division: String(divId), page_size: '100' }),
      ]);

      const reg = regRes.data.results.find((r) => r.id === registrationId);
      if (reg) setTeamName(reg.team_name);

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

  // ── Save ──────────────────────────────────────────────────────────────────
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
              <span className="text-sm font-normal text-zinc-400 ml-1">/ {maxTotal}</span>
            </p>
          </div>
          <PrintButton />
          <Button onClick={handleSave} loading={saving} className="print:hidden">
            <Save className="h-4 w-4" />
            Guardar
          </Button>
        </div>
      </div>

      {existingSheet && (
        <ScoreSheetPrintView
          sheet={existingSheet}
          teamName={teamName || `Inscripción #${registrationId}`}
          sheetTypeLabel="Partner Stunt"
          organization={organization}
        />
      )}

      <div className="print:hidden max-w-2xl mx-auto px-6 py-8 flex flex-col gap-6">

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
            <p className="text-xs text-zinc-400">de {maxTotal} pts</p>
          </div>
        </div>

        {/* ── Category scorers ─────────────────────────────────────────── */}
        {CATEGORIES.map((cat) => (
          <ScoreSelector
            key={cat.key}
            category={cat}
            value={scores[cat.key] ?? 0}
            onChange={(v) => setScore(cat.key, v)}
          />
        ))}

        {/* ── Notes ────────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Comentarios del juez</span>
          </div>
          <div className="p-4">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones sobre el desempeño de la pareja/trío..."
              rows={3}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>
        </div>

        {/* ── Score summary ─────────────────────────────────────────────── */}
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden text-sm">
          <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Resumen de puntajes</span>
          </div>
          <table className="w-full">
            <tbody className="divide-y divide-zinc-100">
              {CATEGORIES.map((cat) => {
                const v = scores[cat.key] ?? 0;
                const catPct = (v / FIELD_MAX) * 100;
                return (
                  <tr key={cat.key}>
                    <td className="px-4 py-3 text-zinc-700 font-medium">{cat.label}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              catPct >= 90 ? 'bg-emerald-500' :
                              catPct >= 70 ? 'bg-blue-500' :
                              catPct >= 50 ? 'bg-amber-500' :
                              catPct > 0   ? 'bg-red-500' : 'bg-zinc-200'
                            }`}
                            style={{ width: `${catPct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-zinc-900 w-20">
                      {fmt(v)} <span className="text-zinc-400 font-normal">/ {FIELD_MAX}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-4 py-4 rounded-b-xl" style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)' }}>
            <div>
              <p className="text-xs uppercase tracking-wide opacity-60 font-medium">TOTAL Partner Stunt</p>
              <p className="text-xs opacity-40 mt-0.5">{pct.toFixed(1)}% de perfección</p>
            </div>
            <span className="text-3xl font-bold tabular-nums">{fmt(total)}</span>
          </div>
        </div>

        {/* ── Competition stats after save ─────────────────────────────── */}
        {existingSheet && (
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Puntaje final de competencia</span>
            </div>
            <div className="grid grid-cols-3 divide-x divide-zinc-100 text-center">
              <div className="px-4 py-4">
                <p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-1">Puntaje Bruto</p>
                <p className="text-2xl font-bold tabular-nums text-zinc-900">
                  {parseFloat(existingSheet.raw_score).toFixed(2)}
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
              <p className="text-xs uppercase tracking-wide opacity-60">Puntaje Final</p>
              <span className="text-3xl font-bold tabular-nums" style={{ color: 'var(--brand-primary-text)' }}>
                {parseFloat(existingSheet.final_score).toFixed(2)}
              </span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
