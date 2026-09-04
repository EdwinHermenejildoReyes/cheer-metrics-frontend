'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, AlertCircle, X, Eye } from 'lucide-react';
import { InfoButton } from '@/components/ui/InfoButton';
import { toast } from 'sonner';
import { PageSpinner } from '@/components/ui/spinner';
import competitionsRepository from '@/repositories/competitionsRepository';
import { useJudge } from '@/hooks/useJudge';
import { useConfirm } from '@/hooks/useConfirm';
import { useBranding } from '@/contexts/BrandingContext';
import { PrintButton } from '@/components/print/PrintButton';
import { DeduccionesSheetPrintView } from '@/components/print/DeduccionesSheetPrintView';
import {
  DEDUCTION_CODES,
  DEDUCTION_TYPE_LABELS,
  DEDUCTION_AMOUNTS,
  DEDUCTION_RULE_REFERENCE,
  type DeductionType,
  type Deduction,
  type ScoreSheet,
  type UnpaidAthlete,
} from '@/types/competitions';
import { PaymentWarningBanner } from '@/components/competitions/PaymentWarningBanner';

// ── Constants ─────────────────────────────────────────────────────────────────

const FALLS:   DeductionType[] = ['x', 'ca', 'csa', 'ec', 'cc', 'csc'];
const TIME:    DeductionType[] = ['tiempo'];
const ILLEGAL: DeductionType[] = ['pi', 'eap', 'rg', 'gfn', 'bfn', 'seg'];
const ADMIN:   DeductionType[] = ['ad', 'div'];

const ZONE_ROWS = [
  { key: 'F', label: 'FRENTE' },
  { key: 'C', label: 'CENTRO' },
  { key: 'T', label: 'FONDO'  },
] as const;

const ZONE_COLS = [
  { key: 'IZQ', label: 'IZQ' },
  { key: 'CTR', label: 'CTR' },
  { key: 'DER', label: 'DER' },
] as const;

const TRACK_ZONES = ZONE_ROWS.flatMap(r =>
  ZONE_COLS.map(c => ({ key: `${r.key}·${c.key}` as string, rowKey: r.key, colKey: c.key }))
);

const TRACK_INTERVALS = [
  { key: '0 a 15',      label: '0 a 15'      },
  { key: '15 a 30',     label: '15 a 30'     },
  { key: '30 a 45',     label: '30 a 45'     },
  { key: '45 a 1',      label: '45 a 1'      },
  { key: '1 a 1:15',    label: '1 a 1:15'    },
  { key: '1:15 a 1:30', label: '1:15 a 1:30' },
  { key: '1:30 a 1:45', label: '1:30 a 1:45' },
  { key: '1:45 a 2:00', label: '1:45 a 2:00' },
  { key: '2:00 a 2:15', label: '2:00 a 2:15' },
  { key: '2:15 a 2:30', label: '2:15 a 2:30' },
];

type ColorKey = 'red' | 'orange' | 'amber' | 'zinc';

function colorFor(type: DeductionType): ColorKey {
  if (FALLS.includes(type))   return 'red';
  if (TIME.includes(type))    return 'orange';
  if (ILLEGAL.includes(type)) return 'amber';
  return 'zinc';
}

const BADGE_COLORS: Record<ColorKey, string> = {
  red:    'bg-red-100 text-red-700 border-red-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
  amber:  'bg-amber-100 text-amber-800 border-amber-200',
  zinc:   'bg-zinc-100 text-zinc-700 border-zinc-200',
};

const PILL_COLORS: Record<ColorKey, string> = {
  red:    'bg-red-600 text-white',
  orange: 'bg-orange-500 text-white',
  amber:  'bg-amber-500 text-white',
  zinc:   'bg-zinc-700 text-white',
};

function fmt(n: number | string) { return parseFloat(String(n)).toFixed(2); }

// ── Section 2 annotation helpers ──────────────────────────────────────────────

