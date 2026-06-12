import { AlertTriangle, XCircle } from 'lucide-react';
import type { UnpaidAthlete } from '@/types/competitions';

interface Props {
  unpaidAthletes: UnpaidAthlete[];
  requirePayment: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Sin pago',
  partial: 'Abono',
};

export function PaymentWarningBanner({ unpaidAthletes, requirePayment }: Props) {
  if (unpaidAthletes.length === 0) return null;

  return (
    <div className={`print:hidden mx-6 mt-4 rounded-xl border px-4 py-3 flex gap-3 items-start ${
      requirePayment
        ? 'bg-red-50 border-red-200 text-red-800'
        : 'bg-yellow-50 border-yellow-200 text-yellow-800'
    }`}>
      {requirePayment
        ? <XCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-500" />
        : <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-yellow-500" />
      }
      <div className="flex-1 text-sm">
        <p className="font-semibold mb-1">
          {requirePayment
            ? 'Planilla bloqueada — pago pendiente'
            : 'Advertencia — pago pendiente'}
        </p>
        <ul className="space-y-0.5">
          {unpaidAthletes.map(a => (
            <li key={a.athlete_id} className="flex gap-2">
              <span className="font-medium">{a.athlete_name}</span>
              <span className="opacity-75">
                · {STATUS_LABEL[a.payment_status]} · Saldo: ${parseFloat(a.balance_due).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
        {requirePayment && (
          <p className="mt-1.5 opacity-75 text-xs">
            Registra el pago en Facturación antes de guardar esta planilla.
          </p>
        )}
      </div>
    </div>
  );
}
