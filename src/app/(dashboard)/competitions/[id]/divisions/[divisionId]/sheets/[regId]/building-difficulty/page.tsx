'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Eye, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageSpinner } from '@/components/ui/spinner';
import { InfoButton } from '@/components/ui/InfoButton';
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

function fmt(n: number) { return n.toFixed(2); }

function SectionTotal({ label, breakdown, total }: {
  label: string;
  breakdown: { key: string; value: number }[];
  total: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl px-5 py-3" style={{ backgroundColor: 'var(--plt-primary)', color: 'var(--plt-primary-fg)' }}>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-xs uppercase tracking-wide opacity-60">{label}</span>
        {breakdown.map(({ key, value }) => (
          <span key={key}>{key}: <strong className="tabular-nums">{fmt(value)}</strong></span>
        ))}
      </div>
      <span className="text-xl font-bold tabular-nums">{fmt(total)}</span>
    </div>
  );
}

export default function BuildingDifficultyPage() {
  const router = useRouter();
  const { id, divisionId, regId } = useParams<{ id: string; divisionId: string; regId: string }>();

  const { isJudge, isCompetitionActive } = useJudge();
  const [competitionIntId, setCompetitionIntId] = useState<number | null>(null);
  const [regIntId, setRegIntId] = useState<number | null>(null);
  const { organization } = useBranding();
  const readOnly = !isJudge;

  useEffect(() => {

    if (competitionIntId !== null && isJudge && !isCompetitionActive(competitionIntId)) {
      toast.error('El evento ha finalizado.');
      router.replace(`/competitions/${id}`);
    }
  }, [isJudge, competitionIntId, isCompetitionActive, router, id]);

  const [teamName,       setTeamName]       = useState('');
  const [existingSheet,  setExistingSheet]  = useState<ScoreSheet | null>(null);
  const [division,       setDivision]       = useState<Division | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [bCfg,           setBCfg]           = useState<BuildingConfig>(DEFAULT_BUILDING_CONFIG);
  const [athleteCount,   setAthleteCount]   = useState<number | null>(null);
  const [unpaidAthletes, setUnpaidAthletes] = useState<UnpaidAthlete[]>([]);
  const [requirePayment, setRequirePayment] = useState(false);
  const [localCountStr,  setLocalCountStr]  = useState('');
  const [savingCount,    setSavingCount]    = useState(false);
  const [editingCount,   setEditingCount]   = useState(false);

  // ── Stunts difficulty ─────────────────────────────────────────────────────
  const [stuntsRango,   setStuntsRango]   = useState<number>(0);
  const [stuntsSkills,  setStuntsSkills]  = useState<(number | null)[]>([null, null, null, null, null]);
  const [stuntsPartMax, setStuntsPartMax] = useState<number | null>(null);
  const [stuntsNotes,   setStuntsNotes]   = useState('');

  // ── Pyramids difficulty ───────────────────────────────────────────────────
  const [pyramidsRangeIdx, setPyramidsRangeIdx] = useState<number | null>(null);
  const [pyramidsFine,     setPyramidsFine]     = useState<number>(0.0);
  const [pyramidsDrivers,  setPyramidsDrivers]  = useState<number>(0.0);
  const [pyramidsNotes,    setPyramidsNotes]    = useState('');

  // ── Tosses difficulty ─────────────────────────────────────────────────────
  const [tossesDiff,  setTossesDiff]  = useState<number>(0.0);
  const [tossesNotes, setTossesNotes] = useState('');

  // ── Cross-sheet ───────────────────────────────────────────────────────────
  const [creativityBuilding,  setCreativityBuilding]  = useState<number>(1.5);
  const [showmanshipBuilding, setShowmanshipBuilding] = useState<number>(1.0);

  // ── Computed ──────────────────────────────────────────────────────────────
  const stuntsSkillsTotal  = parseFloat(stuntsSkills.reduce<number>((s, v) => s + (v ?? 0), 0).toFixed(2));
  const stuntsDriversTotal = parseFloat((stuntsSkillsTotal + (stuntsPartMax ?? 0)).toFixed(2));

  const pyramidsDiff = pyramidsRangeIdx !== null
    ? parseFloat((bCfg.pyramidRango[pyramidsRangeIdx].low + pyramidsFine).toFixed(1))
    : 0.0;

  const category       = division?.category as DivisionCategory | undefined;
  const isCoed         = category === 'coed';
  const activeStuntsRango = (category && bCfg.stuntsRangoByCategory?.[category]) ?? bCfg.stuntsRango;

  const activeStuntsRangoOpt = activeStuntsRango.find(r => r.value === stuntsRango);
  const activeSkillCount     = activeStuntsRangoOpt?.skillCount ?? bCfg.stuntsSkillCount;

  const stuntSkillLabels = Array.from(
    { length: bCfg.stuntsSkillCount },
    (_, i) => i === 4 && isCoed ? 'Habilidad #5 / Coed' : `Habilidad #${i + 1}`
  );

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

      const reg = regRes.data.results.find(r => r.public_id === regId);
      if (reg) {
        setRegIntId(reg.id);
        setTeamName(reg.team_name);
        setAthleteCount(reg.athlete_count ?? null);
        setLocalCountStr(reg.athlete_count != null ? String(reg.athlete_count) : '');
        setEditingCount(reg.athlete_count == null);
        setUnpaidAthletes(reg.unpaid_athletes);
        setRequirePayment(reg.competition_require_payment);
      }

      const sysConfig = getScoringConfig(divRes.data);
      const cfg = sysConfig.building;
      setBCfg(cfg);
      setDivision(divRes.data);
      setCompetitionIntId(divRes.data.competition);

      if (cfg.stuntsHasDiff && cfg.stuntsRango.length > 0) setStuntsRango(cfg.stuntsRango[0].value);

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
          if (idx >= 0) { setPyramidsRangeIdx(idx); setPyramidsFine(parseFloat((v - cfg.pyramidRango[idx].low).toFixed(1))); }
        }
        if (sheet.tosses_difficulty) {
          const v = parseFloat(sheet.tosses_difficulty);
          if (cfg.tossDiffOpts.some(o => o.value === v)) setTossesDiff(v);
        }
        if (sheet.pyramids_drivers) {
          const v = parseFloat(sheet.pyramids_drivers);
          if (cfg.pyramidDriversOpts.some(o => o.value === v)) setPyramidsDrivers(v);
        }
        if (sheet.creativity_building) setCreativityBuilding(Math.min(2.0, Math.max(1.5, parseFloat(sheet.creativity_building))));
        if (sheet.showmanship_building) setShowmanshipBuilding(Math.min(cfg.showmanshipMax, Math.max(1.0, parseFloat(sheet.showmanship_building))));

        if (sheet.notes) {
          try {
            const p = JSON.parse(sheet.notes);
            setStuntsNotes(p.bd_stunts ?? '');
            setPyramidsNotes(p.bd_pyramids ?? '');
            setTossesNotes(p.bd_tosses ?? '');
            const s = p._scores ?? {};
            if (s.bd_stuntsRango !== undefined && cfg.stuntsRango.some(r => r.value === s.bd_stuntsRango)) setStuntsRango(s.bd_stuntsRango);
            if (Array.isArray(s.bd_stuntsSkills)) setStuntsSkills(Array(5).fill(null).map((_, i) => s.bd_stuntsSkills[i] ?? null));
            if (s.bd_stuntsPartMax !== undefined && s.bd_stuntsPartMax !== null && cfg.stuntsPartMaxOpts.some(o => o.value === s.bd_stuntsPartMax)) setStuntsPartMax(s.bd_stuntsPartMax);
            if (s.bd_pyramidsRangeIdx !== undefined) setPyramidsRangeIdx(s.bd_pyramidsRangeIdx);
            if (s.bd_pyramidsFine !== undefined) setPyramidsFine(s.bd_pyramidsFine);
          } catch { /* noop */ }
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

  // Refresh scoresheet every 5 s for read-only (admin) view so judges' saves appear in real time
  useEffect(() => {
    if (!readOnly || loading) return;
    const interval = setInterval(async () => {
      try {
        const sheetRes = await competitionsRepository.listScoreSheets({ registration__public_id: regId });
        if (sheetRes.data.results.length === 0) return;
        const sheet = sheetRes.data.results[0];
        setExistingSheet(sheet);
        if (sheet.stunts_difficulty) {
          const v = parseFloat(sheet.stunts_difficulty);
          if (bCfg.stuntsRango.some(r => r.value === v)) setStuntsRango(v);
        }
        if (sheet.pyramids_difficulty) {
          const v = parseFloat(sheet.pyramids_difficulty);
          const idx = bCfg.pyramidRango.findIndex(r => v >= r.low && v <= r.high);
          if (idx >= 0) { setPyramidsRangeIdx(idx); setPyramidsFine(parseFloat((v - bCfg.pyramidRango[idx].low).toFixed(1))); }
        }
        if (sheet.tosses_difficulty) {
          const v = parseFloat(sheet.tosses_difficulty);
          if (bCfg.tossDiffOpts.some(o => o.value === v)) setTossesDiff(v);
        }
        if (sheet.pyramids_drivers) {
          const v = parseFloat(sheet.pyramids_drivers);
          if (bCfg.pyramidDriversOpts.some(o => o.value === v)) setPyramidsDrivers(v);
        }
        if (sheet.creativity_building) setCreativityBuilding(Math.min(2.0, Math.max(1.5, parseFloat(sheet.creativity_building))));
        if (sheet.showmanship_building) setShowmanshipBuilding(Math.min(bCfg.showmanshipMax, Math.max(1.0, parseFloat(sheet.showmanship_building))));
        if (sheet.notes) {
          try {
            const p = JSON.parse(sheet.notes);
            setStuntsNotes(p.bd_stunts ?? '');
            setPyramidsNotes(p.bd_pyramids ?? '');
            setTossesNotes(p.bd_tosses ?? '');
            const s = p._scores ?? {};
            if (s.bd_stuntsRango !== undefined && bCfg.stuntsRango.some(r => r.value === s.bd_stuntsRango)) setStuntsRango(s.bd_stuntsRango);
            if (Array.isArray(s.bd_stuntsSkills)) setStuntsSkills(Array(5).fill(null).map((_, i) => s.bd_stuntsSkills[i] ?? null));
            if (s.bd_stuntsPartMax !== undefined && s.bd_stuntsPartMax !== null && bCfg.stuntsPartMaxOpts.some(o => o.value === s.bd_stuntsPartMax)) setStuntsPartMax(s.bd_stuntsPartMax);
            if (s.bd_pyramidsRangeIdx !== undefined) setPyramidsRangeIdx(s.bd_pyramidsRangeIdx);
            if (s.bd_pyramidsFine !== undefined) setPyramidsFine(s.bd_pyramidsFine);
          } catch { /* noop */ }
        }
      } catch { /* noop */ }
    }, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, loading, regId, bCfg]);

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
      const notesPayload = (() => {
        let existing: Record<string, unknown> = {};
        try { existing = JSON.parse(existingSheet?.notes ?? '{}'); } catch { /* noop */ }
        const existingScores = (existing._scores as Record<string, unknown>) ?? {};
        return JSON.stringify({
          ...existing,
          bd_stunts: stuntsNotes,
          bd_pyramids: pyramidsNotes,
          bd_tosses: tossesNotes,
          _scores: {
            ...existingScores,
            bd_stuntsRango: stuntsRango,
            bd_stuntsSkills: stuntsSkills,
            bd_stuntsPartMax: stuntsPartMax,
            bd_pyramidsRangeIdx: pyramidsRangeIdx,
            bd_pyramidsFine: pyramidsFine,
          },
        });
      })();

      const payload: Partial<ScoreSheet> = {
        stunts_difficulty:   String(stuntsRango),
        stunts_drivers:      String(stuntsDriversTotal),
        pyramids_difficulty: String(pyramidsDiff),
        ...(bCfg.pyramidDriversOpts.length > 0 ? { pyramids_drivers: String(pyramidsDrivers) } : {}),
        tosses_difficulty:   String(bCfg.hasTosses ? tossesDiff : 0),
        creativity_building:  String(bCfg.hasCreativity ? creativityBuilding : 0),
        showmanship_building: String(showmanshipBuilding),
        notes: notesPayload,
      };

      let saved: ScoreSheet;
      if (existingSheet) {
        const res = await competitionsRepository.updateScoreSheet(existingSheet.id, payload);
        saved = res.data;
      } else {
        const res = await competitionsRepository.createScoreSheet({ registration: regIntId!, ...payload } as Partial<ScoreSheet>);
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
  }, [readOnly, stuntsRango, stuntsSkills, stuntsPartMax, pyramidsRangeIdx, pyramidsFine, pyramidsDrivers, tossesDiff, creativityBuilding, showmanshipBuilding, stuntsNotes, pyramidsNotes, tossesNotes]);

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

  const diffTotal = parseFloat((stuntsRango + stuntsDriversTotal + pyramidsDiff + (bCfg.hasTosses ? tossesDiff : 0)).toFixed(2));
  const sheetTotal = parseFloat((diffTotal + creativityBuilding + showmanshipBuilding).toFixed(2));

  return (
    <div className="min-h-screen bg-zinc-50 pb-16">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between gap-4 bg-white border-b border-zinc-200 px-6 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push(`/competitions/${id}/divisions/${divisionId}`)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-400 font-medium">Planilla — Dificultad Elevaciones</p>
            <p className="text-sm font-semibold text-zinc-900 leading-tight">{teamName || `Inscripción #${regId}`}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Total planilla</p>
            <p className="text-2xl font-bold tabular-nums text-zinc-900">{fmt(sheetTotal)}</p>
          </div>
          {readOnly ? (
            <span className="text-xs font-medium text-zinc-400 px-3 py-1.5 rounded-lg bg-zinc-100 border border-zinc-200">Solo lectura</span>
          ) : (
            <Button onClick={() => handleSave()} loading={saving} disabled={requirePayment && unpaidAthletes.length > 0}>
              <Save className="h-4 w-4" />
              Guardar
            </Button>
          )}
        </div>
      </div>
      {readOnly && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center gap-2">
          <Eye className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-700 font-medium">Solo lectura — solo los jueces asignados pueden calificar.</p>
        </div>
      )}
      <PaymentWarningBanner unpaidAthletes={unpaidAthletes} requirePayment={requirePayment} />
      <SkillReferencePanel skillLevel={division?.skill_level} sheetType="building" />

      {/* ── Construction table banner ─────────────────────────────────── */}
      {(() => {
        const groups = athleteCount ? getConstructionGroups(athleteCount) : null;
        const localVal = parseInt(localCountStr, 10);
        const previewGroups = !isNaN(localVal) && localVal > 0 ? getConstructionGroups(localVal) : null;
        const displayGroups = previewGroups ?? groups;
        const showInput = !readOnly && editingCount;
        return (
          <div className="mx-auto max-w-4xl px-6 pt-6">
            <div className={`rounded-xl border px-5 py-4 flex flex-col gap-3 ${
              displayGroups ? 'border-zinc-200 bg-white' : 'border-dashed border-zinc-300 bg-zinc-50'
            }`}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-0.5">Tabla de cantidad en construcción</p>
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
          </div>
        );
      })()}

      <div className={`max-w-4xl mx-auto px-6 py-8 flex flex-col gap-16${readOnly ? ' pointer-events-none select-none opacity-75' : ''}`}>


        {/* ── STUNTS DIFFICULTY ────────────────────────────────────────── */}
        {bCfg.hasStunts && bCfg.stuntsHasDiff && (
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-700">Elevaciones — Dificultad</h2>
              <InfoButton title="Elevaciones — Dificultad" size="xl">
                <div className="space-y-5 text-sm text-zinc-700">
                  <p className="text-zinc-500 text-xs leading-relaxed">
                    Evalúa las habilidades de elevación (stunts) ejecutadas por el equipo, considerando dificultad y habilidades de los drivers (spotter/base).
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
                        { label: 'No Cumple',     desc: 'Habilidad básica o no ejecutada al nivel requerido',                          color: 'bg-zinc-100 text-zinc-600' },
                        { label: 'Avanzado +0.10', desc: 'Habilidad claramente de dificultad avanzada dentro del nivel',               color: 'bg-blue-50 text-blue-700' },
                        { label: 'Elite  +0.20',  desc: 'Habilidad de máxima dificultad o complejidad Elite dentro del nivel',         color: 'bg-violet-50 text-violet-700' },
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
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
                <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Rango Base de Complejidad</span>
                <span className="text-sm font-semibold tabular-nums text-zinc-500">Rango: {fmt(stuntsRango)}</span>
              </div>
              <div className="p-4 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  {activeStuntsRango.map(({ value, label }) => (
                    <button key={value} type="button" onClick={() => setStuntsRango(value)}
                      className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors border text-left ${stuntsRango === value ? 'border-transparent' : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-600 hover:bg-zinc-50'}`}
                      style={stuntsRango === value ? { backgroundColor: 'var(--plt-primary)', color: 'var(--plt-primary-fg)', borderColor: 'var(--plt-primary)' } : undefined}
                    >
                      <span className="flex-1">{label}</span>
                      <span className={`text-base font-bold tabular-nums ml-3 shrink-0 ${stuntsRango === value ? 'text-zinc-300' : 'text-zinc-400'}`}>{value.toFixed(1)}</span>
                    </button>
                  ))}
                </div>

                {bCfg.stuntsSkillCount > 0 && (
                  <div>
                    <p className="text-xs font-medium text-zinc-500 mb-2">Grado de Dificultad — Habilidades (+0.10 / +0.20)</p>
                    <div className="flex flex-col gap-2">
                      {stuntSkillLabels.map((skill, i) => {
                        const disabled = i >= activeSkillCount;
                        return (
                          <div key={skill} className="flex items-center gap-3">
                            <span className={`w-28 shrink-0 text-sm ${disabled ? 'text-zinc-400' : 'text-zinc-700'}`}>{skill}</span>
                            <div className="flex flex-1 gap-1.5">
                              {bCfg.stuntsSkillGrades.map(({ label, value }) => (
                                <button key={label} type="button" disabled={disabled}
                                  onClick={() => { const next = [...stuntsSkills]; next[i] = value; setStuntsSkills(next); }}
                                  className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors border ${disabled ? 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed opacity-50' : stuntsSkills[i] === value ? 'border-transparent' : 'bg-white text-zinc-600 border-zinc-300 hover:border-zinc-600'}`}
                                  style={!disabled && stuntsSkills[i] === value ? { backgroundColor: 'var(--plt-primary)', color: 'var(--plt-primary-fg)', borderColor: 'var(--plt-primary)' } : undefined}
                                >
                                  {label}{value > 0 && <span className="ml-1 opacity-70">+{value.toFixed(2)}</span>}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 flex justify-between text-xs border-t border-zinc-100 pt-2">
                      <span className="text-zinc-500">Rango {fmt(stuntsRango)} + Grado Dif {fmt(stuntsSkillsTotal)}</span>
                      <span className="font-semibold text-zinc-900">Total Drivers: {fmt(stuntsDriversTotal)}</span>
                    </div>
                  </div>
                )}

                {bCfg.stuntsPartMaxOpts.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-zinc-500 mb-0.5">Part Max — Spotter / Base</p>
                    <p className="text-[10px] text-zinc-400 mb-2">Habilidad en Canon o Sincronizado · Sin Repetir Atletas</p>
                    <div className="flex flex-col gap-1.5">
                      {bCfg.stuntsPartMaxOpts.map(({ value, label }) => (
                        <button key={value} type="button" onClick={() => setStuntsPartMax(value)}
                          className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors border text-left ${stuntsPartMax === value ? 'border-transparent' : 'bg-white text-zinc-700 border-zinc-300 hover:border-violet-400 hover:text-violet-700'}`}
                          style={stuntsPartMax === value ? { backgroundColor: 'var(--plt-accent)', color: 'var(--plt-primary-fg)', borderColor: 'var(--plt-accent)' } : undefined}
                        >
                          <span className="flex-1">{label}</span>
                          <span className={`text-base font-bold tabular-nums ml-3 shrink-0 ${stuntsPartMax === value ? 'text-white/80' : 'text-zinc-400'}`}>{value.toFixed(1)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <SectionTotal label="Dificultad Stunts" breakdown={[{ key: 'Rango', value: stuntsRango }, { key: 'Drivers', value: stuntsDriversTotal }]} total={stuntsRango + stuntsDriversTotal} />
          </section>
        )}

        {/* ── PYRAMIDS DIFFICULTY ──────────────────────────────────────── */}
        {bCfg.hasPyramids && bCfg.pyramidsHasDiff && (
          <section className="flex flex-col gap-4" style={{ paddingTop: '1rem' }}>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-700">Pirámides — Dificultad</h2>
              <InfoButton title="Pirámides — Dificultad" size="xl">
                <div className="space-y-4 text-sm text-zinc-700">
                  <p className="text-zinc-500 text-xs leading-relaxed">
                    Evalúa las estructuras de pirámide ejecutadas por el equipo. Se considera la variedad y dificultad de las estructuras diferentes del nivel, junto con la calidad de ejecución.
                  </p>
                  <div>
                    <h3 className="font-semibold text-zinc-900 mb-2">Rango de Dificultad</h3>
                    <p className="text-xs text-zinc-500 leading-relaxed">
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
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Rango de Pirámides</span>
                <p className="text-[10px] text-zinc-400 mt-0.5"># Habilidades Diferentes del Nivel + # Estructuras x Gran Parte</p>
              </div>
              <div className="p-4 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  {bCfg.pyramidRango.map(({ low, high, label }, idx) => (
                    <button key={idx} type="button" onClick={() => { setPyramidsRangeIdx(idx); setPyramidsFine(0.0); }}
                      className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors border text-left ${pyramidsRangeIdx === idx ? 'border-transparent' : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-600 hover:bg-zinc-50'}`}
                      style={pyramidsRangeIdx === idx ? { backgroundColor: 'var(--plt-primary)', color: 'var(--plt-primary-fg)', borderColor: 'var(--plt-primary)' } : undefined}
                    >
                      <span className="flex-1">{label}</span>
                      <span className={`text-sm font-bold tabular-nums ml-3 shrink-0 ${pyramidsRangeIdx === idx ? 'text-zinc-300' : 'text-zinc-400'}`}>{low.toFixed(1)}–{high.toFixed(1)}</span>
                    </button>
                  ))}
                </div>

                {pyramidsRangeIdx !== null && bCfg.pyramidFineSteps.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-zinc-500 mb-2">Ajuste dentro del rango</p>
                    <div className="grid grid-cols-6 gap-1">
                      {bCfg.pyramidFineSteps.map(step => (
                        <button key={step} type="button" onClick={() => setPyramidsFine(step)}
                          className={`rounded-lg py-2 text-xs font-semibold tabular-nums transition-colors border ${pyramidsFine === step ? 'border-transparent' : 'bg-white text-zinc-600 border-zinc-300 hover:border-zinc-600'}`}
                          style={pyramidsFine === step ? { backgroundColor: 'var(--plt-primary)', color: 'var(--plt-primary-fg)', borderColor: 'var(--plt-primary)' } : undefined}
                        >+{step.toFixed(1)}</button>
                      ))}
                    </div>
                    <p className="mt-2 text-right text-xs text-zinc-500">Dificultad: <strong className="text-zinc-900 tabular-nums">{pyramidsDiff.toFixed(1)}</strong></p>
                  </div>
                )}

                {bCfg.pyramidDriversOpts.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-zinc-500 mb-1.5">Drivers — Pirámides</p>
                    <div className="flex flex-col gap-1.5">
                      {bCfg.pyramidDriversOpts.map(({ value, label }) => (
                        <button key={value} type="button" onClick={() => setPyramidsDrivers(value)}
                          className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors border text-left ${pyramidsDrivers === value ? 'border-transparent' : 'bg-white text-zinc-700 border-zinc-300 hover:border-violet-400 hover:text-violet-700'}`}
                          style={pyramidsDrivers === value ? { backgroundColor: 'var(--plt-accent)', color: 'var(--plt-primary-fg)', borderColor: 'var(--plt-accent)' } : undefined}
                        >
                          <span className="flex-1">{label}</span>
                          <span className={`text-base font-bold tabular-nums ml-3 shrink-0 ${pyramidsDrivers === value ? 'text-white/80' : 'text-zinc-400'}`}>{value.toFixed(1)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <SectionTotal
              label="Dificultad Pirámides"
              breakdown={[
                { key: 'Dif', value: pyramidsDiff },
                ...(bCfg.pyramidDriversOpts.length > 0 ? [{ key: 'Drivers', value: pyramidsDrivers }] : []),
              ]}
              total={parseFloat((pyramidsDiff + (bCfg.pyramidDriversOpts.length > 0 ? pyramidsDrivers : 0)).toFixed(2))}
            />
          </section>
        )}

        {/* ── TOSSES DIFFICULTY ────────────────────────────────────────── */}
        {bCfg.hasTosses && (
          <section className="flex flex-col gap-4" style={{ paddingTop: '1rem' }}>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-700">Lanzamientos — Dificultad</h2>
              <InfoButton title="Lanzamientos — Dificultad" size="lg">
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
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Dificultad</span>
                <p className="text-[10px] text-zinc-400 mt-0.5">Lanzamiento Apropiado del Nivel</p>
              </div>
              <div className="p-4 flex flex-col gap-1.5">
                {bCfg.tossDiffOpts.map(({ value, label }) => (
                  <button key={value} type="button" onClick={() => setTossesDiff(value)}
                    className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors border text-left ${tossesDiff === value ? 'border-transparent' : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-600 hover:bg-zinc-50'}`}
                    style={tossesDiff === value ? { backgroundColor: 'var(--plt-primary)', color: 'var(--plt-primary-fg)', borderColor: 'var(--plt-primary)' } : undefined}
                  >
                    <span className="flex-1">{label}</span>
                    <span className={`text-base font-bold tabular-nums ml-3 shrink-0 ${tossesDiff === value ? 'text-zinc-300' : 'text-zinc-400'}`}>{value.toFixed(1)}</span>
                  </button>
                ))}
              </div>
            </div>
            <SectionTotal label="Dificultad Lanzamientos" breakdown={[{ key: 'Dif', value: tossesDiff }]} total={tossesDiff} />
          </section>
        )}

        {/* ── TOTAL DIFICULTAD ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between rounded-xl px-5 py-4 shadow-sm" style={{ backgroundColor: 'var(--plt-primary)', color: 'var(--plt-primary-fg)', marginTop: '1rem' }}>
          <span className="text-sm font-semibold uppercase tracking-wide">Subtotal Dificultad</span>
          <span className="text-2xl font-bold tabular-nums">{fmt(diffTotal)}</span>
        </div>

        {/* ── CREATIVITY + SHOWMANSHIP ─────────────────────────────────── */}
        <section className="flex flex-col gap-4" style={{ paddingTop: '1rem' }}>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-700">
              {bCfg.hasCreativity ? 'Creatividad & Showmanship' : 'Cheer / Animación'}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">Puntuado por este juez — se promedia con los otros dos jueces</p>
          </div>
          <div className={`grid gap-4 ${bCfg.hasCreativity ? 'grid-cols-2' : 'grid-cols-1 max-w-md'}`}>
            {bCfg.hasCreativity && (
              <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Creatividad</span>
                    <InfoButton title="Creatividad AD Escénica">
                      <div className="flex flex-col gap-2 text-xs text-zinc-600">
                        <p><strong className="text-zinc-800">Rango: 1.5 – 2.0</strong></p>
                        <p>Evalúa la Creatividad, Innovación y/o efecto visual durante las formaciones, transiciones y construcciones de elevaciones a lo largo de la rutina.</p>
                        <p className="text-zinc-400">Se promedia con los otros dos jueces del panel.</p>
                      </div>
                    </InfoButton>
                  </div>
                  <span className="text-lg font-bold tabular-nums text-zinc-900">{fmt(creativityBuilding)}</span>
                </div>
                <div className="p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <input type="range" min="1.5" max="2.0" step="0.1" value={creativityBuilding} onChange={e => setCreativityBuilding(parseFloat(e.target.value))} className="flex-1 accent-zinc-900" />
                    <input type="number" min="1.5" max="2.0" step="0.1" value={creativityBuilding} onChange={e => setCreativityBuilding(parseFloat(Math.min(2.0, Math.max(1.5, parseFloat(e.target.value) || 1.5)).toFixed(2)))} className="w-16 h-9 rounded-lg border border-zinc-300 px-2 text-center text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-zinc-900" />
                  </div>
                  <p className="text-[11px] text-zinc-400">Creatividad, Innovación y/o visual durante formaciones y construcciones</p>
                </div>
              </div>
            )}
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">{bCfg.hasCreativity ? 'Showmanship' : 'Cheer / Animación'}</span>
                  {bCfg.hasCreativity && (
                    <InfoButton title="Showmanship (Habilidad Escénica)">
                      <div className="flex flex-col gap-2 text-xs text-zinc-600">
                        <p><strong className="text-zinc-800">Rango: 1.0 – 2.0</strong></p>
                        <p>Impresión general del panel sobre toda la presentación, abarcando todas las áreas de la categoría.</p>
                        <p>Enfocarse en: energía del equipo, entusiasmo genuino, confianza, contacto visual y expresión facial.</p>
                        <p className="text-zinc-400">Se promedia con los otros dos jueces del panel.</p>
                      </div>
                    </InfoButton>
                  )}
                </div>
                <span className="text-lg font-bold tabular-nums text-zinc-900">{fmt(showmanshipBuilding)}</span>
              </div>
              <div className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <input type="range" min="1.0" max={bCfg.showmanshipMax} step="0.1" value={showmanshipBuilding} onChange={e => setShowmanshipBuilding(parseFloat(e.target.value))} className="flex-1 accent-zinc-900" />
                  <input type="number" min="1.0" max={bCfg.showmanshipMax} step="0.1" value={showmanshipBuilding} onChange={e => setShowmanshipBuilding(parseFloat(Math.min(bCfg.showmanshipMax, Math.max(1.0, parseFloat(e.target.value) || 1.0)).toFixed(2)))} className="w-16 h-9 rounded-lg border border-zinc-300 px-2 text-center text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-zinc-900" />
                </div>
                <p className="text-[11px] text-zinc-400">{bCfg.hasCreativity ? 'Ritmo, Confianza y Conexión durante la rutina' : 'Cheer / Animación — máx 5.0'}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── OBSERVATIONS ─────────────────────────────────────────────── */}
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
            <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Observaciones del juez</span>
          </div>
          <div className="divide-y divide-zinc-100">
            {[
              { key: 'stunts', label: 'Elevaciones', value: stuntsNotes, set: setStuntsNotes },
              { key: 'pyramids', label: 'Pirámides', value: pyramidsNotes, set: setPyramidsNotes },
              ...(bCfg.hasTosses ? [{ key: 'tosses', label: 'Lanzamientos', value: tossesNotes, set: setTossesNotes }] : []),
            ].map(({ key, label, value, set }) => (
              <div key={key} className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">{label}</p>
                <textarea value={value} onChange={e => set(e.target.value)} placeholder={`Observaciones sobre ${label}...`} rows={2}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900" />
              </div>
            ))}
          </div>
        </div>

        {/* ── GRAND TOTAL ───────────────────────────────────────────────── */}
        <div className="rounded-xl px-6 py-5 flex items-center justify-between shadow-lg" style={{ backgroundColor: 'var(--plt-primary)', color: 'var(--plt-primary-fg)', marginTop: '1rem' }}>
          <div>
            <p className="text-base uppercase tracking-wide font-bold">Total Planilla — Dificultad</p>
            <p className="text-xs opacity-70 mt-0.5">Dif. + Creatividad ({fmt(creativityBuilding)}) + Showmanship ({fmt(showmanshipBuilding)})</p>
          </div>
          <span className="text-4xl font-bold tabular-nums">{fmt(sheetTotal)}</span>
        </div>

      </div>
    </div>
  );
}
