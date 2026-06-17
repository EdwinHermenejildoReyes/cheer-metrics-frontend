'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, AlertCircle, Eye } from 'lucide-react';
import { InfoButton } from '@/components/ui/InfoButton';
import { toast } from 'sonner';
import { PageSpinner } from '@/components/ui/spinner';
import competitionsRepository from '@/repositories/competitionsRepository';
import { useJudge } from '@/hooks/useJudge';
import { useConfirm } from '@/hooks/useConfirm';
import { useBranding } from '@/contexts/BrandingContext';
import {
  DEDUCTION_CODES,
  DEDUCTION_TYPE_LABELS,
  DEDUCTION_AMOUNTS,
  type DeductionType,
  type Deduction,
  type ScoreSheet,
  type UnpaidAthlete,
} from '@/types/competitions';
import { PaymentWarningBanner } from '@/components/competitions/PaymentWarningBanner';
import { getConstructionGroups } from '@/lib/constructionTable';

const ILLEGAL: DeductionType[] = ['pi', 'eap', 'rg', 'gfn', 'bfn', 'seg'];
const ADMIN:   DeductionType[] = ['ad', 'div'];
const MY_TYPES = [...ILLEGAL, ...ADMIN];

type ColorKey = 'amber' | 'zinc';
function colorFor(type: DeductionType): ColorKey { return ILLEGAL.includes(type) ? 'amber' : 'zinc'; }
const BADGE_COLORS: Record<ColorKey, string> = {
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  zinc:  'bg-zinc-100 text-zinc-700 border-zinc-200',
};
const PILL_COLORS: Record<ColorKey, string> = {
  amber: 'bg-amber-500 text-white',
  zinc:  'bg-zinc-600 text-white',
};

function fmt(n: number | string) { return parseFloat(String(n)).toFixed(2); }

