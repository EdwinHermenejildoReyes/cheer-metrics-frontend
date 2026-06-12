'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import competitionsRepository from '@/repositories/competitionsRepository';
import type { Competition, GymInvoice } from '@/types/competitions';

const STATUS_BADGE = {
  paid:    'bg-green-100 text-green-800',
  partial: 'bg-yellow-100 text-yellow-800',
  pending: 'bg-red-100 text-red-800',
};
const STATUS_LABEL = {
  paid:    'Pagado',
  partial: 'Abono',
  pending: 'Pendiente',
};

function invoiceStatus(inv: GymInvoice): 'paid' | 'partial' | 'pending' {
  if (inv.paid) return 'paid';
  if (parseFloat(inv.amount_paid) > 0) return 'partial';
  return 'pending';
}

function fmt(val: string | number) {
  return `$${parseFloat(String(val)).toFixed(2)}`;
}

export default function BillingOverviewPage() {
  const router = useRouter();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [invoices, setInvoices]         = useState<GymInvoice[]>([]);
  const [selectedComp, setSelectedComp] = useState('');
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    competitionsRepository.listCompetitions({ page_size: '100' }).then(res => {
      setCompetitions(res.data.results);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page_size: '200' };
    if (selectedComp) params.competition = selectedComp;
    competitionsRepository.listGymInvoices(params).then(res => {
      setInvoices(res.data.results);
      setLoading(false);
    });
  }, [selectedComp]);

  const totalSum     = invoices.reduce((s, i) => s + parseFloat(i.total), 0);
  const paidSum      = invoices.reduce((s, i) => s + parseFloat(i.amount_paid), 0);
  const balanceSum   = invoices.reduce((s, i) => s + parseFloat(i.balance_due), 0);
  const paidCount    = invoices.filter(i => i.paid).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Facturación</h1>
          <p className="text-sm text-gray-500">Resumen de pagos por gimnasio</p>
        </div>
        <select
          value={selectedComp}
          onChange={e => setSelectedComp(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Todas las competencias</option>
          {competitions.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="border rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Total facturado</p>
          <p className="text-xl font-bold">{fmt(totalSum)}</p>
        </div>
        <div className="border rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Total cobrado</p>
          <p className="text-xl font-bold text-green-700">{fmt(paidSum)}</p>
        </div>
        <div className="border rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Saldo pendiente</p>
          <p className="text-xl font-bold text-red-600">{fmt(balanceSum)}</p>
        </div>
        <div className="border rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Facturas pagadas</p>
          <p className="text-xl font-bold">{paidCount} / {invoices.length}</p>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Cargando…</div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No hay facturas generadas.</div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Gimnasio</th>
                <th className="px-4 py-3 font-medium">Competencia</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium text-right">Pagado</th>
                <th className="px-4 py-3 font-medium text-right">Saldo</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoices.map(inv => {
                const st = invoiceStatus(inv);
                return (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{inv.gym_name}</td>
                    <td className="px-4 py-3 text-gray-500">{inv.competition_name}</td>
                    <td className="px-4 py-3 text-right font-semibold">{fmt(inv.total)}</td>
                    <td className="px-4 py-3 text-right text-green-700">{fmt(inv.amount_paid)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600">{fmt(inv.balance_due)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[st]}`}>
                        {STATUS_LABEL[st]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => router.push(`/competitions/${inv.competition}/billing/${inv.id}`)}
                        className="text-purple-600 text-sm hover:underline"
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
