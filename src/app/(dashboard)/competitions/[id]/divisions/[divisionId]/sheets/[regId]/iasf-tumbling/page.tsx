'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Eye } from 'lucide-react';
import { InfoButton } from '@/components/ui/InfoButton';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageSpinner } from '@/components/ui/spinner';
import { PrintButton } from '@/components/print/PrintButton';
import { IasfSheetPrintView } from '@/components/print/IasfSheetPrintView';
import competitionsRepository from '@/repositories/competitionsRepository';
import { useJudge } from '@/hooks/useJudge';
import { toastApiError } from '@/utils/apiErrors';
import type { ScoreSheet, UnpaidAthlete } from '@/types/competitions';
import { PaymentWarningBanner } from '@/components/competitions/PaymentWarningBanner';
import { SkillReferencePanel } from '@/components/skill-tables/SkillReferencePanel';

// ── IASF World: Tumbling categories ───────────────────────────────────────────

type Band = { label: string; range: string; min: number; max: number; color: 'red' | 'amber' | 'emerald' };

const CATEGORIES: {
  key: keyof Pick<ScoreSheet,
    'standing_difficulty' | 'standing_execution' |
    'running_difficulty' | 'jumps_difficulty' | 'jumps_execution'
  >;
  label: string;
  description: string;
  max: number;
  step: number;
  bands: Band[];
}[] = [
  {
    key: 'standing_difficulty',
    label: 'Gimnasia en Parado — Dificultad',
    max: 5,
    step: 1,
    description: 'Dificultad de los elementos de gimnasia en parado',
    bands: [
      { label: 'Bajo el promedio', range: '1 – 3', min: 1, max: 3, color: 'red' },
      { label: 'Promedio',         range: '3 – 5', min: 3, max: 5, color: 'emerald' },
    ],
  },
  {
    key: 'standing_execution',
    label: 'Gimnasia — Técnica Global',
    max: 10,
    step: 1,
    description: 'Calidad técnica de todos los elementos de gimnasia (parado y corriendo)',
    bands: [
      { label: 'Bajo el promedio',  range: '1 – 6',  min: 1,  max: 6,  color: 'red' },
      { label: 'Promedio',          range: '6 – 9',  min: 6,  max: 9,  color: 'amber' },
      { label: 'Sobre el promedio', range: '9 – 10', min: 9,  max: 10, color: 'emerald' },
    ],
  },
  {
    key: 'running_difficulty',
    label: 'Gimnasia Corriendo — Dificultad',
    max: 5,
    step: 1,
    description: 'Dificultad de los elementos de gimnasia con carrera',
    bands: [
      { label: 'Bajo el promedio', range: '1 – 3', min: 1, max: 3, color: 'red' },
      { label: 'Promedio',         range: '3 – 5', min: 3, max: 5, color: 'emerald' },
    ],
  },
  {
    key: 'jumps_difficulty',
    label: 'Saltos — Dificultad',
    max: 5,
    step: 1,
    description: 'Dificultad de los saltos realizados durante la rutina',
    bands: [
      { label: 'Bajo el promedio', range: '1 – 4', min: 1, max: 4, color: 'amber' },
      { label: 'Promedio/Alto',    range: '4 – 5', min: 4, max: 5, color: 'emerald' },
    ],
  },
  {
    key: 'jumps_execution',
    label: 'Saltos — Técnica',
    max: 5,
    step: 1,
    description: 'Calidad técnica de los saltos: altura, forma y sincronización',
    bands: [
      { label: 'Bajo el promedio',  range: '1 – 2', min: 1, max: 2, color: 'red' },
      { label: 'Promedio',          range: '2 – 4', min: 2, max: 4, color: 'amber' },
      { label: 'Sobre el promedio', range: '4 – 5', min: 4, max: 5, color: 'emerald' },
    ],
  },
];

const MAX_TOTAL = CATEGORIES.reduce((s, c) => s + c.max, 0); // 30

