'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { PageSpinner } from '@/components/ui/spinner';
import competitionsRepository from '@/repositories/competitionsRepository';
import { useJudge } from '@/hooks/useJudge';
import { useBranding } from '@/contexts/BrandingContext';
import { PrintButton } from '@/components/print/PrintButton';
import { DeduccionesSheetPrintView } from '@/components/print/DeduccionesSheetPrintView';
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

// ── Constants ─────────────────────────────────────────────────────────────────

const FALLS:   DeductionType[] = ['x', 'ca', 'csa', 'ec', 'cc', 'csc'];
const TIME:    DeductionType[] = ['tiempo', 'tiempo_grave'];
const ILLEGAL: DeductionType[] = ['pi', 'eap', 'rg', 'gfn', 'bfn', 'seg'];
const ADMIN:   DeductionType[] = ['ad', 'div'];

// 3×3 floor grid: rows = depth (Frente/Centro/Fondo), cols = lateral (IZQ/CTR/DER)
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

// Flat list of all 9 zones in row-major order
const TRACK_ZONES = ZONE_ROWS.flatMap(r =>
  ZONE_COLS.map(c => ({ key: `${r.key}·${c.key}` as string, rowKey: r.key, colKey: c.key }))
);

// Track intervals
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

const SECTION_COLORS: Record<string, { label: string; color: ColorKey }> = {
  CAÍDAS:         { label: 'Caídas',         color: 'red'    },
  TIEMPO:         { label: 'Tiempo',          color: 'orange' },
  ILEGALIDADES:   { label: 'Ilegalidades',    color: 'amber'  },
  ADMINISTRATIVAS:{ label: 'Administrativas', color: 'zinc'   },
};

function fmt(n: number | string) { return parseFloat(String(n)).toFixed(2); }

// ── Pending placement state ───────────────────────────────────────────────────
interface Pending {
  type: DeductionType;
  time: string;   // full key: "0 a 15 / F·IZQ"
  count: number;
  notes: string;
  hitZero: boolean;
}

