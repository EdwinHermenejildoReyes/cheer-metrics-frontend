'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Shield, Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { PageSpinner } from '@/components/ui/spinner';
import competitionsRepository from '@/repositories/competitionsRepository';
import { useJudge } from '@/hooks/useJudge';
import { toastApiError } from '@/utils/apiErrors';
import type { IcuDanceDeductionSheet } from '@/types/competitions';

const SKILL_TIERS = [
  { key: 'skill_025_count' as const, amount: 0.25, label: 'Error individual involuntario', hint: 'Ej. Poms abajo en aerial, error no coreografiado' },
  { key: 'skill_050_count' as const, amount: 0.50, label: 'Error individual coreografiado — 1 bailarín', hint: '' },
  { key: 'skill_100_count' as const, amount: 1.00, label: 'Error ind. coreog. / grupos involuntario', hint: 'Un bailarín coreografiado O grupos/parejas involuntario' },
  { key: 'skill_150_count' as const, amount: 1.50, label: 'Individual coreografiado — varios bailarines', hint: '' },
  { key: 'skill_200_count' as const, amount: 2.00, label: 'Grupos/parejas coreografiadas / múltiples involuntarios', hint: '' },
  { key: 'skill_250_count' as const, amount: 2.50, label: 'Equipo completo o casi completo coreografiado', hint: '' },
] as const;

type SkillKey = (typeof SKILL_TIERS)[number]['key'];
type TimeInfraction = 'none' | 'low' | 'mid' | 'high';

const TIME_OPTIONS: { value: TimeInfraction; label: string; amount: number }[] = [
  { value: 'none', label: 'Sin infracción de tiempo', amount: 0 },
  { value: 'low',  label: '3–7 segundos de exceso', amount: 0.5 },
  { value: 'mid',  label: '8–10 segundos de exceso', amount: 1.5 },
  { value: 'high', label: '11+ segundos de exceso', amount: 2.5 },
];

