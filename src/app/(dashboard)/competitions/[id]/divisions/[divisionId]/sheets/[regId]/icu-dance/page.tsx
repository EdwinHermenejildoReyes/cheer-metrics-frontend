'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { ArrowLeft, Save, Eye, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageSpinner } from '@/components/ui/spinner';
import { PrintButton } from '@/components/print/PrintButton';
import competitionsRepository from '@/repositories/competitionsRepository';
import { useJudge } from '@/hooks/useJudge';
import { toastApiError } from '@/utils/apiErrors';
import type { RootState } from '@/core/rootReducer';
import type { IcuJudgeScore, IcuAggregate, UnpaidAthlete } from '@/types/competitions';
import { PaymentWarningBanner } from '@/components/competitions/PaymentWarningBanner';

// ── ICU Dance scoring config (POM / Hip Hop / Jazz / High Kick teams) ────────
// Source: ICU World Cheerleading Championships Score Sheet
// Structure: 10 criteria × 10 pts = 100 pts

type IcuScoreKey = 'icu_style_execution' | 'icu_movement_technique' | 'icu_skill_technique' |
  'icu_synchronization' | 'icu_uniformity' | 'icu_spacing' |
  'icu_musicality' | 'icu_staging' | 'icu_complexity' | 'icu_audience_appeal';

type IcuCommentKey = 'icu_notes_style_execution' | 'icu_notes_movement_technique' | 'icu_notes_skill_technique' |
  'icu_notes_synchronization' | 'icu_notes_uniformity' | 'icu_notes_spacing' |
  'icu_notes_musicality' | 'icu_notes_staging' | 'icu_notes_complexity' | 'icu_notes_audience_appeal';

type IcuSection = {
  label: string;
  criteria: {
    key: IcuScoreKey;
    commentKey: IcuCommentKey;
    tabLabel: string;
    label: string;
    description: string;
    categoryNote?: string;
  }[];
};

const ICU_DANCE_SECTIONS: IcuSection[] = [
  {
    label: 'TECHNICAL EXECUTION',
    criteria: [
      {
        key: 'icu_style_execution',
        commentKey: 'icu_notes_style_execution',
        tabLabel: 'Ex Category Style',
        label: 'Category Style Execution',
        description: 'Quality and execution of the specific category style',
        categoryNote: 'POM: Técnica de movimiento de pompones — colocación, control, precisión · Hip Hop: Groove y calidad del estilo hip hop/street auténtico · Jazz: Continuidad del movimiento, calidad del estilo, extensión y presencia · High Kick: Técnica de patada alta — postura, flexibilidad, extensión, control',
      },
      {
        key: 'icu_movement_technique',
        commentKey: 'icu_notes_movement_technique',
        tabLabel: 'Ex Mov Technique',
        label: 'Movement Technique Execution',
        description: 'Movement that has strength, intensity, placement, control, presence and commitment',
      },
      {
        key: 'icu_skill_technique',
        commentKey: 'icu_notes_skill_technique',
        tabLabel: 'Ex Skills',
        label: 'Skill Technique Execution',
        description: 'Ability to demonstrate appropriate level skills with correct placement, body alignment, control, extension, balance, strength and completion of movement',
      },
    ],
  },
  {
    label: 'GROUP EXECUTION',
    criteria: [
      {
        key: 'icu_synchronization',
        commentKey: 'icu_notes_synchronization',
        tabLabel: 'Synch / Timing',
        label: 'Synchronization / Timing with Music',
        description: 'Correct timing with team members and the music',
      },
      {
        key: 'icu_uniformity',
        commentKey: 'icu_notes_uniformity',
        tabLabel: 'Uniformity',
        label: 'Uniformity of Movement',
        description: 'Movements are the same on each person: clear, clean and precise',
      },
      {
        key: 'icu_spacing',
        commentKey: 'icu_notes_spacing',
        tabLabel: 'Spacing',
        label: 'Spacing',
        description: 'Correct positioning/distance between individuals on the performance surface during the routine and transitions',
      },
    ],
  },
  {
    label: 'CHOREOGRAPHY',
    criteria: [
      {
        key: 'icu_musicality',
        commentKey: 'icu_notes_musicality',
        tabLabel: 'Musicality',
        label: 'Musicality',
        description: 'Movement that complements the music accents, rhythm, tempo, phrasing, lyrics, style, etc. in a creative, unique and original manner',
      },
      {
        key: 'icu_staging',
        commentKey: 'icu_notes_staging',
        tabLabel: 'Staging',
        label: 'Routine Staging / Visual Effects',
        description: 'Utilization of varied formations and seamless transitions. Visual impact of staging through group work, partner work, floor work, lifts, levels, opposition, etc.',
      },
      {
        key: 'icu_complexity',
        commentKey: 'icu_notes_complexity',
        tabLabel: 'Complexity',
        label: 'Complexity of Movement',
        description: 'Level of difficulty of movement such as tempo, weight changes, directional changes, connectivity, continuity, intricacy of movement, etc. Difficulty of skills being credited in relation to correct technical execution',
      },
    ],
  },
  {
    label: 'OVERALL EFFECT',
    criteria: [
      {
        key: 'icu_audience_appeal',
        commentKey: 'icu_notes_audience_appeal',
        tabLabel: 'Overall',
        label: 'Communication / Projection / Audience Appeal',
        description: 'Ability to exhibit a dynamic routine with genuine showmanship and audience appeal. The performance fulfills the category description and has age appropriate music, costume and choreography that enhances the performance',
      },
    ],
  },
];

