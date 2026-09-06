'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Eye, Lock } from 'lucide-react';
import { InfoButton } from '@/components/ui/InfoButton';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageSpinner } from '@/components/ui/spinner';
import { PrintButton } from '@/components/print/PrintButton';
import { TumblingSheetPrintView } from '@/components/print/TumblingSheetPrintView';
import competitionsRepository from '@/repositories/competitionsRepository';
import { getScoringConfig, DEFAULT_TUMBLING_CONFIG } from '@/lib/scoringConfig';
import { getGymGroups, getGymGroupsPrep } from '@/lib/constructionTable';
import { useJudge } from '@/hooks/useJudge';
import { useBranding } from '@/contexts/BrandingContext';
import { toastApiError } from '@/utils/apiErrors';
import type { TumblingConfig } from '@/lib/scoringConfig';
import type { Division, JudgeScoreRecord, ScoreSheet, UnpaidAthlete } from '@/types/competitions';
import { PaymentWarningBanner } from '@/components/competitions/PaymentWarningBanner';
import { SkillReferencePanel } from '@/components/skill-tables/SkillReferencePanel';
import type { TumblingPrintData } from '@/components/print/TumblingSheetPrintView';

// ── Execution categories (same for all scoring systems) ──────────────────────
const STANDING_EXEC_CATS = ['Aprox.', 'Con. Corporal', 'Aterrizajes', 'Sinc'];
const RUNNING_EXEC_CATS  = ['Aprox.', 'Con. Corporal', 'Aterrizajes', 'Sinc'];
const JUMPS_EXEC_CATS    = ['P. Brazos', 'P. Piernas', 'Sinc'];
const EXEC_DED_OPTS      = [0.05, 0.10, 0.20, 0.30];
const EXEC_DED_LABELS    = ['Mínimos', 'Menores', 'Múltiples', 'Generalizados'];

// ── Types & helpers ───────────────────────────────────────────────────────────
type ExecDeds = (number | null)[];

function emptyExec(cats: string[]): ExecDeds {
  return cats.map(() => null);
}

function execScore(max: number, deds: ExecDeds): number {
  const sum = deds.reduce<number>((s, d) => s + (d ?? 0), 0);
  return parseFloat(Math.max(0, max - sum).toFixed(2));
}

function fmt(n: number) {
  return n.toFixed(2);
}

// ── Tumbling category descriptions for info modals ───────────────────────────
const TUMBLING_CAT_DESCRIPTIONS: Record<string, string> = {
  'Aprox.': 'Aproximación a la habilidad — posición inicial, pasos de carrera y control antes de ejecutar.',
  'Con. Corporal': 'Control corporal durante la habilidad — posición de brazos, piernas y tronco.',
  'Aterrizajes': 'Calidad del aterrizaje — absorción, equilibrio y control al finalizar la habilidad.',
  'Sinc': 'Sincronización entre los integrantes del equipo al ejecutar la habilidad simultáneamente.',
  'P. Brazos': 'Posición y técnica de brazos durante el salto — elevación, ángulo y limpieza.',
  'P. Piernas': 'Posición y técnica de piernas durante el salto — extensión, ángulo y control.',
};

const EXEC_DED_DESCS = [
  'Errores leves, casi imperceptibles; no afectan el conjunto',
  'Errores claramente visibles pero controlados y aislados',
  'Errores frecuentes o repetidos en varias ejecuciones',
  'Errores graves o falta de control notoria en la categoría',
];