export default function SafetyRulesPage() {
  const router = useRouter();
  const { id, divisionId, regId } = useParams<{ id: string; divisionId: string; regId: string }>();
  const competitionId  = Number(id);
  const divId          = Number(divisionId);
  const registrationId = Number(regId);

  const confirm = useConfirm();
  const { isJudge, isCompetitionActive } = useJudge();
  const readOnly = !isJudge;
  const { organization } = useBranding();

  useEffect(() => {
    if (isJudge && !isCompetitionActive(competitionId)) {
      toast.error('El evento ha finalizado.');
      router.replace(`/competitions/${competitionId}`);
    }
  }, [isJudge, competitionId, isCompetitionActive, router]);

  const [teamName,       setTeamName]       = useState('');
  const [sheet,          setSheet]          = useState<ScoreSheet | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [athleteCount,   setAthleteCount]   = useState<number | null>(null);
  const [unpaidAthletes, setUnpaidAthletes] = useState<UnpaidAthlete[]>([]);
  const [requirePayment, setRequirePayment] = useState(false);
  const [deleting,       setDeleting]       = useState<number | null>(null);
  const [savingDirect,   setSavingDirect]   = useState<Set<DeductionType>>(new Set());

  const load = useCallback(async () => {
    try {
      const [sheetRes, regRes] = await Promise.all([
        competitionsRepository.listScoreSheets({ registration: String(registrationId) }),
        competitionsRepository.listRegistrations({ division: String(divId), page_size: '100' }),
      ]);
      const reg = regRes.data.results.find(r => r.id === registrationId);
      if (reg) { setTeamName(reg.team_name); setAthleteCount(reg.athlete_count ?? null); setUnpaidAthletes(reg.unpaid_athletes); setRequirePayment(reg.competition_require_payment); }
      if (sheetRes.data.results.length > 0) {
        const s = sheetRes.data.results[0];
        setSheet(s);
        if (!reg) setTeamName(s.team_name);
      }
    } finally { setLoading(false); }
  }, [registrationId, divId]);

  useEffect(() => { load(); }, [load]);

  const handleDirectAdd = async (type: DeductionType, currentDeductions: Deduction[]) => {
    if (!sheet || savingDirect.has(type)) return;
    setSavingDirect(prev => new Set(prev).add(type));
    try {
      const existing = currentDeductions.find(d => d.deduction_type === type && (!d.routine_time || d.routine_time === ''));
      if (existing) { await competitionsRepository.updateDeduction(existing.id, { count: existing.count + 1 }); }
      else { await competitionsRepository.createDeduction({ score_sheet: sheet.id, deduction_type: type, count: 1, routine_time: '', hit_zero: false, notes: '' }); }
      await load();
    } catch { toast.error('No se pudo registrar el descuento'); } finally {
      setSavingDirect(prev => { const next = new Set(prev); next.delete(type); return next; });
    }
  };

  const handleDelete = async (ded: Deduction) => {
    setDeleting(ded.id);
    try { await competitionsRepository.deleteDeduction(ded.id); toast.success('Descuento eliminado'); await load(); } finally { setDeleting(null); }
  };

  if (loading) return <PageSpinner />;

  const deductions = sheet?.deductions ?? [];
  const myDeds     = deductions.filter(d => MY_TYPES.includes(d.deduction_type as DeductionType));
  const totalDed   = myDeds.reduce((s, d) => s + parseFloat(d.total_amount), 0);

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between gap-4 bg-white border-b border-zinc-200 px-6 py-3 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/competitions/${competitionId}/divisions/${divId}`)}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-400 font-medium">Planilla — Reglas y Seguridad</p>
            <p className="text-sm font-semibold text-zinc-900 leading-tight">{teamName || `Inscripción #${registrationId}`}</p>
          </div>
        </div>
        {sheet && (
          <div className="flex items-center gap-5">
            <div className="text-right">
              <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Descuentos</p>
              <p className={`text-xl font-bold tabular-nums ${totalDed > 0 ? 'text-red-600' : 'text-zinc-300'}`}>−{totalDed.toFixed(2)}</p>
            </div>
          </div>
        )}
      </div>

      {readOnly && (
        <div className="print:hidden bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center gap-2">
          <Eye className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-700 font-medium">Solo lectura — solo los jueces asignados pueden calificar.</p>
        </div>
      )}
      <PaymentWarningBanner unpaidAthletes={unpaidAthletes} requirePayment={requirePayment} />

      {/* ── Construction table banner ─────────────────────────────────── */}
      {(() => {
        const groups = athleteCount ? getConstructionGroups(athleteCount) : null;
        return (
          <div className="mx-auto max-w-4xl px-4 pt-6 print:hidden">
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

      <div className={`max-w-4xl mx-auto px-4 py-6 print:hidden${readOnly ? ' pointer-events-none select-none opacity-75' : ''}`}>

        {!sheet && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 mb-6">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">No existe planilla para esta inscripción. Registra puntajes primero en Building, Tumbling u Overall.</p>
          </div>
        )}

        {sheet && (
          <div className="grid grid-cols-[220px_1fr] gap-6 items-start">
            {/* LEFT — palette */}
            <div className="flex flex-col gap-4 sticky top-20">
              {[
                { key: 'ILEGALES',    types: ILLEGAL, color: 'amber' as ColorKey },
                { key: 'ADMINISTRACIÓN', types: ADMIN, color: 'zinc' as ColorKey },
              ].map(({ key, types, color }) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <div className={`text-[9px] font-bold uppercase tracking-widest px-1 flex items-center gap-1 ${color === 'amber' ? 'text-amber-500' : 'text-zinc-500'}`}>
                    {key}
                    <span className="font-normal normal-case tracking-normal opacity-60">→ lista</span>
                    <InfoButton title={`Deducciones — ${key}`} size="lg">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-zinc-50">
                            <th className="text-left px-3 py-1.5 border border-zinc-200 font-medium text-zinc-600">Código</th>
                            <th className="text-left px-3 py-1.5 border border-zinc-200 font-medium text-zinc-600">Descripción</th>
                            <th className="text-center px-3 py-1.5 border border-zinc-200 font-medium text-zinc-600 w-16">Monto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {types.map(t => (
                            <tr key={t} className="even:bg-zinc-50">
                              <td className="px-3 py-1.5 border border-zinc-200 font-black text-zinc-900">{DEDUCTION_CODES[t]}</td>
                              <td className="px-3 py-1.5 border border-zinc-200 text-zinc-600">{DEDUCTION_TYPE_LABELS[t]}</td>
                              <td className="px-3 py-1.5 border border-zinc-200 text-center text-red-600 font-semibold tabular-nums">−{DEDUCTION_AMOUNTS[t]}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </InfoButton>
                  </div>
                  <div className="flex flex-col gap-1">
                    {types.map(type => {
                      const isBusy = savingDirect.has(type);
                      const ck     = colorFor(type);
                      const cnt    = deductions.find(d => d.deduction_type === type && !d.routine_time)?.count ?? 0;
                      return (
                        <div
                          key={type}
                          onClick={() => handleDirectAdd(type, deductions)}
                          className={`relative flex items-center justify-between rounded-lg px-3 py-2 border transition-all select-none ${isBusy ? 'cursor-wait bg-zinc-100 border-zinc-200 opacity-60' : 'cursor-pointer bg-white border-zinc-200 hover:border-zinc-400 hover:shadow-sm'}`}
                        >
                          {cnt > 0 && (
                            <span className="absolute -top-2 -right-2 z-10 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 shadow-sm leading-none">
                              {cnt}
                            </span>
                          )}
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-black shrink-0 text-zinc-900">{DEDUCTION_CODES[type]}</span>
                            <span className="text-[9px] truncate text-zinc-400">{DEDUCTION_TYPE_LABELS[type].split(' ').slice(0, 3).join(' ')}</span>
                          </div>
                          <span className="text-[10px] font-bold tabular-nums shrink-0 ml-1 text-red-600">−{DEDUCTION_AMOUNTS[type]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* RIGHT — recorded deductions */}
            <div className="flex flex-col gap-4">
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Ilegales', types: ILLEGAL, color: 'amber' as ColorKey },
                  { label: 'Admin',    types: ADMIN,   color: 'zinc'  as ColorKey },
                ].map(({ label, types, color }) => {
                  const groupTotal = myDeds.filter(d => types.includes(d.deduction_type as DeductionType)).reduce((s, d) => s + parseFloat(d.total_amount), 0);
                  const groupCount = myDeds.filter(d => types.includes(d.deduction_type as DeductionType)).length;
                  return (
                    <div key={label} className={`rounded-xl border px-4 py-3 ${color === 'amber' ? 'border-amber-200 bg-amber-50' : 'border-zinc-200 bg-zinc-50'}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${color === 'amber' ? 'text-amber-600' : 'text-zinc-500'}`}>{label}</p>
                      <p className={`text-2xl font-bold tabular-nums ${groupTotal > 0 ? 'text-red-600' : 'text-zinc-300'}`}>−{fmt(groupTotal)}</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">{groupCount} {groupCount === 1 ? 'descuento' : 'descuentos'}</p>
                    </div>
                  );
                })}
              </div>

              {/* Deductions list */}
              <div className="flex flex-col gap-2">
                <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-700">
                  Descuentos registrados{myDeds.length > 0 && ` (${myDeds.length})`}
                </h2>
                {myDeds.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-5 py-10 text-center">
                    <p className="text-sm text-zinc-400">Sin descuentos — toca un tipo en el panel izquierdo para agregar</p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                    <div className="grid grid-cols-[4.5rem_1fr_5rem_2.5rem] gap-0 border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                      <span>Código</span><span>Descripción</span><span className="text-right">Monto</span><span />
                    </div>
                    <div className="divide-y divide-zinc-100">
                      {myDeds.map(ded => {
                        const ck = colorFor(ded.deduction_type as DeductionType);
                        return (
                          <div key={ded.id} className="grid grid-cols-[4.5rem_1fr_5rem_2.5rem] gap-0 items-center px-3 py-2.5">
                            <span className={`inline-flex items-center justify-center self-center rounded-md px-2 py-0.5 text-xs font-black w-fit ${BADGE_COLORS[ck]}`}>
                              {DEDUCTION_CODES[ded.deduction_type as DeductionType]}
                            </span>
                            <div className="min-w-0 pr-2">
                              <p className="text-xs text-zinc-700 truncate">{ded.notes || DEDUCTION_TYPE_LABELS[ded.deduction_type as DeductionType]}</p>
                              {ded.count > 1 && <p className="text-[10px] text-zinc-400">{ded.count} × −{ded.unit_amount}</p>}
                            </div>
                            <span className="text-sm font-bold tabular-nums text-red-600 text-right">−{ded.total_amount}</span>
                            <button
                              type="button"
                              onClick={async () => {
                                if (await confirm({ title: 'Eliminar descuento', message: `¿Eliminar ${DEDUCTION_CODES[ded.deduction_type as DeductionType]} (−${ded.total_amount})?`, confirmLabel: 'Eliminar' }))
                                  handleDelete(ded);
                              }}
                              disabled={deleting === ded.id}
                              className="flex items-center justify-center rounded-lg p-1 text-zinc-300 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="flex items-center justify-between rounded-xl bg-amber-600 px-5 py-3 text-white">
                <span className="text-sm font-semibold uppercase tracking-wide">Total Descuentos (Reglas + Admin)</span>
                <span className="text-2xl font-bold tabular-nums">−{totalDed.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