function Counter({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => onChange(Math.max(0, value - 1))} disabled={value <= 0 || disabled}
        className="w-8 h-8 rounded-lg bg-zinc-100 hover:bg-zinc-200 disabled:opacity-30 flex items-center justify-center transition-colors">
        <Minus className="w-3.5 h-3.5" />
      </button>
      <span className="w-7 text-center text-base font-bold tabular-nums">{value}</span>
      <button onClick={() => onChange(value + 1)} disabled={disabled}
        className="w-8 h-8 rounded-lg bg-zinc-100 hover:bg-zinc-200 disabled:opacity-30 flex items-center justify-center transition-colors">
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function IcuDanceDeductionsPage() {
  const router = useRouter();
  const { divisionId, regId } = useParams<{ id: string; divisionId: string; regId: string }>();
  const { isJudge } = useJudge();

  const [regIntId, setRegIntId]   = useState<number | null>(null);
  const [teamName, setTeamName]   = useState('');
  const [divisionName, setDivisionName] = useState('');
  const [sheetId, setSheetId]     = useState<number | null>(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);

  const [skillCounts, setSkillCounts] = useState<Record<SkillKey, number>>({
    skill_025_count: 0, skill_050_count: 0, skill_100_count: 0,
    skill_150_count: 0, skill_200_count: 0, skill_250_count: 0,
  });
  const [timeInfraction, setTimeInfraction]         = useState<TimeInfraction>('none');
  const [safetyDeduction, setSafetyDeduction]       = useState('0');
  const [imagePolicyCount, setImagePolicyCount]     = useState(0);
  const [conductDeduction, setConductDeduction]     = useState('0');
  const [registrationDeduction, setRegistrationDeduction] = useState('0');
  const [notes, setNotes]                           = useState('');

  const readOnly = !isJudge;

  // Live totals (mirror backend logic)
  const skillTotal = SKILL_TIERS.reduce((acc, t) => acc + skillCounts[t.key] * t.amount, 0);
  const timeTotal  = TIME_OPTIONS.find(o => o.value === timeInfraction)?.amount ?? 0;
  const totalDeductions =
    skillTotal + timeTotal +
    parseFloat(safetyDeduction  || '0') +
    imagePolicyCount * 1.0 +
    parseFloat(conductDeduction || '0') +
    parseFloat(registrationDeduction || '0');

  const load = useCallback(async () => {
    try {
      const [regRes, divRes] = await Promise.all([
        competitionsRepository.listRegistrations({ division__public_id: divisionId, page_size: '100' }),
        competitionsRepository.getDivision(divisionId),
      ]);
      const reg = regRes.data.results.find(r => r.public_id === regId);
      if (reg) {
        setRegIntId(reg.id);
        setTeamName(reg.team_name);
        const deductRes = await competitionsRepository.getIcuDeductionSheet(reg.id);
        const existing = deductRes.data.results[0] ?? null;
        if (existing) {
          setSheetId(existing.id ?? null);
          setSkillCounts({
            skill_025_count: existing.skill_025_count,
            skill_050_count: existing.skill_050_count,
            skill_100_count: existing.skill_100_count,
            skill_150_count: existing.skill_150_count,
            skill_200_count: existing.skill_200_count,
            skill_250_count: existing.skill_250_count,
          });
          setTimeInfraction(existing.time_infraction);
          setSafetyDeduction(existing.safety_deduction);
          setImagePolicyCount(existing.image_policy_count);
          setConductDeduction(existing.conduct_deduction);
          setRegistrationDeduction(existing.registration_deduction);
          setNotes(existing.notes);
        }
      }
      setDivisionName(divRes.data.name);
    } finally {
      setLoading(false);
    }
  }, [regId, divisionId]);

  useEffect(() => { load(); }, [load]);

  const initialSettled = useRef(false);
  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => { initialSettled.current = true; }, 500);
      return () => clearTimeout(t);
    }
  }, [loading]);

  const handleSave = useCallback(async (silent = false) => {
    if (!regIntId) return;
    setSaving(true);
    try {
      const payload: Partial<IcuDanceDeductionSheet> = {
        registration: regIntId,
        ...skillCounts,
        time_infraction: timeInfraction,
        safety_deduction: safetyDeduction,
        image_policy_count: imagePolicyCount,
        conduct_deduction: conductDeduction,
        registration_deduction: registrationDeduction,
        notes,
      };
      if (sheetId) {
        await competitionsRepository.updateIcuDeductionSheet(sheetId, payload);
      } else {
        const res = await competitionsRepository.createIcuDeductionSheet(payload);
        setSheetId(res.data.id ?? null);
      }
      if (!silent) toast.success('Deducciones guardadas.');
    } catch (err) {
      if (!silent) toastApiError(err, 'Error al guardar deducciones.');
    } finally {
      setSaving(false);
    }
  }, [regIntId, sheetId, skillCounts, timeInfraction, safetyDeduction, imagePolicyCount, conductDeduction, registrationDeduction, notes]);

  const handleSaveRef = useRef(handleSave);
  // eslint-disable-next-line react-hooks/refs
  handleSaveRef.current = handleSave;

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!initialSettled.current || readOnly) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { handleSaveRef.current(true); }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [skillCounts, timeInfraction, safetyDeduction, imagePolicyCount, conductDeduction, registrationDeduction, notes, readOnly]);

  if (loading) return <PageSpinner />;

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="sticky top-0 z-10 bg-white border-b border-zinc-200 px-4 py-3 flex items-center gap-3 print:hidden">
        <button onClick={() => router.back()} className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Shield className="w-4 h-4 text-red-500" />
        <div>
          <p className="text-xs text-zinc-400">{teamName} · {divisionName}</p>
          <h1 className="text-sm font-semibold text-zinc-900">Juez de Seguridad — Deducciones</h1>
        </div>
        {!readOnly ? (
          <button onClick={() => handleSave(false)} disabled={saving}
            className="ml-auto px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-50 transition-colors">
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        ) : (
          <span className="ml-auto text-xs bg-zinc-100 text-zinc-500 px-2 py-1 rounded-md">Solo lectura</span>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Skill violations */}
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Violaciones de Habilidades</p>
          </div>
          <div className="divide-y divide-zinc-50">
            {SKILL_TIERS.map(tier => (
              <div key={tier.key} className="px-4 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800">{tier.label}</p>
                  {tier.hint && <p className="text-xs text-zinc-400 mt-0.5">{tier.hint}</p>}
                  <p className="text-xs text-red-500 font-semibold mt-0.5">−{tier.amount.toFixed(2)} por ocurrencia</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Counter value={skillCounts[tier.key]} onChange={v => setSkillCounts(prev => ({ ...prev, [tier.key]: v }))} disabled={readOnly} />
                  <span className="w-14 text-right text-sm font-bold tabular-nums text-red-500">
                    {skillCounts[tier.key] > 0 ? `−${(skillCounts[tier.key] * tier.amount).toFixed(2)}` : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-2.5 bg-red-50 border-t border-red-100 flex justify-between">
            <span className="text-xs font-medium text-red-700">Subtotal violaciones</span>
            <span className="text-sm font-bold text-red-700">−{skillTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Time infraction */}
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Infracción de Tiempo</p>
          </div>
          <div className="p-4 space-y-2">
            {TIME_OPTIONS.map(opt => (
              <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                timeInfraction === opt.value
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-800'
              } ${readOnly ? 'pointer-events-none' : ''}`}>
                <input type="radio" name="time_infraction" value={opt.value}
                  checked={timeInfraction === opt.value}
                  onChange={() => !readOnly && setTimeInfraction(opt.value)}
                  className="hidden" />
                <span className="flex-1 text-sm">{opt.label}</span>
                {opt.amount > 0 && (
                  <span className={`text-sm font-bold tabular-nums ${timeInfraction === opt.value ? 'text-red-300' : 'text-red-500'}`}>
                    −{opt.amount.toFixed(1)}
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Discretionary deductions */}
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Otras Deducciones</p>
          </div>
          <div className="divide-y divide-zinc-50">
            {/* Image policy (count × 1.0) */}
            <div className="px-4 py-3 flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-zinc-800">Política de Imagen</p>
                <p className="text-xs text-red-500">−1.00 por ocurrencia</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Counter value={imagePolicyCount} onChange={setImagePolicyCount} disabled={readOnly} />
                <span className="w-14 text-right text-sm font-bold tabular-nums text-red-500">
                  {imagePolicyCount > 0 ? `−${imagePolicyCount.toFixed(2)}` : '—'}
                </span>
              </div>
            </div>
            {/* Decimal deductions */}
            {([
              { label: 'Infracciones de seguridad general', hint: '0.25 – 6.00 (a discreción del juez)', value: safetyDeduction, set: setSafetyDeduction },
              { label: 'Conducta antideportiva', hint: 'Hasta −6.00', value: conductDeduction, set: setConductDeduction },
              { label: 'Registro incorrecto', hint: 'Hasta −6.00', value: registrationDeduction, set: setRegistrationDeduction },
            ] as { label: string; hint: string; value: string; set: (v: string) => void }[]).map(row => (
              <div key={row.label} className="px-4 py-3 flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-800">{row.label}</p>
                  <p className="text-xs text-zinc-400">{row.hint}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm text-red-500 font-bold">−</span>
                  <input type="number" min="0" max="6" step="0.25" value={row.value}
                    onChange={e => row.set(e.target.value)} disabled={readOnly}
                    className="w-20 text-right border border-zinc-200 rounded-lg px-2 py-1.5 text-sm font-bold tabular-nums text-red-600 bg-white disabled:bg-zinc-50" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">Observaciones del Juez</p>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} disabled={readOnly}
            rows={3} placeholder="Notas adicionales del juez de seguridad…"
            className="w-full text-sm text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 resize-none disabled:bg-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-300" />
        </div>

        {/* Total */}
        <div className="rounded-xl border-2 border-red-200 bg-red-50 px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-red-600 font-medium uppercase tracking-wide">Total de Deducciones</p>
            <p className="text-xs text-red-400 mt-0.5">Se resta del promedio de los jueces de contenido</p>
          </div>
          <p className="text-4xl font-bold tabular-nums text-red-700">−{totalDeductions.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}
