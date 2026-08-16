'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { ArrowLeft, Star } from 'lucide-react';
import { toast } from 'sonner';
import { PageSpinner } from '@/components/ui/spinner';
import competitionsRepository from '@/repositories/competitionsRepository';
import { useJudge } from '@/hooks/useJudge';
import { toastApiError } from '@/utils/apiErrors';
import type { RootState } from '@/core/rootReducer';
import type { IcuJudgeScore, IcuAggregate } from '@/types/competitions';

// Solo Division Score Sheet
// Appearance/Projection (30): Facial(10) + Costume(10) + OverallEffect(10)
// Choreography (30): Variety(10) + Creativity(10) + Music(10)
// Technique (40): Execution(20) + Body(10) + Control(10)
// Total: 100 pts

type SoloScoreKey =
  | 'icu_solo_facial' | 'icu_solo_costume' | 'icu_solo_overall_effect'
  | 'icu_solo_variety' | 'icu_solo_creativity' | 'icu_solo_music'
  | 'icu_solo_technique_exec' | 'icu_solo_technique_body' | 'icu_solo_technique_control';

type SoloCommentKey =
  | 'icu_notes_solo_facial' | 'icu_notes_solo_costume' | 'icu_notes_solo_overall_effect'
  | 'icu_notes_solo_variety' | 'icu_notes_solo_creativity' | 'icu_notes_solo_music'
  | 'icu_notes_solo_technique_exec' | 'icu_notes_solo_technique_body' | 'icu_notes_solo_technique_control';

const SECTIONS: {
  label: string;
  pts: number;
  criteria: { key: SoloScoreKey; commentKey: SoloCommentKey; label: string; description: string; max: number }[];
}[] = [
  {
    label: 'APPEARANCE / PROJECTION',
    pts: 30,
    criteria: [
      { key: 'icu_solo_facial', commentKey: 'icu_notes_solo_facial', max: 10,
        label: 'Facial Expression / Eye Contact',
        description: 'Expresión facial y contacto visual con el público durante toda la actuación' },
      { key: 'icu_solo_costume', commentKey: 'icu_notes_solo_costume', max: 10,
        label: 'Costume & Appearance',
        description: 'El vestuario es apropiado para el estilo, categoría y música; presentación general del participante' },
      { key: 'icu_solo_overall_effect', commentKey: 'icu_notes_solo_overall_effect', max: 10,
        label: 'Overall Effect',
        description: 'Efecto general: la actuación es cohesiva, el vestuario y la música se complementan y refuerzan el desempeño' },
    ],
  },
  {
    label: 'CHOREOGRAPHY',
    pts: 30,
    criteria: [
      { key: 'icu_solo_variety', commentKey: 'icu_notes_solo_variety', max: 10,
        label: 'Variety and Difficulty',
        description: 'Variedad y dificultad de los movimientos y destrezas en relación con la categoría' },
      { key: 'icu_solo_creativity', commentKey: 'icu_notes_solo_creativity', max: 10,
        label: 'Creativity and Style',
        description: 'Creatividad y estilo únicos que reflejan la personalidad artística y la música' },
      { key: 'icu_solo_music', commentKey: 'icu_notes_solo_music', max: 10,
        label: 'Complements with Music',
        description: 'La coreografía complementa y realza la música: acentos, fraseo, ritmo y estilo' },
    ],
  },
  {
    label: 'TECHNIQUE',
    pts: 40,
    criteria: [
      { key: 'icu_solo_technique_exec', commentKey: 'icu_notes_solo_technique_exec', max: 20,
        label: 'Execution of Technical Skill',
        description: 'Ejecución de las destrezas técnicas propias del estilo con colocación, alineación, equilibrio, fuerza y control correctos' },
      { key: 'icu_solo_technique_body', commentKey: 'icu_notes_solo_technique_body', max: 10,
        label: 'Body Positioning / Alignment',
        description: 'Alineación, postura, colocación y posicionamiento corporal correctos a lo largo de la rutina' },
      { key: 'icu_solo_technique_control', commentKey: 'icu_notes_solo_technique_control', max: 10,
        label: 'Placement & Control',
        description: 'Control del escenario, colocación precisa y control del movimiento durante toda la actuación' },
    ],
  },
];

const ALL_KEYS  = SECTIONS.flatMap(s => s.criteria.map(c => c.key));
const ALL_CKEYS = SECTIONS.flatMap(s => s.criteria.map(c => c.commentKey));
const MAX_TOTAL = 100;