function fmt(n: number) { return n.toFixed(0); }

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
  const adjust = (delta: number) =>
    onChange(Math.min(category.max, Math.max(0, value + delta)));

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="flex items-start justify-between px-4 py-3 bg-zinc-50 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-zinc-900">{category.label}</span>
            <InfoButton title={`${category.label} — Reglas`} size="lg">
              <div className="space-y-3 text-sm">
                <p className="text-zinc-600">{category.description}</p>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-50">
                      <th className="text-left px-3 py-1.5 border border-zinc-200 font-medium text-zinc-600">Rango</th>
                      <th className="text-left px-3 py-1.5 border border-zinc-200 font-medium text-zinc-600">Nivel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {category.bands.map(b => (
                      <tr key={b.label} className="even:bg-zinc-50">
                        <td className="px-3 py-1.5 border border-zinc-200 font-semibold tabular-nums">{b.range}</td>
                        <td className="px-3 py-1.5 border border-zinc-200 text-zinc-600">{b.label}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </InfoButton>
          </div>
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
            <span key={b.label} className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors ${
              isActive ? colors.chip : 'text-zinc-400 border-zinc-200'
            }`}>{b.range} · {b.label}</span>
          );
        })}
      </div>
      <div className="px-4 pb-4 flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1">
            <button type="button" onClick={() => adjust(-5)} disabled={value <= 0}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-30 transition-colors">−5</button>
            <button type="button" onClick={() => adjust(-1)} disabled={value <= 0}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-30 transition-colors">−1</button>
          </div>
          <div className="text-4xl font-bold tabular-nums text-zinc-900 w-16 text-center select-none">{value}</div>
          <div className="flex gap-1">
            <button type="button" onClick={() => adjust(+1)} disabled={value >= category.max}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-30 transition-colors">+1</button>
            <button type="button" onClick={() => adjust(+5)} disabled={value >= category.max}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-30 transition-colors">+5</button>
          </div>
        </div>
        <input type="range" min={0} max={category.max} step={category.step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full accent-zinc-900 cursor-pointer" />
        <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-200 ${BAND_COLORS[activeBand.color].bar}`}
            style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function IasfTumblingSheetPage() {
  const router  = useRouter();
  const { id, divisionId, regId } = useParams<{ id: string; divisionId: string; regId: string }>();
  const competitionId  = Number(id);
  const divId          = Number(divisionId);
  const registrationId = Number(regId);

  const { isJudge, isCompetitionActive } = useJudge();
  const readOnly = !isJudge;

  useEffect(() => {
    if (isJudge && !isCompetitionActive(competitionId)) {
      toast.error('El evento ha finalizado. Ya no puedes acceder a las planillas.');
      router.replace(`/competitions/${competitionId}`);
    }
  }, [isJudge, competitionId, isCompetitionActive, router]);

  const [teamName,       setTeamName]       = useState<string>('');
  const [existingSheet,  setExistingSheet]  = useState<ScoreSheet | null>(null);
  const [skillLevel,     setSkillLevel]     = useState<string | undefined>(undefined);
  const [loading,        setLoading]        = useState(true);
  const [unpaidAthletes, setUnpaidAthletes] = useState<UnpaidAthlete[]>([]);
  const [requirePayment, setRequirePayment] = useState(false);
  const [saving,        setSaving]        = useState(false);

  const [scores, setScores] = useState<Record<string, number>>({
    standing_difficulty: 0,
    standing_execution:  0,
    running_difficulty:  0,
    jumps_difficulty:    0,
    jumps_execution:     0,
  });
  const [notes, setNotes] = useState('');

  const total = Object.values(scores).reduce((s, v) => s + v, 0);
  const pct   = MAX_TOTAL > 0 ? (total / MAX_TOTAL) * 100 : 0;

  const load = useCallback(async () => {
    try {
      const [sheetRes, regRes, divRes] = await Promise.all([
        competitionsRepository.listScoreSheets({ registration: String(registrationId) }),
        competitionsRepository.listRegistrations({ division: String(divId), page_size: '100' }),
        competitionsRepository.getDivision(divId),
      ]);
      const reg = regRes.data.results.find(r => r.id === registrationId);
      if (reg) {
        setTeamName(reg.team_name);
        setUnpaidAthletes(reg.unpaid_athletes);
        setRequirePayment(reg.competition_require_payment);
      }
      setSkillLevel(divRes.data.skill_level);
      if (sheetRes.data.results.length > 0) {
        const sheet = sheetRes.data.results[0];
        setExistingSheet(sheet);
        if (!reg) setTeamName(sheet.team_name);
        setScores({
          standing_difficulty: sheet.standing_difficulty ? parseFloat(sheet.standing_difficulty) : 0,
          standing_execution:  sheet.standing_execution  ? parseFloat(sheet.standing_execution)  : 0,
          running_difficulty:  sheet.running_difficulty  ? parseFloat(sheet.running_difficulty)  : 0,
          jumps_difficulty:    sheet.jumps_difficulty    ? parseFloat(sheet.jumps_difficulty)    : 0,
          jumps_execution:     sheet.jumps_execution     ? parseFloat(sheet.jumps_execution)     : 0,
        });
        if (sheet.notes) setNotes(sheet.notes);
      }
    } finally {
      setLoading(false);
    }
  }, [registrationId, divId]);

  useEffect(() => { load(); }, [load]);

  // Admin polling — refresh score data every 5 s in read-only mode
  useEffect(() => {
    if (!readOnly || loading) return;
    const interval = setInterval(async () => {
      try {
        const sheetRes = await competitionsRepository.listScoreSheets({ registration: String(registrationId) });
        if (sheetRes.data.results.length === 0) return;
        const sheet = sheetRes.data.results[0];
        setExistingSheet(sheet);
        setScores({
          standing_difficulty: sheet.standing_difficulty ? parseFloat(sheet.standing_difficulty) : 0,
          standing_execution:  sheet.standing_execution  ? parseFloat(sheet.standing_execution)  : 0,
          running_difficulty:  sheet.running_difficulty  ? parseFloat(sheet.running_difficulty)  : 0,
          jumps_difficulty:    sheet.jumps_difficulty    ? parseFloat(sheet.jumps_difficulty)    : 0,
          jumps_execution:     sheet.jumps_execution     ? parseFloat(sheet.jumps_execution)     : 0,
        });
        if (sheet.notes) setNotes(sheet.notes);
      } catch { /* noop */ }
    }, 5000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, loading, registrationId]);

  // Prevents auto-save from firing while load() is populating initial form values
  const initialValuesSettled = useRef(false);
  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => { initialValuesSettled.current = true; }, 500);
      return () => clearTimeout(t);
    }
  }, [loading]);

  // Stable ref so auto-save effect can call the latest handleSave without it as a dep
  const handleSaveRef = useRef<(silent?: boolean) => Promise<void>>(async () => {});

  const handleSave = async (silent = false) => {
    setSaving(true);
    try {
      const payload: Partial<ScoreSheet> = {
        standing_difficulty: String(scores.standing_difficulty),
        standing_execution:  String(scores.standing_execution),
        running_difficulty:  String(scores.running_difficulty),
        jumps_difficulty:    String(scores.jumps_difficulty),
        jumps_execution:     String(scores.jumps_execution),
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
      if (!silent) toast.success('Planilla guardada');
    } catch (err) {
      toastApiError(err);
    } finally {
      setSaving(false);
    }
  };

  // Keep ref current so auto-save always calls the latest closure
  handleSaveRef.current = handleSave;

  // Auto-save 2 s after the last change (judge mode only)
  useEffect(() => {
    if (readOnly || !initialValuesSettled.current) return;
    const timer = setTimeout(() => { handleSaveRef.current(true); }, 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, scores, notes]);

  if (loading) return <PageSpinner />;

  return (
    <div className="min-h-screen bg-zinc-50 pb-16">
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between gap-4 bg-white border-b border-zinc-200 px-6 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push(`/competitions/${competitionId}/divisions/${divId}`)}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-400 font-medium">IASF World — Gimnasia</p>
            <p className="text-sm font-semibold text-zinc-900 leading-tight">
              {teamName || `Inscripción #${registrationId}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right print:hidden">
            <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Total</p>
            <p className="text-2xl font-bold tabular-nums text-zinc-900">
              {total}
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

      <IasfSheetPrintView
        data={{
          sheetTypeLabel:   'Gimnasia',
          teamName:         teamName || `Inscripción #${registrationId}`,
          categories:       CATEGORIES,
          maxTotal:         MAX_TOTAL,
          scores,
          notes,
          total,
          rawScore:         existingSheet ? parseFloat(existingSheet.raw_score)        : undefined,
          totalDeductions:  existingSheet ? parseFloat(existingSheet.total_deductions) : undefined,
          finalScore:       existingSheet ? parseFloat(existingSheet.final_score)      : undefined,
          percentage:       existingSheet?.percentage,
        }}
      />

      <div className={`print:hidden max-w-2xl mx-auto px-6 py-8 flex flex-col gap-6${readOnly ? ' pointer-events-none select-none opacity-75' : ''}`}>
        <SkillReferencePanel skillLevel={skillLevel} sheetType="tumbling" />
        <div className="rounded-xl bg-white border border-zinc-200 p-4 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs text-zinc-500 mb-1.5">
              <span className="text-sm font-bold text-zinc-700">Progreso total</span>
              <span className="tabular-nums font-medium">{pct.toFixed(1)}%</span>
            </div>
            <div className="h-3 rounded-full bg-zinc-100 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-300 ${
                pct >= 90 ? 'bg-emerald-500' : pct >= 70 ? 'bg-blue-500' :
                pct >= 50 ? 'bg-amber-500' : pct >= 30 ? 'bg-red-500' : 'bg-zinc-300'
              }`} style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-3xl font-bold tabular-nums text-zinc-900">{total}</p>
            <p className="text-xs text-zinc-400">de {MAX_TOTAL} pts</p>
          </div>
        </div>

        {CATEGORIES.map(cat => (
          <ScoreSelector key={cat.key} category={cat}
            value={scores[cat.key] ?? 0}
            onChange={v => setScores(prev => ({ ...prev, [cat.key]: v }))} />
        ))}

        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
            <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Comentarios del juez</span>
          </div>
          <div className="p-4">
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Observaciones sobre la gimnasia..."
              rows={3}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900" />
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="px-5 py-4 flex flex-col gap-2">
            {CATEGORIES.map(cat => (
              <div key={cat.key} className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">{cat.label}</span>
                <span className="tabular-nums font-semibold text-zinc-900">{scores[cat.key] ?? 0} / {cat.max}</span>
              </div>
            ))}
            <div className="mt-2 pt-2 border-t border-zinc-200 flex items-center justify-between">
              <span className="text-base font-bold text-zinc-700">Total Gimnasia</span>
              <span className="text-lg font-bold tabular-nums text-zinc-900">{total} / {MAX_TOTAL}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
