'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Trophy, Clock, Printer, CheckCircle, AlertTriangle } from 'lucide-react';
import type { PublicResult, PublicResultDeduction } from '@/repositories/competitionsRepository';

const BASE = process.env.NEXT_PUBLIC_MAIN_API_URL ?? '/api/v1/';

function fmt(v: string | undefined) {
  return v ? parseFloat(v).toFixed(2) : '–';
}
function fmtPct(v: string | undefined) {
  return v ? parseFloat(v).toFixed(2) : '–';
}

function ScoreRow({ label, value, max, highlight }: { label: string; value: string; max?: string; highlight?: boolean }) {
  const num = parseFloat(value);
  if (num === 0 && !highlight) return null;
  return (
    <div className={`flex items-center justify-between py-2.5 px-4 ${highlight ? 'bg-zinc-50 font-semibold' : ''}`}>
      <span className="text-sm text-zinc-700">{label}</span>
      <span className="text-sm tabular-nums font-medium text-zinc-900">
        {fmt(value)}
        {max && <span className="ml-1 text-xs font-normal text-zinc-400">/ {parseFloat(max).toFixed(0)}</span>}
      </span>
    </div>
  );
}

function DeductionRow({ d }: { d: PublicResultDeduction }) {
  return (
    <div className="flex items-start justify-between py-2 px-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-700">
          {d.type}
          {d.count > 1 && <span className="ml-1.5 text-xs text-zinc-400">×{d.count}</span>}
          {d.hit_zero && (
            <span className="ml-1.5 text-[10px] font-bold text-red-700 bg-red-50 rounded px-1">HIT ZERO</span>
          )}
        </p>
        {d.routine_time && (
          <p className="text-xs text-zinc-400 mt-0.5">Tiempo: {d.routine_time}</p>
        )}
        {d.notes && (
          <p className="text-xs text-zinc-400 mt-0.5">{d.notes}</p>
        )}
      </div>
      <span className="text-sm tabular-nums font-semibold text-red-600 ml-4">−{parseFloat(d.total).toFixed(2)}</span>
    </div>
  );
}

