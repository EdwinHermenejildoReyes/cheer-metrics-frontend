'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Eye, Lock, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageSpinner } from '@/components/ui/spinner';
import { PrintButton } from '@/components/print/PrintButton';
import { BuildingSheetPrintView } from '@/components/print/BuildingSheetPrintView';
import competitionsRepository from '@/repositories/competitionsRepository';
import { getScoringConfig, DEFAULT_BUILDING_CONFIG } from '@/lib/scoringConfig';
import { getConstructionGroups } from '@/lib/constructionTable';
import { useJudge } from '@/hooks/useJudge';
import { useBranding } from '@/contexts/BrandingContext';
import { toastApiError } from '@/utils/apiErrors';
import type { BuildingConfig } from '@/lib/scoringConfig';
import type { Division, DivisionCategory, Registration, ScoreSheet, UnpaidAthlete } from '@/types/competitions';
import { PaymentWarningBanner } from '@/components/competitions/PaymentWarningBanner';
import { SkillReferencePanel } from '@/components/skill-tables/SkillReferencePanel';
import type { BuildingPrintData } from '@/components/print/BuildingSheetPrintView';
import { InfoButton } from '@/components/ui/InfoButton';

// ── Execution categories (same for all scoring systems) ──────────────────────
const EXEC_CATS      = ['Flyer', 'Base/Spotter', 'Transición', 'Sincronización'];
const TOSS_EXEC_CATS = ['Flyer', 'Base/Spotter', 'Altura'];
const EXEC_DED_OPTS   = [0.05, 0.10, 0.20, 0.30];
const EXEC_DED_LABELS = ['Mínimos', 'Menores', 'Múltiples', 'Generalizados'];

// ── Execution deduction rules info content ────────────────────────────────────
function ExecInfoContent({ cats, note }: { cats: string[]; note?: string }) {
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
            {[
              { label: 'Mínimos', amt: '−0.05', desc: 'Errores leves, casi imperceptibles; no afectan el conjunto' },
              { label: 'Menores', amt: '−0.10', desc: 'Errores claramente visibles pero controlados y aislados' },
              { label: 'Múltiples', amt: '−0.20', desc: 'Errores frecuentes o repetidos en varias ejecuciones' },
              { label: 'Generalizados', amt: '−0.30', desc: 'Errores graves o falta de control notoria en la categoría' },
            ].map(({ label, amt, desc }) => (
              <tr key={label} className="even:bg-zinc-50">
                <td className="px-3 py-1.5 border border-zinc-200 font-medium">{label}</td>
                <td className="px-3 py-1.5 border border-zinc-200 text-center text-red-600 font-semibold tabular-nums">{amt}</td>
                <td className="px-3 py-1.5 border border-zinc-200 text-zinc-500">{desc}</td>
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
              <span><strong>{cat}:</strong> {CAT_DESCRIPTIONS[cat] ?? 'Calidad técnica de ejecución en esta categoría.'}</span>
            </li>
          ))}
        </ul>
      </div>
      {note && <p className="text-xs text-zinc-400 leading-relaxed border-t border-zinc-100 pt-3">{note}</p>}
    </div>
  );
}

const CAT_DESCRIPTIONS: Record<string, string> = {
  'Flyer': 'Posición corporal, rigidez, extensión y control del cuerpo durante la habilidad.',
  'Base/Spotter': 'Técnica de sujeción, estabilidad, posición y coordinación de los bases y spotter.',
  'Transición': 'Limpieza, control y fluidez al entrar y salir de cada habilidad.',
  'Sincronización': 'Coordinación y tiempo entre los diferentes grupos o stunts del equipo.',
  'Altura': 'Alcance del pico máximo, limpieza en la subida y técnica durante el lanzamiento.',
};

// ── Helpers ──────────────────────────────────────────────────────────────────
type ExecDeds = (number | null)[];
const EMPTY_EXEC: ExecDeds = [null, null, null, null];

function execScore(max: number, deds: ExecDeds): number {
  const sum = deds.reduce<number>((s, d) => s + (d ?? 0), 0);
  return parseFloat(Math.max(0, max - sum).toFixed(2));
}

function fmt(n: number) {
  return n.toFixed(2);
}

// ── "No Aplica" placeholder ───────────────────────────────────────────────────
function NoAplicaBadge({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-6 text-center col-span-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">{label}</p>
    </div>
  );
}

