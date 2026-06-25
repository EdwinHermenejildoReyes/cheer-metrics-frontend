'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, FileDown, Clock, CheckCircle, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { PageSpinner } from '@/components/ui/spinner';
import competitionsRepository from '@/repositories/competitionsRepository';
import { getScoringConfig, DEFAULT_BUILDING_CONFIG, DEFAULT_TUMBLING_CONFIG } from '@/lib/scoringConfig';
import type { BuildingConfig, TumblingConfig } from '@/lib/scoringConfig';
import type { ScoreSheet, UnpaidAthlete } from '@/types/competitions';
import { PaymentWarningBanner } from '@/components/competitions/PaymentWarningBanner';
import { SkillReferencePanel } from '@/components/skill-tables/SkillReferencePanel';
import { useBranding } from '@/contexts/BrandingContext';

function fmt(n: number) { return n.toFixed(2); }

// ── Page ─────────────────────────────────────────────────────────────────────
export default function RangosSheetPage() {
  const router = useRouter();
  const { id, divisionId, regId } = useParams<{ id: string; divisionId: string; regId: string }>();
  const competitionId  = Number(id);
  const divId          = Number(divisionId);
  const registrationId = Number(regId);

  const [teamName,           setTeamName]           = useState<string>('');
  const [gymName,            setGymName]            = useState('');
  const [performanceOrder,   setPerformanceOrder]   = useState<number | null>(null);
  const [divisionName,       setDivisionName]       = useState('');
  const [competitionName,    setCompetitionName]    = useState('');
  const [skillLevel,         setSkillLevel]         = useState<string | undefined>(undefined);
  const [existingSheet,      setExistingSheet]      = useState<ScoreSheet | null>(null);
  const [loading,            setLoading]            = useState(true);
  const [exporting,          setExporting]          = useState(false);
  const [bCfg,               setBCfg]               = useState<BuildingConfig>(DEFAULT_BUILDING_CONFIG);
  const [tCfg,               setTCfg]               = useState<TumblingConfig>(DEFAULT_TUMBLING_CONFIG);
  const [unpaidAthletes,     setUnpaidAthletes]     = useState<UnpaidAthlete[]>([]);
  const [requirePayment,     setRequirePayment]     = useState(false);
  const [protestStartedAt,   setProtestStartedAt]   = useState<string | null>(null);

  const { organization } = useBranding();

  // ── Stunts difficulty ─────────────────────────────────────────────────────
  const [stuntsRango,   setStuntsRango]   = useState<number>(0);
  const [stuntsSkills,  setStuntsSkills]  = useState<(number | null)[]>([null, null, null, null, null]);
  const [stuntsPartMax, setStuntsPartMax] = useState<number | null>(null);
  const [stuntsNotes,   setStuntsNotes]   = useState('');
  const [pyramidsNotes, setPyramidsNotes] = useState('');
  const [tossesNotes,   setTossesNotes]   = useState('');
  const [standingNotes, setStandingNotes] = useState('');
  const [runningNotes,  setRunningNotes]  = useState('');
  const [jumpsNotes,    setJumpsNotes]    = useState('');

  // ── Pyramids difficulty ───────────────────────────────────────────────────
  const [pyramidsRangeIdx, setPyramidsRangeIdx] = useState<number | null>(null);
  const [pyramidsFine,     setPyramidsFine]     = useState<number>(0.0);

  // ── Tosses difficulty ─────────────────────────────────────────────────────
  const [tossesDiff, setTossesDiff] = useState<number>(0.0);

  // ── Standing (Estática) difficulty ────────────────────────────────────────
  const [standingRango,     setStandingRango]     = useState<number>(0);
  const [standingHabilidad, setStandingHabilidad] = useState<number>(0.0);

  // ── Running (Con Carrera) difficulty ─────────────────────────────────────
  const [runningRango,     setRunningRango]     = useState<number>(0);
  const [runningHabilidad, setRunningHabilidad] = useState<number>(0.0);

  // ── Jumps difficulty ──────────────────────────────────────────────────────
  const [jumpsDiff, setJumpsDiff] = useState<number>(0);

  // ── Computed ──────────────────────────────────────────────────────────────
  const stuntsSkillsTotal  = parseFloat(stuntsSkills.reduce<number>((s, v) => s + (v ?? 0), 0).toFixed(2));
  const stuntsDriversTotal = parseFloat((stuntsSkillsTotal + (stuntsPartMax ?? 0)).toFixed(2));
  const pyramidsDiff = pyramidsRangeIdx !== null
    ? parseFloat((bCfg.pyramidRango[pyramidsRangeIdx].low + pyramidsFine).toFixed(2))
    : 0.0;

  // ── Derived from config ───────────────────────────────────────────────────
  const stuntSkillLabels = Array.from(
    { length: bCfg.stuntsSkillCount },
    (_, i) => i === 4 ? 'Habilidad #5 / Coed' : `Habilidad #${i + 1}`
  );

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const [sheetRes, regRes, divRes] = await Promise.all([
        competitionsRepository.listScoreSheets({ registration: String(registrationId) }),
        competitionsRepository.listRegistrations({ division: String(divId), page_size: '100' }),
        competitionsRepository.getDivision(divId),
      ]);

      const reg = regRes.data.results.find((r) => r.id === registrationId);
      if (reg) {
        setTeamName(reg.team_name);
        setGymName(reg.gym_name ?? '');
        setPerformanceOrder(reg.performance_order ?? null);
        setUnpaidAthletes(reg.unpaid_athletes);
        setRequirePayment(reg.competition_require_payment);
      }
      setDivisionName(divRes.data.name);
      setCompetitionName(divRes.data.competition_name);
      setSkillLevel(divRes.data.skill_level);

      const sysConfig = getScoringConfig(divRes.data);
      const bcfg = sysConfig.building;
      const tcfg = sysConfig.tumbling;
      setBCfg(bcfg);
      setTCfg(tcfg);

      // Config-based defaults
      if (bcfg.stuntsHasDiff && bcfg.stuntsRango.length > 0) setStuntsRango(bcfg.stuntsRango[0].value);
      else setStuntsRango(0);
      if (tcfg.standingHasDiff && tcfg.standingRango.length > 0) setStandingRango(tcfg.standingRango[0].value);
      else setStandingRango(0);
      if (tcfg.runningHasDiff && tcfg.runningRango.length > 0) setRunningRango(tcfg.runningRango[0].value);
      else setRunningRango(0);
      if (tcfg.jumpsHasDiff && tcfg.jumpsDiffOpts.length > 0) setJumpsDiff(tcfg.jumpsDiffOpts[0].value);
      else setJumpsDiff(0);

      if (sheetRes.data.results.length > 0) {
        const sheet = sheetRes.data.results[0];
        setExistingSheet(sheet);
        if (!reg) setTeamName(sheet.team_name);

        // Stunts
        if (sheet.stunts_difficulty) {
          const v = parseFloat(sheet.stunts_difficulty);
          if (bcfg.stuntsRango.some(r => r.value === v)) setStuntsRango(v);
        }

        // Pyramids
        if (sheet.pyramids_difficulty) {
          const v = parseFloat(sheet.pyramids_difficulty);
          const idx = bcfg.pyramidRango.findIndex((r) => v >= r.low && v <= r.high);
          if (idx !== -1) {
            setPyramidsRangeIdx(idx);
            const fine = parseFloat((v - bcfg.pyramidRango[idx].low).toFixed(1));
            setPyramidsFine(bcfg.pyramidFineSteps.includes(fine) ? fine : 0.0);
          }
        }

        // Tosses
        if (sheet.tosses_difficulty) {
          const v = parseFloat(sheet.tosses_difficulty);
          const match = bcfg.tossDiffOpts.find((o) => o.value === v);
          if (match) setTossesDiff(match.value);
        }

        // Standing
        if (sheet.standing_difficulty) {
          const v = parseFloat(sheet.standing_difficulty);
          const match = tcfg.standingRango.find((o) => o.value === v);
          if (match) setStandingRango(match.value);
        }
        if (sheet.standing_drivers) {
          const v = parseFloat(sheet.standing_drivers);
          const match = tcfg.standingHabilidad.find((o) => o.value === v);
          if (match) setStandingHabilidad(match.value);
        }

        // Running
        if (sheet.running_difficulty) {
          const v = parseFloat(sheet.running_difficulty);
          const match = tcfg.runningRango.find((o) => o.value === v);
          if (match) setRunningRango(match.value);
        }
        if (sheet.running_drivers) {
          const v = parseFloat(sheet.running_drivers);
          const match = tcfg.runningHabilidad.find((o) => o.value === v);
          if (match) setRunningHabilidad(match.value);
        }

        // Jumps
        if (sheet.jumps_difficulty) {
          const v = parseFloat(sheet.jumps_difficulty);
          const match = tcfg.jumpsDiffOpts.find((o) => o.value === v);
          if (match) setJumpsDiff(match.value);
        }

        // Notes restoration — supports both grupal (stunts/pyramids/tosses) and individual (bd_*/td_*) key formats
        if (sheet.notes) {
          try {
            const p = JSON.parse(sheet.notes);
            setStuntsNotes(p.bd_stunts ?? p.stunts ?? '');
            setPyramidsNotes(p.bd_pyramids ?? p.pyramids ?? '');
            setTossesNotes(p.bd_tosses ?? p.tosses ?? '');
            setStandingNotes(p.td_standing ?? p.standing ?? '');
            setRunningNotes(p.td_running ?? p.running ?? '');
            setJumpsNotes(p.td_jumps ?? p.jumps ?? '');
            const s = p._scores ?? {};
            const srango = s.bd_stuntsRango ?? s.stuntsRango;
            if (srango !== undefined && bcfg.stuntsRango.some(r => r.value === srango)) setStuntsRango(srango);
            const sskills = s.bd_stuntsSkills ?? s.stuntsSkills;
            if (Array.isArray(sskills)) {
              setStuntsSkills(Array(5).fill(null).map((_, i) => sskills[i] ?? null));
            }
            const spartmax = s.bd_stuntsPartMax ?? s.stuntsPartMax;
            if (spartmax !== undefined && spartmax !== null && bcfg.stuntsPartMaxOpts.some(o => o.value === spartmax)) setStuntsPartMax(spartmax);
            if (p.protest_started_at) setProtestStartedAt(p.protest_started_at);
          } catch { /* ignore malformed notes */ }
        }
      }
    } finally {
      setLoading(false);
    }
  }, [registrationId, divId]);

  useEffect(() => { load(); }, [load]);

  // Admin polling — refresh score data every 5 s
  useEffect(() => {
    if (loading) return;
    const interval = setInterval(async () => {
      try {
        const sheetRes = await competitionsRepository.listScoreSheets({ registration: String(registrationId) });
        if (sheetRes.data.results.length === 0) return;
        const sheet = sheetRes.data.results[0];
        setExistingSheet(sheet);
        if (sheet.stunts_difficulty) {
          const v = parseFloat(sheet.stunts_difficulty);
          if (bCfg.stuntsRango.some(r => r.value === v)) setStuntsRango(v);
        }
        if (sheet.pyramids_difficulty) {
          const v = parseFloat(sheet.pyramids_difficulty);
          const idx = bCfg.pyramidRango.findIndex((r) => v >= r.low && v <= r.high);
          if (idx !== -1) {
            setPyramidsRangeIdx(idx);
            const fine = parseFloat((v - bCfg.pyramidRango[idx].low).toFixed(1));
            setPyramidsFine(bCfg.pyramidFineSteps.includes(fine) ? fine : 0.0);
          }
        }
        if (sheet.tosses_difficulty) {
          const v = parseFloat(sheet.tosses_difficulty);
          const match = bCfg.tossDiffOpts.find((o) => o.value === v);
          if (match) setTossesDiff(match.value);
        }
        if (sheet.standing_difficulty) {
          const v = parseFloat(sheet.standing_difficulty);
          const match = tCfg.standingRango.find((o) => o.value === v);
          if (match) setStandingRango(match.value);
        }
        if (sheet.standing_drivers) {
          const v = parseFloat(sheet.standing_drivers);
          const match = tCfg.standingHabilidad.find((o) => o.value === v);
          if (match) setStandingHabilidad(match.value);
        }
        if (sheet.running_difficulty) {
          const v = parseFloat(sheet.running_difficulty);
          const match = tCfg.runningRango.find((o) => o.value === v);
          if (match) setRunningRango(match.value);
        }
        if (sheet.running_drivers) {
          const v = parseFloat(sheet.running_drivers);
          const match = tCfg.runningHabilidad.find((o) => o.value === v);
          if (match) setRunningHabilidad(match.value);
        }
        if (sheet.jumps_difficulty) {
          const v = parseFloat(sheet.jumps_difficulty);
          const match = tCfg.jumpsDiffOpts.find((o) => o.value === v);
          if (match) setJumpsDiff(match.value);
        }
        if (sheet.notes) {
          try {
            const p = JSON.parse(sheet.notes);
            setStuntsNotes(p.bd_stunts ?? p.stunts ?? '');
            setPyramidsNotes(p.bd_pyramids ?? p.pyramids ?? '');
            setTossesNotes(p.bd_tosses ?? p.tosses ?? '');
            setStandingNotes(p.td_standing ?? p.standing ?? '');
            setRunningNotes(p.td_running ?? p.running ?? '');
            setJumpsNotes(p.td_jumps ?? p.jumps ?? '');
            const s = p._scores ?? {};
            const srango = s.bd_stuntsRango ?? s.stuntsRango;
            if (srango !== undefined && bCfg.stuntsRango.some(r => r.value === srango)) setStuntsRango(srango);
            const sskills = s.bd_stuntsSkills ?? s.stuntsSkills;
            if (Array.isArray(sskills)) setStuntsSkills(Array(5).fill(null).map((_: unknown, i: number) => sskills[i] ?? null));
            const spartmax = s.bd_stuntsPartMax ?? s.stuntsPartMax;
            if (spartmax !== undefined && spartmax !== null && bCfg.stuntsPartMaxOpts.some(o => o.value === spartmax)) setStuntsPartMax(spartmax);
            if (p.protest_started_at) setProtestStartedAt(p.protest_started_at);
          } catch { /* noop */ }
        }
      } catch { /* noop */ }
    }, 5000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, registrationId, bCfg, tCfg]);

  // ── Export PDF — records protest start on first export ────────────────────
  const handleExport = async () => {
    if (!existingSheet) { window.print(); return; }

    // If protest hasn't started yet, record the timestamp now
    if (!protestStartedAt) {
      setExporting(true);
      try {
        let existing: Record<string, unknown> = {};
        try { existing = JSON.parse(existingSheet.notes || '{}'); } catch {}
        const now = new Date().toISOString();
        const res = await competitionsRepository.updateScoreSheet(existingSheet.id, {
          notes: JSON.stringify({ ...existing, protest_started_at: now }),
        });
        setExistingSheet(res.data);
        setProtestStartedAt(now);
        toast.success('Reloj de reclamo iniciado — 15 minutos');
      } catch {
        toast.error('No se pudo registrar la exportación');
        return;
      } finally {
        setExporting(false);
      }
    }

    window.print();
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="min-h-screen bg-zinc-50 pb-16">

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 5mm 8mm; }
          body {
            zoom: 0.60;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      {/* ── Sticky top bar ──────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-white border-b border-zinc-200 px-6 py-3 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/competitions/${competitionId}/divisions/${divId}`)}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-400 font-medium">Planilla — Rangos (Dificultad)</p>
            <p className="text-sm font-semibold text-zinc-900 leading-tight">
              {teamName || `Inscripción #${registrationId}`}
            </p>
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-zinc-900 text-white hover:bg-zinc-700 transition-colors disabled:opacity-50"
        >
          <FileDown className="h-4 w-4" />
          {exporting ? 'Registrando...' : 'Exportar PDF'}
        </button>
      </div>
      <PaymentWarningBanner unpaidAthletes={unpaidAthletes} requirePayment={requirePayment} />
      <SkillReferencePanel skillLevel={skillLevel} sheetType="building" />
      {protestStartedAt && <ProtestTimer startedAt={protestStartedAt} />}

      {/* ── Print-only branded header ────────────────────────────────────── */}
      <div className="hidden print:block px-0 pb-3">
        <div
          className="overflow-hidden"
          style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)' }}
        >
          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-3">
              {organization?.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={organization.logo} alt={organization.name ?? ''} className="h-7 object-contain"
                  style={{ filter: 'brightness(0) invert(1)' }} />
              ) : (
                <Trophy className="h-5 w-5 opacity-80" />
              )}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest opacity-75">{organization?.name ?? ''}</p>
                <p className="text-[10px] opacity-60">{competitionName}</p>
              </div>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Planilla — Rangos (Dificultad)</p>
          </div>
          <div className="px-5 pb-4">
            <h1 className="text-xl font-bold leading-tight" style={{ color: 'var(--brand-primary-text)' }}>
              {teamName || `Inscripción #${registrationId}`}
            </h1>
            {gymName && <p className="text-xs opacity-70 mt-0.5">{gymName}</p>}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {divisionName && (
                <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'var(--brand-primary-text)' }}>
                  {divisionName}
                </span>
              )}
              {performanceOrder && (
                <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                  style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'var(--brand-primary-text)' }}>
                  Salida #{performanceOrder}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 print:px-0 print:py-0 pointer-events-none select-none">
        <div className="grid grid-cols-2 gap-8 print:gap-4 items-start">

        {/* ══ CONSTRUCCIONES ════════════════════════════════════════════════ */}
        <div>
          <h1 className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-6">
            Construcciones
          </h1>

          {/* ── ELEVACIONES ─────────────────────────────────────────────── */}
          {bCfg.hasStunts ? (
            <section className="flex flex-col gap-4 print:gap-2 mb-8 print:mb-3">
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-700">
                Elevaciones — Stunts
              </h2>

              {!bCfg.stuntsHasDiff ? (
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-5 text-center">
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Sin Dificultad</p>
                  <p className="text-sm text-zinc-400 mt-1">Solo Ejecución — no se califica rango aquí</p>
                </div>
              ) : (
                <>
                  <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                    <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                      <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Rango Base de Complejidad</span>
                    </div>
                    <div className="p-4">
                      {bCfg.stuntsRango.filter(r => r.value === stuntsRango).map(({ value, label }) => (
                        <div
                          key={value}
                          className="flex items-center justify-between rounded-lg px-4 py-2.5 text-sm font-medium border border-transparent"
                          style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)' }}
                        >
                          <span>{label}</span>
                          <span className="text-base font-bold tabular-nums">{value.toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Grado de Dificultad per skill */}
                  {bCfg.stuntsSkillCount > 0 && (
                    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                      <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                        <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Grado de Dificultad — Habilidades</span>
                      </div>
                      <div className="divide-y divide-zinc-100">
                        {stuntSkillLabels.map((skill, i) => {
                          const grade = bCfg.stuntsSkillGrades.find(g => g.value === stuntsSkills[i]);
                          return (
                            <div key={skill} className="flex items-center justify-between px-4 py-2.5">
                              <span className="text-sm text-zinc-700">{skill}</span>
                              {grade ? (
                                <span
                                  className="rounded-lg px-3 py-1 text-xs font-medium border border-transparent"
                                  style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)' }}
                                >
                                  {grade.label}{grade.value > 0 && <span className="ml-1 opacity-70">+{grade.value.toFixed(2)}</span>}
                                </span>
                              ) : (
                                <span className="text-xs text-zinc-400">—</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between px-4 py-2.5 bg-zinc-50 border-t border-zinc-100 text-xs">
                        <span className="text-zinc-500">
                          Rango {fmt(stuntsRango)} + Grado Dif {fmt(stuntsSkillsTotal)}
                        </span>
                        <span className="font-bold text-zinc-900">Total Drivers: {fmt(stuntsDriversTotal)}</span>
                      </div>
                    </div>
                  )}

                  {/* Part Max */}
                  {bCfg.stuntsPartMaxOpts.length > 0 && (
                    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                      <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                        <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Part Max — Spotter / Base</span>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Habilidad en Canon o Sincronizado · Sin Repetir Atletas</p>
                      </div>
                      <div className="p-4">
                        {bCfg.stuntsPartMaxOpts.filter(o => o.value === stuntsPartMax).map(({ value, label }) => (
                          <div
                            key={value}
                            className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium border border-transparent"
                            style={{ backgroundColor: 'var(--brand-accent)', color: 'var(--brand-primary-text)' }}
                          >
                            <span className="flex-1">{label}</span>
                            <span className="text-base font-bold tabular-nums ml-3 shrink-0">{value.toFixed(1)}</span>
                          </div>
                        ))}
                        {stuntsPartMax === null && (
                          <p className="text-sm text-zinc-400 text-center py-1">Sin selección</p>
                        )}
                      </div>
                    </div>
                  )}

                </>
              )}
              <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-100">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Comentario del Juez — Elevaciones</span>
                </div>
                <p className={`px-4 py-3 text-sm whitespace-pre-wrap ${stuntsNotes ? 'text-zinc-700' : 'text-zinc-400 italic'}`}>
                  {stuntsNotes || 'Sin observaciones'}
                </p>
              </div>
            </section>
          ) : (
            <section className="mb-8">
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-700 mb-4">Elevaciones — Stunts</h2>
              <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">No Aplica para esta División</p>
              </div>
            </section>
          )}

          {/* ── PIRÁMIDES ───────────────────────────────────────────────── */}
          {bCfg.hasPyramids ? (
            <section className="flex flex-col gap-4 print:gap-2 mb-8 print:mb-3">
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-700">Pirámides</h2>

              {!bCfg.pyramidsHasDiff ? (
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-5 text-center">
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Sin Dificultad</p>
                  <p className="text-sm text-zinc-400 mt-1">Solo Ejecución — no se califica rango aquí</p>
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                  <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                    <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Rango de Complejidad</span>
                  </div>
                  <div className="p-4">
                    {pyramidsRangeIdx !== null ? (
                      <div
                        className="flex items-center justify-between rounded-lg px-4 py-2.5 text-sm font-medium border border-transparent"
                        style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)' }}
                      >
                        <span>{bCfg.pyramidRango[pyramidsRangeIdx].label}</span>
                        <span className="text-sm font-bold tabular-nums">
                          {bCfg.pyramidRango[pyramidsRangeIdx].low.toFixed(1)} – {bCfg.pyramidRango[pyramidsRangeIdx].high.toFixed(1)}
                        </span>
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-400 text-center">Sin selección</p>
                    )}
                  </div>

                  {pyramidsRangeIdx !== null && bCfg.pyramidFineSteps.length > 0 && (
                    <div className="border-t border-zinc-200 px-4 py-3 bg-zinc-50 flex items-center justify-between">
                      <p className="text-xs font-medium text-zinc-500">
                        Ajuste fino — rango {bCfg.pyramidRango[pyramidsRangeIdx].low.toFixed(1)}–{bCfg.pyramidRango[pyramidsRangeIdx].high.toFixed(1)}
                      </p>
                      <span
                        className="rounded-lg px-4 py-2 text-sm font-semibold border border-transparent"
                        style={{ backgroundColor: 'var(--brand-accent)', color: 'var(--brand-primary-text)' }}
                      >
                        {parseFloat((bCfg.pyramidRango[pyramidsRangeIdx].low + pyramidsFine).toFixed(1)).toFixed(1)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between px-4 py-2.5 border-t border-zinc-200 text-xs">
                    <span className="text-zinc-500">Pirámides — Dificultad</span>
                    <span className="font-bold text-zinc-900">{fmt(pyramidsDiff)}</span>
                  </div>
                </div>
              )}
              <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-100">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Comentario del Juez — Pirámides</span>
                </div>
                <p className={`px-4 py-3 text-sm whitespace-pre-wrap ${pyramidsNotes ? 'text-zinc-700' : 'text-zinc-400 italic'}`}>
                  {pyramidsNotes || 'Sin observaciones'}
                </p>
              </div>
            </section>
          ) : null}

          {/* ── LANZAMIENTOS ────────────────────────────────────────────── */}
          {bCfg.hasTosses && (
            <section className="flex flex-col gap-4 print:gap-2">
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-700">Lanzamientos — Tosses</h2>

              <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                  <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Dificultad</span>
                </div>
                <div className="p-4">
                  {bCfg.tossDiffOpts.filter(o => o.value === tossesDiff).map(({ value, label }) => (
                    <div
                      key={value}
                      className="flex items-center justify-between rounded-lg px-4 py-2.5 text-sm font-medium border border-transparent"
                      style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)' }}
                    >
                      <span>{label}</span>
                      <span className="text-base font-bold tabular-nums">{value === 0 ? '—' : value.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-100">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Comentario del Juez — Lanzamientos</span>
                </div>
                <p className={`px-4 py-3 text-sm whitespace-pre-wrap ${tossesNotes ? 'text-zinc-700' : 'text-zinc-400 italic'}`}>
                  {tossesNotes || 'Sin observaciones'}
                </p>
              </div>
            </section>
          )}

        </div>

        {/* ══ GIMNASIA ══════════════════════════════════════════════════════ */}
        <div>
          <h1 className="text-[10px] font-bold uppercase tracking-widest text-green-500 mb-6">
            Gimnasia
          </h1>

          {/* ── ESTÁTICA ────────────────────────────────────────────────── */}
          {tCfg.hasStanding ? (
            <section className="flex flex-col gap-4 print:gap-2 mb-8 print:mb-3">
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-700">
                Gimnasia Estática (Standing)
              </h2>

              {!tCfg.standingHasDiff ? (
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-5 text-center">
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Sin Dificultad</p>
                  <p className="text-sm text-zinc-400 mt-1">Solo Ejecución — no se califica rango aquí</p>
                </div>
              ) : (
                <>
                  <TumblingDiffCard
                    label="Rango Base"
                    options={tCfg.standingRango}
                    selected={standingRango}
                  />
                  <TumblingDiffCard
                    label="Habilidad"
                    options={tCfg.standingHabilidad}
                    selected={standingHabilidad}
                    accent="emerald"
                  />
                </>
              )}
              <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-100">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Comentario del Juez — Estática</span>
                </div>
                <p className={`px-4 py-3 text-sm whitespace-pre-wrap ${standingNotes ? 'text-zinc-700' : 'text-zinc-400 italic'}`}>
                  {standingNotes || 'Sin observaciones'}
                </p>
              </div>
            </section>
          ) : null}

          {/* ── CON CARRERA ─────────────────────────────────────────────── */}
          {tCfg.hasRunning ? (
            <section className="flex flex-col gap-4 print:gap-2 mb-8 print:mb-3">
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-700">
                Gimnasia Con Carrera (Running)
              </h2>

              {!tCfg.runningHasDiff ? (
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-5 text-center">
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Sin Dificultad</p>
                  <p className="text-sm text-zinc-400 mt-1">Solo Ejecución — no se califica rango aquí</p>
                </div>
              ) : (
                <>
                  <TumblingDiffCard
                    label="Rango Base"
                    options={tCfg.runningRango}
                    selected={runningRango}
                  />
                  <TumblingDiffCard
                    label="Habilidad"
                    options={tCfg.runningHabilidad}
                    selected={runningHabilidad}
                    accent="emerald"
                  />
                </>
              )}
              <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-100">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Comentario del Juez — Con Carrera</span>
                </div>
                <p className={`px-4 py-3 text-sm whitespace-pre-wrap ${runningNotes ? 'text-zinc-700' : 'text-zinc-400 italic'}`}>
                  {runningNotes || 'Sin observaciones'}
                </p>
              </div>
            </section>
          ) : null}

          {/* ── SALTOS ──────────────────────────────────────────────────── */}
          {tCfg.hasJumps && (
            <section className="flex flex-col gap-4 print:gap-2">
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-700">
                Saltos (Jumps)
              </h2>

              {!tCfg.jumpsHasDiff ? (
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-5 text-center">
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Sin Dificultad</p>
                  <p className="text-sm text-zinc-400 mt-1">Solo Ejecución — no se califica rango aquí</p>
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                  <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                    <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Dificultad</span>
                  </div>
                  <div className="p-4">
                    {tCfg.jumpsDiffOpts.filter(o => o.value === jumpsDiff).map(({ value, label }) => (
                      <div
                        key={value}
                        className="flex items-center justify-between rounded-lg px-4 py-2.5 text-sm font-medium border border-zinc-900 bg-zinc-900 text-white"
                      >
                        <span>{label}</span>
                        <span className="text-base font-bold tabular-nums">{value.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-100">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Comentario del Juez — Saltos</span>
                </div>
                <p className={`px-4 py-3 text-sm whitespace-pre-wrap ${jumpsNotes ? 'text-zinc-700' : 'text-zinc-400 italic'}`}>
                  {jumpsNotes || 'Sin observaciones'}
                </p>
              </div>
            </section>
          )}

        </div>

        </div>{/* end grid */}
      </div>
    </div>
  );
}

// ── Protest timer ─────────────────────────────────────────────────────────────

function ProtestTimer({ startedAt }: { startedAt: string }) {
  const deadline = new Date(new Date(startedAt).getTime() + 15 * 60 * 1000);
  const [remaining, setRemaining] = useState<number>(deadline.getTime() - Date.now());

  useEffect(() => {
    const id = setInterval(() => setRemaining(deadline.getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAt]);

  if (remaining <= 0) {
    return (
      <div className="flex items-center gap-2 bg-zinc-100 border-b border-zinc-200 px-6 py-2.5 text-zinc-500">
        <CheckCircle className="h-4 w-4 shrink-0" />
        <p className="text-sm">La ventana de reclamo ha expirado.</p>
      </div>
    );
  }

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const isUrgent = remaining < 3 * 60 * 1000;

  return (
    <div className={`flex items-center gap-2 border-b px-6 py-2.5 ${isUrgent ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
      <Clock className={`h-4 w-4 shrink-0 ${isUrgent ? 'text-red-500' : 'text-amber-500'}`} />
      <div>
        <p className="text-sm font-semibold">
          Ventana de reclamo: {mins}:{secs.toString().padStart(2, '0')} restantes
        </p>
        <p className="text-xs opacity-75">Vence a las {deadline.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}</p>
      </div>
    </div>
  );
}

// ── Reusable option-list card (display-only) ─────────────────────────────────
function TumblingDiffCard({
  label,
  options,
  selected,
  accent = 'zinc',
}: {
  label: string;
  options: { value: number; label: string }[];
  selected: number;
  accent?: 'zinc' | 'emerald';
}) {
  const activeStyle = accent === 'emerald'
    ? { backgroundColor: 'var(--brand-accent)', color: 'var(--brand-primary-text)' }
    : { backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)' };

  const selectedOpt = options.find(o => o.value === selected);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
        <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">{label}</span>
      </div>
      <div className="p-4">
        {selectedOpt ? (
          <div
            className="flex items-center justify-between rounded-lg px-4 py-2.5 text-sm font-medium border border-transparent"
            style={activeStyle}
          >
            <span>{selectedOpt.label}</span>
            <span className="text-base font-bold tabular-nums">{selectedOpt.value.toFixed(1)}</span>
          </div>
        ) : (
          <p className="text-sm text-zinc-400 text-center">Sin selección</p>
        )}
      </div>
    </div>
  );
}
