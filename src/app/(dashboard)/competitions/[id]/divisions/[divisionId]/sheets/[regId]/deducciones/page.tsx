'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, AlertCircle } from 'lucide-react';
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

      <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-8">

        {/* ── No sheet warning ──────────────────────────────────────────── */}
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
            {/* ── Quick-add sections ──────────────────────────────────── */}

            {/* Caídas */}
            <section className="flex flex-col gap-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Caídas</h2>
              <DeductionGroup
                types={FALLS}
                addingType={addingType}
                onSelectType={handleSelectType}
                addForm={addForm}
                setAddForm={setAddForm}
                onAdd={handleAdd}
                saving={saving}
                onCancel={() => setAddingType(null)}
                accent="red"
              />
            </section>

            {/* Tiempo */}
            <section className="flex flex-col gap-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Tiempo</h2>
              <p className="text-xs text-zinc-400 -mt-1">Descuenta −0.05 por cada segundo de exceso</p>
              <DeductionGroup
                types={TIME}
                addingType={addingType}
                onSelectType={handleSelectType}
                addForm={addForm}
                setAddForm={setAddForm}
                onAdd={handleAdd}
                saving={saving}
                onCancel={() => setAddingType(null)}
                accent="orange"
                countLabel="Segundos de exceso"
              />
            </section>

            {/* Ilegalidades */}
            <section className="flex flex-col gap-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Ilegalidades</h2>
              <DeductionGroup
                types={ILLEGAL}
                addingType={addingType}
                onSelectType={handleSelectType}
                addForm={addForm}
                setAddForm={setAddForm}
                onAdd={handleAdd}
                saving={saving}
                onCancel={() => setAddingType(null)}
                accent="amber"
              />
            </section>

            {/* ── Recorded deductions list ────────────────────────────── */}
            <section className="flex flex-col gap-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                Descuentos registrados ({deductions.length})
              </h2>

              {deductions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-5 py-8 text-center">
                  <p className="text-sm text-zinc-400">Sin descuentos registrados</p>
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden divide-y divide-zinc-100">
                  {deductions.map((ded) => {
                    const inFalls   = FALLS.includes(ded.deduction_type);
                    const inTime    = TIME.includes(ded.deduction_type);
                    const chipCls   = inFalls   ? 'bg-red-100 text-red-700'
                                    : inTime    ? 'bg-orange-100 text-orange-700'
                                    :             'bg-amber-100 text-amber-700';
                    return (
                      <div key={ded.id} className="flex items-center gap-3 px-4 py-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${chipCls}`}>
                          {DEDUCTION_CODES[ded.deduction_type]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-900 leading-tight">
                            {ded.deduction_type_display || DEDUCTION_TYPE_LABELS[ded.deduction_type]}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-400">
                            {ded.routine_time && <span>{ded.routine_time}</span>}
                            <span>{ded.count} × −{ded.unit_amount}</span>
                            {ded.hit_zero && (
                              <span className="font-semibold text-red-600 uppercase tracking-wide">Hit Zero</span>
                            )}
                            {ded.notes && (
                              <span className="truncate max-w-[140px] italic">{ded.notes}</span>
                            )}
                          </div>
                        </div>
                        <span className="text-sm font-bold tabular-nums text-red-600 shrink-0">
                          −{ded.total_amount}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDelete(ded)}
                          disabled={deleting === ded.id}
                          className="rounded-lg p-1.5 text-zinc-300 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Totals */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between rounded-xl bg-red-600 px-5 py-3 text-white">
                  <span className="text-sm font-semibold uppercase tracking-wide">Total Descuentos</span>
                  <span className="text-2xl font-bold tabular-nums">−{fmt(totalDed)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-zinc-900 px-5 py-3 text-white">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-zinc-400 text-xs uppercase tracking-wide">Score final</span>
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

// ── Deduction group with inline add form ─────────────────────────────────────
const ACCENT = {
  red:    {
    active: 'bg-red-600 border-red-600 text-white ring-red-200',
    hover:  'hover:border-red-300 hover:bg-red-50 hover:text-red-700',
    form:   'border-red-200 bg-red-50',
    btn:    'bg-red-600 hover:bg-red-700 text-white',
  },
  orange: {
    active: 'bg-orange-500 border-orange-500 text-white ring-orange-200',
    hover:  'hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700',
    form:   'border-orange-200 bg-orange-50',
    btn:    'bg-orange-500 hover:bg-orange-600 text-white',
  },
  amber:  {
    active: 'bg-amber-500 border-amber-500 text-white ring-amber-200',
    hover:  'hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700',
    form:   'border-amber-200 bg-amber-50',
    btn:    'bg-amber-500 hover:bg-amber-600 text-white',
  },
};

function DeductionGroup({
  types,
  addingType,
  onSelectType,
  addForm,
  setAddForm,
  onAdd,
  saving,
  onCancel,
  accent,
  countLabel = 'Cantidad',
}: {
  types: DeductionType[];
  addingType: DeductionType | null;
  onSelectType: (t: DeductionType) => void;
  addForm: AddForm;
  setAddForm: (f: AddForm) => void;
  onAdd: () => void;
  saving: boolean;
  onCancel: () => void;
  accent: keyof typeof ACCENT;
  countLabel?: string;
}) {
  const c = ACCENT[accent];
  const active = addingType && types.includes(addingType) ? addingType : null;
  const previewTotal = active
    ? (addForm.count * parseFloat(DEDUCTION_AMOUNTS[active])).toFixed(2)
    : '0.00';

  return (
    <div className="flex flex-col gap-2">
      {/* Type buttons grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {types.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onSelectType(type)}
            className={`flex items-center justify-between rounded-xl px-3 py-2.5 border text-left transition-colors ${
              addingType === type
                ? `${c.active} shadow-sm ring-2`
                : `bg-white text-zinc-700 border-zinc-200 ${c.hover}`
            }`}
          >
            <div>
              <p className={`text-xs font-bold ${addingType === type ? 'text-white' : 'text-zinc-900'}`}>
                {DEDUCTION_CODES[type]}
              </p>
              <p className={`text-[11px] leading-tight mt-0.5 ${addingType === type ? 'text-white/80' : 'text-zinc-500'}`}>
                {DEDUCTION_TYPE_LABELS[type]}
              </p>
            </div>
            <span className={`text-xs font-semibold tabular-nums shrink-0 ml-2 ${addingType === type ? 'text-white/90' : 'text-zinc-400'}`}>
              −{DEDUCTION_AMOUNTS[type]}
            </span>
          </button>
        ))}
      </div>

      {/* Inline add form */}
      {active && (
        <div className={`rounded-xl border ${c.form} px-4 py-4 flex flex-col gap-3`}>
          <p className="text-xs font-semibold text-zinc-700">
            {DEDUCTION_CODES[active]} — {DEDUCTION_TYPE_LABELS[active]}
            <span className="ml-2 font-normal text-zinc-400">
              −{DEDUCTION_AMOUNTS[active]} por unidad
            </span>
          </p>

          {/* Count + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-600 mb-1.5 block">{countLabel}</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAddForm({ ...addForm, count: Math.max(1, addForm.count - 1) })}
                  className="w-8 h-8 rounded-lg border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 text-base font-bold flex items-center justify-center"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm font-bold tabular-nums">{addForm.count}</span>
                <button
                  type="button"
                  onClick={() => setAddForm({ ...addForm, count: addForm.count + 1 })}
                  className="w-8 h-8 rounded-lg border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 text-base font-bold flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600 mb-1.5 block">Momento (ej. 1:23)</label>
              <input
                type="text"
                placeholder="0:00"
                value={addForm.routineTime}
                onChange={(e) => setAddForm({ ...addForm, routineTime: e.target.value })}
                className="w-full h-8 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-zinc-600 mb-1.5 block">Nota (opcional)</label>
            <input
              type="text"
              placeholder="Descripción breve..."
              value={addForm.notes}
              onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
              className="w-full h-8 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>

          {/* Hit zero */}
          <label className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={addForm.hitZero}
              onChange={(e) => setAddForm({ ...addForm, hitZero: e.target.checked })}
              className="rounded border-zinc-300"
            />
            <span className="font-bold text-red-700 uppercase tracking-wide">Hit Zero</span>
            <span className="text-zinc-500">— la rutina llegó a cero</span>
          </label>

          {/* Preview */}
          <div className="flex items-center justify-between text-xs text-zinc-500 border-t border-black/10 pt-2">
            <span>{addForm.count} × −{DEDUCTION_AMOUNTS[active]}</span>
            <span className="font-bold text-red-600">−{previewTotal}</span>
          </div>

          {/* Actions */}
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
      )}
    </div>
  );
}