function TumblingExecInfoContent({ cats, dedOpts }: { cats: string[]; dedOpts?: number[] }) {
  const opts = dedOpts ?? EXEC_DED_OPTS;
  return (
    <div className="space-y-4 text-sm">
      <div>
        <h3 className="font-semibold text-zinc-900 mb-2">Niveles de Deducción</h3>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-zinc-50">
              <th className="text-left px-3 py-1.5 border border-zinc-200 font-medium text-zinc-600">Nivel</th>
              <th className="text-center px-3 py-1.5 border border-zinc-200 font-medium text-zinc-600 w-16">Descuento</th>
              <th className="text-left px-3 py-1.5 border border-zinc-200 font-medium text-zinc-600">Criterio</th>
            </tr>
          </thead>
          <tbody>
            {opts.map((amt, i) => (
              <tr key={amt} className="even:bg-zinc-50">
                <td className="px-3 py-1.5 border border-zinc-200 font-medium">{EXEC_DED_LABELS[i]}</td>
                <td className="px-3 py-1.5 border border-zinc-200 text-center text-red-600 font-semibold tabular-nums">−{fmt(amt)}</td>
                <td className="px-3 py-1.5 border border-zinc-200 text-zinc-500">{EXEC_DED_DESCS[i]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <h3 className="font-semibold text-zinc-900 mb-2">Categorías Evaluadas</h3>
        <ul className="space-y-1.5 text-xs text-zinc-600">
          {cats.map((cat) => (
            <li key={cat} className="flex items-start gap-2">
              <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" />
              <span><strong>{cat}:</strong> {TUMBLING_CAT_DESCRIPTIONS[cat] ?? 'Calidad técnica de ejecución en esta categoría.'}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Execution sub-component ───────────────────────────────────────────────────
function ExecSection({
  label, max, categories, deds, onChange, info, dedOpts,
}: {
  label: string;
  max: number;
  categories: string[];
  deds: ExecDeds;
  onChange: (deds: ExecDeds) => void;
  info?: React.ReactNode;
  dedOpts?: number[];
}) {
  const opts     = dedOpts ?? EXEC_DED_OPTS;
  const score    = execScore(max, deds);
  const totalDed = deds.reduce<number>((s, d) => s + (d ?? 0), 0);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">{label} — Ejecución</span>
            {info && <InfoButton title={`${label} — Reglas de Ejecución`}>{info}</InfoButton>}
          </div>
          <span className="text-sm font-semibold tabular-nums text-zinc-600">Máx: {fmt(max)}</span>
        </div>
        <p className="text-[10px] text-zinc-400 mt-0.5">Se Descuenta por Cantidad, Frecuencia y/o Gravedad de Errores</p>
      </div>

      <div className="divide-y divide-zinc-100">
        {categories.map((cat, i) => (
          <div key={cat} className="flex items-center gap-3 px-4 py-2.5">
            <span className="w-36 shrink-0 text-sm text-zinc-700">{cat}</span>
            <div className="flex flex-1 gap-1.5">
              {opts.map((amt, aidx) => {
                const active = deds[i] === amt;
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      const next = [...deds] as ExecDeds;
                      next[i] = active ? null : amt;
                      onChange(next);
                    }}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors border flex flex-col items-center gap-0.5 ${
                      active
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-white text-zinc-600 border-zinc-300 hover:border-red-400 hover:text-red-600'
                    }`}
                  >
                    <span>−{fmt(amt)}</span>
                    <span className={`text-[9px] ${active ? 'opacity-75' : 'opacity-50'}`}>{EXEC_DED_LABELS[aidx]}</span>
                  </button>
                );
              })}
            </div>
            <span className={`w-10 text-right text-xs tabular-nums ${deds[i] != null ? 'text-red-600' : 'text-zinc-300'}`}>
              {deds[i] != null ? `−${fmt(deds[i]!)}` : '—'}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 border-t border-zinc-200">
        <span className="text-xs text-zinc-400">Descuentos: −{fmt(totalDed)}</span>
        <span className={`text-lg font-bold tabular-nums ${totalDed > 0 ? 'text-red-700' : 'text-zinc-900'}`}>
          {fmt(score)}
        </span>
      </div>
    </div>
  );
}

// ── Section total pill ────────────────────────────────────────────────────────
function SectionTotal({ label, breakdown, total }: {
  label: string;
  breakdown: { key: string; value: number }[];
  total: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl px-5 py-3 bg-zinc-800 text-white">
      <div className="flex items-center gap-4 text-sm">
        <span className="text-xs uppercase tracking-wide opacity-60">{label}</span>
        {breakdown.map(({ key, value }) => (
          <span key={key}>
            {key}: <strong className="tabular-nums">{fmt(value)}</strong>
          </span>
        ))}
      </div>
      <span className="text-xl font-bold tabular-nums">{fmt(total)}</span>
    </div>
  );
}

// ── Difficulty card for standing/running tumbling ─────────────────────────────
function TumblingDiffCard({
  label,
  rangoOpts, habilidadOpts,
  rango, onRango,
  habilidad, onHabilidad,
}: {
  label: string;
  rangoOpts: { value: number; label: string }[];
  habilidadOpts: { value: number; label: string }[];
  rango: number; onRango: (v: number) => void;
  habilidad: number; onHabilidad: (v: number) => void;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
        <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">{label} — Dificultad</span>
      </div>
      <div className="p-4 flex flex-col gap-5">

        {/* Rango Base */}
        <div>
          <p className="text-xs font-medium text-zinc-500 mb-2">Rango Base de Complejidad</p>
          <div className="flex flex-col gap-1.5">
            {rangoOpts.map(({ label: lbl, value }) => (
              <button
                key={value}
                type="button"
                onClick={() => onRango(value)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors border text-left ${
                  rango === value
                    ? 'border-transparent'
                    : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-600 hover:bg-zinc-50'
                }`}
                style={rango === value ? { backgroundColor: '#2563eb', color: '#ffffff', borderColor: '#2563eb' } : undefined}
              >
                <span className={`w-8 text-center rounded font-bold tabular-nums text-xs ${
                  rango === value ? 'text-zinc-300' : 'text-zinc-400'
                }`}>
                  {value.toFixed(1)}
                </span>
                <span className="flex-1">{lbl}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Habilidad Realizada */}
        {habilidadOpts.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-700 mb-2">DRIVERS DE DIFICULTAD EN GIMNASIA {label.toUpperCase()}</p>
            <div className="flex gap-1.5">
              {habilidadOpts.map(({ label: lbl, value }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onHabilidad(value)}
                  className={`flex-1 flex flex-col items-center gap-0.5 rounded-lg px-2 py-2.5 text-xs font-medium transition-colors border ${
                    habilidad === value
                      ? 'border-transparent'
                      : 'bg-white text-zinc-600 border-zinc-300 hover:border-zinc-500 hover:bg-zinc-50'
                  }`}
                  style={habilidad === value ? { backgroundColor: '#f59e0b', color: '#ffffff', borderColor: '#f59e0b' } : undefined}
                >
                  <span className="font-bold text-sm">{value.toFixed(1)}</span>
                  <span className="leading-tight text-center opacity-80">{lbl}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between text-xs border-t border-zinc-100 pt-2">
          <span className="text-zinc-500">
            Base {fmt(rango)} + habilidad {fmt(habilidad)}
          </span>
          <span className="font-semibold text-zinc-900">
            Total: {fmt(rango + habilidad)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TumblingSheetPage() {
  const router  = useRouter();
  const { id, divisionId, regId } = useParams<{ id: string; divisionId: string; regId: string }>();

  const { isJudge, isCompetitionActive, assignments } = useJudge();
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
  const [judgeRecord,    setJudgeRecord]    = useState<JudgeScoreRecord | null>(null);
  const [division,       setDivision]       = useState<Division | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [tCfg,           setTCfg]           = useState<TumblingConfig>(DEFAULT_TUMBLING_CONFIG);
  const [athleteCount,   setAthleteCount]   = useState<number | null>(null);
  const [unpaidAthletes, setUnpaidAthletes] = useState<UnpaidAthlete[]>([]);
  const [requirePayment, setRequirePayment] = useState(false);

  // ── Standing difficulty ───────────────────────────────────────────────────
  const [standingRango,    setStandingRango]    = useState<number>(0);
  const [standingHabilidad, setStandingHabilidad] = useState<number>(0.0);
  const [standingExecDeds, setStandingExecDeds] = useState<ExecDeds>(emptyExec(STANDING_EXEC_CATS));

  // ── Running difficulty ────────────────────────────────────────────────────
  const [runningRango,    setRunningRango]    = useState<number>(0);
  const [runningHabilidad, setRunningHabilidad] = useState<number>(0.0);
  const [runningExecDeds, setRunningExecDeds] = useState<ExecDeds>(emptyExec(RUNNING_EXEC_CATS));

  // ── Jumps ─────────────────────────────────────────────────────────────────
  const [jumpsDiff,     setJumpsDiff]     = useState<number>(0);
  const [jumpsExecDeds, setJumpsExecDeds] = useState<ExecDeds>(emptyExec(JUMPS_EXEC_CATS));

  // ── Cross-sheet ───────────────────────────────────────────────────────────
  const [creativityTumbling,  setCreativityTumbling]  = useState<number>(1.5);
  const [showmanshipTumbling, setShowmanshipTumbling] = useState<number>(1.0);

  const [comments, setComments] = useState('');

  // ── Computed totals ───────────────────────────────────────────────────────
  const standingExecTotal   = execScore(tCfg.standingExecMax, standingExecDeds);
  const standingDiffEff     = tCfg.standingHasDiff ? standingRango : 0;
  const standingHabEff      = tCfg.standingHasDiff ? standingHabilidad : 0;
  const standingTotal       = parseFloat((standingDiffEff + standingHabEff + standingExecTotal).toFixed(2));

  const runningExecTotal    = execScore(tCfg.runningExecMax, runningExecDeds);
  const runningDiffEff      = tCfg.runningHasDiff ? runningRango : 0;
  const runningHabEff       = tCfg.runningHasDiff ? runningHabilidad : 0;
  const runningTotal        = parseFloat((runningDiffEff + runningHabEff + runningExecTotal).toFixed(2));

  const jumpsExecTotal      = execScore(tCfg.jumpsExecMax, jumpsExecDeds);
  const jumpsDiffEff        = tCfg.jumpsHasDiff ? jumpsDiff : 0;
  const jumpsTotal          = parseFloat((jumpsDiffEff + jumpsExecTotal).toFixed(2));

  const tumblingSubtotal    = parseFloat((
    (tCfg.hasStanding ? standingTotal : 0) +
    (tCfg.hasRunning  ? runningTotal  : 0) +
    (tCfg.hasJumps    ? jumpsTotal    : 0)
  ).toFixed(2));
  const sheetTotal          = parseFloat((tumblingSubtotal + creativityTumbling + showmanshipTumbling).toFixed(2));

  // ── Max values from config (for summary table) ────────────────────────────
  const maxStandingRango  = tCfg.standingRango.length > 0 ? Math.max(...tCfg.standingRango.map(r => r.value)) : 0;
  const maxStandingHab    = tCfg.standingHabilidad.length > 0 ? Math.max(...tCfg.standingHabilidad.map(r => r.value)) : 0;
  const maxRunningRango   = tCfg.runningRango.length > 0 ? Math.max(...tCfg.runningRango.map(r => r.value)) : 0;
  const maxRunningHab     = tCfg.runningHabilidad.length > 0 ? Math.max(...tCfg.runningHabilidad.map(r => r.value)) : 0;
  const maxJumpsDiff      = tCfg.jumpsDiffOpts.length > 0 ? Math.max(...tCfg.jumpsDiffOpts.map(o => o.value)) : 0;

  // ── Load ─────────────────────────────────────────────────────────────────
  const assignmentsRef = useRef(assignments);
  assignmentsRef.current = assignments;
  const isJudgeRef = useRef(isJudge);
  isJudgeRef.current = isJudge;

  const populateFromScoreSource = useCallback((
    source: Partial<ScoreSheet | JudgeScoreRecord> & { notes?: string | null },
    tcfg: TumblingConfig,
  ) => {
    if (source.standing_difficulty) {
      const v = parseFloat(source.standing_difficulty as string);
      const match = tcfg.standingRango.find((o) => o.value === v);
      setStandingRango(match ? v : (tcfg.standingRango[0]?.value ?? 0));
    }
    if (source.standing_drivers) {
      const v = parseFloat(source.standing_drivers as string);
      const match = tcfg.standingHabilidad.find((o) => o.value === v);
      setStandingHabilidad(match ? v : 0.0);
    }
    if (source.running_difficulty) {
      const v = parseFloat(source.running_difficulty as string);
      const match = tcfg.runningRango.find((o) => o.value === v);
      setRunningRango(match ? v : (tcfg.runningRango[0]?.value ?? 0));
    }
    if (source.running_drivers) {
      const v = parseFloat(source.running_drivers as string);
      const match = tcfg.runningHabilidad.find((o) => o.value === v);
      setRunningHabilidad(match ? v : 0.0);
    }
    if (source.jumps_difficulty) {
      const v = parseFloat(source.jumps_difficulty as string);
      const match = tcfg.jumpsDiffOpts.find((o) => o.value === v);
      setJumpsDiff(match ? v : (tcfg.jumpsDiffOpts[0]?.value ?? 0));
    }
    if (source.creativity_tumbling) {
      setCreativityTumbling(Math.min(tcfg.creativityMax, Math.max(tcfg.creativityMin, parseFloat(source.creativity_tumbling as string))));
    }
    if (source.showmanship_tumbling) {
      setShowmanshipTumbling(Math.min(tcfg.showmanshipMax, Math.max(tcfg.showmanshipMin, parseFloat(source.showmanship_tumbling as string))));
    }
    if (source.notes) {
      try {
        const p = JSON.parse(source.notes as string);
        setComments(p.comments ?? [p.standing, p.running, p.jumps].filter(Boolean).join('\n'));
        if (p._scores) {
          const s = p._scores;
          if (Array.isArray(s.standingExecDeds)) setStandingExecDeds(s.standingExecDeds);
          if (Array.isArray(s.runningExecDeds))  setRunningExecDeds(s.runningExecDeds);
          if (Array.isArray(s.jumpsExecDeds))    setJumpsExecDeds(s.jumpsExecDeds);
        }
        if (p.protest_started_at) {
          const elapsed = Date.now() - new Date(p.protest_started_at).getTime();
          if (elapsed >= 15 * 60 * 1000) setProtestExpired(true);
        }
      } catch {
        setComments(source.notes as string);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async () => {
    try {
      const [regRes, divRes] = await Promise.all([
        competitionsRepository.listRegistrations({ division__public_id: divisionId, page_size: '100' }),
        competitionsRepository.getDivision(divisionId),
      ]);

      const reg = regRes.data.results.find((r) => r.public_id === regId);
      if (reg) {
        setRegIntId(reg.id);
        setTeamName(reg.team_name);
        setAthleteCount(reg.athlete_count ?? null);
        setUnpaidAthletes(reg.unpaid_athletes);
        setRequirePayment(reg.competition_require_payment);
      }

      const sysConfig = getScoringConfig(divRes.data);
      const tcfg = sysConfig.tumbling;
      setTCfg(tcfg);
      setDivision(divRes.data);
      setCompetitionIntId(divRes.data.competition);

      // Config-based defaults
      if (tcfg.standingHasDiff && tcfg.standingRango.length > 0) setStandingRango(tcfg.standingRango[0].value);
      else setStandingRango(0);
      if (tcfg.runningHasDiff && tcfg.runningRango.length > 0) setRunningRango(tcfg.runningRango[0].value);
      else setRunningRango(0);
      if (tcfg.jumpsHasDiff && tcfg.jumpsDiffOpts.length > 0) setJumpsDiff(tcfg.jumpsDiffOpts[0].value);
      else setJumpsDiff(0);
      setCreativityTumbling(tcfg.creativityMin);
      setShowmanshipTumbling(tcfg.showmanshipMin);

      if (isJudgeRef.current) {
        // Judge: load from own JudgeScoreRecord (isolated per judge)
        const myAssignment = assignmentsRef.current.find(
          a => a.competition === divRes.data.competition && a.sheet_type === 'tumbling'
        );
        if (myAssignment) {
          const recordRes = await competitionsRepository.getMyJudgeScoreRecord(regId, myAssignment.id);
          const record = recordRes.data;
          setJudgeRecord(record);
          if (!reg) setTeamName('');
          populateFromScoreSource(record, tcfg);
        } else {
          // No assignment found: fall back to loading the shared ScoreSheet
          const sheetRes = await competitionsRepository.listScoreSheets({ registration__public_id: regId });
          if (sheetRes.data.results.length > 0) {
            const sheet = sheetRes.data.results[0];
            setExistingSheet(sheet);
            populateFromScoreSource(sheet, tcfg);
          }
        }
      } else {
        // Admin: load aggregated ScoreSheet for display
        const sheetRes = await competitionsRepository.listScoreSheets({ registration__public_id: regId });
        if (sheetRes.data.results.length > 0) {
          const sheet = sheetRes.data.results[0];
          setExistingSheet(sheet);
          if (!reg) setTeamName(sheet.team_name);
          populateFromScoreSource(sheet, tcfg);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [regId, divisionId, populateFromScoreSource]);

  useEffect(() => { load(); }, [load]);

  const athleteCountRef = useRef<number | null>(athleteCount);
  athleteCountRef.current = athleteCount;

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const regRes = await competitionsRepository.listRegistrations({ division__public_id: divisionId, page_size: '100' });
        const reg = regRes.data.results.find(r => r.public_id === regId);
        const fetched = reg?.athlete_count ?? null;
        if (fetched !== athleteCountRef.current) setAthleteCount(fetched);
      } catch { /* noop */ }
    }, 5000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [divisionId, regId]);

  useEffect(() => {
    const ch = new BroadcastChannel('cheer-metrics:athlete-count');
    ch.onmessage = (e: MessageEvent<{ registrationId: number; count: number | null }>) => {
      if (e.data.registrationId === regIntId && e.data.count != null)
        setAthleteCount(e.data.count);
    };
    return () => ch.close();
  }, [regId]);

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
            setComments(p.comments ?? [p.standing, p.running, p.jumps].filter(Boolean).join('\n'));
            const s = p._scores ?? {};
            if (Array.isArray(s.standingExecDeds)) setStandingExecDeds(s.standingExecDeds);
            if (Array.isArray(s.runningExecDeds))  setRunningExecDeds(s.runningExecDeds);
            if (Array.isArray(s.jumpsExecDeds))    setJumpsExecDeds(s.jumpsExecDeds);
          } catch { /* noop */ }
        }
        if (sheet.standing_difficulty != null) setStandingRango(parseFloat(sheet.standing_difficulty) || 0);
        if (sheet.standing_drivers    != null) setStandingHabilidad(parseFloat(sheet.standing_drivers) || 0);
        if (sheet.running_difficulty  != null) setRunningRango(parseFloat(sheet.running_difficulty) || 0);
        if (sheet.running_drivers     != null) setRunningHabilidad(parseFloat(sheet.running_drivers) || 0);
        if (sheet.jumps_difficulty    != null) setJumpsDiff(parseFloat(sheet.jumps_difficulty) || 0);
        if (sheet.creativity_tumbling  != null) setCreativityTumbling(parseFloat(sheet.creativity_tumbling)  || 0);
        if (sheet.showmanship_tumbling != null) setShowmanshipTumbling(parseFloat(sheet.showmanship_tumbling) || 0);
      } catch { /* noop */ }
    }, 5000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, loading, regId, tCfg]);

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

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async (silent = false) => {
    setSaving(true);
    try {
      const notesSource = judgeRecord?.notes ?? existingSheet?.notes ?? '{}';
      const scorePayload = {
        standing_difficulty:  String(tCfg.hasStanding ? standingDiffEff    : 0),
        standing_drivers:     String(tCfg.hasStanding ? standingHabEff     : 0),
        standing_execution:   String(tCfg.hasStanding ? standingExecTotal  : 0),
        running_difficulty:   String(tCfg.hasRunning  ? runningDiffEff     : 0),
        running_drivers:      String(tCfg.hasRunning  ? runningHabEff      : 0),
        running_execution:    String(tCfg.hasRunning  ? runningExecTotal   : 0),
        jumps_difficulty:     String(tCfg.hasJumps    ? jumpsDiffEff       : 0),
        jumps_execution:      String(tCfg.hasJumps    ? jumpsExecTotal     : 0),
        creativity_tumbling:  String(tCfg.hasCreativity ? creativityTumbling : 0),
        showmanship_tumbling: String(showmanshipTumbling),
        notes: (() => {
          let existing: Record<string, unknown> = {};
          try { existing = JSON.parse(notesSource); } catch { /* noop */ }
          const existingScores = (existing._scores as Record<string, unknown>) ?? {};
          return JSON.stringify({
            ...existing,
            comments,
            _scores: { ...existingScores, standingExecDeds, runningExecDeds, jumpsExecDeds },
          });
        })(),
      };

      if (judgeRecord) {
        const res = await competitionsRepository.updateJudgeScoreRecord(judgeRecord.id, scorePayload);
        setJudgeRecord(res.data);
      } else if (existingSheet) {
        const res = await competitionsRepository.updateScoreSheet(existingSheet.id, scorePayload as Partial<ScoreSheet>);
        setExistingSheet(res.data);
      } else {
        const res = await competitionsRepository.createScoreSheet({
          registration: regIntId!,
          ...scorePayload,
        } as Partial<ScoreSheet>);
        setExistingSheet(res.data);
      }
      if (!silent) toast.success('Planilla guardada');
    } catch (err) {
      if (!silent) toastApiError(err);
    } finally {
      setSaving(false);
    }
  };

  // Keep ref current so auto-save always calls the latest closure
  handleSaveRef.current = handleSave;

  // Auto-save 2 s after the last change (judge mode only)
  useEffect(() => {
    if (readOnly || !initialValuesSettled.current) return;
    const timer = setTimeout(() => { handleSaveRef.current(true); }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, standingRango, standingHabilidad, standingExecDeds, runningRango, runningHabilidad, runningExecDeds, jumpsDiff, jumpsExecDeds, creativityTumbling, showmanshipTumbling, comments]);

  // Save on unmount — covers browser-back button and swipe navigation
  useEffect(() => {
    return () => {
      if (readOnly || !initialValuesSettled.current) return;
      handleSaveRef.current(true);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <PageSpinner />;

  return (
    <div className="min-h-screen bg-zinc-50 pb-16">

      {/* ── Sticky top bar ─────────────────────────────────────────────── */}
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between gap-4 bg-white border-b border-zinc-200 px-6 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              if (!readOnly && initialValuesSettled.current) await handleSaveRef.current(true);
              router.push(`/competitions/${id}/divisions/${divisionId}`);
            }}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-400 font-medium">Planilla — Gimnasia (Tumbling)</p>
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
      <SkillReferencePanel skillLevel={division?.skill_level} sheetType="tumbling" />

      {!loading && (
        <TumblingSheetPrintView
          teamName={teamName || `Inscripción #${regId}`}
          divisionName={existingSheet?.division_name}
          organization={organization}
          tCfg={tCfg}
          standingRango={standingRango}
          standingHabilidad={standingHabilidad}
          standingExecDeds={standingExecDeds}
          standingNotes={comments}
          runningRango={runningRango}
          runningHabilidad={runningHabilidad}
          runningExecDeds={runningExecDeds}
          runningNotes=""
          jumpsDiff={jumpsDiff}
          jumpsExecDeds={jumpsExecDeds}
          jumpsNotes=""
          creativityTumbling={creativityTumbling}
          showmanshipTumbling={showmanshipTumbling}
          standingDiffEff={standingDiffEff}
          standingHabEff={standingHabEff}
          standingExecTotal={standingExecTotal}
          standingTotal={standingTotal}
          runningDiffEff={runningDiffEff}
          runningHabEff={runningHabEff}
          runningExecTotal={runningExecTotal}
          runningTotal={runningTotal}
          jumpsDiffEff={jumpsDiffEff}
          jumpsExecTotal={jumpsExecTotal}
          jumpsTotal={jumpsTotal}
          tumblingSubtotal={tumblingSubtotal}
          sheetTotal={sheetTotal}
        />
      )}

      <div className={`print:hidden max-w-6xl mx-auto px-6 py-8 flex flex-col gap-14${readOnly ? ' pointer-events-none select-none opacity-75' : ''}`}>

        {/* ── Gym construction table banner ────────────────────────────── */}
        {(() => {
          const sysForGym = (division?.scoring_system || division?.suggested_scoring_system) as string;
          const groups = athleteCount ? (sysForGym === 'prep' || sysForGym === 'escolar' ? getGymGroupsPrep(athleteCount) : getGymGroups(athleteCount)) : null;
          return (
            <div className={`rounded-xl border px-5 py-4 flex items-center justify-between gap-4 mb-6 ${
              groups ? 'border-zinc-200 bg-white' : 'border-dashed border-zinc-300 bg-zinc-50'
            }`}>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-0.5">
                  Tabla de cantidad en gimnasia/saltos
                </p>
                {groups ? (
                  <p className="text-xs text-zinc-500">
                    Basado en <span className="font-semibold text-zinc-800">{athleteCount} atletas</span> confirmados en backstage
                  </p>
                ) : (
                  <p className="text-xs text-zinc-400">
                    {athleteCount
                      ? `${athleteCount} atletas — fuera del rango de tabla (10–30)`
                      : 'Sin conteo de atletas — ingresa el número en la página de Backstage'}
                  </p>
                )}
              </div>
              {groups ? (
                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-center">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Mayoría</p>
                    <p className="text-3xl font-black tabular-nums text-zinc-900">{groups.mayoria}</p>
                    <p className="text-[9px] text-zinc-400">atletas</p>
                  </div>
                  <div className="text-center border-l border-zinc-200 pl-6">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Gran Parte</p>
                    <p className="text-3xl font-black tabular-nums text-zinc-900">{groups.gran_parte}</p>
                    <p className="text-[9px] text-zinc-400">atletas</p>
                  </div>
                </div>
              ) : (
                <span className="text-xs text-zinc-300 italic shrink-0">—</span>
              )}
            </div>
          );
        })()}

        {/* ── Skill reference panel ────────────────────────────────────── */}

        {/* ── GIMNASIA ESTÁTICA ────────────────────────────────────────── */}
        {tCfg.hasStanding && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-700">
                {tCfg.isCombinedSR ? 'Gimnasia — Estática / Con Carrera (Combinadas)' : 'Gimnasia Estática (Standing)'}
              </h2>
              <InfoButton title="Gimnasia Estática — Reglas" size="lg">
                <div className="space-y-3 text-sm">
                  <p className="text-zinc-600">Evalúa habilidades de tumbling realizadas sin carrera previa (standing tumbling). Se valora la dificultad de las habilidades ejecutadas y la calidad técnica de su ejecución.</p>
                  <ul className="space-y-1.5 text-xs text-zinc-600">
                    <li className="flex items-start gap-2"><span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" /><span><strong>Rango Base:</strong> Nivel de complejidad general de las habilidades realizadas por mayoría del equipo.</span></li>
                    <li className="flex items-start gap-2"><span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" /><span><strong>Habilidad:</strong> Bonus por la habilidad de mayor dificultad ejecutada por gran parte del equipo.</span></li>
                    <li className="flex items-start gap-2"><span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" /><span><strong>Ejecución:</strong> Calidad técnica — aproximación, control corporal, aterrizajes y sincronización.</span></li>
                  </ul>
                </div>
              </InfoButton>
            </div>
            <div className="grid grid-cols-2 gap-5 items-start">
              {tCfg.standingHasDiff ? (
                <TumblingDiffCard
                  label="Estática"
                  rangoOpts={tCfg.standingRango}
                  habilidadOpts={tCfg.standingHabilidad}
                  rango={standingRango} onRango={setStandingRango}
                  habilidad={standingHabilidad} onHabilidad={setStandingHabilidad}
                />
              ) : (
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-6 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Sin Dificultad</p>
                    <p className="text-sm text-zinc-400 mt-1">Solo Ejecución para esta División</p>
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-4">
                <ExecSection
                  label="Gimnasia Estática"
                  max={tCfg.standingExecMax}
                  categories={STANDING_EXEC_CATS}
                  deds={standingExecDeds}
                  onChange={setStandingExecDeds}
                  info={<TumblingExecInfoContent cats={STANDING_EXEC_CATS} dedOpts={tCfg.execDedOpts} />}
                  dedOpts={tCfg.execDedOpts}
                />
                <SectionTotal
                  label="Total Estática"
                  breakdown={
                    tCfg.standingHasDiff
                      ? [
                          { key: 'Base', value: standingDiffEff },
                          { key: 'Hab',  value: standingHabEff  },
                          { key: 'Ejec', value: standingExecTotal },
                        ]
                      : [{ key: 'Ejec', value: standingExecTotal }]
                  }
                  total={standingTotal}
                />
              </div>
            </div>
          </section>
        )}

        {/* ── GIMNASIA CON CARRERA ─────────────────────────────────────── */}
        {tCfg.hasRunning && (
          <section className="flex flex-col gap-3 mt-6">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-700">Gimnasia con Carrera (Running)</h2>
              <InfoButton title="Gimnasia con Carrera — Reglas" size="lg">
                <div className="space-y-3 text-sm">
                  <p className="text-zinc-600">Evalúa habilidades de tumbling ejecutadas con carrera previa (running tumbling). Se considera la dificultad del paso de carrera y las habilidades enlazadas.</p>
                  <ul className="space-y-1.5 text-xs text-zinc-600">
                    <li className="flex items-start gap-2"><span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" /><span><strong>Rango Base:</strong> Nivel de complejidad de las series con carrera realizadas por mayoría del equipo.</span></li>
                    <li className="flex items-start gap-2"><span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" /><span><strong>Habilidad:</strong> Bonus por la serie de mayor dificultad ejecutada por gran parte del equipo.</span></li>
                    <li className="flex items-start gap-2"><span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" /><span><strong>Ejecución:</strong> Calidad técnica — aproximación, control corporal, aterrizajes y sincronización.</span></li>
                  </ul>
                </div>
              </InfoButton>
            </div>
            <div className="grid grid-cols-2 gap-5 items-start">
              {tCfg.runningHasDiff ? (
                <TumblingDiffCard
                  label="Con Carrera"
                  rangoOpts={tCfg.runningRango}
                  habilidadOpts={tCfg.runningHabilidad}
                  rango={runningRango} onRango={setRunningRango}
                  habilidad={runningHabilidad} onHabilidad={setRunningHabilidad}
                />
              ) : (
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-6 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Sin Dificultad</p>
                    <p className="text-sm text-zinc-400 mt-1">Solo Ejecución para esta División</p>
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-4">
                <ExecSection
                  label="Gimnasia con Carrera"
                  max={tCfg.runningExecMax}
                  categories={RUNNING_EXEC_CATS}
                  deds={runningExecDeds}
                  onChange={setRunningExecDeds}
                  info={<TumblingExecInfoContent cats={RUNNING_EXEC_CATS} dedOpts={tCfg.execDedOpts} />}
                  dedOpts={tCfg.execDedOpts}
                />
                <SectionTotal
                  label="Total Carrera"
                  breakdown={
                    tCfg.runningHasDiff
                      ? [
                          { key: 'Base', value: runningDiffEff },
                          { key: 'Hab',  value: runningHabEff  },
                          { key: 'Ejec', value: runningExecTotal },
                        ]
                      : [{ key: 'Ejec', value: runningExecTotal }]
                  }
                  total={runningTotal}
                />
              </div>
            </div>
          </section>
        )}

        {/* ── SALTOS ───────────────────────────────────────────────────── */}
        {tCfg.hasJumps && (
          <section className="flex flex-col gap-3 mt-6">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-700">Saltos (Jumps)</h2>
              <InfoButton title="Saltos — Reglas" size="lg">
                <div className="space-y-3 text-sm">
                  <p className="text-zinc-600">Evalúa la calidad y dificultad de los saltos realizados por el equipo. Se considera la técnica de brazos, la extensión de piernas y la sincronización grupal.</p>
                  <ul className="space-y-1.5 text-xs text-zinc-600">
                    <li className="flex items-start gap-2"><span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" /><span><strong>P. Brazos:</strong> Posición y técnica de brazos durante el salto — elevación, ángulo y limpieza.</span></li>
                    <li className="flex items-start gap-2"><span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" /><span><strong>P. Piernas:</strong> Posición y técnica de piernas — extensión completa, ángulo de apertura y control.</span></li>
                    <li className="flex items-start gap-2"><span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" /><span><strong>Sinc:</strong> Sincronización del equipo al ejecutar los saltos simultáneamente.</span></li>
                  </ul>
                </div>
              </InfoButton>
            </div>
            <div className="grid grid-cols-2 gap-5 items-start">
              {tCfg.jumpsHasDiff && tCfg.jumpsDiffOpts.length > 0 ? (
                <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                  <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                    <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Dificultad — Saltos Avanzados</span>
                  </div>
                  <div className="p-4 flex flex-col gap-1.5">
                    {tCfg.jumpsDiffOpts.map(({ label: lbl, value }) => (
                      <button key={value} type="button" onClick={() => setJumpsDiff(value)}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors border text-left ${
                          jumpsDiff === value ? 'border-transparent' : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-600 hover:bg-zinc-50'
                        }`}
                        style={jumpsDiff === value ? { backgroundColor: '#2563eb', color: '#ffffff', borderColor: '#2563eb' } : undefined}>
                        <span className={`w-8 text-center rounded font-bold tabular-nums text-xs ${jumpsDiff === value ? 'text-zinc-300' : 'text-zinc-400'}`}>
                          {value.toFixed(1)}
                        </span>
                        <span className="flex-1">{lbl}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-6 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Sin Dificultad</p>
                    <p className="text-sm text-zinc-400 mt-1">Solo Ejecución para esta División</p>
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-4">
                <ExecSection label="Saltos" max={tCfg.jumpsExecMax} categories={JUMPS_EXEC_CATS} deds={jumpsExecDeds} onChange={setJumpsExecDeds} info={<TumblingExecInfoContent cats={JUMPS_EXEC_CATS} dedOpts={tCfg.execDedOpts} />} dedOpts={tCfg.execDedOpts} />
                <SectionTotal
                  label="Total Saltos"
                  breakdown={
                    tCfg.jumpsHasDiff
                      ? [{ key: 'Dif', value: jumpsDiffEff }, { key: 'Ejec', value: jumpsExecTotal }]
                      : [{ key: 'Ejec', value: jumpsExecTotal }]
                  }
                  total={jumpsTotal}
                />
              </div>
            </div>
          </section>
        )}

        {/* ── TUMBLING SUBTOTAL ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between rounded-xl px-5 py-4 shadow-sm mb-6 bg-zinc-800 text-white">
          <span className="text-sm font-semibold uppercase tracking-wide">Subtotal Gimnasia</span>
          <span className="text-2xl font-bold tabular-nums">{fmt(tumblingSubtotal)}</span>
        </div>

        {/* ── CREATIVITY + SHOWMANSHIP ─────────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-700">
                {tCfg.hasCreativity ? 'Creatividad & Showmanship' : 'Cheer / Animación'}
              </h2>
              <InfoButton title="Creatividad & Showmanship — Reglas" size="lg">
                <div className="space-y-3 text-sm">
                  <p className="text-zinc-600">Estos puntajes son asignados individualmente por cada juez y se <strong>promedian</strong> entre los tres jueces de gimnasia para obtener el valor final.</p>
                  <ul className="space-y-1.5 text-xs text-zinc-600">
                    <li className="flex items-start gap-2"><span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" /><span><strong>Creatividad</strong> ({fmt(tCfg.creativityMin)} – {fmt(tCfg.creativityMax)}): Incorporación de patrones de gimnasia visuales claros que mejoren las habilidades realizadas.</span></li>
                    <li className="flex items-start gap-2"><span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" /><span><strong>Showmanship</strong> ({fmt(tCfg.showmanshipMin)} – {fmt(tCfg.showmanshipMax)}): Confianza, limpieza y conexión emocional durante la ejecución de las habilidades de gimnasia.</span></li>
                  </ul>
                </div>
              </InfoButton>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">Puntuado por este juez — se promedia con los otros dos jueces</p>
          </div>

          <div className={`grid gap-4 ${tCfg.hasCreativity ? 'grid-cols-2' : 'grid-cols-1 max-w-md'}`}>
            {/* Creativity (hidden for escolar_ab) */}
            {tCfg.hasCreativity && (
              <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                  <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Creatividad</span>
                  <span className="text-lg font-bold tabular-nums text-zinc-900">{fmt(creativityTumbling)}</span>
                </div>
                <div className="p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={String(tCfg.creativityMin)}
                      max={String(tCfg.creativityMax)}
                      step="0.1"
                      value={creativityTumbling}
                      onChange={(e) => setCreativityTumbling(parseFloat(e.target.value))}
                      className="flex-1 accent-zinc-900"
                    />
                    <input
                      type="number"
                      min={String(tCfg.creativityMin)}
                      max={String(tCfg.creativityMax)}
                      step="0.1"
                      value={creativityTumbling}
                      onChange={(e) => {
                        const v = Math.min(tCfg.creativityMax, Math.max(tCfg.creativityMin, parseFloat(e.target.value) || tCfg.creativityMin));
                        setCreativityTumbling(parseFloat(v.toFixed(2)));
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
                  {tCfg.hasCreativity ? 'Showmanship' : 'Cheer / Animación'}
                </span>
                <span className="text-lg font-bold tabular-nums text-zinc-900">{fmt(showmanshipTumbling)}</span>
              </div>
              <div className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={String(tCfg.showmanshipMin)}
                    max={tCfg.showmanshipMax}
                    step="0.1"
                    value={showmanshipTumbling}
                    onChange={(e) => setShowmanshipTumbling(parseFloat(e.target.value))}
                    className="flex-1 accent-zinc-900"
                  />
                  <input
                    type="number"
                    min={String(tCfg.showmanshipMin)}
                    max={tCfg.showmanshipMax}
                    step="0.1"
                    value={showmanshipTumbling}
                    onChange={(e) => {
                      const v = Math.min(tCfg.showmanshipMax, Math.max(tCfg.showmanshipMin, parseFloat(e.target.value) || tCfg.showmanshipMin));
                      setShowmanshipTumbling(parseFloat(v.toFixed(2)));
                    }}
                    className="w-16 h-9 rounded-lg border border-zinc-300 px-2 text-center text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
                <p className="text-[11px] text-zinc-400 leading-snug">
                  {tCfg.hasCreativity
                    ? 'Confianza, Limpieza y Conexión durante la rutina (Habilidades de Gimnasia)'
                    : 'Cheer / Animación — máx 5.0 (se promedia con los otros dos jueces)'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── COMMENTS ─────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
            <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Comentarios</span>
          </div>
          <div className="p-4">
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Comentarios de la rutina..."
              rows={5}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>
        </div>

        {/* ── GRAND TOTAL ───────────────────────────────────────────────── */}
        <div className="rounded-xl px-6 py-5 flex items-center justify-between shadow-lg bg-zinc-800 text-white">
          <div>
            <p className="text-base uppercase tracking-wide font-bold">Total Planilla Tumbling</p>
            <p className="text-xs opacity-70 mt-0.5">
              {tCfg.hasCreativity
                ? `Gimnasia + Creatividad (${fmt(creativityTumbling)}) + Showmanship (${fmt(showmanshipTumbling)})`
                : `Gimnasia + Cheer/Animación (${fmt(showmanshipTumbling)})`}
            </p>
          </div>
          <span className="text-4xl font-bold tabular-nums">{fmt(sheetTotal)}</span>
        </div>

        {/* ── Score summary table ───────────────────────────────────────── */}
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden text-sm">
          <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
            <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Resumen de puntajes</span>
          </div>
          <table className="w-full">
            <tbody className="divide-y divide-zinc-100">
              {tCfg.hasStanding && tCfg.standingHasDiff && (
                <>
                  <tr>
                    <td className="px-4 py-2.5 text-zinc-600">Estática — Rango Base</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap">
                      <span className="font-semibold">{fmt(standingDiffEff)}</span>
                      <span className="text-zinc-400 font-normal"> / {fmt(maxStandingRango)}</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-zinc-600">Estática — Habilidad</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap">
                      <span className="font-semibold">{fmt(standingHabEff)}</span>
                      <span className="text-zinc-400 font-normal"> / {fmt(maxStandingHab)}</span>
                    </td>
                  </tr>
                </>
              )}
              {tCfg.hasStanding && (
                <tr>
                  <td className="px-4 py-2.5 text-zinc-600">Estática — Ejecución</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap">
                    <span className="font-semibold">{fmt(standingExecTotal)}</span>
                    <span className="text-zinc-400 font-normal"> / {fmt(tCfg.standingExecMax)}</span>
                  </td>
                </tr>
              )}
              {tCfg.hasRunning && tCfg.runningHasDiff && (
                <>
                  <tr>
                    <td className="px-4 py-2.5 text-zinc-600">Con Carrera — Rango Base</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap">
                      <span className="font-semibold">{fmt(runningDiffEff)}</span>
                      <span className="text-zinc-400 font-normal"> / {fmt(maxRunningRango)}</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-zinc-600">Con Carrera — Habilidad</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap">
                      <span className="font-semibold">{fmt(runningHabEff)}</span>
                      <span className="text-zinc-400 font-normal"> / {fmt(maxRunningHab)}</span>
                    </td>
                  </tr>
                </>
              )}
              {tCfg.hasRunning && (
                <tr>
                  <td className="px-4 py-2.5 text-zinc-600">Con Carrera — Ejecución</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap">
                    <span className="font-semibold">{fmt(runningExecTotal)}</span>
                    <span className="text-zinc-400 font-normal"> / {fmt(tCfg.runningExecMax)}</span>
                  </td>
                </tr>
              )}
              {tCfg.hasJumps && tCfg.jumpsHasDiff && (
                <tr>
                  <td className="px-4 py-2.5 text-zinc-600">Saltos — Dificultad</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap">
                    <span className="font-semibold">{fmt(jumpsDiffEff)}</span>
                    <span className="text-zinc-400 font-normal"> / {fmt(maxJumpsDiff)}</span>
                  </td>
                </tr>
              )}
              {tCfg.hasJumps && (
                <tr>
                  <td className="px-4 py-2.5 text-zinc-600">Saltos — Ejecución</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap">
                    <span className="font-semibold">{fmt(jumpsExecTotal)}</span>
                    <span className="text-zinc-400 font-normal"> / {fmt(tCfg.jumpsExecMax)}</span>
                  </td>
                </tr>
              )}
              <tr className="bg-zinc-50">
                <td className="px-4 py-2.5 font-semibold text-zinc-700">Subtotal Gimnasia</td>
                <td className="px-4 py-2.5 text-right font-bold tabular-nums text-zinc-700">{fmt(tumblingSubtotal)}</td>
              </tr>
              {tCfg.hasCreativity && (
                <tr>
                  <td className="px-4 py-2.5 text-zinc-600">Creatividad (este juez)</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap">
                    <span className="font-semibold">{fmt(creativityTumbling)}</span>
                    <span className="text-zinc-400 font-normal"> / 2.00</span>
                  </td>
                </tr>
              )}
              <tr>
                <td className="px-4 py-2.5 text-zinc-600">
                  {tCfg.hasCreativity ? 'Showmanship (este juez)' : 'Cheer / Animación (este juez)'}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap">
                  <span className="font-semibold">{fmt(showmanshipTumbling)}</span>
                  <span className="text-zinc-400 font-normal"> / {fmt(tCfg.showmanshipMax)}</span>
                </td>
              </tr>
              <tr className="bg-zinc-800">
                <td className="px-4 py-2.5 font-bold text-white">TOTAL</td>
                <td className="px-4 py-2.5 text-right font-bold tabular-nums text-lg text-white">{fmt(sheetTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
