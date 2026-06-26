'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import competitionsRepository from '@/repositories/competitionsRepository';
import type { Competition, GymInvoice } from '@/types/competitions';

const STATUS_BADGE: Record<string, string> = {
  paid:    'bg-green-100 text-green-800',
  partial: 'bg-yellow-100 text-yellow-800',
  pending: 'bg-red-100 text-red-800',
};

const STATUS_LABEL: Record<string, string> = {
  paid:    'Pagado',
  partial: 'Abono',
  pending: 'Pendiente',
};

function invoiceStatus(inv: GymInvoice): 'paid' | 'partial' | 'pending' {
  if (inv.paid) return 'paid';
  const paid = parseFloat(inv.amount_paid);
  if (paid > 0) return 'partial';
  return 'pending';
}

export default function BillingListPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [invoices, setInvoices]       = useState<GymInvoice[]>([]);
  const [gyms, setGyms]               = useState<{ id: number; name: string }[]>([]);
  const [selectedGym, setSelectedGym] = useState('');
  const [generating, setGenerating]   = useState(false);
  const [loading, setLoading]         = useState(true);

  const load = async () => {
    const compRes = await competitionsRepository.getCompetition(id);
    setCompetition(compRes.data);
    const [invRes, gymRes] = await Promise.all([
      competitionsRepository.listGymInvoices({ competition__public_id: id, page_size: '200' }),
      competitionsRepository.listGyms({ page_size: '200' }),
    ]);
    setInvoices(invRes.data.results);
    setGyms(gymRes.data.results);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handleGenerate = async () => {
    if (!selectedGym || !competition) return;
    setGenerating(true);
    try {
      await competitionsRepository.generateGymInvoice(competition.id, Number(selectedGym));
      setSelectedGym('');
      await load();
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div className="p-8 text-sm text-gray-500">Cargando…</div>;

  const invoicedGymIds = new Set(invoices.map(i => i.gym));
  const pendingGyms    = gyms.filter(g => !invoicedGymIds.has(g.id));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-1">← Volver</button>
          <h1 className="text-2xl font-bold">{competition?.name}</h1>
          <p className="text-sm text-gray-500">Facturación por gimnasio</p>
        </div>

        <div className="flex gap-2 items-center">
          <select
            value={selectedGym}
            onChange={e => setSelectedGym(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Seleccionar gimnasio…</option>
            {pendingGyms.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <button
            onClick={handleGenerate}
            disabled={!selectedGym || generating}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {generating ? 'Generando…' : 'Generar factura'}
          </button>
        </div>
      </div>

      {invoices.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          No hay facturas generadas aún.
        </div>
      ) : (
        <div className="overflow-hidden border rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Gimnasio</th>
                <th className="px-4 py-3 font-medium text-right">Atletas</th>
                <th className="px-4 py-3 font-medium text-right">Descuentos</th>
                <th className="px-4 py-3 font-medium text-right">Equipos</th>
                <th className="px-4 py-3 font-medium text-right">Fan Packages</th>
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
                    <td className="px-4 py-3 text-right">${inv.athlete_subtotal}</td>
                    <td className="px-4 py-3 text-right text-green-700">-${inv.discount_subtotal}</td>
                    <td className="px-4 py-3 text-right">${inv.team_subtotal}</td>
                    <td className="px-4 py-3 text-right">${inv.fan_subtotal}</td>
                    <td className="px-4 py-3 text-right font-semibold">${inv.total}</td>
                    <td className="px-4 py-3 text-right text-green-700">${inv.amount_paid}</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600">${inv.balance_due}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[st]}`}>
                        {STATUS_LABEL[st]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => router.push(`/competitions/${id}/billing/${inv.id}`)}
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