function filterTimeChars(raw: string): string {
  return raw.replace(/[^\d:]/g, '');
}

function normalizeTime(raw: string): string {
  const cleaned = raw.trim();
  if (!cleaned) return '';
  let totalSecs: number;
  if (cleaned.includes(':')) {
    const [m, s] = cleaned.split(':');
    totalSecs = (parseInt(m, 10) || 0) * 60 + (parseInt(s, 10) || 0);
  } else {
    totalSecs = parseInt(cleaned, 10) || 0;
  }
  const capped = Math.min(totalSecs, 150);
  const mins = Math.floor(capped / 60);
  const secs = capped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// ── DeductionCard for Section 2 ───────────────────────────────────────────────

function DeductionCard({ ded, onDelete, isDeleting, confirm }: {
  ded: Deduction;
  onDelete: () => void;
  isDeleting: boolean;
  confirm: ReturnType<typeof useConfirm>;
}) {
  const ck = ILLEGAL.includes(ded.deduction_type as DeductionType) ? 'amber' as const : 'zinc' as const;
  const [regla,       setRegla]       = useState(ded.notes);
  const [tiempo,      setTiempo]      = useState(ded.routine_time);
  const [descripcion, setDescripcion] = useState(ded.description);
  const [saving,      setSaving]      = useState(false);

  const saveAnnotation = async (nextRegla: string, nextTiempo: string, nextDesc: string) => {
    if (nextRegla === ded.notes && nextTiempo === ded.routine_time && nextDesc === ded.description) return;
    setSaving(true);
    try {
      await competitionsRepository.updateDeduction(ded.id, { notes: nextRegla, routine_time: nextTiempo, description: nextDesc });
    } catch {
      toast.error('No se pudo guardar la anotación');
      setRegla(ded.notes);
      setTiempo(ded.routine_time);
      setDescripcion(ded.description);
    } finally { setSaving(false); }
  };

  const badgeCls = ck === 'amber' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-zinc-100 text-zinc-700 border-zinc-200';

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <span className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-black shrink-0 border ${badgeCls}`}>
          {DEDUCTION_CODES[ded.deduction_type as DeductionType]}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-zinc-700 leading-snug">
            {DEDUCTION_TYPE_LABELS[ded.deduction_type as DeductionType]}
          </p>
          {ded.count > 1 && (
            <p className="text-[10px] text-zinc-400">{ded.count} × −{ded.unit_amount}</p>
          )}
        </div>
        <span className="text-sm font-bold tabular-nums text-red-600 shrink-0">−{ded.total_amount}</span>
        <button
          type="button"
          onClick={async () => {
            if (await confirm({ title: 'Eliminar descuento', message: `¿Eliminar ${DEDUCTION_CODES[ded.deduction_type as DeductionType]} (−${ded.total_amount})?`, confirmLabel: 'Eliminar' }))
              onDelete();
          }}
          disabled={isDeleting}
          className="flex items-center justify-center rounded-lg p-1 text-zinc-300 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40 shrink-0"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="border-t border-zinc-100 bg-zinc-50 px-3 py-2 flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 w-10 shrink-0">Regla</span>
          <input
            type="text"
            value={regla}
            onChange={e => setRegla(e.target.value)}
            onBlur={() => { const n = normalizeTime(tiempo); if (n !== tiempo) setTiempo(n); saveAnnotation(regla, n, descripcion); }}
            placeholder="Ej. Art. 3.2.1"
            className="flex-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-800 placeholder:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-400 min-w-0"
          />
          <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 w-11 text-right shrink-0">Tiempo</span>
          <input
            type="text"
            value={tiempo}
            onChange={e => setTiempo(filterTimeChars(e.target.value))}
            onBlur={() => { const n = normalizeTime(tiempo); if (n !== tiempo) setTiempo(n); saveAnnotation(regla, n, descripcion); }}
            placeholder="00:00"
            className="w-16 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-800 placeholder:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-400 text-center"
          />
          {saving && <span className="text-[9px] text-zinc-400 shrink-0">guardando…</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 w-10 shrink-0">Desc.</span>
          <input
            type="text"
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            onBlur={() => { const n = normalizeTime(tiempo); saveAnnotation(regla, n, descripcion); }}
            placeholder="Descripción del hecho"
            className="flex-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-800 placeholder:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-400 min-w-0"
          />
        </div>
      </div>
    </div>
  );
}


// ── Page ──────────────────────────────────────────────────────────────────────
export default function DeduccionesSheetPage() {
  const router = useRouter();
  const { id, divisionId, regId } = useParams<{ id: string; divisionId: string; regId: string }>();

  const confirm = useConfirm();
  const { isJudge, isCompetitionActive } = useJudge();
  const [competitionIntId, setCompetitionIntId] = useState<number | null>(null);
  const [regIntId, setRegIntId] = useState<number | null>(null);
  const readOnly = !isJudge;
  const { organization } = useBranding();

  useEffect(() => {

    if (competitionIntId !== null && isJudge && !isCompetitionActive(competitionIntId)) {
      toast.error('El evento ha finalizado.');
      router.replace(`/competitions/${id}`);
    }
  }, [isJudge, competitionIntId, isCompetitionActive, router, id]);

  const [teamName,       setTeamName]       = useState('');
  const [sheet,          setSheet]          = useState<ScoreSheet | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [unpaidAthletes, setUnpaidAthletes] = useState<UnpaidAthlete[]>([]);
  const [requirePayment, setRequirePayment] = useState(false);
  const [deleting,     setDeleting]     = useState<number | null>(null);
  const [savingZone,   setSavingZone]   = useState<string | null>(null);
  const [savingDirect, setSavingDirect] = useState<Set<DeductionType>>(new Set());
  const [hoveredZone,  setHoveredZone]  = useState<string | null>(null);
  const dragTypeRef = useRef<DeductionType | null>(null);
  const [pendingType, setPendingType]   = useState<DeductionType | null>(null);
  const [pendingRule, setPendingRule]   = useState('');
  const pendingRuleRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const [sheetRes, regRes] = await Promise.all([
        competitionsRepository.listScoreSheets({ registration__public_id: regId }),
        competitionsRepository.listRegistrations({ division__public_id: divisionId, page_size: '100' }),
      ]);
      const reg = regRes.data.results.find(r => r.public_id === regId);
      if (reg) {
        setRegIntId(reg.id);
        setTeamName(reg.team_name);
        setUnpaidAthletes(reg.unpaid_athletes);
        setRequirePayment(reg.competition_require_payment);
      }
      if (sheetRes.data.results.length > 0) {
        const s = sheetRes.data.results[0];
        setSheet(s);
        if (!reg) setTeamName(s.team_name);
      }
    } finally {
      setLoading(false);
    }
  }, [regId, divisionId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!readOnly || loading) return;
    const interval = setInterval(async () => {
      try {
        const sheetRes = await competitionsRepository.listScoreSheets({ registration__public_id: regId });
        if (sheetRes.data.results.length === 0) return;
        setSheet(sheetRes.data.results[0]);
      } catch { /* noop */ }
    }, 5000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, loading, regId]);

  // ── Place fall in zone — merges with existing same type+zone ─────────────
  const handlePlace = async (type: DeductionType, fullZoneKey: string, currentDeductions: Deduction[]) => {
    if (!sheet || savingZone) return;
    setSavingZone(fullZoneKey);
    try {
      const existing = currentDeductions.find(d => d.deduction_type === type && d.routine_time === fullZoneKey);
      if (existing) {
        await competitionsRepository.updateDeduction(existing.id, { count: existing.count + 1 });
      } else {
        await competitionsRepository.createDeduction({
          score_sheet: sheet.id, deduction_type: type, count: 1,
          routine_time: fullZoneKey, hit_zero: false, notes: '',
        });
      }
      await load();
    } catch {
      toast.error('No se pudo registrar el descuento');
    } finally {
      setSavingZone(null);
    }
  };

  // ── Direct add — always creates a new record ──────────────────────────────
  const handleDirectAdd = async (type: DeductionType) => {
    if (!sheet || savingDirect.has(type)) return;
    setSavingDirect(prev => new Set(prev).add(type));
    try {
      await competitionsRepository.createDeduction({
        score_sheet: sheet.id, deduction_type: type, count: 1,
        routine_time: '', hit_zero: false,
        notes: DEDUCTION_RULE_REFERENCE[type] ?? '',
      });
      await load();
    } catch {
      toast.error('No se pudo registrar el descuento');
    } finally {
      setSavingDirect(prev => { const next = new Set(prev); next.delete(type); return next; });
    }
  };

  const handleDelete = async (ded: Deduction) => {
    setDeleting(ded.id);
    try {
      await competitionsRepository.deleteDeduction(ded.id);
      toast.success('Descuento eliminado');
      await load();
    } finally {
      setDeleting(null);
    }
  };

  if (loading) return <PageSpinner />;

  const deductions  = sheet?.deductions ?? [];
  const totalDed    = parseFloat(sheet?.total_deductions ?? '0');
  const finalScore  = parseFloat(sheet?.final_score     ?? '0');
  const scaledScore = parseFloat(sheet?.scaled_score    ?? '0');

  // Section 1: group FALLS + TIME by zone for pista display
  const pistaDedsByZone: Record<string, Deduction[]> = {};
  for (const d of deductions) {
    if (!FALLS.includes(d.deduction_type) && !TIME.includes(d.deduction_type)) continue;
    const k = d.routine_time || 'sin tiempo';
    if (!pistaDedsByZone[k]) pistaDedsByZone[k] = [];
    pistaDedsByZone[k].push(d);
  }

  // Section 2
  const section2Deds  = deductions.filter(d => ILLEGAL.includes(d.deduction_type) || ADMIN.includes(d.deduction_type));
  const section2Total = section2Deds.reduce((s, d) => s + parseFloat(d.total_amount), 0);

  const zoneKey = (intervalKey: string, zKey: string) => `${intervalKey} / ${zKey}`;

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">

      {/* ── Sticky header ──────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 flex items-center justify-between gap-4 bg-white border-b border-zinc-200 px-6 py-3 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/competitions/${id}/divisions/${divisionId}`)}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-400 font-medium">Planilla — Deducciones</p>
            <p className="text-sm font-semibold text-zinc-900 leading-tight">
              {teamName || `Inscripción #${regId}`}
            </p>
          </div>
        </div>
        {sheet && (
          <div className="flex items-center gap-5">
            <PrintButton />
            <div className="text-right">
              <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Descuentos</p>
              <p className={`text-xl font-bold tabular-nums ${totalDed > 0 ? 'text-red-600' : 'text-zinc-300'}`}>
                −{fmt(totalDed)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Score final</p>
              <p className="text-xl font-bold tabular-nums text-zinc-900">{fmt(finalScore)}</p>
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


      <div className={`max-w-6xl mx-auto px-4 py-6 print:hidden${readOnly ? ' pointer-events-none select-none opacity-75' : ''}`}>

        {!sheet && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 mb-6">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              No existe planilla para esta inscripción. Registra puntajes primero en Building, Tumbling u Overall.
            </p>
          </div>
        )}

        {sheet && (
          <>
            {/* ══════════════════════════════════════════════════════════════
                SECCIÓN 1 — Caídas, Tiempos y Pista
                ══════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-[200px_1fr] gap-4 items-start">

              {/* ═══ LEFT — Caídas + Tiempos palette (direct-add) ═══════════ */}
              <div className="flex flex-col gap-3 sticky top-20">
                {[
                  { key: 'CAÍDAS', types: FALLS, color: 'red'    as ColorKey, label: 'Caídas'  },
                  { key: 'TIEMPO', types: TIME,  color: 'orange' as ColorKey, label: 'Tiempo'  },
                ].map(({ key, types, color, label }) => (
                  <div key={key} className="flex flex-col gap-1">
                    <div className={`text-[9px] font-bold uppercase tracking-widest px-1 flex items-center gap-1 ${color === 'red' ? 'text-red-500' : 'text-orange-500'}`}>
                      {label}
                      <span className="font-normal normal-case tracking-normal opacity-60">{key === 'CAÍDAS' ? '→ pista' : '→ lista'}</span>
                      <InfoButton title={`Deducciones — ${label}`} size="lg">
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
                        const isBusy  = savingDirect.has(type);
                        const ck      = colorFor(type);
                        const isDragGroup = key === 'CAÍDAS';
                        const cnt = deductions
                          .filter(d => d.deduction_type === type)
                          .reduce((s, d) => s + d.count, 0);
                        return (
                          <div
                            key={type}
                            draggable={isDragGroup}
                            onDragStart={isDragGroup ? (e) => {
                              e.dataTransfer.setData('deduction-type', type);
                              dragTypeRef.current = type;
                            } : undefined}
                            onDragEnd={isDragGroup ? () => {
                              dragTypeRef.current = null;
                            } : undefined}
                            onClick={isDragGroup ? undefined : () => handleDirectAdd(type)}
                            className={`relative flex items-center justify-between rounded-lg px-3 py-2 border transition-all select-none ${
                              isBusy
                                ? 'cursor-wait bg-zinc-100 border-zinc-200 opacity-60'
                                : isDragGroup
                                ? 'cursor-grab active:cursor-grabbing bg-white border-zinc-200 hover:border-zinc-400 hover:shadow-sm'
                                : 'cursor-pointer bg-white border-zinc-200 hover:border-zinc-400 hover:shadow-sm'
                            }`}
                          >
                            {cnt > 0 && (
                              <span className={`absolute -top-2 -right-2 z-10 min-w-[18px] h-[18px] rounded-full text-white text-[10px] font-bold flex items-center justify-center px-1 shadow-sm leading-none ${PILL_COLORS[ck]}`}>
                                {cnt}
                              </span>
                            )}
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-sm font-black shrink-0 text-zinc-900">{DEDUCTION_CODES[type]}</span>
                              <span className="text-[9px] text-zinc-400 leading-tight">{DEDUCTION_TYPE_LABELS[type]}</span>
                            </div>
                            <span className="text-[10px] font-bold tabular-nums shrink-0 ml-1 text-red-600">
                              −{DEDUCTION_AMOUNTS[type]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* ═══ CENTER — Pista (click cell → dropdown) ═════════════════ */}
              <div className="flex flex-col rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm">

                {/* Column headers */}
                <div className="flex items-stretch border-b border-zinc-200 bg-zinc-50">
                  <div className="w-20 shrink-0 flex items-center justify-center px-2 border-r border-zinc-200">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-700">Tiempo</p>
                  </div>
                  <div className="flex-1 grid grid-cols-3">
                    {ZONE_COLS.map((col, ci) => (
                      <div key={col.key} className={`py-2 text-center ${ci < 2 ? 'border-r border-zinc-200' : ''}`}>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-700">{col.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="w-20 shrink-0 flex items-center justify-center px-2 border-l border-zinc-200">
                    <p className="text-[10px] text-zinc-700">2:30 min</p>
                  </div>
                </div>

                {/* Time rows */}
                <div className="divide-y divide-zinc-200">
                  {TRACK_INTERVALS.map(({ key, label }) => {
                    const isMidpoint = key === '1 a 1:15' || key === '2:00 a 2:15';
                    return (
                      <div key={key} className={`flex items-stretch min-h-[90px] ${isMidpoint ? 'bg-zinc-50/60' : ''}`}>

                        {/* Left time label */}
                        <div className={`flex flex-col items-end justify-center shrink-0 w-20 px-2.5 py-2 self-stretch border-r ${isMidpoint ? 'border-zinc-400 bg-zinc-100' : 'border-zinc-200'}`}>
                          <span className={`text-[12px] font-mono font-bold tabular-nums leading-snug text-right ${isMidpoint ? 'text-zinc-700' : 'text-zinc-500'}`}>{label.split(' a ')[0]}</span>
                          <span className="text-[9px] font-mono text-zinc-300 leading-none">a</span>
                          <span className={`text-[12px] font-mono font-bold tabular-nums leading-snug text-right ${isMidpoint ? 'text-zinc-700' : 'text-zinc-500'}`}>{label.split(' a ')[1]}</span>
                        </div>

                        {/* 3×3 zone grid */}
                        <div className="flex-1 grid grid-cols-3 grid-rows-3 divide-x divide-y divide-zinc-100">
                          {TRACK_ZONES.map((zone, zi) => {
                            const fullKey    = zoneKey(key, zone.key);
                            const isSaving   = savingZone === fullKey;
                            const isHovered  = hoveredZone === fullKey;
                            const zoneDeds   = pistaDedsByZone[fullKey] ?? [];
                            const isRowLabel = zi % 3 === 0;
                            const rowIdx     = Math.floor(zi / 3);

                            return (
                              <div
                                key={zone.key}
                                className={`relative flex flex-col items-center justify-center gap-1 p-1 transition-colors min-h-[30px] ${
                                  isSaving ? 'bg-green-50' :
                                  isHovered ? 'bg-blue-50 ring-1 ring-inset ring-blue-300' :
                                  'hover:bg-zinc-50'
                                }`}
                                onDragOver={(e) => { e.preventDefault(); setHoveredZone(fullKey); }}
                                onDragLeave={() => setHoveredZone(null)}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  setHoveredZone(null);
                                  const type = (e.dataTransfer.getData('deduction-type') || dragTypeRef.current) as DeductionType | null;
                                  if (type && FALLS.includes(type)) handlePlace(type, fullKey, deductions);
                                }}
                              >
                                {/* Row depth label */}
                                {isRowLabel && (
                                  <span className={`absolute left-1 top-1 text-[8px] font-bold uppercase tracking-widest ${
                                    rowIdx === 0 ? 'text-zinc-300' : rowIdx === 1 ? 'text-zinc-200' : 'text-zinc-300'
                                  }`}>{ZONE_ROWS[rowIdx].label[0]}</span>
                                )}

                                {isSaving && <span className="text-[9px] text-green-500 font-medium">…</span>}

                                {!isSaving && isHovered && zoneDeds.length === 0 && (
                                  <span className="text-[9px] text-blue-400 font-medium">+</span>
                                )}

                                {!isSaving && zoneDeds.length > 0 && (
                                  <div className="relative z-10 flex flex-wrap gap-1 justify-center">
                                    {zoneDeds.map(ded => {
                                      const ck = colorFor(ded.deduction_type);
                                      return (
                                        <div
                                          key={ded.id}
                                          title={`${DEDUCTION_TYPE_LABELS[ded.deduction_type]} × ${ded.count} = −${ded.total_amount}`}
                                          className={`group/chip flex items-center gap-0.5 rounded px-1.5 py-0.5 border text-[10px] font-bold cursor-pointer transition-all hover:scale-105 ${BADGE_COLORS[ck]}`}
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            if (await confirm({ title: 'Eliminar descuento', message: `¿Eliminar ${DEDUCTION_CODES[ded.deduction_type]} — ${DEDUCTION_TYPE_LABELS[ded.deduction_type]} ×${ded.count} (−${ded.total_amount})?`, confirmLabel: 'Eliminar' })) {
                                              handleDelete(ded);
                                            }
                                          }}
                                        >
                                          {DEDUCTION_CODES[ded.deduction_type]}
                                          {ded.count > 1 && <span className="font-normal opacity-70">×{ded.count}</span>}
                                          <X className="h-2 w-2 opacity-0 group-hover/chip:opacity-60 transition-opacity" />
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {!isSaving && !isHovered && zoneDeds.length === 0 && (
                                  <div className="w-1 h-1 rounded-full bg-zinc-200 opacity-40" />
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Right time label */}
                        <div className={`flex flex-col items-start justify-center shrink-0 w-20 px-2.5 py-2 self-stretch border-l ${isMidpoint ? 'border-zinc-400 bg-zinc-100' : 'border-zinc-200'}`}>
                          <span className={`text-[12px] font-mono font-bold tabular-nums leading-snug ${isMidpoint ? 'text-zinc-700' : 'text-zinc-500'}`}>{label.split(' a ')[0]}</span>
                          <span className="text-[9px] font-mono text-zinc-300 leading-none">a</span>
                          <span className={`text-[12px] font-mono font-bold tabular-nums leading-snug ${isMidpoint ? 'text-zinc-700' : 'text-zinc-500'}`}>{label.split(' a ')[1]}</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Sin tiempo row — direct-added FALLS + TIME */}
                  {pistaDedsByZone['sin tiempo'] && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 border-t border-zinc-200">
                      <span className="text-[10px] text-zinc-400 w-20 text-right pr-2 shrink-0">Sin tiempo</span>
                      <div className="flex flex-wrap gap-1.5">
                        {pistaDedsByZone['sin tiempo'].map(ded => {
                          const ck = colorFor(ded.deduction_type);
                          return (
                            <div
                              key={ded.id}
                              className={`flex items-center gap-1 rounded-md px-2 py-0.5 border text-xs font-bold cursor-pointer hover:scale-105 transition-all ${BADGE_COLORS[ck]}`}
                              onClick={async () => {
                                if (await confirm({ title: 'Eliminar descuento', message: `¿Eliminar ${DEDUCTION_CODES[ded.deduction_type]} — ${DEDUCTION_TYPE_LABELS[ded.deduction_type]} (−${ded.total_amount})?`, confirmLabel: 'Eliminar' })) {
                                  handleDelete(ded);
                                }
                              }}
                            >
                              {DEDUCTION_CODES[ded.deduction_type]}
                              {ded.count > 1 && <span className="font-normal opacity-70">×{ded.count}</span>}
                              <X className="h-2.5 w-2.5 opacity-40" />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-4 py-2 border-t border-zinc-100 bg-zinc-50">
                  <p className="text-[9px] text-zinc-400 text-center">
                    Arrastra una caída desde la paleta izquierda hasta la celda · Clic en chip para eliminar · F = Frente · C = Centro · T = Fondo
                  </p>
                </div>
              </div>

            </div>

            {/* ══════════════════════════════════════════════════════════════
                SECCIÓN 2 — Ilegalidades y Administración
                ══════════════════════════════════════════════════════════════ */}
            <div className="mt-8 pt-8 border-t border-zinc-200">
              <div className="grid grid-cols-[220px_1fr] gap-6 items-start">

                {/* LEFT palette */}
                <div className="flex flex-col gap-4 sticky top-20">
                  {[
                    { key: 'ILEGALES',       types: ILLEGAL, color: 'amber' as ColorKey },
                    { key: 'ADMINISTRACIÓN', types: ADMIN,   color: 'zinc'  as ColorKey },
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
                          const cnt    = section2Deds.filter(d => d.deduction_type === type).length;
                          return (
                            <div
                              key={type}
                              onClick={() => handleDirectAdd(type)}
                              className={`relative flex items-center justify-between rounded-lg px-3 py-2 border transition-all select-none ${
                                isBusy
                                  ? 'cursor-wait bg-zinc-100 border-zinc-200 opacity-60'
                                  : 'cursor-pointer bg-white border-zinc-200 hover:border-zinc-400 hover:shadow-sm'
                              }`}
                            >
                              {cnt > 0 && (
                                <span className="absolute -top-2 -right-2 z-10 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 shadow-sm leading-none">
                                  {cnt}
                                </span>
                              )}
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-sm font-black shrink-0 text-zinc-900">{DEDUCTION_CODES[type]}</span>
                                <span className="text-[9px] text-zinc-400 leading-tight">{DEDUCTION_TYPE_LABELS[type]}</span>
                              </div>
                              <span className={`text-[10px] font-bold tabular-nums shrink-0 ml-1 ${isBusy ? 'text-zinc-400' : 'text-red-600'}`}>
                                −{DEDUCTION_AMOUNTS[type]}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* RIGHT — summary + DeductionCard list */}
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Ilegales', types: ILLEGAL, color: 'amber' as ColorKey },
                      { label: 'Admin',    types: ADMIN,   color: 'zinc'  as ColorKey },
                    ].map(({ label, types, color }) => {
                      const groupDeds  = section2Deds.filter(d => types.includes(d.deduction_type));
                      const groupTotal = groupDeds.reduce((s, d) => s + parseFloat(d.total_amount), 0);
                      const groupCount = groupDeds.length;
                      return (
                        <div key={label} className={`rounded-xl border px-4 py-3 ${color === 'amber' ? 'border-amber-200 bg-amber-50' : 'border-zinc-200 bg-zinc-50'}`}>
                          <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${color === 'amber' ? 'text-amber-600' : 'text-zinc-500'}`}>{label}</p>
                          <p className={`text-2xl font-bold tabular-nums ${groupTotal > 0 ? 'text-red-600' : 'text-zinc-300'}`}>−{fmt(groupTotal)}</p>
                          <p className="text-[10px] text-zinc-400 mt-0.5">{groupCount} {groupCount === 1 ? 'descuento' : 'descuentos'}</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-col gap-2">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-700">
                      Descuentos registrados{section2Deds.length > 0 && ` (${section2Deds.length})`}
                    </h2>
                    {section2Deds.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-5 py-10 text-center">
                        <p className="text-sm text-zinc-400">Sin descuentos — toca un tipo en el panel izquierdo para agregar</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {[...section2Deds].sort((a, b) => b.id - a.id).map(ded => (
                          <DeductionCard
                            key={ded.id}
                            ded={ded}
                            onDelete={() => handleDelete(ded)}
                            isDeleting={deleting === ded.id}
                            confirm={confirm}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-amber-600 px-5 py-3 text-white">
                    <span className="text-sm font-semibold uppercase tracking-wide">Total Descuentos (Reglas + Admin)</span>
                    <span className="text-2xl font-bold tabular-nums">−{fmt(section2Total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Combined totals ───────────────────────────────────────────── */}
            <div className="mt-6 flex flex-col gap-2">
              <div className="flex items-center justify-between rounded-xl bg-red-600 px-5 py-3 text-white">
                <span className="text-sm font-semibold uppercase tracking-wide">Total Descuentos</span>
                <span className="text-2xl font-bold tabular-nums">−{fmt(totalDed)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl px-5 py-3" style={{ backgroundColor: 'var(--plt-primary)', color: 'var(--plt-primary-fg)' }}>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-xs uppercase tracking-wide opacity-60">Score final</span>
                  <span>Escalado: <strong className="tabular-nums">{fmt(scaledScore)}</strong></span>
                  <span>−<strong className="text-red-300 tabular-nums">{fmt(totalDed)}</strong></span>
                </div>
                <span className="text-2xl font-bold tabular-nums">{fmt(finalScore)}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Print view ─────────────────────────────────────────────────────── */}
      {sheet && (
        <DeduccionesSheetPrintView
          data={{
            teamName,
            organization: organization ?? undefined,
            deductions,
            totalDed,
            scaledScore,
            finalScore,
          }}
        />
      )}
    </div>
  );
}