// Direct-add (non-fall types — bypass the track)
// Keyed by deduction type so multiple can be active simultaneously
interface DirectPendingEntry {
  count:   number;
  notes:   string;
  hitZero: boolean;
}
type DirectPendings = Partial<Record<DeductionType, DirectPendingEntry>>;

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DeduccionesSheetPage() {
  const router = useRouter();
  const { id, divisionId, regId } = useParams<{ id: string; divisionId: string; regId: string }>();
  const competitionId  = Number(id);
  const divId          = Number(divisionId);
  const registrationId = Number(regId);

  const { isJudge, isCompetitionActive } = useJudge();
  const { organization } = useBranding();
  const primary = organization?.primary_color ?? 'var(--brand-primary)';

  useEffect(() => {
    if (isJudge && !isCompetitionActive(competitionId)) {
      toast.error('El evento ha finalizado.');
      router.replace(`/competitions/${competitionId}`);
    }
  }, [isJudge, competitionId, isCompetitionActive, router]);

  const [teamName,       setTeamName]       = useState('');
  const [sheet,          setSheet]          = useState<ScoreSheet | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [unpaidAthletes, setUnpaidAthletes] = useState<UnpaidAthlete[]>([]);
  const [requirePayment, setRequirePayment] = useState(false);
  const [deleting,  setDeleting]  = useState<number | null>(null);
  const [saving,    setSaving]    = useState(false);

  // Track interaction state (falls only)
  const [armedType,    setArmedType]    = useState<DeductionType | null>(null);
  const [hoveredZone,  setHoveredZone]  = useState<string | null>(null);
  const [pending,      setPending]      = useState<Pending | null>(null);
  const dragTypeRef    = useRef<DeductionType | null>(null);

  // Direct-add state (tiempo, ilegalidades, administrativas)
  const [directPendings, setDirectPendings] = useState<DirectPendings>({});
  const [savingDirect,   setSavingDirect]   = useState<DeductionType | null>(null);

  const load = useCallback(async () => {
    try {
      const [sheetRes, regRes] = await Promise.all([
        competitionsRepository.listScoreSheets({ registration: String(registrationId) }),
        competitionsRepository.listRegistrations({ division: String(divId), page_size: '100' }),
      ]);
      const reg = regRes.data.results.find(r => r.id === registrationId);
      if (reg) {
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
  }, [registrationId, divId]);

  useEffect(() => { load(); }, [load]);

  // ── Place deduction in a zone ─────────────────────────────────────────────
  const handlePlace = (type: DeductionType, zoneKey: string) => {
    setPending({ type, time: zoneKey, count: 1, notes: '', hitZero: false });
    setArmedType(null);
    dragTypeRef.current = null;
  };

  // ── Confirm placement ─────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!sheet || !pending) return;
    setSaving(true);
    try {
      await competitionsRepository.createDeduction({
        score_sheet:    sheet.id,
        deduction_type: pending.type,
        count:          pending.count,
        routine_time:   pending.time,
        hit_zero:       pending.hitZero,
        notes:          pending.notes,
      });
      toast.success('Descuento registrado');
      setPending(null);
      await load();
    } catch {
      toast.error('No se pudo registrar el descuento');
    } finally {
      setSaving(false);
    }
  };

  const handleDirectConfirm = async (type: DeductionType) => {
    const entry = directPendings[type];
    if (!sheet || !entry) return;
    setSavingDirect(type);
    try {
      await competitionsRepository.createDeduction({
        score_sheet:    sheet.id,
        deduction_type: type,
        count:          entry.count,
        routine_time:   '',
        hit_zero:       entry.hitZero,
        notes:          entry.notes,
      });
      toast.success('Descuento registrado');
      setDirectPendings(prev => { const next = { ...prev }; delete next[type]; return next; });
      await load();
    } catch {
      toast.error('No se pudo registrar el descuento');
    } finally {
      setSavingDirect(null);
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

  // Group deductions by full zone key (routine_time = "0 a 15 / F·IZQ")
  const dedsByZone: Record<string, Deduction[]> = {};
  for (const d of deductions) {
    const k = d.routine_time || 'sin tiempo';
    if (!dedsByZone[k]) dedsByZone[k] = [];
    dedsByZone[k].push(d);
  }

  const previewTotal = pending
    ? (pending.count * parseFloat(DEDUCTION_AMOUNTS[pending.type])).toFixed(2)
    : '0.00';

  // Helper: build zone key
  const zoneKey = (intervalKey: string, zKey: string) => `${intervalKey} / ${zKey}`;

  // Helper: does this interval row contain the pending zone?
  const rowHasPending = (intervalKey: string) =>
    pending !== null && TRACK_ZONES.some(z => pending.time === zoneKey(intervalKey, z.key));

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">

      {/* ── Sticky header ──────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 flex items-center justify-between gap-4 bg-white border-b border-zinc-200 px-6 py-3 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/competitions/${competitionId}/divisions/${divId}`)}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-400 font-medium">Planilla — Deducciones</p>
            <p className="text-sm font-semibold text-zinc-900 leading-tight">
              {teamName || `Inscripción #${registrationId}`}
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
      <PaymentWarningBanner unpaidAthletes={unpaidAthletes} requirePayment={requirePayment} />

      <div className="max-w-6xl mx-auto px-4 py-6 print:hidden">

        {/* ── No sheet warning ─────────────────────────────────────────────── */}
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
            {/* ── Armed type hint banner ──────────────────────────────────── */}
            {armedType && !pending && (
              <div
                className="flex items-center justify-between rounded-xl px-4 py-3 mb-4 shadow-sm"
                style={{ backgroundColor: primary, color: organization?.text_on_primary ?? '#fff' }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-black">{DEDUCTION_CODES[armedType]}</span>
                  <div>
                    <p className="text-sm font-semibold">{DEDUCTION_TYPE_LABELS[armedType]}</p>
                    <p className="text-xs opacity-70">Toca una celda de la pista para registrar</p>
                  </div>
                </div>
                <button
                  onClick={() => setArmedType(null)}
                  className="rounded-lg p-1.5 hover:bg-white/20 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* ── 3-column main layout ─────────────────────────────────────── */}
            <div className="grid grid-cols-[200px_1fr_152px] gap-4 items-start">

              {/* ═══ LEFT — Deduction palette ═══════════════════════════════ */}
              <div className="flex flex-col gap-3 sticky top-20">

                {[
                  { key: 'CAÍDAS',          types: FALLS,   isFallGroup: true  },
                  { key: 'TIEMPO',          types: TIME,    isFallGroup: false },
                  { key: 'ILEGALIDADES',    types: ILLEGAL, isFallGroup: false },
                  { key: 'ADMINISTRATIVAS', types: ADMIN,   isFallGroup: false },
                ].map(({ key, types, isFallGroup }) => {
                  const { label, color } = SECTION_COLORS[key];
                  return (
                    <div key={key} className="flex flex-col gap-1">
                      <p className={`text-[9px] font-bold uppercase tracking-widest px-1 flex items-center gap-1 ${
                        color === 'red' ? 'text-red-500' :
                        color === 'orange' ? 'text-orange-500' :
                        color === 'amber' ? 'text-amber-600' : 'text-zinc-500'
                      }`}>
                        {label}
                        <span className="font-normal normal-case tracking-normal opacity-60">
                          {isFallGroup ? '→ pista' : '→ lista'}
                        </span>
                      </p>
                      <div className="flex flex-col gap-1">
                        {types.map(type => {
                          const isArmed   = armedType === type;
                          const isDirect  = type in directPendings;
                          const ck        = colorFor(type);
                          return (
                            <div
                              key={type}
                              draggable={isFallGroup}
                              onDragStart={isFallGroup ? (e) => {
                                e.dataTransfer.setData('deduction-type', type);
                                dragTypeRef.current = type;
                                setArmedType(type);
                              } : undefined}
                              onDragEnd={isFallGroup ? () => {
                                setTimeout(() => {
                                  if (!pending) setArmedType(null);
                                }, 50);
                              } : undefined}
                              onClick={() => {
                                if (isFallGroup) {
                                  setArmedType(prev => prev === type ? null : type);
                                  setDirectPendings({});
                                } else {
                                  setDirectPendings(prev => {
                                    if (type in prev) {
                                      const next = { ...prev }; delete next[type]; return next;
                                    }
                                    return { ...prev, [type]: { count: 1, notes: '', hitZero: false } };
                                  });
                                  setArmedType(null);
                                }
                              }}
                              className={`flex items-center justify-between rounded-lg px-3 py-2 border transition-all select-none ${
                                isFallGroup ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                              } ${
                                isArmed || isDirect
                                  ? `${PILL_COLORS[ck]} border-transparent shadow-md scale-[1.02]`
                                  : 'bg-white border-zinc-200 hover:border-zinc-400 hover:shadow-sm'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`text-sm font-black shrink-0 ${isArmed || isDirect ? 'text-white' : 'text-zinc-900'}`}>
                                  {DEDUCTION_CODES[type]}
                                </span>
                                <span className={`text-[9px] truncate ${isArmed || isDirect ? 'text-white/75' : 'text-zinc-400'}`}>
                                  {DEDUCTION_TYPE_LABELS[type].split(' ').slice(0, 2).join(' ')}
                                </span>
                              </div>
                              <span className={`text-[10px] font-bold tabular-nums shrink-0 ml-1 ${isArmed || isDirect ? 'text-white/90' : 'text-red-600'}`}>
                                −{DEDUCTION_AMOUNTS[type]}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ═══ CENTER — Pista / Track ══════════════════════════════════ */}
              <div className="flex flex-col rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm">

                {/* Track header with column labels */}
                <div className="flex items-stretch border-b border-zinc-200 bg-zinc-50">
                  <div className="w-20 shrink-0 flex items-center justify-center px-2 border-r border-zinc-200">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Tiempo</p>
                  </div>
                  <div className="flex-1 grid grid-cols-3">
                    {ZONE_COLS.map((col, ci) => (
                      <div key={col.key} className={`py-2 text-center ${ci < 2 ? 'border-r border-zinc-200' : ''}`}>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">{col.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="w-20 shrink-0 flex items-center justify-center px-2 border-l border-zinc-200">
                    <p className="text-[10px] text-zinc-400">2:30 min</p>
                  </div>
                </div>

                {/* Time rows */}
                <div className="divide-y divide-zinc-200">
                  {TRACK_INTERVALS.map(({ key, label }) => {
                    const hasPending = rowHasPending(key);
                    const isArmedRow = !!armedType && !pending;
                    const isMidpoint = key === '1 a 1:15' || key === '2:00 a 2:15';

                    return (
                      <div key={key} className={isMidpoint ? 'bg-zinc-50/60' : ''}>

                        {/* Row with 9 cells */}
                        <div className={`flex items-stretch min-h-[90px] ${hasPending ? 'bg-blue-50/40' : ''}`}>

                          {/* Left time label */}
                          <div className={`flex flex-col items-end justify-center shrink-0 w-20 px-2.5 py-2 self-stretch border-r ${
                            isMidpoint ? 'border-zinc-400 bg-zinc-100' : 'border-zinc-200'
                          }`}>
                            <span className={`text-[12px] font-mono font-bold tabular-nums leading-snug text-right ${
                              isMidpoint ? 'text-zinc-700' : 'text-zinc-500'
                            }`}>{label.split(' a ')[0]}</span>
                            <span className="text-[9px] font-mono text-zinc-300 leading-none">a</span>
                            <span className={`text-[12px] font-mono font-bold tabular-nums leading-snug text-right ${
                              isMidpoint ? 'text-zinc-700' : 'text-zinc-500'
                            }`}>{label.split(' a ')[1]}</span>
                          </div>

                          {/* 3×3 grid of drop zones */}
                          <div className="flex-1 grid grid-cols-3 grid-rows-3 divide-x divide-y divide-zinc-100">
                            {TRACK_ZONES.map((zone, zi) => {
                              const fullKey    = zoneKey(key, zone.key);
                              const isHovered  = hoveredZone === fullKey;
                              const isPending  = pending?.time === fullKey;
                              const zoneDeds   = dedsByZone[fullKey] ?? [];
                              const isRowLabel = zi % 3 === 0; // first col of each row
                              const rowIdx     = Math.floor(zi / 3);

                              return (
                                <div
                                  key={zone.key}
                                  className={`relative flex flex-col items-center justify-center gap-1 p-1 transition-colors min-h-[30px] ${
                                    isPending
                                      ? 'bg-blue-100'
                                      : isHovered && isArmedRow
                                      ? 'bg-zinc-100'
                                      : ''
                                  } ${isArmedRow ? 'cursor-crosshair' : ''}`}
                                  onDragOver={(e) => { e.preventDefault(); setHoveredZone(fullKey); }}
                                  onDragLeave={() => setHoveredZone(null)}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    const type = (e.dataTransfer.getData('deduction-type') || dragTypeRef.current) as DeductionType | null;
                                    if (type && FALLS.includes(type)) handlePlace(type, fullKey);
                                    setHoveredZone(null);
                                  }}
                                  onClick={() => {
                                    if (armedType && FALLS.includes(armedType) && !pending) handlePlace(armedType, fullKey);
                                  }}
                                >
                                  {/* Row depth label on the left cell of each row */}
                                  {isRowLabel && (
                                    <span className={`absolute left-1 top-1 text-[8px] font-bold uppercase tracking-widest ${
                                      rowIdx === 0 ? 'text-zinc-300' :
                                      rowIdx === 1 ? 'text-zinc-200' : 'text-zinc-300'
                                    }`}>{ZONE_ROWS[rowIdx].label[0]}</span>
                                  )}

                                  {/* Deduction chips */}
                                  {zoneDeds.length > 0 && (
                                    <div className="relative z-10 flex flex-wrap gap-1 justify-center">
                                      {zoneDeds.map(ded => {
                                        const ck = colorFor(ded.deduction_type);
                                        return (
                                          <div
                                            key={ded.id}
                                            title={`${DEDUCTION_TYPE_LABELS[ded.deduction_type]}${ded.count > 1 ? ` ×${ded.count}` : ''} = −${ded.total_amount}`}
                                            className={`group/chip flex items-center gap-0.5 rounded px-1.5 py-0.5 border text-[10px] font-bold cursor-pointer transition-all hover:scale-105 ${BADGE_COLORS[ck]}`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (confirm(`Eliminar ${DEDUCTION_CODES[ded.deduction_type]} (−${ded.total_amount})?`)) {
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

                                  {/* Drop hint */}
                                  {isHovered && isArmedRow && zoneDeds.length === 0 && (
                                    <span className={`relative z-10 rounded px-1.5 py-0.5 text-[10px] font-bold border opacity-60 ${armedType ? BADGE_COLORS[colorFor(armedType)] : ''}`}>
                                      {armedType ? DEDUCTION_CODES[armedType] : ''}
                                    </span>
                                  )}

                                  {/* Empty cell center dot */}
                                  {zoneDeds.length === 0 && !isHovered && (
                                    <div className="w-1 h-1 rounded-full bg-zinc-150 opacity-40" />
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Right time label */}
                          <div className={`flex flex-col items-start justify-center shrink-0 w-20 px-2.5 py-2 self-stretch border-l ${
                            isMidpoint ? 'border-zinc-400 bg-zinc-100' : 'border-zinc-200'
                          }`}>
                            <span className={`text-[12px] font-mono font-bold tabular-nums leading-snug ${
                              isMidpoint ? 'text-zinc-700' : 'text-zinc-500'
                            }`}>{label.split(' a ')[0]}</span>
                            <span className="text-[9px] font-mono text-zinc-300 leading-none">a</span>
                            <span className={`text-[12px] font-mono font-bold tabular-nums leading-snug ${
                              isMidpoint ? 'text-zinc-700' : 'text-zinc-500'
                            }`}>{label.split(' a ')[1]}</span>
                          </div>
                        </div>

                        {/* ── Inline confirmation form ─────────────────────── */}
                        {hasPending && pending && (
                          <div className="border-y border-blue-200 bg-blue-50 px-4 py-3">
                            <div className="flex items-start gap-3">
                              <span className={`rounded-lg px-2.5 py-1 text-sm font-black shrink-0 ${PILL_COLORS[colorFor(pending.type)]}`}>
                                {DEDUCTION_CODES[pending.type]}
                              </span>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <span className="text-xs font-semibold text-zinc-700">{DEDUCTION_TYPE_LABELS[pending.type]}</span>
                                  <span className="text-xs text-zinc-400">{pending.time}</span>
                                  <span className="text-xs font-bold text-red-600">−{previewTotal}</span>
                                </div>

                                <div className="flex items-center gap-3 flex-wrap">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-zinc-500">Cantidad:</span>
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => setPending(p => p ? { ...p, count: Math.max(1, p.count - 1) } : p)}
                                        className="w-6 h-6 rounded border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100 text-sm font-bold flex items-center justify-center"
                                      >−</button>
                                      <span className="w-5 text-center text-sm font-bold tabular-nums">{pending.count}</span>
                                      <button
                                        type="button"
                                        onClick={() => setPending(p => p ? { ...p, count: p.count + 1 } : p)}
                                        className="w-6 h-6 rounded border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100 text-sm font-bold flex items-center justify-center"
                                      >+</button>
                                    </div>
                                  </div>

                                  <input
                                    type="text"
                                    placeholder="Nota (opcional)"
                                    value={pending.notes}
                                    onChange={(e) => setPending(p => p ? { ...p, notes: e.target.value } : p)}
                                    className="flex-1 min-w-32 h-7 rounded-lg border border-zinc-300 bg-white px-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />

                                  <label className="flex items-center gap-1 text-[10px] cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={pending.hitZero}
                                      onChange={(e) => setPending(p => p ? { ...p, hitZero: e.target.checked } : p)}
                                      className="rounded border-zinc-300"
                                    />
                                    <span className="font-bold text-red-700 uppercase tracking-wide">Hit Zero</span>
                                  </label>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setPending(null)}
                                  className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  onClick={handleConfirm}
                                  disabled={saving}
                                  className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
                                >
                                  {saving ? '...' : `Agregar −${previewTotal}`}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Outside-time row */}
                  {dedsByZone['sin tiempo'] && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 border-t border-zinc-200">
                      <span className="text-[10px] text-zinc-400 w-20 text-right pr-2 shrink-0">Sin tiempo</span>
                      <div className="flex flex-wrap gap-1.5">
                        {dedsByZone['sin tiempo'].map(ded => {
                          const ck = colorFor(ded.deduction_type);
                          return (
                            <div
                              key={ded.id}
                              className={`flex items-center gap-1 rounded-md px-2 py-0.5 border text-xs font-bold cursor-pointer hover:scale-105 transition-all ${BADGE_COLORS[ck]}`}
                              onClick={() => {
                                if (confirm(`Eliminar ${DEDUCTION_CODES[ded.deduction_type]} (−${ded.total_amount})?`)) {
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

                {/* Track footer */}
                <div className="px-4 py-2 border-t border-zinc-100 bg-zinc-50">
                  <p className="text-[9px] text-zinc-400 text-center">
                    Solo caídas · Arrastra o selecciona y toca una celda · F = Frente · C = Centro · T = Fondo · Clic en badge para eliminar
                  </p>
                </div>
              </div>

              {/* ═══ RIGHT — Reference table ════════════════════════════════ */}
              <div className="flex flex-col gap-2 sticky top-20">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1">Referencia</p>

                {[
                  { title: 'CAÍDAS',          types: FALLS,   color: 'red'    as ColorKey },
                  { title: 'TIEMPO',          types: TIME,    color: 'orange' as ColorKey },
                  { title: 'ILEGALIDADES',    types: ILLEGAL, color: 'amber'  as ColorKey },
                  { title: 'ADMINISTRATIVAS', types: ADMIN,   color: 'zinc'   as ColorKey },
                ].map(({ title, types, color }) => (
                  <div key={title} className="rounded-lg border border-zinc-100 bg-white overflow-hidden">
                    <div className={`px-2.5 py-1 text-[8px] font-bold uppercase tracking-widest ${
                      color === 'red'    ? 'bg-red-50 text-red-500' :
                      color === 'orange' ? 'bg-orange-50 text-orange-500' :
                      color === 'amber'  ? 'bg-amber-50 text-amber-600' :
                      'bg-zinc-50 text-zinc-500'
                    }`}>{title}</div>
                    <div className="divide-y divide-zinc-50">
                      {types.map(type => (
                        <div key={type} className="flex items-center justify-between px-2.5 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black text-zinc-800 w-9">{DEDUCTION_CODES[type]}</span>
                            <span className="text-[8px] text-zinc-400 leading-tight">
                              {DEDUCTION_TYPE_LABELS[type].split(' ').slice(0, 2).join(' ')}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold tabular-nums text-red-500">−{DEDUCTION_AMOUNTS[type]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

            </div>

            {/* ── Direct-add panel (tiempo / ilegalidades / administrativas) ─ */}
            {Object.keys(directPendings).length > 0 && (
              <div className="mt-6 rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
                <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-200">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                    Por registrar ({Object.keys(directPendings).length})
                  </p>
                </div>
                <div className="divide-y divide-zinc-100">
                  {(Object.entries(directPendings) as [DeductionType, DirectPendingEntry][]).map(([type, entry]) => {
                    const ck      = colorFor(type);
                    const total   = (entry.count * parseFloat(DEDUCTION_AMOUNTS[type])).toFixed(2);
                    const isBusy  = savingDirect === type;
                    return (
                      <div key={type} className="flex items-center gap-3 px-4 py-3">
                        <span className={`rounded-lg px-2.5 py-1 text-sm font-black shrink-0 ${PILL_COLORS[ck]}`}>
                          {DEDUCTION_CODES[type]}
                        </span>

                        <div className="flex-1 min-w-0 flex items-center gap-3 flex-wrap">
                          <span className="text-xs font-semibold text-zinc-700 shrink-0">
                            {DEDUCTION_TYPE_LABELS[type]}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setDirectPendings(p => ({ ...p, [type]: { ...entry, count: Math.max(1, entry.count - 1) } }))}
                              className="w-6 h-6 rounded border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100 text-sm font-bold flex items-center justify-center"
                            >−</button>
                            <span className="w-5 text-center text-sm font-bold tabular-nums">{entry.count}</span>
                            <button
                              type="button"
                              onClick={() => setDirectPendings(p => ({ ...p, [type]: { ...entry, count: entry.count + 1 } }))}
                              className="w-6 h-6 rounded border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100 text-sm font-bold flex items-center justify-center"
                            >+</button>
                          </div>

                          <input
                            type="text"
                            placeholder="Nota (opcional)"
                            value={entry.notes}
                            onChange={(e) => setDirectPendings(p => ({ ...p, [type]: { ...entry, notes: e.target.value } }))}
                            className="flex-1 min-w-28 h-7 rounded-lg border border-zinc-300 bg-white px-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                          />

                          <span className="text-xs font-bold text-red-600 tabular-nums shrink-0">−{total}</span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setDirectPendings(prev => { const next = { ...prev }; delete next[type]; return next; })}
                            className="rounded-lg border border-zinc-200 p-1.5 text-zinc-400 hover:text-red-500 hover:border-red-200 transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDirectConfirm(type)}
                            disabled={isBusy}
                            className="rounded-lg bg-zinc-900 hover:bg-zinc-700 text-white px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
                          >
                            {isBusy ? '...' : `Agregar −${total}`}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Deductions list + totals ──────────────────────────────────── */}
            <div className="mt-6 flex flex-col gap-3">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                Descuentos registrados{deductions.length > 0 && ` (${deductions.length})`}
              </h2>

              {deductions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-5 py-8 text-center">
                  <p className="text-sm text-zinc-400">Sin descuentos — arrastra o selecciona un tipo y toca la pista</p>
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                  <div className="grid grid-cols-[7rem_4.5rem_1fr_5rem_2.5rem] gap-0 border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                    <span>Tiempo / Zona</span>
                    <span>Código</span>
                    <span>Descripción</span>
                    <span className="text-right">Monto</span>
                    <span />
                  </div>
                  <div className="divide-y divide-zinc-100">
                    {[...deductions].sort((a, b) => (a.routine_time || 'z').localeCompare(b.routine_time || 'z')).map(ded => {
                      const ck = colorFor(ded.deduction_type);
                      return (
                        <div key={ded.id} className="grid grid-cols-[7rem_4.5rem_1fr_5rem_2.5rem] gap-0 items-center px-3 py-2.5">
                          <span className="text-xs tabular-nums text-zinc-500 font-mono leading-tight">{ded.routine_time || '—'}</span>
                          <span className={`inline-flex items-center justify-center self-center rounded-md px-2 py-0.5 text-xs font-black w-fit ${BADGE_COLORS[ck]}`}>
                            {DEDUCTION_CODES[ded.deduction_type]}
                          </span>
                          <div className="min-w-0 pr-2">
                            <p className="text-xs text-zinc-700 truncate">
                              {ded.notes || DEDUCTION_TYPE_LABELS[ded.deduction_type]}
                            </p>
                            {ded.count > 1 && <p className="text-[10px] text-zinc-400">{ded.count} × −{ded.unit_amount}</p>}
                            {ded.hit_zero && <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide">Hit Zero</p>}
                          </div>
                          <span className="text-sm font-bold tabular-nums text-red-600 text-right">−{ded.total_amount}</span>
                          <button
                            type="button"
                            onClick={() => handleDelete(ded)}
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

              {/* Totals */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between rounded-xl bg-red-600 px-5 py-3 text-white">
                  <span className="text-sm font-semibold uppercase tracking-wide">Total Descuentos</span>
                  <span className="text-2xl font-bold tabular-nums">−{fmt(totalDed)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl px-5 py-3" style={{ backgroundColor: primary, color: organization?.text_on_primary ?? '#fff' }}>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-xs uppercase tracking-wide opacity-60">Score final</span>
                    <span>Escalado: <strong className="tabular-nums">{fmt(scaledScore)}</strong></span>
                    <span>−<strong className="text-red-300 tabular-nums">{fmt(totalDed)}</strong></span>
                  </div>
                  <span className="text-2xl font-bold tabular-nums">{fmt(finalScore)}</span>
                </div>
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
