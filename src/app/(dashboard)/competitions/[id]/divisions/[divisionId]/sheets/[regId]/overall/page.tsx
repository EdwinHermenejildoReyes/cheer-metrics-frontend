'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, CheckCircle2, Eye, Lock } from 'lucide-react';
import { InfoButton } from '@/components/ui/InfoButton';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageSpinner } from '@/components/ui/spinner';
import { PrintButton } from '@/components/print/PrintButton';
import { OverallSheetPrintView } from '@/components/print/OverallSheetPrintView';
import competitionsRepository from '@/repositories/competitionsRepository';
import { useJudge } from '@/hooks/useJudge';
import { useBranding } from '@/contexts/BrandingContext';
import { toastApiError } from '@/utils/apiErrors';
import type { ScoreSheet, ScoringSystem, UnpaidAthlete } from '@/types/competitions';
import { PaymentWarningBanner } from '@/components/competitions/PaymentWarningBanner';

// ── Formations scale (standard: 2.0 → 1.0 in steps of −0.1) ─────────────────
const FORMATIONS_VALUES      = [2.0, 1.9, 1.8, 1.7, 1.6, 1.5, 1.4, 1.3, 1.2, 1.1, 1.0];
// International/Prep 2026: 5.0 → 3.0 in steps of −0.2
const FORMATIONS_VALUES_INTL = [5.0, 4.8, 4.6, 4.4, 4.2, 4.0, 3.8, 3.6, 3.4, 3.2, 3.0];
// Escolar 2026: 5.0 → 3.0 in steps of −0.1 (finer granularity per FECU 2026 p.7)
const FORMATIONS_VALUES_ESCOLAR = [
  5.0, 4.9, 4.8, 4.7, 4.6, 4.5, 4.4, 4.3, 4.2, 4.1, 4.0,
  3.9, 3.8, 3.7, 3.6, 3.5, 3.4, 3.3, 3.2, 3.1, 3.0,
];

// ── Dance levels ──────────────────────────────────────────────────────────────
const DANCE_LEVELS_FULL = [
  { label: 'Reducido',  sublabel: 'Bajo el Promedio',   value: 0.5 },
  { label: 'Moderado',  sublabel: 'Promedio',            value: 1.0 },
  { label: 'Elevado',   sublabel: 'Sobre el Promedio',   value: 1.5 },
];
const DANCE_LEVELS_ESCOLAR = [
  { label: 'Reducido',  sublabel: 'Bajo el Promedio',   value: 0.5 },
  { label: 'Elevado',   sublabel: 'Promedio / Alto',     value: 1.0 },
];
// International 2026: 4 levels for both difficulty and execution (max 2.0)
const DANCE_LEVELS_INTL = [
  { label: 'Reducido',  sublabel: 'Bajo el Promedio',   value: 0.5 },
  { label: 'Moderado',  sublabel: 'Promedio',            value: 1.0 },
  { label: 'Elevado',   sublabel: 'Sobre el Promedio',   value: 1.5 },
  { label: 'Superior',  sublabel: 'Nivel Alto',          value: 2.0 },
];
// Escolar AB: diff max=1.0, exec max=2.0 (separate level sets per field)
const DANCE_DIFF_LEVELS_AB = [
  { label: 'Reducido',  sublabel: 'Bajo el Promedio',   value: 0.5 },
  { label: 'Elevado',   sublabel: 'Promedio / Alto',     value: 1.0 },
];
const DANCE_EXEC_LEVELS_AB = [
  { label: 'Reducido',  sublabel: 'Bajo el Promedio',   value: 0.5 },
  { label: 'Moderado',  sublabel: 'Promedio',            value: 1.0 },
  { label: 'Elevado',   sublabel: 'Sobre el Promedio',   value: 1.5 },
  { label: 'Superior',  sublabel: 'Nivel Alto',          value: 2.0 },
];

const DANCE_DIFF_CRITERIA = [
  'Elementos Visuales', 'Trabajo de Pies', 'Trabajo en Parejas',
  'Variedad de Niveles', 'Trabajo de Suelo', 'Velocidad',
];

const DANCE_EXEC_CRITERIA = [
  'Técnica', 'Fuerza / Precisión de Movimientos',
  'Perfección', 'Sincronización / Timing', 'Energía / Entretenimiento',
];

// ── Animación / Porra — Escolar 2026 ─────────────────────────────────────────
const ANIMACION_CRITERIA_LABELS = [
  'Voz', 'Motions', 'Saltos', 'Contenido Coreográfico', 'Showmanship',
];
const ANIMACION_LEVELS = [
  { label: 'BAJO',  value: 0.3 },
  { label: 'MEDIO', value: 0.6 },
  { label: 'ALTO',  value: 1.0 },
];

function fmt(n: number) { return n.toFixed(2); }