// ── Execution sub-component ──────────────────────────────────────────────────
function ExecSection({
  label, max, deds, onChange, cats = EXEC_CATS, info, dedOpts,
}: {
  label: string;
  max: number;
  deds: ExecDeds;
  onChange: (deds: ExecDeds) => void;
  cats?: string[];
  info?: React.ReactNode;
  dedOpts?: number[];
}) {
  const opts = dedOpts ?? EXEC_DED_OPTS;
  const score = execScore(max, deds);
  const totalDed = deds.reduce<number>((s, d) => s + (d ?? 0), 0);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">{label} — Ejecución</span>
            {info && (
              <InfoButton title={`Ejecución — ${label}`} size="lg">{info}</InfoButton>
            )}
          </div>
          <span className="text-sm font-semibold tabular-nums text-zinc-600">Máx: {fmt(max)}</span>
        </div>
        <p className="text-[10px] text-zinc-400 mt-0.5">Se Descuenta por Cantidad, Frecuencia y/o Gravedad de Errores</p>
      </div>

      <div className="divide-y divide-zinc-100">
        {cats.map((cat, i) => (
          <div key={cat} className="flex items-center gap-3 px-4 py-2.5">
            <span className="w-28 shrink-0 text-sm text-zinc-700">{cat}</span>
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
        <span className="text-xs text-zinc-400">
          Descuentos: −{fmt(totalDed)}
        </span>
        <span className={`text-lg font-bold tabular-nums ${totalDed > 0 ? 'text-red-700' : 'text-zinc-900'}`}>
          {fmt(score)}
        </span>
      </div>
    </div>
  );
}

// ── Scored total pill ────────────────────────────────────────────────────────
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

// ── Page ─────────────────────────────────────────────────────────────────────
export default function BuildingSheetPage() {
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

  const [teamName,      setTeamName]      = useState<string>('');
  const [existingSheet, setExistingSheet] = useState<ScoreSheet | null>(null);
  const [division,      setDivision]      = useState<Division | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [bCfg,          setBCfg]          = useState<BuildingConfig>(DEFAULT_BUILDING_CONFIG);
  const [athleteCount,  setAthleteCount]  = useState<number | null>(null);
  const [unpaidAthletes,  setUnpaidAthletes]  = useState<UnpaidAthlete[]>([]);
  const [requirePayment,  setRequirePayment]  = useState(false);
  const [localCountStr,   setLocalCountStr]   = useState('');
  const [savingCount,     setSavingCount]     = useState(false);
  const [editingCount,    setEditingCount]    = useState(false);
  const [maleCountStr,    setMaleCountStr]    = useState('');
  const [maleCountEditable, setMaleCountEditable] = useState(true);

  // ── Stunts – difficulty ───────────────────────────────────────────────────
  const [stuntsRango,    setStuntsRango]    = useState<number>(0);
  const [stuntsSkills,   setStuntsSkills]   = useState<(number | null)[]>([null, null, null, null, null]);
  const [stuntsPartMax,  setStuntsPartMax]  = useState<number | null>(null);
  const [stuntsExecDeds, setStuntsExecDeds] = useState<ExecDeds>([...EMPTY_EXEC]);

  // ── Pyramids ──────────────────────────────────────────────────────────────
  const [pyramidsRangeIdx,  setPyramidsRangeIdx]  = useState<number | null>(null);
  const [pyramidsFine,      setPyramidsFine]      = useState<number>(0.0);
  const [pyramidsExecDeds, setPyramidsExecDeds] = useState<ExecDeds>([...EMPTY_EXEC]);
  const [pyramidsDrivers,   setPyramidsDrivers]   = useState<number>(0.0);

  // ── Tosses ────────────────────────────────────────────────────────────────
  const [tossesDiff,    setTossesDiff]    = useState<number>(0.0);
  const [tossesExecDeds, setTossesExecDeds] = useState<ExecDeds>([null, null, null]);

  // ── Cross-sheet ───────────────────────────────────────────────────────────
  const [creativityBuilding,  setCreativityBuilding]  = useState<number>(1.5);
  const [showmanshipBuilding, setShowmanshipBuilding] = useState<number>(1.0);

  const [comments, setComments] = useState('');

  // ── Computed totals ───────────────────────────────────────────────────────
  const stuntsSkillsTotal  = parseFloat(stuntsSkills.reduce<number>((s, v) => s + (v ?? 0), 0).toFixed(2));
  const stuntsDriversTotal = parseFloat((stuntsSkillsTotal + (stuntsPartMax ?? 0)).toFixed(2));
  const stuntsExecTotal    = execScore(bCfg.stuntsExecMax, stuntsExecDeds);
  const stuntsSectionTotal  = parseFloat((stuntsRango + stuntsExecTotal + stuntsDriversTotal).toFixed(2));

  const pyramidsDiff = pyramidsRangeIdx !== null
    ? parseFloat((bCfg.pyramidRango[pyramidsRangeIdx].low + pyramidsFine).toFixed(1))
    : 0.0;
  const pyramidsExecTotal   = execScore(bCfg.pyramidsExecMax, pyramidsExecDeds);
  const pyramidsSectionTotal = parseFloat((pyramidsDiff + pyramidsExecTotal + pyramidsDrivers).toFixed(2));

  const tossesExecTotal   = execScore(bCfg.tossesExecMax, tossesExecDeds);
  const tossesSectionTotal = bCfg.hasTosses
    ? parseFloat((tossesDiff + tossesExecTotal).toFixed(2))
    : 0.0;

  const buildingTotal = parseFloat((stuntsSectionTotal + pyramidsSectionTotal + tossesSectionTotal).toFixed(2));
  const sheetTotal    = parseFloat((buildingTotal + creativityBuilding + showmanshipBuilding).toFixed(2));

  // ── Max values from config (for summary table) ────────────────────────────
  const maxStuntsRango     = bCfg.stuntsRango.length > 0 ? Math.max(...bCfg.stuntsRango.map(r => r.value)) : 0;
  const maxStuntsSkills    = bCfg.stuntsSkillCount > 0 && bCfg.stuntsSkillGrades.length > 0
    ? bCfg.stuntsSkillCount * Math.max(...bCfg.stuntsSkillGrades.map(g => g.value)) : 0;
  const maxStuntsPartMax   = bCfg.stuntsPartMaxOpts.length > 0 ? Math.max(...bCfg.stuntsPartMaxOpts.map(o => o.value)) : 0;
  const maxStuntsDrivers   = parseFloat((maxStuntsSkills + maxStuntsPartMax).toFixed(2));
  const maxPyramidsDiff    = bCfg.pyramidRango.length > 0
    ? parseFloat((bCfg.pyramidRango[bCfg.pyramidRango.length - 1].low +
        (bCfg.pyramidFineSteps.length > 0 ? Math.max(...bCfg.pyramidFineSteps) : 0)).toFixed(1)) : 0;
  const maxPyramidsDrivers = bCfg.pyramidDriversOpts.length > 0 ? Math.max(...bCfg.pyramidDriversOpts.map(o => o.value)) : 0;
  const maxTossesDiff      = bCfg.tossDiffOpts.length > 0 ? Math.max(...bCfg.tossDiffOpts.map(o => o.value)) : 0;

  // ── Derived from config ───────────────────────────────────────────────────
  const category = division?.category as DivisionCategory | undefined;
  const isCoed = category === 'coed';
  const activeStuntsRango =
    (category && bCfg.stuntsRangoByCategory?.[category]) ?? bCfg.stuntsRango;

  const stuntSkillLabels = Array.from(
    { length: bCfg.stuntsSkillCount },
    (_, i) => i === 4 && isCoed ? 'Habilidad #5 / Coed' : `Habilidad #${i + 1}`
  );

  // Derive how many skill slots are active from the selected rango option's skillCount.
  // Falls back to stuntsSkillCount (all slots) when skillCount is not defined.
  const activeStuntsRangoOpt = activeStuntsRango.find(r => r.value === stuntsRango);
  const activeSkillCount = activeStuntsRangoOpt?.skillCount ?? bCfg.stuntsSkillCount;

  // Reset all skill grades whenever the rango changes.
  useEffect(() => {
    setStuntsSkills(Array(bCfg.stuntsSkillCount).fill(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stuntsRango]);

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const [sheetRes, regRes, divRes] = await Promise.all([
        competitionsRepository.listScoreSheets({ registration__public_id: regId }),
        competitionsRepository.listRegistrations({ division__public_id: divisionId, page_size: '100' }),
        competitionsRepository.getDivision(divisionId),
      ]);

      const reg = regRes.data.results.find((r) => r.public_id === regId);
      if (reg) {
        setRegIntId(reg.id);
        setTeamName(reg.team_name);
        setAthleteCount(reg.athlete_count ?? null);
        setLocalCountStr(reg.athlete_count != null ? String(reg.athlete_count) : '');
        setEditingCount(reg.athlete_count == null);
        setMaleCountStr(reg.male_athlete_count != null ? String(reg.male_athlete_count) : '');
        setMaleCountEditable(reg.male_athlete_count == null);
        setUnpaidAthletes(reg.unpaid_athletes);
        setRequirePayment(reg.competition_require_payment);
      }

      const sysConfig = getScoringConfig(divRes.data);
      const cfg = sysConfig.building;
      setBCfg(cfg);
      setDivision(divRes.data);
      setCompetitionIntId(divRes.data.competition);

      // Set config-based defaults
      if (cfg.stuntsHasDiff && cfg.stuntsRango.length > 0) {
        setStuntsRango(cfg.stuntsRango[0].value);
      } else {
        setStuntsRango(0);
      }

      if (sheetRes.data.results.length > 0) {
        const sheet = sheetRes.data.results[0];
        setExistingSheet(sheet);
        if (!reg) setTeamName(sheet.team_name);

        if (sheet.stunts_difficulty) {
          const v = parseFloat(sheet.stunts_difficulty);
          if (cfg.stuntsRango.some(r => r.value === v)) setStuntsRango(v);
        }
        if (sheet.pyramids_difficulty) {
          const v = parseFloat(sheet.pyramids_difficulty);
          const idx = cfg.pyramidRango.findIndex(r => v >= r.low && v <= r.high);
          if (idx >= 0) {
            setPyramidsRangeIdx(idx);
            setPyramidsFine(parseFloat((v - cfg.pyramidRango[idx].low).toFixed(1)));
          }
        }
        if (sheet.tosses_difficulty) {
          const v = parseFloat(sheet.tosses_difficulty);
          setTossesDiff(cfg.tossDiffOpts.some(o => o.value === v) ? v : 0.0);
        }
        if (sheet.pyramids_drivers) {
          const v = parseFloat(sheet.pyramids_drivers);
          if (cfg.pyramidDriversOpts.some(o => o.value === v)) setPyramidsDrivers(v);
        }
        if (sheet.creativity_building) {
          setCreativityBuilding(Math.min(cfg.creativityMax, Math.max(cfg.creativityMin, parseFloat(sheet.creativity_building))));
        }
        if (sheet.showmanship_building) {
          setShowmanshipBuilding(Math.min(cfg.showmanshipMax, Math.max(cfg.showmanshipMin, parseFloat(sheet.showmanship_building))));
        }
        if (sheet.notes) {
          try {
            const parsed = JSON.parse(sheet.notes);
            if (parsed._scores) {
              const s = parsed._scores;
              if (s.stuntsRango !== undefined && cfg.stuntsRango.some(r => r.value === s.stuntsRango)) setStuntsRango(s.stuntsRango);
              if (Array.isArray(s.stuntsSkills)) {
                setStuntsSkills(Array(5).fill(null).map((_, i) => s.stuntsSkills[i] ?? null));
              }
              if (s.stuntsPartMax !== undefined && s.stuntsPartMax !== null && cfg.stuntsPartMaxOpts.some(o => o.value === s.stuntsPartMax)) setStuntsPartMax(s.stuntsPartMax);
              if (Array.isArray(s.stuntsExecDeds))   setStuntsExecDeds(s.stuntsExecDeds);
              if (Array.isArray(s.pyramidsExecDeds))  setPyramidsExecDeds(s.pyramidsExecDeds);
              if (Array.isArray(s.tossesExecDeds))    setTossesExecDeds(s.tossesExecDeds);
              if (s.pyramidsRangeIdx !== undefined)   setPyramidsRangeIdx(s.pyramidsRangeIdx);
              if (s.pyramidsFine !== undefined)        setPyramidsFine(s.pyramidsFine);
            } else if (sheet.stunts_drivers) {
              const v = parseFloat(sheet.stunts_drivers);
              if (cfg.stuntsPartMaxOpts.some(o => o.value === v)) setStuntsPartMax(v);
            }
            setComments(parsed.comments ?? [parsed.stunts, parsed.pyramids, parsed.tosses].filter(Boolean).join('\n'));
            if (parsed.protest_started_at) {
              const elapsed = Date.now() - new Date(parsed.protest_started_at).getTime();
              if (elapsed >= 15 * 60 * 1000) setProtestExpired(true);
            }
          } catch {
            setComments(sheet.notes);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  }, [regId, divisionId]);

  useEffect(() => { load(); }, [load]);

  // Refs always reflect latest values without being closure dependencies
  const athleteCountRef  = useRef<number | null>(athleteCount);
  const editingCountRef  = useRef(editingCount);
  athleteCountRef.current = athleteCount;
  editingCountRef.current = editingCount;

  // Poll every 5s; updates when the server value differs and the judge isn't actively editing
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const regRes = await competitionsRepository.listRegistrations({ division__public_id: divisionId, page_size: '100' });
        const reg = regRes.data.results.find(r => r.public_id === regId);
        const fetched = reg?.athlete_count ?? null;
        if (fetched !== athleteCountRef.current && !editingCountRef.current) {
          setAthleteCount(fetched);
          if (fetched != null) { setLocalCountStr(String(fetched)); setEditingCount(false); }
        }
      } catch { /* noop */ }
    }, 5000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [divisionId, regId]);

  // Real-time cross-tab updates via BroadcastChannel (same browser, non-incognito tabs only)
  useEffect(() => {
    const ch = new BroadcastChannel('cheer-metrics:athlete-count');
    ch.onmessage = (e: MessageEvent<{ registrationId: number; count: number | null }>) => {
      if (e.data.registrationId === regIntId && e.data.count != null) {
        setAthleteCount(e.data.count);
        setLocalCountStr(String(e.data.count));
      }
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
            setComments(p.comments ?? [p.stunts, p.pyramids, p.tosses].filter(Boolean).join('\n'));
            const s = p._scores ?? {};
            if (s.stuntsRango       != null) setStuntsRango(s.stuntsRango);
            if (Array.isArray(s.stuntsSkills))    setStuntsSkills(s.stuntsSkills);
            if (s.stuntsPartMax     != null) setStuntsPartMax(s.stuntsPartMax);
            if (Array.isArray(s.stuntsExecDeds))  setStuntsExecDeds(s.stuntsExecDeds);
            if (Array.isArray(s.pyramidsExecDeds)) setPyramidsExecDeds(s.pyramidsExecDeds);
            if (Array.isArray(s.tossesExecDeds))  setTossesExecDeds(s.tossesExecDeds);
            if (s.pyramidsRangeIdx  != null) setPyramidsRangeIdx(s.pyramidsRangeIdx);
            if (s.pyramidsFine      != null) setPyramidsFine(s.pyramidsFine);
            if (s.pyramidsDrivers   != null) setPyramidsDrivers(s.pyramidsDrivers);
          } catch { /* noop */ }
        }
        if (sheet.tosses_difficulty != null) setTossesDiff(parseFloat(sheet.tosses_difficulty) || 0);
        if (sheet.creativity_building  != null) setCreativityBuilding(parseFloat(sheet.creativity_building)  || 0);
        if (sheet.showmanship_building != null) setShowmanshipBuilding(parseFloat(sheet.showmanship_building) || 0);
      } catch { /* noop */ }
    }, 5000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, loading, regId, bCfg]);

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
      const payload: Partial<ScoreSheet> = {
        stunts_difficulty:    String(stuntsRango),
        stunts_execution:     String(stuntsExecTotal),
        stunts_drivers:       String(stuntsDriversTotal),
        pyramids_difficulty:  String(pyramidsDiff),
        pyramids_execution:   String(pyramidsExecTotal),
        ...(bCfg.pyramidDriversOpts.length > 0 ? { pyramids_drivers: String(pyramidsDrivers) } : {}),
        tosses_difficulty:    String(bCfg.hasTosses ? tossesDiff : 0),
        tosses_execution:     String(bCfg.hasTosses ? tossesExecTotal : 0),
        creativity_building:  String(bCfg.hasCreativity ? creativityBuilding : 0),
        showmanship_building: String(showmanshipBuilding),
        notes: (() => {
          let existing: Record<string, unknown> = {};
          try { existing = JSON.parse(existingSheet?.notes ?? '{}'); } catch { /* noop */ }
          const existingScores = (existing._scores as Record<string, unknown>) ?? {};
          return JSON.stringify({
            ...existing,
            comments,
            _scores: {
              ...existingScores,
              stuntsRango, stuntsSkills, stuntsPartMax,
              stuntsExecDeds, pyramidsExecDeds, tossesExecDeds,
              pyramidsRangeIdx, pyramidsFine,
            },
          });
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
    if (readOnly || !initialValuesSettled.current) return;
    const timer = setTimeout(() => { handleSaveRef.current(true); }, 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, stuntsRango, stuntsSkills, stuntsPartMax, stuntsExecDeds, pyramidsExecDeds, tossesExecDeds, pyramidsRangeIdx, pyramidsFine, pyramidsDrivers, tossesDiff, creativityBuilding, showmanshipBuilding, comments]);

  const handleSaveAthleteCount = async () => {
    const val = localCountStr === '' ? null : parseInt(localCountStr, 10);
    if (localCountStr !== '' && (isNaN(val as number) || (val as number) < 1)) {
      toast.error('Ingresa un número válido de atletas');
      return;
    }
    setSavingCount(true);
    try {
      await competitionsRepository.updateRegistration(regId, { athlete_count: val } as Partial<Registration>);
      setAthleteCount(val);
      setEditingCount(false);
      const ch = new BroadcastChannel('cheer-metrics:athlete-count');
      ch.postMessage({ registrationId: regIntId!, count: val });
      ch.close();
      toast.success('Conteo guardado');
    } catch {
      toast.error('No se pudo guardar el conteo');
    } finally {
      setSavingCount(false);
    }
  };

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
            <p className="text-[11px] uppercase tracking-wide text-zinc-400 font-medium">Planilla — Elevaciones (Building)</p>
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
      <SkillReferencePanel skillLevel={division?.skill_level} sheetType="building" />

      {/* Print-only view (hidden in browser, visible when printing) */}
      {!loading && (
        <BuildingSheetPrintView
          teamName={teamName || `Inscripción #${regId}`}
          divisionName={existingSheet?.division_name}
          organization={organization}
          bCfg={bCfg}
          stuntsRango={stuntsRango}
          stuntsSkills={stuntsSkills}
          stuntsPartMax={stuntsPartMax}
          stuntsExecDeds={stuntsExecDeds}
          stuntsNotes={comments}
          pyramidsRangeIdx={pyramidsRangeIdx}
          pyramidsFine={pyramidsFine}
          pyramidsExecDeds={pyramidsExecDeds}
          pyramidsDrivers={pyramidsDrivers}
          pyramidsNotes=""
          tossesDiff={tossesDiff}
          tossesExecDeds={tossesExecDeds}
          tossesNotes=""
          creativityBuilding={creativityBuilding}
          showmanshipBuilding={showmanshipBuilding}
          stuntsSkillsTotal={stuntsSkillsTotal}
          stuntsDriversTotal={stuntsDriversTotal}
          stuntsExecTotal={stuntsExecTotal}
          stuntsSectionTotal={stuntsSectionTotal}
          pyramidsDiff={pyramidsDiff}
          pyramidsExecTotal={pyramidsExecTotal}
          pyramidsSectionTotal={pyramidsSectionTotal}
          tossesExecTotal={tossesExecTotal}
          tossesSectionTotal={tossesSectionTotal}
          buildingTotal={buildingTotal}
          sheetTotal={sheetTotal}
        />
      )}

      <div className={`print:hidden max-w-6xl mx-auto px-6 py-8 flex flex-col gap-14${readOnly ? ' pointer-events-none select-none opacity-75' : ''}`}>

        {/* ── Construction table banner ────────────────────────────────── */}
        {(() => {
          const groups = athleteCount ? getConstructionGroups(athleteCount) : null;
          const localVal = parseInt(localCountStr, 10);
          const previewGroups = !isNaN(localVal) && localVal > 0 ? getConstructionGroups(localVal) : null;
          const displayGroups = previewGroups ?? groups;
          const showInput = !readOnly && editingCount;
          return (
            <div className={`rounded-xl border px-5 py-4 flex flex-col gap-3 mb-6 ${
              displayGroups ? 'border-zinc-200 bg-white' : 'border-dashed border-zinc-300 bg-zinc-50'
            }`}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-0.5">
                    Tabla de cantidad en construcción
                  </p>
                  <p className="text-xs text-zinc-400">
                    {showInput ? 'Ingresa o corrige el número de atletas en pista' : athleteCount ? `${athleteCount} atletas confirmados` : 'Sin conteo de atletas'}
                  </p>
                </div>
                {displayGroups && (
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Mayoría</p>
                        <p className="text-3xl font-black tabular-nums text-zinc-900">{displayGroups.mayoria}</p>
                      </div>
                      <div className="text-center border-x border-zinc-200 px-6">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Gran Parte</p>
                        <p className="text-3xl font-black tabular-nums text-zinc-900">{displayGroups.gran_parte}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Máx</p>
                        <p className="text-3xl font-black tabular-nums text-zinc-900">{displayGroups.max}</p>
                      </div>
                    </div>
                    {athleteCount != null && !editingCount && !readOnly && (
                      <button
                        type="button"
                        onClick={() => setEditingCount(true)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
                        title="Editar conteo"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
                {!displayGroups && !showInput && (
                  <span className="text-xs text-zinc-300 italic shrink-0">—</span>
                )}
              </div>
              {showInput && (
                <>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => { const cur = parseInt(localCountStr || '0', 10); if (cur > 1) setLocalCountStr(String(cur - 1)); }}
                        className="w-8 h-8 rounded-lg border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100 font-bold text-lg flex items-center justify-center transition-colors"
                      >−</button>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={localCountStr}
                        placeholder="0"
                        onChange={e => setLocalCountStr(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveAthleteCount(); }}
                        className="w-16 h-8 rounded-lg border border-zinc-300 bg-white text-center text-sm font-bold tabular-nums text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                      />
                      <button
                        type="button"
                        onClick={() => { const cur = parseInt(localCountStr || '0', 10); setLocalCountStr(String(isNaN(cur) ? 1 : cur + 1)); }}
                        className="w-8 h-8 rounded-lg border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100 font-bold text-lg flex items-center justify-center transition-colors"
                      >+</button>
                      <span className="text-xs text-zinc-400">atletas</span>
                    </div>
                    {localCountStr && (
                      <button
                        type="button"
                        onClick={handleSaveAthleteCount}
                        disabled={savingCount}
                        className="ml-auto rounded-lg bg-zinc-900 hover:bg-zinc-700 text-white px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        {savingCount ? 'Guardando...' : 'Guardar'}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {/* ── Coed style table ─────────────────────────────────────────── */}
        {isCoed && (() => {
          const sl = division?.skill_level;
          const isHighCoed = sl === 'L5' || sl === 'L6' || sl === 'L7';
          const isMidCoed  = sl === 'L3' || sl === 'L4';
          if (!isHighCoed && !isMidCoed) return null;
          const COED_ROWS: [number, number, number][] = [[1,3,1],[4,5,2],[6,7,3],[8,9,4],[10,11,5],[12,13,6],[14,16,7]];
          const maleVal = parseInt(maleCountStr, 10);
          const hasMale = !isNaN(maleVal) && maleVal > 0;
          const matched = hasMale
            ? (COED_ROWS.find(([mn, mx]) => maleVal >= mn && maleVal <= mx) ?? (maleVal > 16 ? COED_ROWS[COED_ROWS.length - 1] : null))
            : null;
          return (
            <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    Tabla de cantidad Coed — Estilo Coed
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">{isMidCoed ? 'N3–N4:' : 'N5–N7:'}</span>
                    {maleCountEditable ? (
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={maleCountStr}
                        placeholder="0"
                        onChange={e => setMaleCountStr(e.target.value)}
                        className="w-12 h-6 rounded border border-zinc-200 bg-zinc-50 text-center text-xs font-bold tabular-nums text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                      />
                    ) : (
                      <span className="text-xs font-bold tabular-nums text-zinc-900">{maleCountStr}</span>
                    )}
                    <span className="text-xs text-zinc-400">atletas masculinos</span>
                    {!maleCountEditable && !readOnly && (
                      <button
                        type="button"
                        onClick={() => setMaleCountEditable(true)}
                        className="p-1 rounded text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                        title="Editar conteo"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
                {isMidCoed ? (
                  <div className="text-center shrink-0">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Grupos Estilo Coed</p>
                    <p className="text-3xl font-black tabular-nums text-zinc-700">1</p>
                  </div>
                ) : (
                  <div className="shrink-0 overflow-x-auto">
                    <table className="text-xs border-collapse">
                      <thead>
                        <tr>
                          <th className="px-3 py-1.5 text-left border border-zinc-200 whitespace-nowrap text-[9px] font-bold uppercase tracking-widest text-zinc-400">Atletas masc.</th>
                          <th className="px-3 py-1.5 text-center border border-zinc-200 whitespace-nowrap text-[9px] font-bold uppercase tracking-widest text-zinc-400">Grupos Coed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {COED_ROWS.map(([min, max, grp]) => {
                          const active = matched?.[0] === min;
                          return (
                            <tr key={min} className={active ? 'bg-blue-600' : 'even:bg-zinc-50'}>
                              <td className={`px-3 py-1 border border-zinc-200 tabular-nums ${active ? 'text-white font-bold' : 'text-zinc-700'}`}>{min}–{max}</td>
                              <td className={`px-3 py-1 border border-zinc-200 text-center font-bold tabular-nums ${active ? 'text-white' : 'text-zinc-900'}`}>{grp}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── Skill reference panel ────────────────────────────────────── */}

        {/* ── STUNTS ──────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-700 flex items-center gap-2">
            Elevaciones — Stunts
            <InfoButton title="Elevaciones — Stunts" size="xl">
              <div className="space-y-5 text-sm text-zinc-700">
                <p className="text-zinc-500 text-xs leading-relaxed">
                  Evalúa las habilidades de elevación (stunts) ejecutadas por el equipo, considerando dificultad, ejecución técnica y habilidades de los drivers (spotter/base).
                </p>
                <div>
                  <h3 className="font-semibold text-zinc-900 mb-2">Rango Base de Complejidad</h3>
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-zinc-50">
                        <th className="text-left px-3 py-1.5 border border-zinc-200 font-medium text-zinc-600">Criterio</th>
                        <th className="text-center px-3 py-1.5 border border-zinc-200 font-medium text-zinc-600 w-16">Puntaje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeStuntsRango.map(({ value, label }) => (
                        <tr key={value} className="even:bg-zinc-50">
                          <td className="px-3 py-1.5 border border-zinc-200">{label}</td>
                          <td className="px-3 py-1.5 border border-zinc-200 text-center font-semibold tabular-nums">{value.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 mb-1">Grado de Dificultad por Habilidad</h3>
                  <p className="text-xs text-zinc-500 mb-2">Se aplica a cada habilidad individual ejecutada dentro del rango seleccionado.</p>
                  <div className="flex flex-col gap-1.5">
                    {[
                      { label: 'No Cumple', desc: 'Habilidad básica o no ejecutada al nivel requerido', color: 'bg-zinc-100 text-zinc-600' },
                      { label: 'Avanzado  +0.10', desc: 'Habilidad claramente de dificultad avanzada dentro del nivel', color: 'bg-blue-50 text-blue-700' },
                      { label: 'Elite  +0.20', desc: 'Habilidad de máxima dificultad o complejidad Elite dentro del nivel', color: 'bg-violet-50 text-violet-700' },
                    ].map(({ label, desc, color }) => (
                      <div key={label} className={`rounded-lg px-3 py-2 ${color}`}>
                        <p className="font-semibold text-xs">{label}</p>
                        <p className="text-xs opacity-80 mt-0.5">{desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 mb-1">Part Max — Spotter / Base</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Bonificación por la participación máxima de Spotter/Base en una habilidad en Canon o Sincronizado. No se pueden repetir atletas entre grupos contados.
                  </p>
                </div>
              </div>
            </InfoButton>
          </h2>
          {!bCfg.hasStunts ? (
            <NoAplicaBadge label="Sin Stunts — No Aplica para esta División" />
          ) : (
            <div className="grid grid-cols-2 gap-5 items-start">

              {/* LEFT: Difficulty */}
              {!bCfg.stuntsHasDiff ? (
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-6 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Sin Dificultad</p>
                    <p className="text-sm text-zinc-400 mt-1">Solo Ejecución para esta División</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                  <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200 flex items-center gap-1.5">
                    <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Dificultad</span>
                    <InfoButton title="Dificultad — Stunts" size="md">
                      <div className="space-y-3 text-xs text-zinc-700">
                        <p className="text-zinc-500 leading-relaxed">El puntaje de dificultad combina el <strong>Rango Base</strong> (tipo de habilidades ejecutadas) más el <strong>Grado de Dificultad</strong> individual de cada habilidad.</p>
                        <p className="leading-relaxed"><strong>Fórmula:</strong> Rango Base + Σ Grado por Habilidad + Part Max (Spotter/Base)</p>
                        <p className="text-zinc-500 leading-relaxed">Solo cuentan las habilidades que califiquen dentro del rango seleccionado. Las habilidades con menor nivel al del rango elegido no suman grado de dificultad.</p>
                      </div>
                    </InfoButton>
                  </div>
                  <div className="p-4 flex flex-col gap-5">

                    {/* Rango Base */}
                    <div>
                      <p className="text-xs font-medium text-zinc-500 mb-2">Rango Base de Complejidad</p>
                      <div className="flex flex-col gap-1.5">
                        {activeStuntsRango.map(({ value, label }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setStuntsRango(value)}
                            className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors border text-left ${
                              stuntsRango === value
                                ? 'border-transparent'
                                : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-600 hover:bg-zinc-50'
                            }`}
                            style={stuntsRango === value ? { backgroundColor: '#2563eb', color: '#ffffff', borderColor: '#2563eb' } : undefined}
                          >
                            <span className="flex-1">{label}</span>
                            <span className={`text-base font-bold tabular-nums ml-3 shrink-0 ${stuntsRango === value ? 'text-zinc-300' : 'text-zinc-400'}`}>
                              {value.toFixed(1)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Grado de Dificultad per skill */}
                    {bCfg.stuntsSkillCount > 0 && (
                      <div>
                        <p className="text-xs font-medium text-zinc-500 mb-2">Grado de Dificultad — Habilidades (+0.10 / +0.20)</p>
                        <div className="flex flex-col gap-2">
                          {stuntSkillLabels.map((skill, i) => {
                            const skillDisabled = i >= activeSkillCount;
                            return (
                              <div key={skill} className="flex items-center gap-3">
                                <span className={`w-28 shrink-0 text-sm ${skillDisabled ? 'text-zinc-400' : 'text-zinc-700'}`}>{skill}</span>
                                <div className="flex flex-1 gap-1.5">
                                  {bCfg.stuntsSkillGrades.map(({ label, value }) => (
                                    <button
                                      key={label}
                                      type="button"
                                      disabled={skillDisabled}
                                      onClick={() => {
                                        const next = [...stuntsSkills];
                                        next[i] = value;
                                        setStuntsSkills(next);
                                      }}
                                      className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors border ${
                                        skillDisabled
                                          ? 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed opacity-50'
                                          : stuntsSkills[i] !== null && stuntsSkills[i] === value
                                            ? 'border-transparent'
                                            : 'bg-white text-zinc-600 border-zinc-300 hover:border-zinc-600'
                                      }`}
                                      style={!skillDisabled && stuntsSkills[i] !== null && stuntsSkills[i] === value ? { backgroundColor: '#2563eb', color: '#ffffff', borderColor: '#2563eb' } : undefined}
                                    >
                                      {label}
                                      {value > 0 && (
                                        <span className="ml-1 opacity-70">+{value.toFixed(2)}</span>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-3 flex justify-between text-xs border-t border-zinc-100 pt-2">
                          <span className="text-zinc-500">
                            Rango {fmt(stuntsRango)} + Grado Dif {fmt(stuntsSkillsTotal)}
                          </span>
                          <span className="font-semibold text-zinc-900">Total Drivers: {fmt(stuntsDriversTotal)}</span>
                        </div>
                      </div>
                    )}

                    {/* Part Max */}
                    {bCfg.stuntsPartMaxOpts.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-zinc-500 mb-0.5">Part Max — Spotter / Base</p>
                        <p className="text-[10px] text-zinc-400 mb-2">Habilidad en Canon o Sincronizado · Sin Repetir Atletas</p>
                        <div className="flex flex-col gap-1.5">
                          {bCfg.stuntsPartMaxOpts.map(({ value, label }) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setStuntsPartMax(value)}
                              className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors border text-left ${
                                stuntsPartMax !== null && stuntsPartMax === value
                                  ? 'border-transparent'
                                  : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-500 hover:bg-zinc-50'
                              }`}
                              style={stuntsPartMax !== null && stuntsPartMax === value ? { backgroundColor: '#f59e0b', color: '#ffffff', borderColor: '#f59e0b' } : undefined}
                            >
                              <span className="flex-1">{label}</span>
                              <span className={`text-base font-bold tabular-nums ml-3 shrink-0 ${stuntsPartMax !== null && stuntsPartMax === value ? 'text-white/80' : 'text-zinc-400'}`}>
                                {value.toFixed(1)}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* RIGHT: Execution + Total + Comments */}
              <div className="flex flex-col gap-4">
                <ExecSection label="Elevaciones" max={bCfg.stuntsExecMax} deds={stuntsExecDeds} onChange={setStuntsExecDeds} dedOpts={bCfg.buildingExecDedOpts}
                  info={<ExecInfoContent cats={EXEC_CATS} note="Cada categoría se evalúa de forma independiente. Solo se puede seleccionar un nivel de deducción por categoría por vuelta." />}
                />
                <SectionTotal
                  label="Total Elevaciones"
                  breakdown={
                    bCfg.stuntsHasDiff
                      ? [
                          { key: 'Dif', value: stuntsRango },
                          { key: 'Ejec', value: stuntsExecTotal },
                          { key: 'Drivers', value: stuntsDriversTotal },
                        ]
                      : [{ key: 'Ejec', value: stuntsExecTotal }]
                  }
                  total={stuntsSectionTotal}
                />
              </div>
            </div>
          )}
        </section>

        {/* ── PYRAMIDS ────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-3 mt-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-700 flex items-center gap-2">
            Pirámides
            <InfoButton title="Pirámides" size="xl">
              <div className="space-y-4 text-sm text-zinc-700">
                <p className="text-zinc-500 text-xs leading-relaxed">
                  Evalúa las estructuras de pirámide ejecutadas por el equipo. Se considera la variedad y dificultad de las estructuras diferentes del nivel, junto con la calidad de ejecución.
                </p>
                <div>
                  <h3 className="font-semibold text-zinc-900 mb-2">Rango de Dificultad</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed mb-2">
                    Basado en el número de <strong>Habilidades Diferentes del Nivel</strong> y el número de <strong>Estructuras por Gran Parte</strong> del equipo. Cada rango tiene un puntaje mínimo y máximo; el <strong>Ajuste Fino</strong> permite ubicar el desempeño dentro de ese rango.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 mb-2">Ejecución — Pirámides</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Se evalúan las mismas categorías que en Stunts (Flyer, Base/Spotter, Transición, Sincronización). La <strong>Sincronización</strong> en pirámides considera la coordinación entre todos los stunts que conforman la estructura simultáneamente.
                  </p>
                </div>
              </div>
            </InfoButton>
          </h2>
          {!bCfg.hasPyramids ? (
            <NoAplicaBadge label="Sin Pirámides — No Aplica para esta División" />
          ) : (
            <div className="grid grid-cols-2 gap-5 items-start">

              {/* LEFT: Difficulty */}
              {!bCfg.pyramidsHasDiff ? (
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-6 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Sin Dificultad</p>
                    <p className="text-sm text-zinc-400 mt-1">Solo Ejecución para esta División</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                  <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                    <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Dificultad</span>
                    <p className="text-[10px] text-zinc-400 mt-0.5"># Habilidades Diferentes del Nivel + # Estructuras x Gran Parte</p>
                  </div>
                  <div className="p-4 flex flex-col gap-4">
                    <div>
                      <p className="text-xs font-medium text-zinc-500 mb-2">Rango</p>
                      <div className="flex flex-col gap-1.5">
                        {bCfg.pyramidRango.map(({ low, high, label }, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => { setPyramidsRangeIdx(idx); setPyramidsFine(0.0); }}
                            className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors border text-left ${
                              pyramidsRangeIdx === idx
                                ? 'border-transparent'
                                : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-600 hover:bg-zinc-50'
                            }`}
                            style={pyramidsRangeIdx === idx ? { backgroundColor: '#2563eb', color: '#ffffff', borderColor: '#2563eb' } : undefined}
                          >
                            <span className="flex-1">{label}</span>
                            <span className={`text-sm font-bold tabular-nums ml-3 shrink-0 ${pyramidsRangeIdx === idx ? 'text-zinc-300' : 'text-zinc-400'}`}>
                              {low.toFixed(1)}–{high.toFixed(1)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {pyramidsRangeIdx !== null && bCfg.pyramidFineSteps.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-zinc-500 mb-2">Ajuste dentro del rango</p>
                        <div className={`grid gap-1 ${bCfg.pyramidFineSteps.length > 6 ? 'grid-cols-6' : 'grid-cols-6'}`}>
                          {bCfg.pyramidFineSteps.map((step) => (
                            <button
                              key={step}
                              type="button"
                              onClick={() => setPyramidsFine(step)}
                              className={`rounded-lg py-2 text-xs font-semibold tabular-nums transition-colors border ${
                                pyramidsFine === step
                                  ? 'border-transparent'
                                  : 'bg-white text-zinc-600 border-zinc-300 hover:border-zinc-600'
                              }`}
                              style={pyramidsFine === step ? { backgroundColor: '#2563eb', color: '#ffffff', borderColor: '#2563eb' } : undefined}
                            >
                              +{step.toFixed(1)}
                            </button>
                          ))}
                        </div>
                        <p className="mt-2 text-right text-xs text-zinc-500">
                          Dificultad: <strong className="text-zinc-900 tabular-nums">{pyramidsDiff.toFixed(1)}</strong>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* RIGHT: Execution + Drivers + Total + Comments */}
              <div className="flex flex-col gap-4">
                <ExecSection label="Pirámides" max={bCfg.pyramidsExecMax} deds={pyramidsExecDeds} onChange={setPyramidsExecDeds} dedOpts={bCfg.buildingExecDedOpts}
                  info={<ExecInfoContent cats={EXEC_CATS} note="En pirámides, la Sincronización evalúa la coordinación entre todos los stunts que forman la estructura simultáneamente." />}
                />

                {/* Pyramid drivers (escolar_ab only) */}
                {bCfg.pyramidDriversOpts.length > 0 && (
                  <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                    <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                      <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Drivers — Pirámides</span>
                    </div>
                    <div className="p-3 flex flex-col gap-1.5">
                      {bCfg.pyramidDriversOpts.map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setPyramidsDrivers(value)}
                          className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors border text-left ${
                            pyramidsDrivers === value
                              ? 'border-transparent'
                              : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-500 hover:bg-zinc-50'
                          }`}
                          style={pyramidsDrivers === value ? { backgroundColor: '#f59e0b', color: '#ffffff', borderColor: '#f59e0b' } : undefined}
                        >
                          <span className="flex-1">{label}</span>
                          <span className={`text-base font-bold tabular-nums ml-3 shrink-0 ${pyramidsDrivers === value ? 'text-white/80' : 'text-zinc-400'}`}>
                            {value.toFixed(1)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <SectionTotal
                  label="Total Pirámides"
                  breakdown={
                    bCfg.pyramidsHasDiff
                      ? [
                          { key: 'Dif', value: pyramidsDiff },
                          { key: 'Ejec', value: pyramidsExecTotal },
                          ...(bCfg.pyramidDriversOpts.length > 0 ? [{ key: 'Drivers', value: pyramidsDrivers }] : []),
                        ]
                      : [{ key: 'Ejec', value: pyramidsExecTotal }]
                  }
                  total={pyramidsSectionTotal}
                />
              </div>
            </div>
          )}
        </section>

        {/* ── TOSSES ──────────────────────────────────────────────────── */}
        {bCfg.hasTosses && (
          <section className="flex flex-col gap-3 mt-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-700 flex items-center gap-2">
              Lanzamientos — Tosses
              <InfoButton title="Lanzamientos — Tosses" size="lg">
                <div className="space-y-4 text-sm text-zinc-700">
                  <p className="text-zinc-500 text-xs leading-relaxed">
                    Evalúa los lanzamientos (basket tosses y similares) ejecutados por el equipo. Se considera la dificultad de la habilidad lanzada y la calidad de ejecución técnica.
                  </p>
                  <div>
                    <h3 className="font-semibold text-zinc-900 mb-2">Dificultad</h3>
                    <p className="text-xs text-zinc-500 leading-relaxed">Basada en el lanzamiento apropiado al nivel de la categoría. El puntaje refleja si la habilidad ejecutada corresponde al nivel mínimo requerido o lo supera.</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-900 mb-2">Ejecución</h3>
                    <p className="text-xs text-zinc-500 leading-relaxed">Se evalúan <strong>Flyer</strong> (posición corporal y control en el aire), <strong>Base/Spotter</strong> (técnica del lanzamiento y recepción) y <strong>Altura</strong> (alcance del pico máximo y limpieza de trayectoria).</p>
                  </div>
                </div>
              </InfoButton>
            </h2>
            <div className="grid grid-cols-2 gap-5 items-start">

              {/* LEFT: Difficulty */}
              <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                  <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Dificultad</span>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Lanzamiento Apropiado del Nivel</p>
                </div>
                <div className="p-4">
                  <div className="flex flex-col gap-1.5">
                    {bCfg.tossDiffOpts.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setTossesDiff(value)}
                        className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors border text-left ${
                          tossesDiff === value
                            ? 'border-transparent'
                            : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-600 hover:bg-zinc-50'
                        }`}
                        style={tossesDiff === value ? { backgroundColor: '#2563eb', color: '#ffffff', borderColor: '#2563eb' } : undefined}
                      >
                        <span className="flex-1">{label}</span>
                        <span className={`text-base font-bold tabular-nums ml-3 shrink-0 ${tossesDiff === value ? 'text-zinc-300' : 'text-zinc-400'}`}>
                          {value.toFixed(1)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT: Execution + Total + Comments */}
              <div className="flex flex-col gap-4">
                <ExecSection label="Lanzamientos" max={bCfg.tossesExecMax} deds={tossesExecDeds} onChange={setTossesExecDeds} cats={TOSS_EXEC_CATS} dedOpts={bCfg.tossesExecDedOpts}
                  info={<ExecInfoContent cats={TOSS_EXEC_CATS} note="En lanzamientos, la Altura evalúa el alcance del pico máximo y la limpieza de la trayectoria; no se evalúa Sincronización." />}
                />
                <SectionTotal
                  label="Total Lanzamientos"
                  breakdown={[
                    { key: 'Dif', value: tossesDiff },
                    { key: 'Ejec', value: tossesExecTotal },
                  ]}
                  total={tossesSectionTotal}
                />
              </div>
            </div>
          </section>
        )}

        {/* ── BUILDING SUBTOTAL ────────────────────────────────────────── */}
        <div className="flex items-center justify-between rounded-xl px-5 py-4 shadow-sm mb-6 bg-zinc-800 text-white">
          <span className="text-sm font-semibold uppercase tracking-wide">Subtotal Elevaciones</span>
          <span className="text-2xl font-bold tabular-nums">{fmt(buildingTotal)}</span>
        </div>

        {/* ── CREATIVITY + SHOWMANSHIP ─────────────────────────────────── */}
        <section className="flex flex-col gap-4 mt-6">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-700 flex items-center gap-2">
              {bCfg.hasCreativity ? 'Creatividad & Showmanship' : 'Cheer / Animación'}
              <InfoButton title={bCfg.hasCreativity ? 'Creatividad & Showmanship' : 'Cheer / Animación'} size="lg">
                <div className="space-y-4 text-sm text-zinc-700">
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Este puntaje es asignado individualmente por cada juez y luego <strong>promediado entre los tres jueces de building</strong>. No se suma directamente; el promedio es el que contribuye al total final.
                  </p>
                  {bCfg.hasCreativity ? (
                    <div className="space-y-3">
                      <div className="rounded-lg border border-zinc-200 p-3">
                        <p className="font-semibold text-zinc-900 text-xs mb-1">Creatividad (1.0 – 2.0)</p>
                        <p className="text-xs text-zinc-500 leading-relaxed">Evalúa la creatividad, innovación y valor visual del equipo durante formaciones, transiciones y construcciones. Considera originalidad y propuesta artística dentro de las habilidades.</p>
                      </div>
                      <div className="rounded-lg border border-zinc-200 p-3">
                        <p className="font-semibold text-zinc-900 text-xs mb-1">Showmanship (1.0 – 2.0)</p>
                        <p className="text-xs text-zinc-500 leading-relaxed">Evalúa la expresión facial, energía, presencia escénica y la capacidad del equipo de proyectar emoción al público y al panel de jueces durante toda la rutina.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-zinc-200 p-3">
                      <p className="font-semibold text-zinc-900 text-xs mb-1">Cheer / Animación (0.0 – 5.0)</p>
                      <p className="text-xs text-zinc-500 leading-relaxed">Evalúa la animación, energía, proyección y el espíritu general del equipo. Incluye vocalización de cheers, expresión corporal y conexión con el público.</p>
                    </div>
                  )}
                  <p className="text-xs text-zinc-400 border-t border-zinc-100 pt-3">
                    Selecciona el valor con el slider o escríbelo directamente en el campo numérico.
                  </p>
                </div>
              </InfoButton>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">Puntuado por este juez — se promedia con los otros dos jueces</p>
          </div>

          <div className={`grid gap-4 ${bCfg.hasCreativity ? 'grid-cols-2' : 'grid-cols-1 max-w-md'}`}>
            {/* Creativity (hidden for escolar_ab) */}
            {bCfg.hasCreativity && (
              <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                  <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Creatividad</span>
                  <span className="text-lg font-bold tabular-nums text-zinc-900">{fmt(creativityBuilding)}</span>
                </div>
                <div className="p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={String(bCfg.creativityMin)}
                      max={String(bCfg.creativityMax)}
                      step="0.1"
                      value={creativityBuilding}
                      onChange={(e) => setCreativityBuilding(parseFloat(e.target.value))}
                      className="flex-1 accent-zinc-900"
                    />
                    <input
                      type="number"
                      min={String(bCfg.creativityMin)}
                      max={String(bCfg.creativityMax)}
                      step="0.1"
                      value={creativityBuilding}
                      onChange={(e) => {
                        const v = Math.min(bCfg.creativityMax, Math.max(bCfg.creativityMin, parseFloat(e.target.value) || bCfg.creativityMin));
                        setCreativityBuilding(parseFloat(v.toFixed(2)));
                      }}
                      className="w-16 h-9 rounded-lg border border-zinc-300 px-2 text-center text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-snug">Creatividad, Innovación y/o visual durante formaciones, transiciones y construcciones</p>
                </div>
              </div>
            )}

            {/* Showmanship / Cheer-Animación */}
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">
                  {bCfg.hasCreativity ? 'Showmanship' : 'Cheer / Animación'}
                </span>
                <span className="text-lg font-bold tabular-nums text-zinc-900">{fmt(showmanshipBuilding)}</span>
              </div>
              <div className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={String(bCfg.showmanshipMin)}
                    max={bCfg.showmanshipMax}
                    step="0.1"
                    value={showmanshipBuilding}
                    onChange={(e) => setShowmanshipBuilding(parseFloat(e.target.value))}
                    className="flex-1 accent-zinc-900"
                  />
                  <input
                    type="number"
                    min={String(bCfg.showmanshipMin)}
                    max={bCfg.showmanshipMax}
                    step="0.1"
                    value={showmanshipBuilding}
                    onChange={(e) => {
                      const v = Math.min(bCfg.showmanshipMax, Math.max(bCfg.showmanshipMin, parseFloat(e.target.value) || bCfg.showmanshipMin));
                      setShowmanshipBuilding(parseFloat(v.toFixed(2)));
                    }}
                    className="w-16 h-9 rounded-lg border border-zinc-300 px-2 text-center text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
                <p className="text-[11px] text-zinc-400 leading-snug">
                  {bCfg.hasCreativity
                    ? 'Ritmo, Confianza y Conexión durante la rutina'
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
            <p className="text-base uppercase tracking-wide font-bold">Total Planilla Building</p>
            <p className="text-xs opacity-70 mt-0.5">
              {bCfg.hasCreativity
                ? `Elevaciones + Creatividad (${fmt(creativityBuilding)}) + Showmanship (${fmt(showmanshipBuilding)})`
                : `Elevaciones + Cheer/Animación (${fmt(showmanshipBuilding)})`}
            </p>
          </div>
          <span className="text-4xl font-bold tabular-nums">{fmt(sheetTotal)}</span>
        </div>

        {/* Score summary table */}
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden text-sm">
          <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
            <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Resumen de puntajes</span>
          </div>
          <table className="w-full">
            <tbody className="divide-y divide-zinc-100">
              {bCfg.hasStunts && bCfg.stuntsHasDiff && (
                <tr>
                  <td className="px-4 py-2.5 text-zinc-600">Stunts — Dificultad (Rango)</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap">
                    <span className="font-semibold">{fmt(stuntsRango)}</span>
                    <span className="text-zinc-400 font-normal"> / {fmt(maxStuntsRango)}</span>
                  </td>
                </tr>
              )}
              {bCfg.hasStunts && (
                <tr>
                  <td className="px-4 py-2.5 text-zinc-600">Stunts — Ejecución</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap">
                    <span className="font-semibold">{fmt(stuntsExecTotal)}</span>
                    <span className="text-zinc-400 font-normal"> / {fmt(bCfg.stuntsExecMax)}</span>
                  </td>
                </tr>
              )}
              {bCfg.hasStunts && bCfg.stuntsHasDiff && (
                <tr>
                  <td className="px-4 py-2.5 text-zinc-600">Stunts — Drivers (Grado+PM)</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap">
                    <span className="font-semibold">{fmt(stuntsDriversTotal)}</span>
                    <span className="text-zinc-400 font-normal"> / {fmt(maxStuntsDrivers)}</span>
                  </td>
                </tr>
              )}
              {bCfg.hasPyramids && bCfg.pyramidsHasDiff && (
                <tr>
                  <td className="px-4 py-2.5 text-zinc-600">Pirámides — Dificultad</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap">
                    <span className="font-semibold">{fmt(pyramidsDiff)}</span>
                    <span className="text-zinc-400 font-normal"> / {fmt(maxPyramidsDiff)}</span>
                  </td>
                </tr>
              )}
              {bCfg.hasPyramids && (
                <tr>
                  <td className="px-4 py-2.5 text-zinc-600">Pirámides — Ejecución</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap">
                    <span className="font-semibold">{fmt(pyramidsExecTotal)}</span>
                    <span className="text-zinc-400 font-normal"> / {fmt(bCfg.pyramidsExecMax)}</span>
                  </td>
                </tr>
              )}
              {bCfg.hasPyramids && bCfg.pyramidDriversOpts.length > 0 && (
                <tr>
                  <td className="px-4 py-2.5 text-zinc-600">Pirámides — Drivers</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap">
                    <span className="font-semibold">{fmt(pyramidsDrivers)}</span>
                    <span className="text-zinc-400 font-normal"> / {fmt(maxPyramidsDrivers)}</span>
                  </td>
                </tr>
              )}
              {bCfg.hasTosses && (
                <>
                  <tr>
                    <td className="px-4 py-2.5 text-zinc-600">Lanzamientos — Dificultad</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap">
                      <span className="font-semibold">{fmt(tossesDiff)}</span>
                      <span className="text-zinc-400 font-normal"> / {fmt(maxTossesDiff)}</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-zinc-600">Lanzamientos — Ejecución</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap">
                      <span className="font-semibold">{fmt(tossesExecTotal)}</span>
                      <span className="text-zinc-400 font-normal"> / {fmt(bCfg.tossesExecMax)}</span>
                    </td>
                  </tr>
                </>
              )}
              <tr className="bg-zinc-50">
                <td className="px-4 py-2.5 font-semibold text-zinc-700">Subtotal Elevaciones</td>
                <td className="px-4 py-2.5 text-right font-bold tabular-nums text-zinc-700">{fmt(buildingTotal)}</td>
              </tr>
              {bCfg.hasCreativity && (
                <tr>
                  <td className="px-4 py-2.5 text-zinc-600">Creatividad (este juez)</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap">
                    <span className="font-semibold">{fmt(creativityBuilding)}</span>
                    <span className="text-zinc-400 font-normal"> / 2.00</span>
                  </td>
                </tr>
              )}
              <tr>
                <td className="px-4 py-2.5 text-zinc-600">
                  {bCfg.hasCreativity ? 'Showmanship (este juez)' : 'Cheer / Animación (este juez)'}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap">
                  <span className="font-semibold">{fmt(showmanshipBuilding)}</span>
                  <span className="text-zinc-400 font-normal"> / {fmt(bCfg.showmanshipMax)}</span>
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