function ScoreSelector({ label, description, max, value, onChange }: {
  label: string; description: string; max: number; value: number; onChange: (v: number) => void;
}) {
  const pct = (value / max) * 100;
  const rel = value / max;
  const color = rel >= 0.8 ? 'emerald' : rel >= 0.5 ? 'amber' : 'red';
  const barColor = color === 'emerald' ? 'bg-emerald-500' : color === 'amber' ? 'bg-amber-400' : 'bg-red-400';
  const qual = rel >= 0.8 ? 'Sobre el promedio' : rel >= 0.5 ? 'Promedio' : 'Bajo el promedio';

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="flex items-start justify-between px-4 py-3 bg-zinc-50 border-b border-zinc-200">
        <div className="flex-1 pr-3">
          <p className="text-sm font-semibold text-zinc-900">{label}</p>
          {max === 20 && <span className="inline-block mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">20 pts</span>}
          <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-2xl font-bold tabular-nums text-zinc-900">{value}</span>
          <p className="text-[10px] text-zinc-400">/ {max}</p>
        </div>
      </div>
      <div className="px-4 pb-4 pt-3 flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1">
            {(max === 20 ? [-10, -2, -1] : [-5, -1]).map(d => (
              <button key={d} type="button" onClick={() => onChange(Math.max(0, value + d))}
                disabled={value <= 0}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-30 transition-colors">
                {d}
              </button>
            ))}
          </div>
          <div className="text-4xl font-bold tabular-nums text-zinc-900 w-16 text-center">{value}</div>
          <div className="flex gap-1">
            {(max === 20 ? [+1, +2, +10] : [+1, +5]).map(d => (
              <button key={d} type="button" onClick={() => onChange(Math.min(max, value + d))}
                disabled={value >= max}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-30 transition-colors">
                +{d}
              </button>
            ))}
          </div>
        </div>
        <input type="range" min={0} max={max} step={1} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full accent-zinc-900 cursor-pointer" />
        <div className="flex items-center justify-between">
          <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden flex-1 mr-3">
            <div className={`h-full rounded-full transition-all duration-200 ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
            color === 'emerald' ? 'bg-emerald-50 text-emerald-700' :
            color === 'amber'   ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
          }`}>{qual}</span>
        </div>
      </div>
    </div>
  );
}

