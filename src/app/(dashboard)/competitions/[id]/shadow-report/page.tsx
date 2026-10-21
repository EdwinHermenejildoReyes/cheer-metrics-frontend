'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, EyeOff, Send, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { PageSpinner } from '@/components/ui/spinner';
import { PrintButton } from '@/components/print/PrintButton';
import competitionsRepository from '@/repositories/competitionsRepository';
import { useBranding } from '@/contexts/BrandingContext';
import { SHEET_TYPE_LABELS } from '@/types/competitions';
import type { ShadowReport, ShadowJudgeEntry } from '@/types/competitions';

function JudgeCard({ entry, onSendReport }: { entry: ShadowJudgeEntry; onSendReport: (id: number) => Promise<void> }) {
  const [open, setOpen] = useState(true);
  const [sending, setSending] = useState(false);

  const scored = entry.records.filter((r) => r.official_final_score != null);
  const withComments = entry.records.filter((r) => r.comments && r.comments.trim());

  const handleSend = async () => {
    setSending(true);
    try {
      await onSendReport(entry.assignment_id);
      toast.success(`Reporte enviado a ${entry.judge_email}`);
    } catch {
      toast.error('No se pudo enviar el reporte');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden break-inside-avoid print:shadow-none">
      {/* Judge header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100 bg-zinc-50">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-100 shrink-0">
          <EyeOff className="w-4 h-4 text-violet-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-900 leading-tight">{entry.judge_name}</p>
          <p className="text-xs text-zinc-400 truncate">{entry.judge_email}</p>
        </div>
        <span className="text-[11px] font-medium bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full shrink-0">
          {SHEET_TYPE_LABELS[entry.sheet_type] ?? entry.sheet_type}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-zinc-400">{scored.length} calificados</span>
          {withComments.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-emerald-600">
              <MessageSquare className="w-3.5 h-3.5" />
              {withComments.length} comentarios
            </span>
          )}
          <button
            onClick={handleSend}
            disabled={sending}
            title="Enviar reporte por email"
            className="print:hidden flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100 transition-colors disabled:opacity-50"
          >
            <Send className="w-3 h-3" />
            {sending ? 'Enviando…' : 'Enviar email'}
          </button>
          <button
            onClick={() => setOpen((v) => !v)}
            className="print:hidden p-1 rounded text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Records table */}
      {(open || typeof window === 'undefined') && (
        <div className="overflow-x-auto">
          {entry.records.length === 0 ? (
            <p className="px-4 py-6 text-sm text-zinc-400 text-center">Sin equipos calificados aún.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/60">
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400 w-10">#</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">Equipo</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">División</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400 w-20">Oficial</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">Observaciones del juez sombra</th>
                </tr>
              </thead>
              <tbody>
                {entry.records.map((rec) => (
                  <tr key={rec.record_id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/50">
                    <td className="px-4 py-3 text-xs text-zinc-400 tabular-nums">{rec.performance_order ?? '—'}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900 leading-tight">{rec.team_name}</p>
                      <p className="text-xs text-zinc-400">{rec.gym_name}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{rec.division_name}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-zinc-700">
                      {rec.official_final_score ? Number(rec.official_final_score).toFixed(2) : <span className="text-zinc-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 whitespace-pre-line max-w-xs">
                      {rec.comments && rec.comments.trim()
                        ? rec.comments
                        : <span className="text-zinc-300 text-xs italic">Sin observaciones</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default function ShadowReportPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { organization } = useBranding();

  const [report, setReport] = useState<ShadowReport | null>(null);
  const [loading, setLoading] = useState(true);

  const today = new Date().toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' });
  const primary     = organization?.primary_color  ?? '#18181b';
  const primaryText = organization?.text_on_primary ?? '#ffffff';

  const load = useCallback(async () => {
    try {
      const res = await competitionsRepository.getShadowReport(id);
      setReport(res.data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleSendReport = async (assignmentId: number) => {
    await competitionsRepository.sendShadowReport(assignmentId);
  };

  if (loading) return <PageSpinner />;
  if (!report) return null;

  const totalShadow = report.shadow_judges.length;
  const totalComments = report.shadow_judges.reduce(
    (sum, j) => sum + j.records.filter((r) => r.comments && r.comments.trim()).length,
    0,
  );

  return (
    <div className="min-h-screen bg-zinc-50">

      {/* Print-only branded header */}
      <div className="hidden print:block">
        <div className="flex items-center justify-between px-6 py-4" style={{ backgroundColor: primary, color: primaryText }}>
          <div className="flex items-center gap-4">
            {organization?.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={organization.logo} alt="" className="h-12 w-auto object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
            )}
            <div>
              {organization?.name && (
                <p className="text-base font-bold" style={{ color: primaryText }}>{organization.name}</p>
              )}
              <p className="text-xs mt-0.5" style={{ color: primaryText, opacity: 0.75 }}>Reporte Jueces Sombra · Cheer Metrics</p>
            </div>
          </div>
          <div className="text-right text-xs" style={{ color: primaryText, opacity: 0.75 }}>
            <p>Fecha de impresión</p>
            <p className="font-semibold mt-0.5" style={{ opacity: 1 }}>{today}</p>
          </div>
        </div>
        <div className="px-6 pt-4 pb-3" style={{ borderBottom: `2px solid ${primary}` }}>
          <h1 className="text-2xl font-bold text-zinc-900 leading-tight">
            Reporte Jueces Sombra — {report.competition_name}
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">Calificaciones y observaciones de práctica (no afectan el resultado oficial)</p>
        </div>
      </div>

      {/* Screen header */}
      <div className="sticky top-0 z-10 bg-white border-b border-zinc-200 px-4 py-3 flex items-center gap-3 print:hidden">
        <button
          onClick={() => router.back()}
          className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <p className="text-xs text-zinc-400">{report.competition_name}</p>
          <h1 className="text-sm font-semibold text-zinc-900 leading-tight">Jueces Sombra</h1>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-zinc-400">
            {totalShadow} juez{totalShadow !== 1 ? 'ces' : ''} · {totalComments} comentario{totalComments !== 1 ? 's' : ''}
          </span>
          <PrintButton label="Imprimir / PDF" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">

        {totalShadow === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white py-20 text-center">
            <EyeOff className="w-10 h-10 text-zinc-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-zinc-500">No hay jueces sombra asignados a esta competencia.</p>
            <p className="text-xs text-zinc-400 mt-1">Crea una asignación con la opción &quot;Juez sombra&quot; marcada.</p>
          </div>
        ) : (
          report.shadow_judges.map((entry) => (
            <JudgeCard
              key={entry.assignment_id}
              entry={entry}
              onSendReport={handleSendReport}
            />
          ))
        )}
      </div>

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
