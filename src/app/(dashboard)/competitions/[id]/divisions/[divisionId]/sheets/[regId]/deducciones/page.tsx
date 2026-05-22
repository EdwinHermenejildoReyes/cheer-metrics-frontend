'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, AlertCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { PageSpinner } from '@/components/ui/spinner';
import competitionsRepository from '@/repositories/competitionsRepository';
import {
  DEDUCTION_CODES,
  DEDUCTION_TYPE_LABELS,
  DEDUCTION_AMOUNTS,
  type DeductionType,
  type Deduction,
  type ScoreSheet,
} from '@/types/competitions';

const FALLS:   DeductionType[] = ['x', 'ca', 'csa', 'ec', 'cc', 'csc'];
const TIME:    DeductionType[] = ['tiempo'];
const ILLEGAL: DeductionType[] = ['pi', 'eap', 'rg', 'gfn', 'bfn', 'seg'];
// Short labels that fit in compact buttons
const SHORT_LABELS: Record<DeductionType, string> = {
  x:      'Salida superf.',
  ca:     'Caída atleta',
  csa:    'Caída seria atl.',
  ec:     'Error construc.',
  cc:     'Caída construc.',
  csc:    'Caída seria c.',
  tiempo: 'Por segundo',
  pi:     'Pol. imagen',
  eap:    'Est. atlét. pres.',
  rg:     'Reglas grales.',
  gfn:    'Gimn. fuera niv.',
  bfn:    'Acr. fuera niv.',
  seg:    'Infr. seguridad',
};

type ColorKey = 'red' | 'orange' | 'amber';

const COLOR: Record<ColorKey, {
  active: string; hover: string; form: string; btn: string;
  badge: string; codeBg: string;
}> = {
  red: {
    active:  'bg-red-600 border-red-600 text-white shadow-sm',
    hover:   'hover:border-red-300 hover:bg-red-50',
    form:    'border-red-200 bg-red-50',
    btn:     'bg-red-600 hover:bg-red-700 text-white',
    badge:   'bg-red-100 text-red-700',
    codeBg:  'bg-red-600',
  },
  orange: {
    active:  'bg-orange-500 border-orange-500 text-white shadow-sm',
    hover:   'hover:border-orange-300 hover:bg-orange-50',
    form:    'border-orange-200 bg-orange-50',
    btn:     'bg-orange-500 hover:bg-orange-600 text-white',
    badge:   'bg-orange-100 text-orange-700',
    codeBg:  'bg-orange-500',
  },
  amber: {
    active:  'bg-amber-500 border-amber-500 text-white shadow-sm',
    hover:   'hover:border-amber-300 hover:bg-amber-50',
    form:    'border-amber-200 bg-amber-50',
    btn:     'bg-amber-500 hover:bg-amber-600 text-white',
    badge:   'bg-amber-100 text-amber-700',
    codeBg:  'bg-amber-500',
  },
};

function colorFor(type: DeductionType): ColorKey {
  if (FALLS.includes(type))   return 'red';
  if (TIME.includes(type))    return 'orange';
  return 'amber';
}

function fmt(n: number | string) { return parseFloat(String(n)).toFixed(2); }

interface AddForm {
  count: number;
  routineTime: string;
  hitZero: boolean;
  notes: string;
}
const EMPTY_FORM: AddForm = { count: 1, routineTime: '', hitZero: false, notes: '' };