function ProtestTimer({ updatedAt }: { updatedAt: string }) {
  const deadline = new Date(new Date(updatedAt).getTime() + 15 * 60 * 1000);
  const [remaining, setRemaining] = useState<number>(deadline.getTime() - Date.now());

  useEffect(() => {
    const id = setInterval(() => setRemaining(deadline.getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updatedAt]);

  if (remaining <= 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-3 text-zinc-500">
        <CheckCircle className="h-4 w-4 shrink-0" />
        <p className="text-sm">La ventana de reclamo ha expirado.</p>
      </div>
    );
  }

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const isUrgent = remaining < 3 * 60 * 1000;

  return (
    <div className={`flex items-center gap-2 rounded-xl px-4 py-3 ${isUrgent ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>
      <Clock className={`h-4 w-4 shrink-0 ${isUrgent ? 'text-red-500' : 'text-amber-500'}`} />
      <div>
        <p className="text-sm font-semibold">
          Ventana de reclamo: {mins}:{secs.toString().padStart(2, '0')} restantes
        </p>
        <p className="text-xs opacity-75">Vence a las {deadline.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}</p>
      </div>
    </div>
  );
}

export default function PublicResultPage() {
  const { regId } = useParams<{ regId: string }>();
  const [data, setData]     = useState<PublicResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(false);

  useEffect(() => {
    fetch(`${BASE}registrations/${regId}/public-result/`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [regId]);

  const primary     = data?.organization?.primary_color     ?? '#18181b';
  const primaryText = data?.organization?.text_on_primary   ?? '#ffffff';
  const orgName     = data?.organization?.name              ?? 'Cheer Metrics';
  const logoUrl     = data?.organization?.logo              ?? '';

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-zinc-300 border-t-zinc-700 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center gap-3 text-zinc-500">
        <AlertTriangle className="h-10 w-10 text-zinc-300" />
        <p className="text-sm">No se encontró el resultado o no está disponible.</p>
      </div>
    );
  }

  const hasScore = data.has_score;
  const totalDed = parseFloat(data.total_deductions ?? '0');
  const hasDeductions = totalDed > 0;

  return (
    <div className="min-h-screen bg-zinc-100 print:bg-white">
      {/* Print styles */}
      <style>{`@media print { @page { size: A4 portrait; margin: 10mm; } .no-print { display: none !important; } }`}</style>

      <div className="max-w-lg mx-auto py-6 px-4 print:p-0 print:max-w-none">

        {/* Header */}
        <div
          className="rounded-2xl print:rounded-none overflow-hidden mb-4"
          style={{ backgroundColor: primary, color: primaryText }}
        >
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={orgName} className="h-8 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
              ) : (
                <Trophy className="h-6 w-6 opacity-80" />
              )}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest opacity-75">{orgName}</p>
                <p className="text-xs opacity-60">{data.competition_name}</p>
              </div>
            </div>
            <button
              onClick={() => window.print()}
              className="no-print flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              style={{ backgroundColor: `${primaryText}20`, color: primaryText }}
            >
              <Printer className="h-3.5 w-3.5" />
              Imprimir
            </button>
          </div>

          <div className="px-5 pb-5">
            <h1 className="text-2xl font-bold leading-tight" style={{ color: primaryText }}>{data.team_name}</h1>
            <p className="text-sm opacity-70 mt-0.5">{data.gym_name}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: `${primaryText}20`, color: primaryText }}>
                {data.division_name}
              </span>
              {data.performance_order && (
                <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: `${primaryText}15`, color: primaryText }}>
                  Salida #{data.performance_order}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Protest timer */}
        {hasScore && data.score_updated_at && (
          <div className="mb-4 no-print">
            <ProtestTimer updatedAt={data.score_updated_at} />
          </div>
        )}

        {!hasScore ? (
          <div className="rounded-2xl bg-white border border-zinc-200 px-5 py-8 text-center text-zinc-400">
            <Trophy className="h-8 w-8 mx-auto mb-3 text-zinc-200" />
            <p className="text-sm">El puntaje aún no está disponible.</p>
          </div>
        ) : (
          <>
            {/* Score breakdown */}
            <div className="rounded-2xl bg-white border border-zinc-200 overflow-hidden mb-4">
              <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50">
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Puntaje por sección</p>
              </div>
              <div className="divide-y divide-zinc-100">
                <ScoreRow label="Elevaciones (Building)" value={data.building_total ?? '0'} />
                <ScoreRow label="Gimnasia (Tumbling)" value={data.tumbling_total ?? '0'} />
                <ScoreRow label="General (Overall)" value={data.overall_total ?? '0'} />
                <ScoreRow label="Partner Stunt" value={data.partner_stunt_total ?? '0'} />
                <ScoreRow label="Creatividad (promedio)" value={data.avg_creativity ?? '0'} />
                <ScoreRow label="Showmanship (promedio)" value={data.avg_showmanship ?? '0'} />
                <ScoreRow label="Puntaje bruto" value={data.raw_score ?? '0'} max={data.max_raw} highlight />
              </div>
            </div>

            {/* Deductions */}
            {hasDeductions && (
              <div className="rounded-2xl bg-white border border-zinc-200 overflow-hidden mb-4">
                <div className="px-4 py-3 border-b border-zinc-100 bg-red-50">
                  <p className="text-xs font-bold uppercase tracking-widest text-red-400">Descuentos</p>
                </div>
                <div className="divide-y divide-zinc-100">
                  {data.deductions?.map((d, i) => <DeductionRow key={i} d={d} />)}
                </div>
                <div className="flex items-center justify-between px-4 py-3 bg-red-50 border-t border-red-100">
                  <span className="text-sm font-semibold text-red-700">Total descuentos</span>
                  <span className="text-base tabular-nums font-bold text-red-700">−{fmt(data.total_deductions)}</span>
                </div>
              </div>
            )}

            {/* Final score */}
            <div
              className="rounded-2xl overflow-hidden mb-4"
              style={{ backgroundColor: primary }}
            >
              <div className="px-5 py-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest opacity-60" style={{ color: primaryText }}>
                    Puntaje Final
                  </p>
                  <p className="text-xs opacity-50 mt-0.5" style={{ color: primaryText }}>
                    {fmtPct(data.percentage)}% de rendimiento
                  </p>
                </div>
                <span className="text-4xl font-black tabular-nums" style={{ color: primaryText }}>
                  {fmt(data.final_score)}
                </span>
              </div>
            </div>
          </>
        )}

        <p className="text-center text-xs text-zinc-400 mt-6 no-print">
          Cheer Metrics · Ecuador · Resultado generado automáticamente
        </p>
      </div>
    </div>
  );
}
