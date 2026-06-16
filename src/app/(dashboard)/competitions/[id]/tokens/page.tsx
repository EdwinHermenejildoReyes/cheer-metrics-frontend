'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Copy, Check, Trash2, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageSpinner } from '@/components/ui/spinner';
import publicRegistrationRepository from '@/repositories/publicRegistrationRepository';
import getEnvVars from '@/utils/getEnvVars';

interface RegToken {
  id: number;
  token: string;
  expires_at: string;
  max_uses: number | null;
  used_count: number;
  notes: string;
  is_valid: boolean;
}

export default function TokensPage() {
  const { id } = useParams<{ id: string }>();
  const competitionId = Number(id);

  const [tokens, setTokens] = useState<RegToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [newExpiry, setNewExpiry] = useState('');
  const [newMaxUses, setNewMaxUses] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const loadTokens = useCallback(async () => {
    try {
      const res = await publicRegistrationRepository.listTokens(competitionId);
      setTokens(res.results ?? res);
    } finally {
      setLoading(false);
    }
  }, [competitionId]);

  useEffect(() => { loadTokens(); }, [loadTokens]);

  const handleCreate = async () => {
    if (!newExpiry) { toast.error('Indica la fecha de expiración.'); return; }
    setCreating(true);
    try {
      await publicRegistrationRepository.createToken({
        competition: competitionId,
        expires_at: new Date(newExpiry).toISOString(),
        max_uses: newMaxUses ? Number(newMaxUses) : null,
        notes: newNotes,
      });
      toast.success('Link creado');
      setNewExpiry('');
      setNewMaxUses('');
      setNewNotes('');
      await loadTokens();
    } catch {
      toast.error('No se pudo crear el link.');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (tokenId: number) => {
    try {
      await publicRegistrationRepository.deleteToken(tokenId);
      toast.success('Link eliminado');
      await loadTokens();
    } catch {
      toast.error('No se pudo eliminar el link.');
    }
  };

  const copyLink = (token: string, tokenId: number) => {
    const { webUrl } = getEnvVars();
    const base = (webUrl ?? window.location.origin).replace(/\/$/, '');
    navigator.clipboard.writeText(`${base}/registro?token=${token}`);
    setCopiedId(tokenId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="flex flex-col gap-6 p-8 max-w-2xl">
      <div className="flex items-center gap-2">
        <Link2 className="h-5 w-5 text-zinc-400" />
        <h1 className="text-xl font-semibold text-zinc-900">Links de inscripción</h1>
      </div>

      {/* Create form */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 flex flex-col gap-4">
        <p className="text-sm text-zinc-500">
          Genera un link para que los gimnasios se inscriban sin necesitar una cuenta.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-1 block">
              Expira el *
            </label>
            <input
              type="datetime-local"
              value={newExpiry}
              onChange={(e) => setNewExpiry(e.target.value)}
              className="h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-1 block">
              Usos máx.
            </label>
            <input
              type="number"
              min={1}
              value={newMaxUses}
              onChange={(e) => setNewMaxUses(e.target.value)}
              placeholder="∞ ilimitado"
              className="h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>
          <div className="col-span-2">
            <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-1 block">
              Nota (opcional)
            </label>
            <input
              type="text"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Ej. Gimnasio XYZ"
              className="h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={handleCreate} disabled={!newExpiry || creating}>
            <Plus className="h-4 w-4" />
            Crear link
          </Button>
        </div>
      </div>

      {/* Token list */}
      {tokens.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-14 text-zinc-400 rounded-xl border border-dashed border-zinc-200">
          <Link2 className="h-8 w-8" />
          <p className="text-sm">Sin links creados aún.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {tokens.map((tk) => (
            <div key={tk.id} className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${tk.is_valid ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-400'}`}>
                    {tk.is_valid ? 'Activo' : 'Inactivo'}
                  </span>
                  {tk.notes && <span className="text-xs font-medium text-zinc-700">{tk.notes}</span>}
                </div>
                <p className="text-[11px] font-mono text-zinc-400">
                  Expira: {new Date(tk.expires_at).toLocaleString('es-EC')}
                  {tk.max_uses != null && ` · ${tk.used_count}/${tk.max_uses} usos`}
                  {tk.max_uses == null && tk.used_count > 0 && ` · ${tk.used_count} usos`}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => copyLink(tk.token, tk.id)}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-zinc-600 border border-zinc-200 hover:bg-zinc-50 transition-colors"
                >
                  {copiedId === tk.id
                    ? <Check className="h-3.5 w-3.5 text-green-600" />
                    : <Copy className="h-3.5 w-3.5" />}
                  {copiedId === tk.id ? 'Copiado' : 'Copiar link'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(tk.id)}
                  className="rounded-lg p-1.5 text-zinc-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