// ── Dance level selector ──────────────────────────────────────────────────────
function DanceLevelSelector({
  label, criteria, levels, value, onChange, info,
}: {
  label: string;
  criteria: string[];
  levels: { label: string; sublabel: string; value: number }[];
  value: number;
  onChange: (v: number) => void;
  info?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="px-4 py-2.5 border-b border-black/20" style={{ backgroundColor: 'var(--plt-primary)' }}>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-white">{label}</span>
          {info && (
            <InfoButton title={label} size="lg">
              {info}
            </InfoButton>
          )}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
          {criteria.map((c) => (
            <span key={c} className="text-[10px] text-white/50">· {c}</span>
          ))}
        </div>
      </div>
      <div className={`grid divide-x divide-zinc-200 ${levels.length === 2 ? 'grid-cols-2' : levels.length === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
        {levels.map(({ label: lbl, sublabel, value: v }) => {
          const active = value === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              className={`flex flex-col items-center gap-1 py-5 px-3 transition-colors ${
                active ? '' : 'bg-white text-zinc-700 hover:bg-zinc-50'
              }`}
              style={active ? { backgroundColor: 'var(--plt-primary)', color: 'var(--plt-primary-fg)' } : undefined}
            >
              <span className={`text-2xl font-bold tabular-nums ${active ? '' : 'text-zinc-900'}`}
                style={active ? { color: 'var(--plt-primary-fg)' } : undefined}>
                {v.toFixed(1)}
              </span>
              <span className={`text-xs font-semibold ${active ? 'opacity-90' : 'text-zinc-700'}`}>
                {lbl}
              </span>
              <span className={`text-[10px] text-center ${active ? 'opacity-60' : 'text-zinc-400'}`}>
                {sublabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function OverallSheetPage() {
  const router  = useRouter();
  const { id, divisionId, regId } = useParams<{ id: string; divisionId: string; regId: string }>();

  const { isJudge, isCompetitionActive } = useJudge();
  const [competitionIntId, setCompetitionIntId] = useState<number | null>(null);
  const [regIntId, setRegIntId] = useState<number | null>(null);
  const { organization } = useBranding();
  const [protestExpired, setProtestExpired] = useState(false);
  const readOnly = !isJudge || protestExpired;

  useEffect(() => {

    if (competitionIntId !== null && isJudge && !isCompetitionActive(competitionIntId)) {
      toast.error('El evento ha finalizado. Ya no puedes acceder a las planillas.');
      router.replace(`/competitions/${id}`);
    }
  }, [isJudge, competitionIntId, isCompetitionActive, router, id]);

  const [teamName,       setTeamName]       = useState<string>('');
  const [existingSheet,  setExistingSheet]  = useState<ScoreSheet | null>(null);
  const [scoringSystem,  setScoringSystem]  = useState<ScoringSystem | ''>('');
  const [skillLevel,     setSkillLevel]     = useState<string | undefined>(undefined);
  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [unpaidAthletes, setUnpaidAthletes] = useState<UnpaidAthlete[]>([]);
  const [requirePayment, setRequirePayment] = useState(false);

  // ── Form state ────────────────────────────────────────────────────────────
  const [formationsScore,    setFormationsScore]    = useState<number>(2.0);
  const [danceDifficulty,    setDanceDifficulty]    = useState<number>(0);   // 0 = not yet selected
  const [danceExecution,     setDanceExecution]     = useState<number>(0);
  const [creativityOverall,  setCreativityOverall]  = useState<number>(1.5);
  const [showmanshipOverall, setShowmanshipOverall] = useState<number>(1.0);
  const [formationsNotes,    setFormationsNotes]    = useState('');
  const [danceNotes,         setDanceNotes]         = useState('');
  const [animacionCriteria,  setAnimacionCriteria]  = useState<number[]>([0, 0, 0, 0, 0]);

  // ── Computed ──────────────────────────────────────────────────────────────
  const isEscolarAB     = scoringSystem === 'escolar_ab';
  const isEscolar       = scoringSystem === 'escolar';
  const isIntl          = scoringSystem === 'intl_l1' || scoringSystem === 'intl_l2_7' || scoringSystem === 'intl_nt' || scoringSystem === 'prep' || isEscolar;
  const hasDanceLimited = !isEscolarAB && !isIntl && (scoringSystem === 'tiny_novice' || scoringSystem === 'mini_novice' || scoringSystem === 'novice_plus' || scoringSystem === 'elite_l1');
  const danceDiffLevels = isEscolarAB ? DANCE_DIFF_LEVELS_AB : isIntl ? DANCE_LEVELS_INTL : (hasDanceLimited ? DANCE_LEVELS_ESCOLAR : DANCE_LEVELS_FULL);
  const danceExecLevels = isEscolarAB ? DANCE_EXEC_LEVELS_AB : isIntl ? DANCE_LEVELS_INTL : (hasDanceLimited ? DANCE_LEVELS_ESCOLAR : DANCE_LEVELS_FULL);
  const showmanshipMax  = (isEscolarAB || isIntl) ? 5.0 : 2.0;
  const overallSubtotal = parseFloat((formationsScore + danceDifficulty + danceExecution).toFixed(2));
  const sheetTotal      = parseFloat((overallSubtotal + (isEscolarAB ? 0 : creativityOverall) + showmanshipOverall).toFixed(2));
  const errorsCount     = isEscolar
    ? Math.round((5.0 - formationsScore) / 0.1)
    : isIntl
    ? Math.round((5.0 - formationsScore) / 0.2)
    : Math.round((2.0 - formationsScore) * 10);
  const animacionTotal  = parseFloat(animacionCriteria.reduce((s, v) => s + v, 0).toFixed(2));
  const animacionFilled = isEscolar && animacionCriteria.some(v => v > 0);

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const [sheetRes, regRes, divRes] = await Promise.all([
        competitionsRepository.listScoreSheets({ registration__public_id: regId }),
        competitionsRepository.listRegistrations({ division__public_id: divisionId, page_size: '100' }),
        competitionsRepository.getDivision(divisionId),
      ]);

      const div = divRes.data;
      setScoringSystem((div.scoring_system || div.suggested_scoring_system) as ScoringSystem);
      setSkillLevel(div.skill_level);

      const reg = regRes.data.results.find((r) => r.public_id === regId);
      if (reg) {
        setRegIntId(reg.id);
        setTeamName(reg.team_name);
        setUnpaidAthletes(reg.unpaid_athletes);
        setRequirePayment(reg.competition_require_payment);
      }

      const sysKey = (div.scoring_system || div.suggested_scoring_system) as string;
      const isIntlSys = sysKey === 'intl_l1' || sysKey === 'intl_l2_7' || sysKey === 'intl_nt' || sysKey === 'prep' || sysKey === 'escolar';

      if (sheetRes.data.results.length > 0) {
        const sheet = sheetRes.data.results[0];
        setExistingSheet(sheet);
        if (!reg) setTeamName(sheet.team_name);

        if (sheet.formations_score) {
          setFormationsScore(parseFloat(sheet.formations_score));
        }
        if (sheet.dance_difficulty) {
          const v = parseFloat(sheet.dance_difficulty);
          const allDiffLevels = [...DANCE_LEVELS_FULL, ...DANCE_DIFF_LEVELS_AB, ...DANCE_LEVELS_INTL];
          setDanceDifficulty(allDiffLevels.find((l) => l.value === v) ? v : 0);
        }
        if (sheet.dance_execution) {
          const v = parseFloat(sheet.dance_execution);
          const allExecLevels = [...DANCE_LEVELS_FULL, ...DANCE_EXEC_LEVELS_AB, ...DANCE_LEVELS_INTL];
          setDanceExecution(allExecLevels.find((l) => l.value === v) ? v : 0);
        }
        if (sheet.creativity_overall) {
          const [cMin, cMax] = isIntlSys ? [8.0, 10.0] : [1.5, 2.0];
          setCreativityOverall(Math.min(cMax, Math.max(cMin, parseFloat(sheet.creativity_overall))));
        }
        if (sheet.showmanship_overall) {
          const sMax    = (sysKey === 'escolar_ab' || isIntlSys) ? 5.0 : 2.0;
          const showMin = sysKey === 'escolar_ab' ? 0 : isIntlSys ? 3.5 : 1.0;
          setShowmanshipOverall(Math.min(sMax, Math.max(showMin, parseFloat(sheet.showmanship_overall))));
        }
        if (sheet.notes) {
          try {
            const p = JSON.parse(sheet.notes);
            setFormationsNotes(p.formations ?? '');
            setDanceNotes(p.dance ?? '');
            if (Array.isArray(p.animacion) && p.animacion.length === 5) {
              setAnimacionCriteria(p.animacion as number[]);
            }
            if (p.protest_started_at) {
              const elapsed = Date.now() - new Date(p.protest_started_at).getTime();
              if (elapsed >= 15 * 60 * 1000) setProtestExpired(true);
            }
          } catch {
            setFormationsNotes(sheet.notes);
          }
        }
      } else if (isIntlSys) {
        setFormationsScore(5.0);
        setCreativityOverall(8.0);
        setShowmanshipOverall(3.5);
      }
    } finally {
      setLoading(false);
    }
  }, [regId, divisionId]);

  useEffect(() => { load(); }, [load]);

  // Admin polling — refresh score data every 5 s in read-only mode
  useEffect(() => {
    if (!readOnly || loading) return;
    const interval = setInterval(async () => {
      try {
        const sheetRes = await competitionsRepository.listScoreSheets({ registration__public_id: regId });
        if (sheetRes.data.results.length === 0) return;
        const sheet = sheetRes.data.results[0];
        setExistingSheet(sheet);
        if (sheet.notes) {
          try {
            const p = JSON.parse(sheet.notes);
            setFormationsNotes(p.formations ?? '');
            setDanceNotes(p.dance ?? '');
            if (Array.isArray(p.animacion) && p.animacion.length === 5) {
              setAnimacionCriteria(p.animacion as number[]);
            }
          } catch { /* noop */ }
        }
        if (sheet.formations_score    != null) setFormationsScore(parseFloat(sheet.formations_score)    || 0);
        if (sheet.dance_difficulty    != null) setDanceDifficulty(parseFloat(sheet.dance_difficulty)    || 0);
        if (sheet.dance_execution     != null) setDanceExecution(parseFloat(sheet.dance_execution)      || 0);
        if (sheet.creativity_overall  != null) setCreativityOverall(parseFloat(sheet.creativity_overall)  || 0);
        if (sheet.showmanship_overall != null) setShowmanshipOverall(parseFloat(sheet.showmanship_overall) || 0);
      } catch { /* noop */ }
    }, 5000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, loading, regId]);

  // Continuously check if protest window expires while page is open
  useEffect(() => {
    if (protestExpired) return;
    const id = setInterval(() => {
      if (!existingSheet?.notes) return;
      try {
        const p = JSON.parse(existingSheet.notes);
        if (p.protest_started_at) {
          const elapsed = Date.now() - new Date(p.protest_started_at).getTime();
          if (elapsed >= 15 * 60 * 1000) setProtestExpired(true);
        }
      } catch {}
    }, 10_000);
    return () => clearInterval(id);
  }, [existingSheet, protestExpired]);

  // Prevents auto-save from firing while load() is populating initial form values.
  // Using useState (not useRef) so transitioning to true re-triggers the auto-save effect.
  const [hasSettled, setHasSettled] = useState(false);
  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => setHasSettled(true), 500);
      return () => clearTimeout(t);
    }
  }, [loading]);

  // Stable ref so auto-save effect can call the latest handleSave without it as a dep
  const handleSaveRef = useRef<(silent?: boolean) => Promise<void>>(async () => {});

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async (silent = false) => {
    setSaving(true);
    try {
      const payload: Partial<ScoreSheet> = {
        formations_score:    String(formationsScore),
        dance_difficulty:    String(danceDifficulty),
        dance_execution:     String(danceExecution),
        creativity_overall:  String(isEscolarAB ? 0 : creativityOverall),
        showmanship_overall: String(showmanshipOverall),
        animacion_escolar:   animacionFilled ? String(animacionTotal) : null,
        notes: (() => {
          let existing: Record<string, unknown> = {};
          try { existing = JSON.parse(existingSheet?.notes ?? '{}'); } catch { /* noop */ }
          const n: Record<string, unknown> = { ...existing, formations: formationsNotes, dance: danceNotes };
          if (isEscolar) n.animacion = animacionCriteria;
          return JSON.stringify(n);
        })(),
      };

      let saved: ScoreSheet;
      if (existingSheet) {
        const res = await competitionsRepository.updateScoreSheet(existingSheet.id, payload);
        saved = res.data;
      } else {
        const res = await competitionsRepository.createScoreSheet({
          registration: regIntId!,
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
    if (readOnly || !hasSettled) return;
    const timer = setTimeout(() => { handleSaveRef.current(true); }, 2000);
    return () => clearTimeout(timer);
  }, [readOnly, hasSettled, formationsScore, danceDifficulty, danceExecution, creativityOverall, showmanshipOverall, formationsNotes, danceNotes, animacionCriteria]);

  if (loading) return <PageSpinner />;

  return (
    <div className="min-h-screen bg-zinc-50 pb-16">

      {/* ── Sticky top bar ─────────────────────────────────────────────── */}
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between gap-4 bg-white border-b border-zinc-200 px-6 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/competitions/${id}/divisions/${divisionId}`)}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-400 font-medium">Planilla — General (Overall)</p>
            <p className="text-sm font-semibold text-zinc-900 leading-tight">
              {teamName || `Inscripción #${regId}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right print:hidden">
            <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Total planilla</p>
            <p className="text-2xl font-bold tabular-nums text-zinc-900">{fmt(sheetTotal)}</p>
          </div>
          <PrintButton />
          {readOnly ? (
            <span className="print:hidden text-xs font-medium text-zinc-400 px-3 py-1.5 rounded-lg bg-zinc-100 border border-zinc-200">
              Solo lectura
            </span>
          ) : (
            <Button onClick={() => handleSave()} loading={saving} disabled={requirePayment && unpaidAthletes.length > 0} className="print:hidden">
              <Save className="h-4 w-4" />
              Guardar
            </Button>
          )}
        </div>
      </div>
      {protestExpired && (
        <div className="print:hidden bg-red-50 border-b border-red-200 px-6 py-2 flex items-center gap-2">
          <Lock className="w-4 h-4 text-red-600 shrink-0" />
          <p className="text-sm text-red-700 font-medium">La ventana de reclamo ha vencido. La planilla está bloqueada.</p>
        </div>
      )}
      {!protestExpired && readOnly && (
        <div className="print:hidden bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center gap-2">
          <Eye className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-700 font-medium">Solo lectura — solo los jueces asignados pueden calificar.</p>
        </div>
      )}
      <PaymentWarningBanner unpaidAthletes={unpaidAthletes} requirePayment={requirePayment} />

      {!loading && (
        <OverallSheetPrintView
          teamName={teamName || `Inscripción #${regId}`}
          divisionName={existingSheet?.division_name}
          organization={organization}
          isEscolarAB={isEscolarAB}
          danceDiffLevels={danceDiffLevels}
          danceExecLevels={danceExecLevels}
          showmanshipMax={showmanshipMax}
          formationsScore={formationsScore}
          danceDifficulty={danceDifficulty}
          danceExecution={danceExecution}
          creativityOverall={creativityOverall}
          showmanshipOverall={showmanshipOverall}
          formationsNotes={formationsNotes}
          danceNotes={danceNotes}
          errorsCount={errorsCount}
          overallSubtotal={overallSubtotal}
          sheetTotal={sheetTotal}
          rawScore={existingSheet?.raw_score}
          maxRaw={existingSheet?.max_raw}
          scaledScore={existingSheet?.scaled_score}
          totalDeductions={existingSheet?.total_deductions}
          finalScore={existingSheet?.final_score}
          percentage={existingSheet?.percentage}
        />
      )}

      <div className={`print:hidden max-w-6xl mx-auto px-6 py-8 flex flex-col gap-14${readOnly ? ' pointer-events-none select-none opacity-75' : ''}`}>

        {/* ── DOS COLUMNAS: Formaciones | Baile ────────────────────────── */}
        <div className="grid grid-cols-2 gap-5 items-start">

          {/* LEFT: Formaciones */}
          <section className="flex flex-col gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-700">Formaciones y Transiciones</h2>
                <InfoButton title="Formaciones y Transiciones — Reglas" size="lg">
                  <div className="space-y-3 text-sm">
                    <p className="text-zinc-600">Evalúa la precisión en las formaciones del equipo y la fluidez al cambiar entre ellas. El puntaje inicia en <strong>{isIntl ? '5.0' : '2.0'}</strong> y se descuenta <strong>{isIntl ? '−0.2' : '−0.1'}</strong> por cada error observado.</p>
                    <ul className="space-y-1.5 text-xs text-zinc-600">
                      <li className="flex items-start gap-2"><span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" /><span><strong>Espaciado:</strong> Desigualdad en la distancia entre atletas dentro de la formación.</span></li>
                      <li className="flex items-start gap-2"><span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" /><span><strong>Alineación:</strong> Falta de alineación visible en filas, columnas o figuras.</span></li>
                      <li className="flex items-start gap-2"><span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" /><span><strong>Transiciones:</strong> Choques, empalmes o pérdida de control al cambiar de formación.</span></li>
                    </ul>
                  </div>
                </InfoButton>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">{isIntl ? '−0.2' : '−0.1'} por cada problema de espaciado en formaciones o choque/empalme en transiciones</p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Valor Inicial</span>
                <div className="flex items-center gap-3">
                  {errorsCount > 0 && (
                    <span className="text-xs text-red-500 tabular-nums">{errorsCount} error{errorsCount !== 1 ? 'es' : ''} × {isIntl ? '−0.2' : '−0.1'}</span>
                  )}
                  <span className={`text-xl font-bold tabular-nums ${formationsScore < (isIntl ? 5.0 : 2.0) ? 'text-red-700' : 'text-zinc-900'}`}>
                    {fmt(formationsScore)}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-11 gap-1">
                  {(isEscolar ? FORMATIONS_VALUES_ESCOLAR : isIntl ? FORMATIONS_VALUES_INTL : FORMATIONS_VALUES).map((v) => {
                    const active = formationsScore === v;
                    const errors = isEscolar
                      ? Math.round((5.0 - v) / 0.1)
                      : isIntl
                      ? Math.round((5.0 - v) / 0.2)
                      : Math.round((2.0 - v) * 10);
                    const isRed   = isIntl ? v < 3.6 : v < 1.5;
                    const isAmber = isIntl ? v < 4.6 : v < 1.8;
                    return (
                      <button key={v} type="button" onClick={() => setFormationsScore(v)}
                        title={errors === 0 ? 'Sin errores' : `${errors} error${errors !== 1 ? 'es' : ''}`}
                        className={`flex flex-col items-center gap-0.5 rounded-lg py-2.5 text-xs font-semibold transition-colors border ${
                          active ? 'border-transparent'
                            : isRed   ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                            : isAmber ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                            : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-600 hover:bg-zinc-50'
                        }`}
                        style={active ? { backgroundColor: 'var(--plt-primary)', color: 'var(--plt-primary-fg)', borderColor: 'var(--plt-primary)' } : undefined}
                      >
                        <span className="tabular-nums">{v.toFixed(1)}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-zinc-400">
                  <span>← Más errores</span>
                  <span>Sin errores →</span>
                </div>
              </div>
            </div>

          </section>

          {/* RIGHT: Baile */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-700">Baile</h2>
              <InfoButton title="Baile — Reglas de Puntuación" size="lg">
                <div className="space-y-3 text-sm">
                  <p className="text-zinc-600">El baile se evalúa en dos dimensiones: <strong>Dificultad</strong> (complejidad y variedad de los elementos coreográficos) y <strong>Ejecución</strong> (calidad técnica y expresiva). Cada juez asigna un nivel y los tres puntajes se promedian.</p>
                  <div>
                    <p className="text-xs font-semibold text-zinc-700 mb-1">Dificultad — Criterios evaluados:</p>
                    <ul className="space-y-1 text-xs text-zinc-600">
                      {DANCE_DIFF_CRITERIA.map((c) => <li key={c} className="flex items-start gap-2"><span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" /><span>{c}</span></li>)}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-700 mb-1">Ejecución — Criterios evaluados:</p>
                    <ul className="space-y-1 text-xs text-zinc-600">
                      {DANCE_EXEC_CRITERIA.map((c) => <li key={c} className="flex items-start gap-2"><span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" /><span>{c}</span></li>)}
                    </ul>
                  </div>
                </div>
              </InfoButton>
            </div>

            <DanceLevelSelector
              label="Dificultad de Baile"
              criteria={DANCE_DIFF_CRITERIA}
              levels={danceDiffLevels}
              value={danceDifficulty}
              onChange={setDanceDifficulty}
              info={
                <ul className="space-y-1.5 text-xs text-zinc-600">
                  <li className="flex items-start gap-2"><span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" /><span><strong>Reducido (Bajo el Promedio):</strong> Coreografía simple, pocos elementos de dificultad, variedad limitada.</span></li>
                  <li className="flex items-start gap-2"><span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" /><span><strong>Moderado (Promedio):</strong> Coreografía con variedad adecuada, elementos de dificultad media y buen uso del espacio.</span></li>
                  <li className="flex items-start gap-2"><span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" /><span><strong>Elevado (Sobre el Promedio):</strong> Coreografía compleja, alta variedad de elementos, excelente uso de niveles y velocidad.</span></li>
                </ul>
              }
            />
            {danceDifficulty === 0 && <p className="text-xs text-amber-600 text-center">— Selecciona un nivel de dificultad —</p>}

            <DanceLevelSelector
              label="Ejecución de Baile"
              criteria={DANCE_EXEC_CRITERIA}
              levels={danceExecLevels}
              value={danceExecution}
              onChange={setDanceExecution}
              info={
                <ul className="space-y-1.5 text-xs text-zinc-600">
                  <li className="flex items-start gap-2"><span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" /><span><strong>Reducido (Bajo el Promedio):</strong> Técnica deficiente, movimientos imprecisos, falta de sincronización y energía.</span></li>
                  <li className="flex items-start gap-2"><span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" /><span><strong>Moderado (Promedio):</strong> Técnica aceptable, movimientos coordinados, sincronización y energía consistentes.</span></li>
                  <li className="flex items-start gap-2"><span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" /><span><strong>Elevado (Sobre el Promedio):</strong> Alta precisión, excelente sincronización, energía y expresividad sobresalientes.</span></li>
                </ul>
              }
            />
            {danceExecution === 0 && <p className="text-xs text-amber-600 text-center">— Selecciona un nivel de ejecución —</p>}
          </section>
        </div>

        {/* ── OVERALL SUBTOTAL ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between rounded-xl px-5 py-4 shadow-sm mb-6" style={{ backgroundColor: 'var(--plt-primary)', color: 'var(--plt-primary-fg)' }}>
          <div className="flex gap-6 text-sm items-center">
            <span className="text-xs uppercase tracking-wide opacity-70">Subtotal General</span>
            <span>Form: <strong>{fmt(formationsScore)}</strong></span>
            <span>Dif: <strong>{fmt(danceDifficulty)}</strong></span>
            <span>Ejec: <strong>{fmt(danceExecution)}</strong></span>
          </div>
          <span className="text-2xl font-bold tabular-nums">{fmt(overallSubtotal)}</span>
        </div>

        {/* ── CREATIVITY + SHOWMANSHIP ─────────────────────────────────── */}
        <section className="flex flex-col gap-4 mt-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-700">
                {isEscolarAB ? 'Cheer / Animación' : 'Creatividad & Showmanship'}
              </h2>
              <InfoButton title="Creatividad & Showmanship — Reglas" size="lg">
                <div className="space-y-3 text-sm">
                  <p className="text-zinc-600">Estos puntajes son asignados individualmente por cada juez y se <strong>promedian</strong> entre los tres jueces de Overall para obtener el valor final (máx. efectivo: 2.00 por categoría).</p>
                  <ul className="space-y-1.5 text-xs text-zinc-600">
                    <li className="flex items-start gap-2"><span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" /><span><strong>Creatividad:</strong> Originalidad de la coreografía, uso innovador del espacio, variedad de formaciones y efectos visuales durante toda la rutina.</span></li>
                    <li className="flex items-start gap-2"><span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" /><span><strong>Showmanship:</strong> Confianza, presencia escénica y conexión emocional del equipo durante la presentación de Overall.</span></li>
                  </ul>
                </div>
              </InfoButton>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">Puntuado por este juez — se promedia con los otros dos jueces</p>
          </div>

          <div className={`grid gap-4 ${isEscolarAB ? 'grid-cols-1 max-w-md' : 'grid-cols-2'}`}>
            {/* Creativity (hidden for escolar_ab) */}
            {!isEscolarAB && (
              <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                  <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Creatividad</span>
                  <span className="text-lg font-bold tabular-nums text-zinc-900">{fmt(creativityOverall)}</span>
                </div>
                <div className="p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={isIntl ? '8.0' : '1.5'}
                      max={isIntl ? '10.0' : '2.0'}
                      step="0.1"
                      value={creativityOverall}
                      onChange={(e) => setCreativityOverall(parseFloat(e.target.value))}
                      className="flex-1 accent-zinc-900"
                    />
                    <input
                      type="number"
                      min={isIntl ? '8.0' : '1.5'}
                      max={isIntl ? '10.0' : '2.0'}
                      step="0.1"
                      value={creativityOverall}
                      onChange={(e) => {
                        const [cMin, cMax] = isIntl ? [8.0, 10.0] : [1.5, 2.0];
                        const v = Math.min(cMax, Math.max(cMin, parseFloat(e.target.value) || cMin));
                        setCreativityOverall(parseFloat(v.toFixed(2)));
                      }}
                      className="w-16 h-9 rounded-lg border border-zinc-300 px-2 text-center text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-snug">Creatividad, Innovación y/o visual durante toda la rutina</p>
                </div>
              </div>
            )}

            {/* Showmanship / Cheer-Animación */}
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">
                  {isEscolarAB ? 'Cheer / Animación' : 'Showmanship'}
                </span>
                <span className="text-lg font-bold tabular-nums text-zinc-900">{fmt(showmanshipOverall)}</span>
              </div>
              <div className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={isEscolarAB ? '0' : isIntl ? '3.5' : '1.0'}
                    max={showmanshipMax}
                    step="0.1"
                    value={showmanshipOverall}
                    onChange={(e) => setShowmanshipOverall(parseFloat(e.target.value))}
                    className="flex-1 accent-zinc-900"
                  />
                  <input
                    type="number"
                    min={isEscolarAB ? '0' : isIntl ? '3.5' : '1.0'}
                    max={showmanshipMax}
                    step="0.1"
                    value={showmanshipOverall}
                    onChange={(e) => {
                      const showMin = isEscolarAB ? 0 : isIntl ? 3.5 : 1.0;
                      const v = Math.min(showmanshipMax, Math.max(showMin, parseFloat(e.target.value) || showMin));
                      setShowmanshipOverall(parseFloat(v.toFixed(2)));
                    }}
                    className="w-16 h-9 rounded-lg border border-zinc-300 px-2 text-center text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
                <p className="text-[11px] text-zinc-400 leading-snug">
                  {isEscolarAB
                    ? 'Cheer / Animación — máx 5.0 (se promedia con los otros dos jueces)'
                    : isIntl
                    ? 'Showmanship — máx 5.0 (se promedia con los otros dos jueces)'
                    : 'Confianza, Limpieza y Conexión durante la rutina (Habilidades de Construcción)'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── ANIMACIÓN / PORRA (Escolar 2026 only) ────────────────────── */}
        {isEscolar && (
          <section className="flex flex-col gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-700">Animación / Porra</h2>
                <InfoButton title="Animación / Porra — FECU 2026" size="lg">
                  <div className="space-y-3 text-sm">
                    <p className="text-zinc-600">Sección opcional exclusiva de la categoría Escolar (FECU 2026). Cada criterio se evalúa como <strong>BAJO (0.3)</strong>, <strong>MEDIO (0.6)</strong> o <strong>ALTO (1.0)</strong>. El total máximo es <strong>5.0</strong>.</p>
                    <p className="text-zinc-600">El puntaje efectivo de Showmanship para este equipo será <strong>el mayor</strong> entre el Showmanship tradicional (promedio de los tres jueces) y el puntaje de Animación/Porra.</p>
                    <p className="text-xs text-zinc-400">Si el equipo no presenta sección de porra, deja todos los criterios en 0.</p>
                  </div>
                </InfoButton>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">Opcional — puntuación: BAJO 0.3 / MEDIO 0.6 / ALTO 1.0 por criterio (máx. 5.0)</p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Puntaje Animación</span>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold tabular-nums text-zinc-900">{animacionTotal.toFixed(2)}</span>
                  <span className="text-xs text-zinc-400">/ 5.00</span>
                </div>
              </div>
              <div className="divide-y divide-zinc-100">
                {ANIMACION_CRITERIA_LABELS.map((label, i) => (
                  <div key={label} className="flex items-center gap-4 px-4 py-3">
                    <span className="text-sm text-zinc-700 w-48 shrink-0">{label}</span>
                    <div className="flex gap-2 flex-1">
                      <button
                        type="button"
                        onClick={() => {
                          const next = [...animacionCriteria];
                          next[i] = next[i] === 0 ? 0 : 0;
                          setAnimacionCriteria(next);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                          animacionCriteria[i] === 0
                            ? 'bg-zinc-100 text-zinc-500 border-zinc-200'
                            : 'bg-white text-zinc-400 border-zinc-200 hover:bg-zinc-50'
                        }`}
                      >
                        —
                      </button>
                      {ANIMACION_LEVELS.map(({ label: lbl, value: v }) => {
                        const active = animacionCriteria[i] === v;
                        return (
                          <button
                            key={v}
                            type="button"
                            onClick={() => {
                              const next = [...animacionCriteria];
                              next[i] = active ? 0 : v;
                              setAnimacionCriteria(next);
                            }}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                              active ? 'border-transparent text-white' : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                            }`}
                            style={active ? { backgroundColor: 'var(--plt-primary)', borderColor: 'var(--plt-primary)' } : undefined}
                          >
                            {lbl}
                            <span className="ml-1 opacity-70">({v.toFixed(1)})</span>
                          </button>
                        );
                      })}
                    </div>
                    <span className="w-10 text-right text-sm font-semibold tabular-nums text-zinc-900">
                      {animacionCriteria[i].toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
              {animacionFilled && (
                <div className="px-4 py-3 bg-blue-50 border-t border-blue-100 flex items-center gap-2">
                  <span className="text-xs text-blue-700">
                    Showmanship efectivo = <strong>max(animación {animacionTotal.toFixed(2)}, promedio showmanship jueces)</strong>
                    {' '}— el mayor de los dos se aplica al puntaje final.
                  </span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── OBSERVATIONS ─────────────────────────────────────────────── */}
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
            <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Observaciones del juez</span>
            <p className="text-[10px] text-zinc-400 mt-0.5">Aquí se consolidarán los comentarios de todas las secciones calificadas (Formaciones, Baile)</p>
          </div>
          <div className="divide-y divide-zinc-100">
            <div className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Formaciones</p>
              <textarea value={formationsNotes} onChange={(e) => setFormationsNotes(e.target.value)}
                placeholder="Observaciones sobre formaciones y transiciones..." rows={4}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900" />
            </div>
            <div className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Baile</p>
              <textarea value={danceNotes} onChange={(e) => setDanceNotes(e.target.value)}
                placeholder="Observaciones sobre dificultad y ejecución de baile..." rows={4}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900" />
            </div>
          </div>
        </div>

        {/* ── GRAND TOTAL ───────────────────────────────────────────────── */}
        <div className="rounded-xl px-6 py-5 flex items-center justify-between shadow-lg" style={{ backgroundColor: 'var(--plt-primary)', color: 'var(--plt-primary-fg)' }}>
          <div>
            <p className="text-base uppercase tracking-wide font-bold">Total Planilla Overall</p>
            <p className="text-xs opacity-70 mt-0.5">
              {isEscolarAB
                ? `General + Cheer/Animación (${fmt(showmanshipOverall)})`
                : `General + Creatividad (${fmt(creativityOverall)}) + Showmanship (${fmt(showmanshipOverall)})`}
            </p>
          </div>
          <span className="text-4xl font-bold tabular-nums">{fmt(sheetTotal)}</span>
        </div>

        {/* ── Full competition stats (after save) ───────────────────────── */}
        {existingSheet && (
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">
                Estadísticas de la Competencia
              </span>
            </div>
            <div className="grid grid-cols-3 divide-x divide-zinc-100 text-center">
              <div className="px-4 py-4">
                <p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-1">Puntaje Bruto</p>
                <p className="text-2xl font-bold tabular-nums text-zinc-900">
                  {parseFloat(existingSheet.raw_score).toFixed(2)}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">/ {parseFloat(existingSheet.max_raw).toFixed(2)}</p>
              </div>
              <div className="px-4 py-4">
                <p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-1">Descuentos</p>
                <p className="text-2xl font-bold tabular-nums text-red-600">
                  −{parseFloat(existingSheet.total_deductions).toFixed(2)}
                </p>
              </div>
              <div className="px-4 py-4">
                <p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-1">% de Perfección</p>
                <p className="text-2xl font-bold tabular-nums text-zinc-900">
                  {existingSheet.percentage}%
                </p>
              </div>
            </div>
            <div className="border-t border-zinc-100 flex items-center justify-between px-6 py-4 rounded-b-xl" style={{ backgroundColor: 'var(--plt-primary)' }}>
              <div>
                <p className="text-xs text-zinc-400 uppercase tracking-wide">Puntaje Final</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-zinc-500 tabular-nums">
                    Bruto {parseFloat(existingSheet.scaled_score).toFixed(2)}
                  </span>
                  {parseFloat(existingSheet.total_deductions) > 0 && (
                    <span className="text-xs text-red-400 tabular-nums">
                      − desc {parseFloat(existingSheet.total_deductions).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-3xl font-bold tabular-nums text-white">
                {parseFloat(existingSheet.final_score).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* ── Score summary ─────────────────────────────────────────────── */}
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden text-sm">
          <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
            <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Resumen de puntajes</span>
          </div>
          <table className="w-full">
            <tbody className="divide-y divide-zinc-100">
              {[
                { label: 'Formaciones y Transiciones', value: formationsScore, max: isIntl ? 5.0 : 2.0 },
                { label: 'Dificultad de Baile',        value: danceDifficulty, max: Math.max(...danceDiffLevels.map(l => l.value)) },
                { label: 'Ejecución de Baile',         value: danceExecution,  max: Math.max(...danceExecLevels.map(l => l.value)) },
              ].map(({ label, value, max }) => (
                <tr key={label}>
                  <td className="px-4 py-2.5 text-zinc-600">{label}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap">
                    <span className="font-semibold">{fmt(value)}</span>
                    <span className="text-zinc-400 font-normal"> / {fmt(max)}</span>
                  </td>
                </tr>
              ))}
              <tr className="bg-zinc-50">
                <td className="px-4 py-2.5 font-semibold" style={{ color: 'var(--plt-primary)' }}>Subtotal General</td>
                <td className="px-4 py-2.5 text-right font-bold tabular-nums" style={{ color: 'var(--plt-primary)' }}>{fmt(overallSubtotal)}</td>
              </tr>
              {!isEscolarAB && (
                <tr>
                  <td className="px-4 py-2.5 text-zinc-600">Creatividad (este juez)</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap">
                    <span className="font-semibold">{fmt(creativityOverall)}</span>
                    <span className="text-zinc-400 font-normal"> / {isIntl ? '10.00' : '2.00'}</span>
                  </td>
                </tr>
              )}
              <tr>
                <td className="px-4 py-2.5 text-zinc-600">
                  {isEscolarAB ? 'Cheer / Animación (este juez)' : 'Showmanship (este juez)'}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap">
                  <span className="font-semibold">{fmt(showmanshipOverall)}</span>
                  <span className="text-zinc-400 font-normal"> / {fmt(showmanshipMax)}</span>
                </td>
              </tr>
              {isEscolar && animacionFilled && (
                <tr>
                  <td className="px-4 py-2.5 text-zinc-600">Animación / Porra (total)</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap">
                    <span className="font-semibold">{animacionTotal.toFixed(2)}</span>
                    <span className="text-zinc-400 font-normal"> / 5.00</span>
                    {animacionTotal > showmanshipOverall && (
                      <span className="ml-2 text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">usa este</span>
                    )}
                  </td>
                </tr>
              )}
              <tr style={{ backgroundColor: 'var(--plt-primary)' }}>
                <td className="px-4 py-2.5 font-bold" style={{ color: 'var(--plt-primary-fg)' }}>TOTAL</td>
                <td className="px-4 py-2.5 text-right font-bold tabular-nums text-lg" style={{ color: 'var(--plt-primary-fg)' }}>{fmt(sheetTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
