'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import competitionsRepository from '@/repositories/competitionsRepository';
import type { AthleteInvoiceLine, FanPackage, FanPackageLine, GymInvoice } from '@/types/competitions';

const PAYMENT_BADGE = {
  paid:    'bg-green-100 text-green-800',
  partial: 'bg-yellow-100 text-yellow-800',
  pending: 'bg-red-100 text-red-800',
};
const PAYMENT_LABEL = {
  paid:    'Pagado',
  partial: 'Abono',
  pending: 'Pendiente',
};

function fmt(val: string | number) {
  return `$${parseFloat(String(val)).toFixed(2)}`;
}

export default function BillingDetailPage() {
  const { id, gymId } = useParams<{ id: string; gymId: string }>();
  const router = useRouter();

  const [invoice, setInvoice]         = useState<GymInvoice | null>(null);
  const [fanPackages, setFanPackages] = useState<FanPackage[]>([]);
  const [loading, setLoading]         = useState(true);

  // Pay modal state
  const [payLine, setPayLine]       = useState<AthleteInvoiceLine | null>(null);
  const [payAmount, setPayAmount]   = useState('');
  const [paying, setPaying]         = useState(false);

  // Fan package add state
  const [newFanPkg, setNewFanPkg]   = useState('');
  const [newFanQty, setNewFanQty]   = useState('1');
  const [addingFan, setAddingFan]   = useState(false);

  const load = async () => {
    const invRes = await competitionsRepository.getGymInvoice(Number(gymId));
    setInvoice(invRes.data);
    const fpRes = await competitionsRepository.listFanPackages(invRes.data.competition);
    setFanPackages(fpRes.data.results);
    setLoading(false);
  };

  useEffect(() => { load(); }, [gymId]);

  const handlePay = async () => {
    if (!payLine || !payAmount) return;
    setPaying(true);
    try {
      await competitionsRepository.payAthleteInvoiceLine(payLine.id, payAmount);
      setPayLine(null);
      setPayAmount('');
      await load();
    } finally {
      setPaying(false);
    }
  };

  const handleAddFan = async () => {
    if (!newFanPkg || !invoice) return;
    setAddingFan(true);
    try {
      await competitionsRepository.createFanPackageLine({
        invoice: invoice.id,
        fan_package: Number(newFanPkg),
        quantity: Number(newFanQty),
        unit_price_snapshot: fanPackages.find(f => f.id === Number(newFanPkg))?.price,
      } as Partial<FanPackageLine>);
      setNewFanPkg('');
      setNewFanQty('1');
      await load();
    } finally {
      setAddingFan(false);
    }
  };

  const handleDeleteFan = async (lineId: number) => {
    await competitionsRepository.deleteFanPackageLine(lineId);
    await load();
  };

  const handleMarkPaid = async () => {
    if (!invoice) return;
    await competitionsRepository.updateGymInvoice(invoice.id, { paid: !invoice.paid });
    await load();
  };

  const handlePrint = () => window.print();

  if (loading || !invoice) return <div className="p-8 text-sm text-gray-500">Cargando…</div>;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto print:p-0">
      {/* Header */}
      <div className="flex items-start justify-between print:hidden">
        <div>
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-1">← Volver</button>
          <h1 className="text-2xl font-bold">{invoice.gym_name}</h1>
          <p className="text-sm text-gray-500">{invoice.competition_name}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleMarkPaid}
            className={`px-4 py-2 rounded-lg text-sm font-medium border ${invoice.paid ? 'bg-white text-gray-700 border-gray-300' : 'bg-green-600 text-white border-transparent'}`}
          >
            {invoice.paid ? 'Marcar pendiente' : 'Marcar pagado'}
          </button>
          <button onClick={handlePrint} className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 bg-white">
            Imprimir / PDF
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Subtotal atletas', value: fmt(invoice.athlete_subtotal) },
          { label: 'Descuentos multi-equipo', value: `-${fmt(invoice.discount_subtotal)}`, cls: 'text-green-700' },
          { label: 'Equipos', value: fmt(invoice.team_subtotal) },
          { label: 'Fan Packages', value: fmt(invoice.fan_subtotal) },
          { label: 'Total', value: fmt(invoice.total), bold: true },
          { label: 'Pagado', value: fmt(invoice.amount_paid), cls: 'text-green-700' },
          { label: 'Saldo pendiente', value: fmt(invoice.balance_due), cls: 'text-red-600', bold: true },
        ].map(c => (
          <div key={c.label} className="border rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{c.label}</p>
            <p className={`text-lg font-semibold ${c.cls ?? ''} ${c.bold ? 'text-xl' : ''}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Athletes */}
      <section>
        <h2 className="text-base font-semibold mb-3">Atletas</h2>
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Atleta</th>
                <th className="px-4 py-3 font-medium text-right">Bruto</th>
                <th className="px-4 py-3 font-medium text-right">Descuento</th>
                <th className="px-4 py-3 font-medium text-right">Neto</th>
                <th className="px-4 py-3 font-medium text-right">Pagado</th>
                <th className="px-4 py-3 font-medium text-right">Saldo</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 print:hidden"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoice.athlete_lines.map(line => (
                <tr key={line.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{line.athlete_name}</td>
                  <td className="px-4 py-3 text-right">{fmt(line.gross_fee)}</td>
                  <td className="px-4 py-3 text-right text-green-700">{parseFloat(line.discount) > 0 ? `-${fmt(line.discount)}` : '—'}</td>
                  <td className="px-4 py-3 text-right font-medium">{fmt(line.net_fee)}</td>
                  <td className="px-4 py-3 text-right text-green-700">{fmt(line.amount_paid)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-red-600">{fmt(line.balance_due)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${PAYMENT_BADGE[line.payment_status]}`}>
                      {PAYMENT_LABEL[line.payment_status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right print:hidden">
                    <button
                      onClick={() => { setPayLine(line); setPayAmount(line.balance_due); }}
                      className="text-purple-600 text-xs hover:underline"
                    >
                      Registrar pago
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Teams */}
      <section>
        <h2 className="text-base font-semibold mb-3">Equipos</h2>
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Equipo</th>
                <th className="px-4 py-3 font-medium">División</th>
                <th className="px-4 py-3 font-medium text-right">Costo</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoice.team_lines.map(line => (
                <tr key={line.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{line.team_name}</td>
                  <td className="px-4 py-3 text-gray-600">{line.division_name}</td>
                  <td className="px-4 py-3 text-right">{fmt(line.team_fee_snapshot)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Fan packages */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Fan Packages</h2>
          {fanPackages.length > 0 && (
            <div className="flex gap-2 items-center print:hidden">
              <select value={newFanPkg} onChange={e => setNewFanPkg(e.target.value)} className="border rounded-lg px-2 py-1 text-sm">
                <option value="">Paquete…</option>
                {fanPackages.map(fp => <option key={fp.id} value={fp.id}>{fp.name} ({fmt(fp.price)})</option>)}
              </select>
              <input
                type="number" min="1" value={newFanQty}
                onChange={e => setNewFanQty(e.target.value)}
                className="border rounded-lg px-2 py-1 text-sm w-16"
              />
              <button
                onClick={handleAddFan}
                disabled={!newFanPkg || addingFan}
                className="bg-purple-600 text-white px-3 py-1 rounded-lg text-sm disabled:opacity-50"
              >
                Agregar
              </button>
            </div>
          )}
        </div>
        {invoice.fan_lines.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center border rounded-xl">Sin paquetes fan asignados.</p>
        ) : (
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Paquete</th>
                  <th className="px-4 py-3 font-medium">Atleta</th>
                  <th className="px-4 py-3 font-medium text-right">Cantidad</th>
                  <th className="px-4 py-3 font-medium text-right">P. Unitario</th>
                  <th className="px-4 py-3 font-medium text-right">Subtotal</th>
                  <th className="px-4 py-3 print:hidden"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoice.fan_lines.map(line => (
                  <tr key={line.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{line.package_name}</td>
                    <td className="px-4 py-3 text-gray-600">{line.athlete_name || '—'}</td>
                    <td className="px-4 py-3 text-right">{line.quantity}</td>
                    <td className="px-4 py-3 text-right">{fmt(line.unit_price_snapshot)}</td>
                    <td className="px-4 py-3 text-right font-medium">{fmt(line.subtotal)}</td>
                    <td className="px-4 py-3 text-right print:hidden">
                      <button onClick={() => handleDeleteFan(line.id)} className="text-red-500 text-xs hover:underline">Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Pay modal */}
      {payLine && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 print:hidden">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <h3 className="font-semibold text-lg">Registrar pago</h3>
            <p className="text-sm text-gray-600">{payLine.athlete_name}</p>
            <div className="space-y-1">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Neto a pagar</span><span className="font-medium">{fmt(payLine.net_fee)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Pagado hasta ahora</span><span className="text-green-700">{fmt(payLine.amount_paid)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Saldo</span><span className="font-semibold text-red-600">{fmt(payLine.balance_due)}</span></div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Monto a registrar</label>
              <input
                type="number" step="0.01" min="0"
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setPayLine(null); setPayAmount(''); }} className="px-4 py-2 text-sm border rounded-lg">Cancelar</button>
              <button
                onClick={handlePay}
                disabled={paying || !payAmount}
                className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg disabled:opacity-50"
              >
                {paying ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
