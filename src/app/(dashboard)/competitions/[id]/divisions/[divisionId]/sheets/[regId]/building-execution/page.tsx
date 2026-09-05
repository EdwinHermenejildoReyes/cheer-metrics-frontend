'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageSpinner } from '@/components/ui/spinner';
import { InfoButton } from '@/components/ui/InfoButton';
import competitionsRepository from '@/repositories/competitionsRepository';
import { getScoringConfig, DEFAULT_BUILDING_CONFIG } from '@/lib/scoringConfig';
import { getConstructionGroups } from '@/lib/constructionTable';
import { useJudge } from '@/hooks/useJudge';
import { toastApiError } from '@/utils/apiErrors';
import type { BuildingConfig } from '@/lib/scoringConfig';
import type { Division, ScoreSheet, UnpaidAthlete } from '@/types/competitions';
import { PaymentWarningBanner } from '@/components/competitions/PaymentWarningBanner';
import { SkillReferencePanel } from '@/components/skill-tables/SkillReferencePanel';

const EXEC_CATS      = ['Flyer', 'Base/Spotter', 'Transición', 'Sincronización'];
const TOSS_EXEC_CATS = ['Flyer', 'Base/Spotter', 'Altura'];
const EXEC_DED_OPTS   = [0.05, 0.10, 0.20, 0.30];
const EXEC_DED_LABELS = ['Mínimos', 'Menores', 'Múltiples', 'Generalizados'];

type ExecDeds = (number | null)[];

function execScore(max: number, deds: ExecDeds): number {
  const sum = deds.reduce<number>((s, d) => s + (d ?? 0), 0);
  return parseFloat(Math.max(0, max - sum).toFixed(2));
}
function fmt(n: number) { return n.toFixed(2); }