const ALL_KEYS = ICU_DANCE_SECTIONS.flatMap(s => s.criteria.map(c => c.key));
const ALL_COMMENT_KEYS = ICU_DANCE_SECTIONS.flatMap(s => s.criteria.map(c => c.commentKey));
const ALL_CRITERIA = ICU_DANCE_SECTIONS.flatMap(s => s.criteria);
const MAX_TOTAL = ALL_KEYS.length * 10; // 100

function fmt(n: number) { return n.toFixed(0); }

// ── Score selector ─────────────────────────────────────────────────────────────

function ScoreSelector({
  label, description, categoryNote, value, onChange,
}: {
  label: string; description: string; categoryNote?: string;
  value: number; onChange: (v: number) => void;
}) {
  const pct = (value / 10) * 100;
  const color = value >= 8 ? 'emerald' : value >= 5 ? 'amber' : 'red';
  const barColor = color === 'emerald' ? 'bg-emerald-500' : color === 'amber' ? 'bg-amber-400' : 'bg-red-400';
  const qualLabel = value >= 8 ? 'Sobre el promedio' : value >= 5 ? 'Promedio' : 'Bajo el promedio';

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="flex items-start justify-between px-4 py-3 bg-zinc-50 border-b border-zinc-200">
        <div className="flex-1 pr-3">
          <p className="text-sm font-semibold text-zinc-900">{label}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
          {categoryNote && (
            <p className="text-[10px] text-zinc-400 mt-1 italic leading-relaxed">{categoryNote}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <span className="text-2xl font-bold tabular-nums text-zinc-900">{fmt(value)}</span>
          <p className="text-[10px] text-zinc-400">/ 10</p>
        </div>
      </div>

      <div className="px-4 pb-4 pt-3 flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1">
            {[-5, -1].map(d => (
              <button key={d} type="button" onClick={() => onChange(Math.max(0, value + d))}
                disabled={value <= 0}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-30 transition-colors">
                {d}
              </button>
            ))}
          </div>
          <div className="text-4xl font-bold tabular-nums text-zinc-900 w-16 text-center select-none">{value}</div>
          <div className="flex gap-1">
            {[+1, +5].map(d => (
              <button key={d} type="button" onClick={() => onChange(Math.min(10, value + d))}
                disabled={value >= 10}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-30 transition-colors">
                +{d}
              </button>
            ))}
          </div>
        </div>
        <input type="range" min={0} max={10} step={1} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full accent-zinc-900 cursor-pointer" />
        <div className="flex items-center justify-between">
          <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden flex-1 mr-3">
            <div className={`h-full rounded-full transition-all duration-200 ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
            color === 'emerald' ? 'bg-emerald-50 text-emerald-700' :
            color === 'amber'   ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
          }`}>{qualLabel}</span>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function IcuDanceSheetPage() {
  const router = useRouter();
  const { id, divisionId, regId } = useParams<{ id: string; divisionId: string; regId: string }>();

  const { isJudge } = useJudge();
  const userId = useSelector((s: RootState) => s.auth.user?.id ?? null);
  const [regIntId, setRegIntId] = useState<number | null>(null);
  const readOnly = !isJudge;

  const [teamName, setTeamName] = useState('');
  const [divisionName, setDivisionName] = useState('');
  const [category, setCategory] = useState('');
  const [myScore, setMyScore] = useState<IcuJudgeScore | null>(null);
  const [aggregate, setAggregate] = useState<IcuAggregate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unpaidAthletes, setUnpaidAthletes] = useState<UnpaidAthlete[]>([]);
  const [requirePayment, setRequirePayment] = useState(false);
  const [notes, setNotes] = useState('');
  const [activeCommentTab, setActiveCommentTab] = useState<'global' | IcuCommentKey>('global');
  const [comments, setComments] = useState<Record<string, string>>(
    Object.fromEntries(ALL_COMMENT_KEYS.map(k => [k, '']))
  );
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(ALL_KEYS.map(k => [k, 0]))
  );

  const total = Object.values(scores).reduce((s, v) => s + v, 0);
  const pct = (total / MAX_TOTAL) * 100;

  const loadAggregate = useCallback(async (rid: number) => {
    try {
      const res = await competitionsRepository.getIcuAggregate(rid, 'icu_dance');
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
        setUnpaidAthletes(reg.unpaid_athletes);
        setRequirePayment(reg.competition_require_payment);

        // Load this judge's own score (if judge) or skip (if admin)
        if (userId && reg.id) {
          try {
            const scoreRes = await competitionsRepository.getMyIcuJudgeScore(reg.id, 'icu_dance', userId);
            const existing = scoreRes.data.results[0] ?? null;
            if (existing) {
              setMyScore(existing);
              setScores(Object.fromEntries(ALL_KEYS.map(k => [k, parseFloat((existing as unknown as Record<string, string>)[k] ?? '0')])));
              setNotes(existing.notes);
              setComments(Object.fromEntries(ALL_COMMENT_KEYS.map(k => [k, (existing as unknown as Record<string, string>)[k] ?? ''])));
            }
          } catch { /* no existing score */ }
        }

        await loadAggregate(reg.id);
      }
      setDivisionName(divRes.data.name);
      setCategory(divRes.data.category);
    } finally {
      setLoading(false);
    }
  }, [regId, divisionId, userId, loadAggregate]);

  useEffect(() => { load(); }, [load]);

  // Poll aggregate every 5s for read-only admins
  useEffect(() => {
    if (!readOnly || loading || !regIntId) return;
    const interval = setInterval(() => loadAggregate(regIntId), 5000);
    return () => clearInterval(interval);
  }, [readOnly, loading, regIntId, loadAggregate]);

  const initialValuesSettled = useRef(false);
  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => { initialValuesSettled.current = true; }, 500);
      return () => clearTimeout(t);
    }
  }, [loading]);

  const handleSaveRef = useRef<(silent?: boolean) => Promise<void>>(async () => {});

  const handleSave = async (silent = false) => {
    if (!regIntId || !userId) return;
    setSaving(true);
    try {
      const payload: Partial<IcuJudgeScore> = {
        ...Object.fromEntries(ALL_KEYS.map(k => [k, String(scores[k])])),
        ...Object.fromEntries(ALL_COMMENT_KEYS.map(k => [k, comments[k] ?? ''])),
        notes,
        sheet_type: 'icu_dance',
      } as Partial<IcuJudgeScore>;

      let saved: IcuJudgeScore;
      if (myScore) {
        const res = await competitionsRepository.updateIcuJudgeScore(myScore.id, payload);
        saved = res.data;
      } else {
        const res = await competitionsRepository.createIcuJudgeScore({
          registration: regIntId,
          judge: userId,
          sheet_type: 'icu_dance',
          ...payload,
        });
        saved = res.data;
      }
      setMyScore(saved);
      await loadAggregate(regIntId);
      if (!silent) toast.success('Planilla guardada');
    } catch (err) {
      toastApiError(err);
    } finally {
      setSaving(false);
    }
  };

  handleSaveRef.current = handleSave;

  useEffect(() => {
    if (readOnly || !initialValuesSettled.current) return;
    const timer = setTimeout(() => { handleSaveRef.current(true); }, 2000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, scores, notes, comments]);

  if (loading) return <PageSpinner />;

  const categoryLabel = {
    pom: 'POM', hip_hop: 'Hip Hop', jazz: 'Jazz', high_kick: 'High Kick',
  }[category] ?? category.toUpperCase();

  return (
    <div className="min-h-screen bg-zinc-50 pb-16">

      {/* Sticky top bar */}
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between gap-4 bg-white border-b border-zinc-200 px-6 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={async () => {
            if (!readOnly && initialValuesSettled.current) await handleSaveRef.current(true);
            router.push(`/competitions/${id}/divisions/${divisionId}`);
          }} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-400 font-medium">
              ICU Dance — {categoryLabel} · {divisionName}
            </p>
            <p className="text-sm font-semibold text-zinc-900 leading-tight">
              {teamName || `Inscripción #${regId}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right print:hidden">
            <p className="text-[10px] text-zinc-400 uppercase tracking-wide">
              {readOnly ? 'Promedio' : 'Mi total'}
            </p>
            <p className="text-2xl font-bold tabular-nums text-zinc-900">
              {readOnly
                ? (aggregate?.average != null ? aggregate.average.toFixed(1) : '—')
                : fmt(total)
              }
              <span className="text-sm font-normal text-zinc-400 ml-1">/ {MAX_TOTAL}</span>
            </p>
          </div>
          <PrintButton />
          {readOnly ? (
            <span className="print:hidden text-xs font-medium text-zinc-400 px-3 py-1.5 rounded-lg bg-zinc-100 border border-zinc-200">
              Solo lectura
            </span>
          ) : (
            <Button onClick={() => handleSave()} loading={saving}
              disabled={requirePayment && unpaidAthletes.length > 0} className="print:hidden">
              <Save className="h-4 w-4" />
              Guardar
            </Button>
          )}
        </div>
      </div>

      {readOnly && (
        <div className="print:hidden bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center gap-2">
          <Eye className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-700 font-medium">Solo lectura — solo los jueces asignados pueden calificar.</p>
        </div>
      )}
      <PaymentWarningBanner unpaidAthletes={unpaidAthletes} requirePayment={requirePayment} />

      {/* Two-column layout */}
      <div className={`print:hidden max-w-[1400px] mx-auto px-6 py-8${readOnly ? ' pointer-events-none select-none opacity-75' : ''}`}>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">

          {/* ── Left column: ICU badge + progress + scoring criteria ── */}
          <div className="flex flex-col gap-6">

            {/* ICU badge */}
            <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
              <div className="text-xs font-bold uppercase tracking-widest text-blue-700 bg-blue-100 px-2 py-1 rounded">ICU</div>
              <div>
                <p className="text-sm font-semibold text-blue-900">Performance Cheer — {categoryLabel}</p>
                <p className="text-xs text-blue-600">10 criterios × 10 pts = 100 pts · ICU World Cheerleading Championships</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="rounded-xl bg-white border border-zinc-200 p-4 flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs text-zinc-500 mb-1.5">
                  <span>Progreso total</span>
                  <span className="tabular-nums font-medium">{pct.toFixed(1)}%</span>
                </div>
                <div className="h-3 rounded-full bg-zinc-100 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-300 ${
                    pct >= 90 ? 'bg-emerald-500' : pct >= 70 ? 'bg-blue-500' :
                    pct >= 50 ? 'bg-amber-500' : pct >= 30 ? 'bg-red-500' : 'bg-zinc-300'
                  }`} style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-3xl font-bold tabular-nums text-zinc-900">{fmt(total)}</p>
                <p className="text-xs text-zinc-400">de {MAX_TOTAL} pts</p>
              </div>
            </div>

            {/* Criteria by section */}
            {ICU_DANCE_SECTIONS.map(section => (
              <div key={section.label} className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-500 shrink-0">{section.label}</span>
                  <div className="flex-1 h-px bg-zinc-200" />
                  <span className="text-xs font-semibold text-zinc-700 tabular-nums">
                    {section.criteria.reduce((s, c) => s + (scores[c.key] ?? 0), 0)} / {section.criteria.length * 10}
                  </span>
                </div>
                {section.criteria.map(c => (
                  <ScoreSelector
                    key={c.key}
                    label={c.label}
                    description={c.description}
                    categoryNote={c.categoryNote}
                    value={scores[c.key] ?? 0}
                    onChange={v => setScores(prev => ({ ...prev, [c.key]: v }))}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* ── Right column: comments + summary + aggregate ── */}
          <div className="flex flex-col gap-4 xl:sticky xl:top-[57px]">

            {/* Judge Comments — vertical tabs */}
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Comentarios del juez</span>
              </div>
              <div className="flex min-h-[220px]">
                {/* Vertical tab list */}
                <div className="flex flex-col w-36 shrink-0 border-r border-zinc-200 bg-zinc-50">
                  <button
                    onClick={() => setActiveCommentTab('global')}
                    className={`px-3 py-2.5 text-left text-xs font-semibold border-l-2 transition-colors ${
                      activeCommentTab === 'global'
                        ? 'border-zinc-900 text-zinc-900 bg-white'
                        : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    Global
                  </button>
                  {ALL_CRITERIA.map(c => (
                    <button
                      key={c.commentKey}
                      onClick={() => setActiveCommentTab(c.commentKey)}
                      className={`px-3 py-2.5 text-left text-xs font-semibold border-l-2 transition-colors flex items-center justify-between gap-1 ${
                        activeCommentTab === c.commentKey
                          ? 'border-zinc-900 text-zinc-900 bg-white'
                          : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      <span className="truncate">{c.tabLabel}</span>
                      {comments[c.commentKey] && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
                {/* Content area */}
                <div className="flex-1 p-4 min-w-0 flex flex-col gap-2">
                  {activeCommentTab === 'global' ? (
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Comentario general sobre el desempeño del equipo..."
                      className="w-full flex-1 min-h-[180px] rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  ) : (
                    (() => {
                      const criterion = ALL_CRITERIA.find(c => c.commentKey === activeCommentTab)!;
                      return (
                        <>
                          <p className="text-xs text-zinc-500 italic leading-relaxed">{criterion.label} — {criterion.description}</p>
                          <textarea
                            value={comments[activeCommentTab] ?? ''}
                            onChange={e => setComments(prev => ({ ...prev, [activeCommentTab]: e.target.value }))}
                            placeholder={`Observaciones sobre ${criterion.tabLabel}...`}
                            className="w-full flex-1 min-h-[140px] rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900"
                          />
                        </>
                      );
                    })()
                  )}
                </div>
              </div>
            </div>

            {/* Score summary table */}
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden text-sm">
              <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">
                  {readOnly ? 'Resumen de puntajes' : 'Mi calificación'}
                </span>
              </div>
              {ICU_DANCE_SECTIONS.map(section => (
                <div key={section.label}>
                  <div className="px-4 py-1.5 bg-zinc-50 border-t border-zinc-100">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{section.label}</p>
                  </div>
                  <table className="w-full">
                    <tbody className="divide-y divide-zinc-50">
                      {section.criteria.map(c => {
                        const v = scores[c.key] ?? 0;
                        return (
                          <tr key={c.key}>
                            <td className="px-4 py-2 text-zinc-700 text-xs">{c.label}</td>
                            <td className="px-3 py-2 w-16">
                              <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                                <div className={`h-full rounded-full ${v >= 8 ? 'bg-emerald-500' : v >= 5 ? 'bg-amber-400' : 'bg-red-400'}`}
                                  style={{ width: `${v * 10}%` }} />
                              </div>
                            </td>
                            <td className="px-4 py-2 text-right font-bold tabular-nums text-zinc-900 w-16 text-sm">
                              {v} <span className="text-zinc-400 font-normal text-xs">/ 10</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="flex items-center justify-between px-4 py-3 rounded-b-xl bg-zinc-800 text-white">
                    <div>
                      <p className="text-sm uppercase tracking-wide font-bold">TOTAL ICU {categoryLabel}</p>
                      <p className="text-xs opacity-70 mt-0.5">{pct.toFixed(1)}% de {MAX_TOTAL} puntos</p>
                    </div>
                    <span className="text-2xl font-bold tabular-nums">{fmt(total)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Multi-judge aggregate */}
            {aggregate && (
              <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200 flex items-center gap-2">
                  <Users className="w-4 h-4 text-zinc-500" />
                  <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">
                    Promedio del panel ({aggregate.count} juez{aggregate.count !== 1 ? 'ces' : ''})
                  </span>
                </div>
                {aggregate.count === 0 ? (
                  <p className="px-4 py-3 text-xs text-zinc-400 italic">Ningún juez ha calificado aún.</p>
                ) : (
                  <>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-zinc-100">
                          <th className="px-4 py-2 text-left font-medium text-zinc-500">Juez</th>
                          <th className="px-4 py-2 text-left font-medium text-zinc-500">Panel</th>
                          <th className="px-4 py-2 text-right font-medium text-zinc-500">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-50">
                        {aggregate.scores.map(s => (
                          <tr key={s.id}>
                            <td className="px-4 py-2 text-zinc-700">{s.judge_name}</td>
                            <td className="px-4 py-2 text-zinc-400">{s.panel_name ?? '—'}</td>
                            <td className="px-4 py-2 text-right font-bold tabular-nums text-zinc-900">{s.total.toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="border-t border-zinc-700 flex items-center justify-between px-5 py-3 rounded-b-xl bg-zinc-800">
                      <p className="text-sm font-bold text-white">Puntaje Final (promedio)</p>
                      <span className="text-2xl font-bold tabular-nums text-white">
                        {aggregate.average?.toFixed(2) ?? '—'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