export default function IcuDanceSoloPage() {
  const router = useRouter();
  const { divisionId, regId } = useParams<{ id: string; divisionId: string; regId: string }>();
  const { isJudge } = useJudge();
  const userId = useSelector((s: RootState) => s.auth.user?.id ?? null);

  const readOnly = !isJudge;

  const [regIntId, setRegIntId]         = useState<number | null>(null);
  const [teamName, setTeamName]         = useState('');
  const [divisionName, setDivisionName] = useState('');
  const [myScore, setMyScore]           = useState<IcuJudgeScore | null>(null);
  const [aggregate, setAggregate]       = useState<IcuAggregate | null>(null);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [notes, setNotes]               = useState('');
  const [comments, setComments]         = useState<Record<string, string>>(
    Object.fromEntries(ALL_CKEYS.map(k => [k, '']))
  );
  const [scores, setScores]             = useState<Record<string, number>>(
    Object.fromEntries(ALL_KEYS.map(k => [k, 0]))
  );

  const total = Object.values(scores).reduce((s, v) => s + v, 0);
  const pct   = (total / MAX_TOTAL) * 100;

  const loadAggregate = useCallback(async (rid: number) => {
    try {
      const res = await competitionsRepository.getIcuAggregate(rid, 'icu_dance_solo');
      setAggregate(res.data);
    } catch { /* noop */ }
  }, []);

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
        if (userId) {
          try {
            const scoreRes = await competitionsRepository.getMyIcuJudgeScore(reg.id, 'icu_dance_solo', userId);
            const existing = scoreRes.data.results[0] ?? null;
            if (existing) {
              setMyScore(existing);
              setScores(Object.fromEntries(ALL_KEYS.map(k => [k, parseFloat((existing as unknown as Record<string, string>)[k] ?? '0')])));
              setNotes(existing.notes);
              setComments(Object.fromEntries(ALL_CKEYS.map(k => [k, (existing as unknown as Record<string, string>)[k] ?? ''])));
            }
          } catch { /* no existing score */ }
        }
        await loadAggregate(reg.id);
      }
      setDivisionName(divRes.data.name);
    } finally {
      setLoading(false);
    }
  }, [regId, divisionId, userId, loadAggregate]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!readOnly || loading || !regIntId) return;
    const interval = setInterval(() => loadAggregate(regIntId), 5000);
    return () => clearInterval(interval);
  }, [readOnly, loading, regIntId, loadAggregate]);

  const initialSettled = useRef(false);
  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => { initialSettled.current = true; }, 500);
      return () => clearTimeout(t);
    }
  }, [loading]);

  const handleSave = useCallback(async (silent = false) => {
    if (!regIntId || !userId) return;
    setSaving(true);
    try {
      const payload = {
        ...Object.fromEntries(ALL_KEYS.map(k => [k, String(scores[k])])),
        ...Object.fromEntries(ALL_CKEYS.map(k => [k, comments[k] ?? ''])),
        notes,
        sheet_type: 'icu_dance_solo',
      } as Partial<IcuJudgeScore>;

      let saved: IcuJudgeScore;
      if (myScore) {
        const res = await competitionsRepository.updateIcuJudgeScore(myScore.id, payload);
        saved = res.data;
      } else {
        const res = await competitionsRepository.createIcuJudgeScore({ ...payload, registration: regIntId });
        saved = res.data;
      }
      setMyScore(saved);
      if (!silent) toast.success('Planilla guardada.');
    } catch (err) {
      toastApiError(err, 'Error al guardar planilla.');
    } finally {
      setSaving(false);
    }
  }, [regIntId, userId, myScore, scores, comments, notes]);

  const handleSaveRef = useRef(handleSave);
  // eslint-disable-next-line react-hooks/refs
  handleSaveRef.current = handleSave;

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!initialSettled.current || readOnly) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { handleSaveRef.current(true); }, 2000);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [scores, comments, notes, readOnly]);

  if (loading) return <PageSpinner />;

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="sticky top-0 z-10 bg-white border-b border-zinc-200 px-4 py-3 flex items-center gap-3 print:hidden">
        <button onClick={() => router.back()} className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Star className="w-4 h-4 text-amber-500" />
        <div>
          <p className="text-xs text-zinc-400">{teamName} · {divisionName}</p>
          <h1 className="text-sm font-semibold text-zinc-900">Solo / Dúo</h1>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {readOnly && aggregate && (
            <div className="text-right">
              <p className="text-xs text-zinc-400">{aggregate.count} juez{aggregate.count !== 1 ? 'ces' : ''}</p>
              <p className="text-sm font-bold text-zinc-900">{aggregate.average?.toFixed(2) ?? '—'}</p>
            </div>
          )}
          {!readOnly && (
            <button onClick={() => handleSave(false)} disabled={saving}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-50 transition-colors">
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          )}
        </div>
      </div>

      {/* Score summary */}
      <div className={`px-4 py-3 flex items-center justify-between ${readOnly ? 'bg-amber-50 border-b border-amber-100' : 'bg-white border-b border-zinc-100'}`}>
        <div>
          <p className="text-xs text-zinc-400">{readOnly ? 'Promedio de jueces' : 'Mi puntuación'}</p>
          <p className="text-2xl font-bold text-zinc-900 tabular-nums">
            {readOnly ? (aggregate?.average?.toFixed(2) ?? '—') : total}
            <span className="text-base font-normal text-zinc-400"> / {MAX_TOTAL}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-400">{readOnly ? `${aggregate?.count ?? 0} juez(ces)` : `${pct.toFixed(0)}%`}</p>
          {!readOnly && <div className="w-24 h-1.5 rounded-full bg-zinc-100 overflow-hidden mt-1">
            <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${pct}%` }} />
          </div>}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {readOnly ? (
          aggregate?.scores && aggregate.scores.length > 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-100">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Planillas de jueces</p>
              </div>
              <div className="divide-y divide-zinc-50">
                {aggregate.scores.map(s => (
                  <div key={s.id} className="px-4 py-3 flex items-center justify-between gap-4">
                    <p className="text-sm font-medium text-zinc-700">{s.judge_name}</p>
                    <p className="text-lg font-bold text-zinc-900 tabular-nums">{s.total.toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2.5 bg-amber-50 border-t border-amber-100 flex justify-between">
                <span className="text-xs font-medium text-amber-700">Promedio</span>
                <span className="text-sm font-bold text-amber-900">{aggregate.average?.toFixed(2) ?? '—'}</span>
              </div>
            </div>
          ) : (
            <p className="text-center text-sm text-zinc-400 py-8">Ningún juez ha enviado planilla aún.</p>
          )
        ) : (
          SECTIONS.map(section => (
            <div key={section.label}>
              <div className="flex items-center gap-2 mb-3 px-1">
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">{section.label}</p>
                <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded">{section.pts} pts</span>
              </div>
              <div className="space-y-3">
                {section.criteria.map(c => (
                  <ScoreSelector key={c.key} label={c.label} description={c.description} max={c.max}
                    value={scores[c.key] ?? 0}
                    onChange={v => setScores(prev => ({ ...prev, [c.key]: v }))} />
                ))}
              </div>
            </div>
          ))
        )}

        {!readOnly && (
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">Comentarios generales</p>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows={3} placeholder="Observaciones…"
              className="w-full text-sm text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-zinc-300" />
          </div>
        )}
      </div>
    </div>
  );
}
