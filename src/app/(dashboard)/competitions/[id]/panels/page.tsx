'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Shuffle, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageSpinner } from '@/components/ui/spinner';
import competitionsRepository from '@/repositories/competitionsRepository';
import type { JudgePanel, Registration } from '@/types/competitions';

export default function PanelsPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [competitionIntId, setCompetitionIntId] = useState<number | null>(null);
  const [competitionName, setCompetitionName] = useState('');
  const [panels, setPanels]         = useState<JudgePanel[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading]       = useState(true);
  const [newPanelName, setNewPanelName] = useState('');
  const [creating, setCreating]     = useState(false);
  const [assigning, setAssigning]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const compRes = await competitionsRepository.getCompetition(id);
      const comp = compRes.data;
      setCompetitionIntId(comp.id);
      setCompetitionName(comp.name);

      const [panelsRes, regsRes] = await Promise.all([
        competitionsRepository.listJudgePanels({ competition__public_id: id, page_size: 100 }),
        competitionsRepository.listRegistrations({
          division__competition__public_id: id,
          status: 'confirmed',
          page_size: '200',
        }),
      ]);
      setPanels(panelsRes.data.results);
      const sorted = [...regsRes.data.results].sort(
        (a, b) => (a.performance_order ?? 9999) - (b.performance_order ?? 9999),
      );
      setRegistrations(sorted);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleCreatePanel = async () => {
    if (!newPanelName.trim() || competitionIntId === null) return;
    setCreating(true);
    try {
      await competitionsRepository.createJudgePanel({ competition: competitionIntId, name: newPanelName.trim() });
      setNewPanelName('');
      toast.success('Panel creado.');
      load();
    } catch {
      toast.error('Error al crear el panel.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePanel = async (panelId: number) => {
    try {
      await competitionsRepository.deleteJudgePanel(panelId);
      toast.success('Panel eliminado.');
      load();
    } catch {
      toast.error('Error al eliminar el panel.');
    }
  };

  const handleAutoAssign = async () => {
    if (competitionIntId === null) return;
    setAssigning(true);
    try {
      await competitionsRepository.autoAssignPanels(competitionIntId);
      toast.success('Equipos asignados automáticamente.');
      load();
    } catch {
      toast.error('Error al asignar automáticamente.');
    } finally {
      setAssigning(false);
    }
  };

  const panelForReg = (regId: number): string | null => {
    const panel = panels.find(p => p.registration_ids.includes(regId));
    return panel ? panel.name : null;
  };

  const unassigned = registrations.filter(r => !panels.some(p => p.registration_ids.includes(r.id)));

  if (loading) return <PageSpinner />;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold">Paneles de jueces</h1>
          <p className="text-sm text-muted-foreground">{competitionName}</p>
        </div>
      </div>

      {/* Create panel */}
      <div className="border rounded-lg p-4 space-y-3">
        <h2 className="font-semibold text-sm">Nuevo panel</h2>
        <div className="flex gap-2">
          <input
            className="flex-1 border rounded px-3 py-2 text-sm bg-background"
            placeholder="Nombre del panel (ej. Panel A)"
            value={newPanelName}
            onChange={e => setNewPanelName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreatePanel(); }}
          />
          <Button onClick={handleCreatePanel} disabled={creating || !newPanelName.trim()} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Crear
          </Button>
        </div>
      </div>

      {/* Auto-assign */}
      {panels.length >= 2 && (
        <div className="border rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm">Asignación automática</p>
            <p className="text-xs text-muted-foreground">
              Distribuye los equipos confirmados entre los paneles por orden de actuación (Panel A: impares, Panel B: pares, etc.)
            </p>
          </div>
          <Button onClick={handleAutoAssign} disabled={assigning} variant="outline" size="sm">
            <Shuffle className="w-4 h-4 mr-1" />
            Auto-asignar
          </Button>
        </div>
      )}

      {/* Panel columns */}
      {panels.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No hay paneles. Crea al menos dos paneles (Panel A y Panel B).
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {panels.map(panel => {
            const panelRegs = registrations.filter(r => panel.registration_ids.includes(r.id));
            return (
              <div key={panel.id} className="border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="font-semibold text-sm">{panel.name}</span>
                    <span className="text-xs text-muted-foreground">({panelRegs.length} equipos)</span>
                  </div>
                  <button
                    onClick={() => handleDeletePanel(panel.id)}
                    className="text-destructive hover:text-destructive/80 transition-colors"
                    title="Eliminar panel"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <ul className="divide-y max-h-80 overflow-y-auto">
                  {panelRegs.length === 0 ? (
                    <li className="px-4 py-3 text-xs text-muted-foreground italic">Sin equipos asignados</li>
                  ) : (
                    panelRegs.map(reg => (
                      <li key={reg.id} className="px-4 py-2 flex items-center gap-3 text-sm">
                        <span className="w-6 text-xs text-muted-foreground font-mono text-right shrink-0">
                          {reg.performance_order ?? '—'}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{reg.team_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{reg.gym_name}</p>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {/* Unassigned registrations */}
      {unassigned.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-yellow-50 dark:bg-yellow-950/20 border-b border-yellow-200 dark:border-yellow-900">
            <p className="font-semibold text-sm text-yellow-800 dark:text-yellow-200">
              Sin panel asignado ({unassigned.length})
            </p>
          </div>
          <ul className="divide-y max-h-60 overflow-y-auto">
            {unassigned.map(reg => (
              <li key={reg.id} className="px-4 py-2 flex items-center gap-3 text-sm">
                <span className="w-6 text-xs text-muted-foreground font-mono text-right shrink-0">
                  {reg.performance_order ?? '—'}
                </span>
                <div className="min-w-0">
                  <p className="font-medium truncate">{reg.team_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{reg.gym_name}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