// ── Page ─────────────────────────────────────────────────────────────────────
export default function DeduccionesSheetPage() {
  const router = useRouter();
  const { id, divisionId, regId } = useParams<{ id: string; divisionId: string; regId: string }>();
  const competitionId  = Number(id);
  const divId          = Number(divisionId);
  const registrationId = Number(regId);

  const [teamName,   setTeamName]   = useState<string>('');
  const [sheet,      setSheet]      = useState<ScoreSheet | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [deleting,   setDeleting]   = useState<number | null>(null);
  const [addingType, setAddingType] = useState<DeductionType | null>(null);
  const [addForm,    setAddForm]    = useState<AddForm>(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);

  const load = useCallback(async () => {
    try {
      const [sheetRes, regRes] = await Promise.all([
        competitionsRepository.listScoreSheets({ registration: String(registrationId) }),
        competitionsRepository.listRegistrations({ division: String(divId), page_size: '100' }),
      ]);
      const reg = regRes.data.results.find((r) => r.id === registrationId);
      if (reg) setTeamName(reg.team_name);
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

  const handleSelectType = (type: DeductionType) => {
    if (addingType === type) {
      setAddingType(null);
    } else {
      setAddingType(type);
      setAddForm(EMPTY_FORM);
    }
  };

  const handleAdd = async () => {
    if (!sheet || !addingType) return;
    setSaving(true);
    try {
      await competitionsRepository.createDeduction({
        score_sheet:    sheet.id,
        deduction_type: addingType,
        count:          addForm.count,
        routine_time:   addForm.routineTime,
        hit_zero:       addForm.hitZero,
        notes:          addForm.notes,
      });
      toast.success('Descuento registrado');
      setAddingType(null);
      await load();
    } catch {
      toast.error('No se pudo registrar el descuento');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ded: Deduction) => {
    setDeleting(ded.id);
    try {
      await competitionsRepository.deleteDeduction(ded.id);
      toast.success('Descuento eliminado');
      await load();
    } catch {
      toast.error('No se pudo eliminar');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) return <PageSpinner />;

  const deductions  = sheet?.deductions ?? [];
  const totalDed    = parseFloat(sheet?.total_deductions ?? '0');
  const finalScore  = parseFloat(sheet?.final_score     ?? '0');
  const scaledScore = parseFloat(sheet?.scaled_score    ?? '0');

  return (
    <div className="min-h-screen bg-zinc-50 pb-16">

      {/* ── Sticky header ──────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-white border-b border-zinc-200 px-6 py-3 shadow-sm">
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

      <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-6">

        {/* ── No sheet warning ──────────────────────────────────────────────── */}
        {!sheet && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              No existe planilla de calificación para esta inscripción. Ingresa datos primero en Building, Tumbling u Overall para crear la planilla.
            </p>
          </div>
        )}

        {sheet && (
          <>
            {/* ══ CAÍDAS ═══════════════════════════════════════════════════ */}
            <section className="flex flex-col gap-3">
              <div className="flex items-baseline gap-2">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-red-500">Caídas</h2>
                <span className="text-[10px] text-zinc-400">X · CA · CSA · EC · CC · CSC</span>
              </div>
              <CodeGrid
                types={FALLS}
                active={addingType}
                onSelect={handleSelectType}
                color="red"
              />
              {addingType && FALLS.includes(addingType) && (
                <InlineForm
                  type={addingType}
                  color="red"
                  form={addForm}
                  onChange={setAddForm}
                  onAdd={handleAdd}
                  onCancel={() => setAddingType(null)}
                  saving={saving}
                />
              )}
            </section>

            {/* ══ TIEMPO ═══════════════════════════════════════════════════ */}
            <section className="flex flex-col gap-3">
              <div className="flex items-baseline gap-2">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-orange-500">Tiempo</h2>
                <span className="text-[10px] text-zinc-400">−0.05 por segundo de exceso</span>
              </div>
              {/* Tiempo as a single wide button */}
              <button
                type="button"
                onClick={() => handleSelectType('tiempo')}
                className={`flex items-center justify-between rounded-xl border px-5 py-3 transition-colors ${
                  addingType === 'tiempo'
                    ? COLOR.orange.active
                    : `bg-white border-zinc-200 ${COLOR.orange.hover}`
                }`}
              >
                <div className="flex items-center gap-3">
                  <Clock className={`h-5 w-5 shrink-0 ${addingType === 'tiempo' ? 'text-white' : 'text-orange-500'}`} />
                  <div className="text-left">
                    <p className={`text-base font-black tracking-tight ${addingType === 'tiempo' ? 'text-white' : 'text-zinc-900'}`}>
                      TIEMPO
                    </p>
                    <p className={`text-xs ${addingType === 'tiempo' ? 'text-white/75' : 'text-zinc-400'}`}>
                      Exceso de tiempo de rutina
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-bold tabular-nums ${addingType === 'tiempo' ? 'text-white/90' : 'text-orange-600'}`}>
                  −0.05 / seg
                </span>
              </button>
              {addingType === 'tiempo' && (
                <InlineForm
                  type="tiempo"
                  color="orange"
                  form={addForm}
                  onChange={setAddForm}
                  onAdd={handleAdd}
                  onCancel={() => setAddingType(null)}
                  saving={saving}
                  countLabel="Segundos de exceso"
                />
              )}
            </section>

            {/* ══ ILEGALIDADES ═════════════════════════════════════════════ */}
            <section className="flex flex-col gap-3">
              <div className="flex items-baseline gap-2">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-amber-500">Ilegalidades</h2>
                <span className="text-[10px] text-zinc-400">PI · EAP · RG · GFN · BFN · SEG</span>
              </div>
              <CodeGrid
                types={ILLEGAL}
                active={addingType}
                onSelect={handleSelectType}
                color="amber"
              />
              {addingType && ILLEGAL.includes(addingType) && (
                <InlineForm
                  type={addingType}
                  color="amber"
                  form={addForm}
                  onChange={setAddForm}
                  onAdd={handleAdd}
                  onCancel={() => setAddingType(null)}
                  saving={saving}
                />
              )}
            </section>

            {/* ══ DESCUENTOS REGISTRADOS ═══════════════════════════════════ */}
            <section className="flex flex-col gap-3">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                Descuentos registrados{deductions.length > 0 && ` (${deductions.length})`}
              </h2>

              {deductions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-5 py-8 text-center">
                  <p className="text-sm text-zinc-400">Sin descuentos registrados</p>
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                  {/* Table header */}
                  <div className="grid grid-cols-[4rem_4.5rem_1fr_5rem_2.5rem] gap-0 border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                    <span>Tiempo</span>
                    <span>Código</span>
                    <span>Descripción</span>
                    <span className="text-right">Monto</span>
                    <span />
                  </div>
                  <div className="divide-y divide-zinc-100">
                    {deductions.map((ded) => {
                      const ck = colorFor(ded.deduction_type);
                      return (
                        <div key={ded.id} className="grid grid-cols-[4rem_4.5rem_1fr_5rem_2.5rem] gap-0 items-center px-3 py-2.5">
                          {/* Time */}
                          <span className="text-xs tabular-nums text-zinc-500">
                            {ded.routine_time || '—'}
                          </span>
                          {/* Code badge */}
                          <span className={`inline-flex items-center justify-center self-center rounded-md px-2 py-0.5 text-xs font-black w-fit ${COLOR[ck].badge}`}>
                            {DEDUCTION_CODES[ded.deduction_type]}
                          </span>
                          {/* Description */}
                          <div className="min-w-0 pr-2">
                            <p className="text-xs text-zinc-700 truncate">
                              {ded.notes || DEDUCTION_TYPE_LABELS[ded.deduction_type]}
                            </p>
                            {ded.count > 1 && (
                              <p className="text-[10px] text-zinc-400">{ded.count} × −{ded.unit_amount}</p>
                            )}
                            {ded.hit_zero && (
                              <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide">Hit Zero</p>
                            )}
                          </div>
                          {/* Amount */}
                          <span className="text-sm font-bold tabular-nums text-red-600 text-right">
                            −{ded.total_amount}
                          </span>
                          {/* Delete */}
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
                <div className="flex items-center justify-between rounded-xl px-5 py-3" style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)' }}>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-xs uppercase tracking-wide opacity-60">Score final</span>
                    <span>Escalado: <strong className="tabular-nums">{fmt(scaledScore)}</strong></span>
                    <span>−<strong className="text-red-400 tabular-nums">{fmt(totalDed)}</strong></span>
                  </div>
                  <span className="text-2xl font-bold tabular-nums">{fmt(finalScore)}</span>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

// ── Code grid — all codes visible, code is the hero element ──────────────────
function CodeGrid({ types, active, onSelect, color }: {
  types: DeductionType[];
  active: DeductionType | null;
  onSelect: (t: DeductionType) => void;
  color: ColorKey;
}) {
  const c = COLOR[color];
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {types.map((type) => {
        const isActive = active === type;
        return (
          <button
            key={type}
            type="button"
            onClick={() => onSelect(type)}
            className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 transition-colors text-center ${
              isActive
                ? `${c.active}`
                : `bg-white border-zinc-200 ${c.hover}`
            }`}
          >
            <span className={`text-xl font-black tracking-tight leading-none ${isActive ? 'text-white' : 'text-zinc-900'}`}>
              {DEDUCTION_CODES[type]}
            </span>
            <span className={`text-[9px] leading-tight px-1 ${isActive ? 'text-white/75' : 'text-zinc-400'}`}>
              {SHORT_LABELS[type]}
            </span>
            <span className={`text-xs font-bold tabular-nums ${isActive ? 'text-white/90' : 'text-red-600'}`}>
              −{DEDUCTION_AMOUNTS[type]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Routine timeline — visual segment picker ──────────────────────────────────
// 6 segments × 30 sec = 3:00 total (covers all division durations)
const TIMELINE_SEGS = [
  { id: '0:15', label: '0:00', sub: '0–0:30' },
  { id: '0:45', label: '0:30', sub: '0:30–1:00' },
  { id: '1:15', label: '1:00', sub: '1:00–1:30' },
  { id: '1:45', label: '1:30', sub: '1:30–2:00' },
  { id: '2:15', label: '2:00', sub: '2:00–2:30' },
  { id: '2:45', label: '2:30', sub: '2:30–3:00' },
];

function RoutineTimeline({ selected, onSelect }: {
  selected: string;
  onSelect: (t: string) => void;
}) {
  // Which segment index is active (for the progress bar highlight)
  const activeIdx = TIMELINE_SEGS.findIndex(s => s.id === selected);

  return (
    <div>
      <label className="text-xs font-medium text-zinc-600 mb-2 block">
        Momento en rutina
        {selected && (
          <span className="ml-2 font-bold text-zinc-900 tabular-nums">≈ {selected}</span>
        )}
      </label>

      {/* Progress track */}
      <div className="relative mb-1">
        {/* Background rail */}
        <div className="h-1.5 rounded-full bg-zinc-200 absolute inset-x-0 top-1/2 -translate-y-1/2" />
        {/* Filled rail up to selection */}
        {activeIdx >= 0 && (
          <div
            className="h-1.5 rounded-full bg-zinc-700 absolute top-1/2 -translate-y-1/2 transition-all"
            style={{ width: `${((activeIdx + 1) / TIMELINE_SEGS.length) * 100}%` }}
          />
        )}
        {/* Segment dots + labels */}
        <div className="relative flex justify-between">
          {TIMELINE_SEGS.map((seg, i) => {
            const isActive = selected === seg.id;
            const isPast   = activeIdx >= 0 && i <= activeIdx;
            return (
              <button
                key={seg.id}
                type="button"
                onClick={() => onSelect(isActive ? '' : seg.id)}
                className="flex flex-col items-center gap-1.5 group"
                title={seg.sub}
              >
                {/* Dot */}
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-zinc-900 border-zinc-900 scale-125'
                    : isPast
                    ? 'bg-zinc-600 border-zinc-600'
                    : 'bg-white border-zinc-300 group-hover:border-zinc-500'
                }`}>
                  {isActive && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                {/* Time label */}
                <span className={`text-[10px] font-semibold tabular-nums ${
                  isActive ? 'text-zinc-900' : isPast ? 'text-zinc-500' : 'text-zinc-400'
                }`}>
                  {seg.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <p className="text-[9px] text-zinc-400 mt-2">Toca el segmento donde ocurrió el evento · Toca de nuevo para deseleccionar</p>
    </div>
  );
}

// ── Inline add form ───────────────────────────────────────────────────────────
function InlineForm({ type, color, form, onChange, onAdd, onCancel, saving, countLabel = 'Cantidad' }: {
  type: DeductionType;
  color: ColorKey;
  form: AddForm;
  onChange: (f: AddForm) => void;
  onAdd: () => void;
  onCancel: () => void;
  saving: boolean;
  countLabel?: string;
}) {
  const c = COLOR[color];
  const previewTotal = (form.count * parseFloat(DEDUCTION_AMOUNTS[type])).toFixed(2);
  const isTiempo = type === 'tiempo';

  return (
    <div className={`rounded-xl border ${c.form} px-4 py-4 flex flex-col gap-4`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className={`rounded-md px-2 py-0.5 text-xs font-black ${c.badge}`}>
          {DEDUCTION_CODES[type]}
        </span>
        <span className="text-xs text-zinc-600">
          {DEDUCTION_TYPE_LABELS[type]}
          <span className="ml-2 text-zinc-400">−{DEDUCTION_AMOUNTS[type]} {isTiempo ? '/ seg' : 'por unidad'}</span>
        </span>
      </div>

      {/* Timeline — only for falls and illegalities, not tiempo */}
      {!isTiempo && (
        <RoutineTimeline
          selected={form.routineTime}
          onSelect={(t) => onChange({ ...form, routineTime: t })}
        />
      )}

      {/* Count */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-zinc-600">{countLabel}</label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange({ ...form, count: Math.max(1, form.count - 1) })}
            className="w-8 h-8 rounded-lg border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 text-base font-bold flex items-center justify-center"
          >−</button>
          <span className="w-8 text-center text-sm font-bold tabular-nums">{form.count}</span>
          <button
            type="button"
            onClick={() => onChange({ ...form, count: form.count + 1 })}
            className="w-8 h-8 rounded-lg border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 text-base font-bold flex items-center justify-center"
          >+</button>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs font-medium text-zinc-600 mb-1.5 block">Descripción (opcional)</label>
        <input
          type="text"
          placeholder={isTiempo ? 'Ej. Pasó 3 segundos' : 'Ej. Caída volante en pirámide final'}
          value={form.notes}
          onChange={(e) => onChange({ ...form, notes: e.target.value })}
          className="w-full h-8 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900"
        />
      </div>

      {/* Hit zero */}
      <label className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={form.hitZero}
          onChange={(e) => onChange({ ...form, hitZero: e.target.checked })}
          className="rounded border-zinc-300"
        />
        <span className="font-bold text-red-700 uppercase tracking-wide">Hit Zero</span>
        <span className="text-zinc-400">— la rutina llegó a cero</span>
      </label>

      {/* Preview + actions */}
      <div className="border-t border-black/10 pt-3 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>{form.count} × −{DEDUCTION_AMOUNTS[type]}</span>
          <span className="font-bold text-red-600">−{previewTotal}</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-zinc-300 bg-white py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onAdd}
            disabled={saving}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${c.btn}`}
          >
            {saving ? 'Guardando...' : `Agregar −${previewTotal}`}
          </button>
        </div>
      </div>
    </div>
  );
}