function ExecSection({ label, max, deds, onChange, cats = EXEC_CATS }: {
  label: string; max: number; deds: ExecDeds; onChange: (d: ExecDeds) => void; cats?: string[];
}) {
  const score    = execScore(max, deds);
  const totalDed = deds.reduce<number>((s, d) => s + (d ?? 0), 0);
  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">{label} — Ejecución</span>
          <InfoButton title={`Ejecución — ${label}`} size="lg">
            <div className="space-y-3 text-sm">
              <table className="w-full text-xs border-collapse">
                <thead><tr className="bg-zinc-50">
                  <th className="text-left px-3 py-1.5 border border-zinc-200 font-medium text-zinc-600">Nivel</th>
                  <th className="text-center px-3 py-1.5 border border-zinc-200 font-medium text-zinc-600 w-16">Descuento</th>
                  <th className="text-left px-3 py-1.5 border border-zinc-200 font-medium text-zinc-600">Criterio</th>
                </tr></thead>
                <tbody>
                  {[
                    { label: 'Mínimos', amt: '−0.05', desc: 'Errores leves, casi imperceptibles' },
                    { label: 'Menores', amt: '−0.10', desc: 'Errores claramente visibles pero controlados' },
                    { label: 'Múltiples', amt: '−0.20', desc: 'Errores frecuentes o repetidos' },
                    { label: 'Generalizados', amt: '−0.30', desc: 'Errores graves o falta de control notoria' },
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
          </InfoButton>
        </div>
        <span className="text-sm font-semibold tabular-nums text-zinc-600">Máx: {fmt(max)}</span>
      </div>
      <div className="divide-y divide-zinc-100">
        {cats.map((cat, i) => (
          <div key={cat} className="flex items-center gap-3 px-4 py-2.5">
            <span className="w-28 shrink-0 text-sm text-zinc-700">{cat}</span>
            <div className="flex flex-1 gap-1.5">
              {EXEC_DED_OPTS.map((amt, aidx) => {
                const active = deds[i] === amt;
                return (
                  <button key={amt} type="button"
                    onClick={() => { const next = [...deds] as ExecDeds; next[i] = active ? null : amt; onChange(next); }}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors border flex flex-col items-center gap-0.5 ${active ? 'bg-red-600 text-white border-red-600' : 'bg-white text-zinc-600 border-zinc-300 hover:border-red-400 hover:text-red-600'}`}
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
        <span className={`text-lg font-bold tabular-nums ${totalDed > 0 ? 'text-red-700' : 'text-zinc-900'}`}>{fmt(score)}</span>
      </div>
    </div>
  );
}

function AutoResizeTextarea({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (ref.current) { ref.current.style.height = 'auto'; ref.current.style.height = `${ref.current.scrollHeight}px`; }
  }, [value]);
  return (
    <textarea ref={ref} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 resize-none overflow-hidden focus:outline-none focus:ring-2 focus:ring-zinc-900"
      style={{ minHeight: '80px' }} />
  );
}

export default function BuildingExecutionPage() {
  const router = useRouter();
  const { id, divisionId, regId } = useParams<{ id: string; divisionId: string; regId: string }>();

  const { isJudge, isCompetitionActive } = useJudge();
  const [competitionIntId, setCompetitionIntId] = useState<number | null>(null);
  const [regIntId, setRegIntId] = useState<number | null>(null);
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

  const EMPTY4: ExecDeds = [null, null, null, null];
  const [stuntsExecDeds,   setStuntsExecDeds]   = useState<ExecDeds>([...EMPTY4]);
  const [pyramidsExecDeds, setPyramidsExecDeds] = useState<ExecDeds>([...EMPTY4]);
  const [tossesExecDeds,   setTossesExecDeds]   = useState<ExecDeds>([null, null, null]);
  const [stuntsNotes,   setStuntsNotes]   = useState('');
  const [pyramidsNotes, setPyramidsNotes] = useState('');
  const [tossesNotes,   setTossesNotes]   = useState('');

  const stuntsExecTotal   = execScore(bCfg.stuntsExecMax,   stuntsExecDeds);
  const pyramidsExecTotal = execScore(bCfg.pyramidsExecMax, pyramidsExecDeds);
  const tossesExecTotal   = execScore(bCfg.tossesExecMax,   tossesExecDeds);
  const sheetTotal = parseFloat((stuntsExecTotal + pyramidsExecTotal + (bCfg.hasTosses ? tossesExecTotal : 0)).toFixed(2));

  const load = useCallback(async () => {
    try {
      const [sheetRes, regRes, divRes] = await Promise.all([
        competitionsRepository.listScoreSheets({ registration__public_id: regId }),
        competitionsRepository.listRegistrations({ division__public_id: divisionId, page_size: '100' }),
        competitionsRepository.getDivision(divisionId),
      ]);
      const reg = regRes.data.results.find(r => r.public_id === regId);
      if (reg) {
        setRegIntId(reg.id); setTeamName(reg.team_name); setAthleteCount(reg.athlete_count ?? null); setUnpaidAthletes(reg.unpaid_athletes); setRequirePayment(reg.competition_require_payment); }
      const cfg = getScoringConfig(divRes.data).building;
      setBCfg(cfg);
      setDivision(divRes.data);
      setCompetitionIntId(divRes.data.competition);
      if (sheetRes.data.results.length > 0) {
        const sheet = sheetRes.data.results[0];
        setExistingSheet(sheet);
        if (!reg) setTeamName(sheet.team_name);
        if (sheet.notes) {
          try {
            const p = JSON.parse(sheet.notes);
            setStuntsNotes(p.be_stunts ?? '');
            setPyramidsNotes(p.be_pyramids ?? '');
            setTossesNotes(p.be_tosses ?? '');
            const s = p._scores ?? {};
            if (Array.isArray(s.be_stuntsExecDeds))   setStuntsExecDeds(s.be_stuntsExecDeds);
            if (Array.isArray(s.be_pyramidsExecDeds)) setPyramidsExecDeds(s.be_pyramidsExecDeds);
            if (Array.isArray(s.be_tossesExecDeds))   setTossesExecDeds(s.be_tossesExecDeds);
          } catch { /* noop */ }
        }
      }
    } finally { setLoading(false); }
  }, [regId, divisionId]);

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
            setStuntsNotes(p.be_stunts ?? '');
            setPyramidsNotes(p.be_pyramids ?? '');
            setTossesNotes(p.be_tosses ?? '');
            const s = p._scores ?? {};
            if (Array.isArray(s.be_stuntsExecDeds))   setStuntsExecDeds(s.be_stuntsExecDeds);
            if (Array.isArray(s.be_pyramidsExecDeds))  setPyramidsExecDeds(s.be_pyramidsExecDeds);
            if (Array.isArray(s.be_tossesExecDeds))    setTossesExecDeds(s.be_tossesExecDeds);
          } catch { /* noop */ }
        }
      } catch { /* noop */ }
    }, 5000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, loading, regId, bCfg]);

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
      const notesPayload = (() => {
        let existing: Record<string, unknown> = {};
        try { existing = JSON.parse(existingSheet?.notes ?? '{}'); } catch { /* noop */ }
        const existingScores = (existing._scores as Record<string, unknown>) ?? {};
        return JSON.stringify({
          ...existing,
          be_stunts: stuntsNotes,
          be_pyramids: pyramidsNotes,
          be_tosses: tossesNotes,
          _scores: { ...existingScores, be_stuntsExecDeds: stuntsExecDeds, be_pyramidsExecDeds: pyramidsExecDeds, be_tossesExecDeds: tossesExecDeds },
        });
      })();

      const payload: Partial<ScoreSheet> = {
        stunts_execution:   String(stuntsExecTotal),
        pyramids_execution: String(pyramidsExecTotal),
        tosses_execution:   String(bCfg.hasTosses ? tossesExecTotal : 0),
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
  }, [readOnly, stuntsExecDeds, pyramidsExecDeds, tossesExecDeds, stuntsNotes, pyramidsNotes, tossesNotes]);

  if (loading) return <PageSpinner />;

  return (
    <div className="min-h-screen bg-zinc-50 pb-16">
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between gap-4 bg-white border-b border-zinc-200 px-6 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={async () => {
            if (!readOnly && initialValuesSettled.current) await handleSaveRef.current(true);
            router.push(`/competitions/${id}/divisions/${divisionId}`);
          }} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-400 font-medium">Planilla — Ejecución Elevaciones</p>
            <p className="text-sm font-semibold text-zinc-900 leading-tight">{teamName || `Inscripción #${regId}`}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Total ejecución</p>
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
        return (
          <div className="mx-auto max-w-5xl px-6 pt-6">
            <div className={`rounded-xl border px-5 py-4 flex items-center justify-between gap-4 ${
              groups ? 'border-zinc-200 bg-white' : 'border-dashed border-zinc-300 bg-zinc-50'
            }`}>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-0.5">Tabla de cantidad en construcción</p>
                {groups ? (
                  <p className="text-xs text-zinc-500">Basado en <span className="font-semibold text-zinc-800">{athleteCount} atletas</span> confirmados en backstage</p>
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
                  </div>
                  <div className="text-center border-x border-zinc-200 px-6">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Gran Parte</p>
                    <p className="text-3xl font-black tabular-nums text-zinc-900">{groups.gran_parte}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Máx</p>
                    <p className="text-3xl font-black tabular-nums text-zinc-900">{groups.max}</p>
                  </div>
                </div>
              ) : (
                <span className="text-xs text-zinc-300 italic shrink-0">—</span>
              )}
            </div>
          </div>
        );
      })()}

      <div className={`max-w-5xl mx-auto px-6 py-8 flex flex-col gap-10${readOnly ? ' pointer-events-none select-none opacity-75' : ''}`}>


        {bCfg.hasStunts && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-700">Elevaciones — Ejecución</h2>
            <div className="grid grid-cols-[3fr_2fr] gap-5 items-start">
              <ExecSection label="Elevaciones" max={bCfg.stuntsExecMax} deds={stuntsExecDeds} onChange={setStuntsExecDeds} />
              <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                <div className="px-3 py-2 bg-zinc-50 border-b border-zinc-200">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Observaciones</span>
                </div>
                <div className="p-3">
                  <AutoResizeTextarea value={stuntsNotes} onChange={setStuntsNotes} placeholder="Observaciones sobre Elevaciones..." />
                </div>
              </div>
            </div>
          </section>
        )}

        {bCfg.hasPyramids && (
          <section className="flex flex-col gap-3" style={{ marginTop: '2.5rem' }}>
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-700">Pirámides — Ejecución</h2>
            <div className="grid grid-cols-[3fr_2fr] gap-5 items-start">
              <ExecSection label="Pirámides" max={bCfg.pyramidsExecMax} deds={pyramidsExecDeds} onChange={setPyramidsExecDeds} />
              <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                <div className="px-3 py-2 bg-zinc-50 border-b border-zinc-200">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Observaciones</span>
                </div>
                <div className="p-3">
                  <AutoResizeTextarea value={pyramidsNotes} onChange={setPyramidsNotes} placeholder="Observaciones sobre Pirámides..." />
                </div>
              </div>
            </div>
          </section>
        )}

        {bCfg.hasTosses && (
          <section className="flex flex-col gap-3" style={{ marginTop: '2.5rem' }}>
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-700">Lanzamientos — Ejecución</h2>
            <div className="grid grid-cols-[3fr_2fr] gap-5 items-start">
              <ExecSection label="Lanzamientos" max={bCfg.tossesExecMax} deds={tossesExecDeds} onChange={setTossesExecDeds} cats={TOSS_EXEC_CATS} />
              <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                <div className="px-3 py-2 bg-zinc-50 border-b border-zinc-200">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Observaciones</span>
                </div>
                <div className="p-3">
                  <AutoResizeTextarea value={tossesNotes} onChange={setTossesNotes} placeholder="Observaciones sobre Lanzamientos..." />
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="rounded-xl px-6 py-5 flex items-center justify-between shadow-lg bg-zinc-800 text-white" style={{ marginTop: '2.5rem' }}>
          <p className="text-base uppercase tracking-wide font-bold">Total Planilla — Ejecución</p>
          <span className="text-4xl font-bold tabular-nums">{fmt(sheetTotal)}</span>
        </div>
      </div>
    </div>
  );
}
