'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Building2, ChevronDown, ChevronRight, UserPlus, UserMinus } from 'lucide-react';
import { toast } from 'sonner';
import { useConfirm } from '@/hooks/useConfirm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageSpinner } from '@/components/ui/spinner';
import { GymModal } from '@/components/competitions/GymModal';
import { TeamModal } from '@/components/competitions/TeamModal';
import { AthleteModal } from '@/components/athletes/AthleteModal';
import { MembershipAddModal } from '@/components/athletes/MembershipAddModal';
import competitionsRepository from '@/repositories/competitionsRepository';
import athletesRepository from '@/repositories/athletesRepository';
import type { AthleteInvoiceLine, Competition, Gym, Team } from '@/types/competitions';
import type { Athlete, Gender, TeamMembership } from '@/types/athletes';
import { GENDER_LABELS } from '@/types/athletes';

const PAY_BADGE: Record<string, string> = {
  paid:    'bg-green-100 text-green-700',
  partial: 'bg-yellow-100 text-yellow-700',
  pending: 'bg-red-100 text-red-600',
};
const PAY_LABEL: Record<string, string> = {
  paid: 'Pagado', partial: 'Abono', pending: 'Pendiente',
};
const GENDER_VARIANT: Record<Gender, 'info' | 'violet' | 'default'> = {
  F: 'violet', M: 'info', O: 'default',
};

export default function GymsPage() {
  const confirm = useConfirm();
  const [gyms,         setGyms]         = useState<Gym[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [expanded,     setExpanded]     = useState<Set<number>>(new Set());
  const [expandedTeams, setExpandedTeams] = useState<Set<number>>(new Set());
  const [gymAthletes,  setGymAthletes]  = useState<Record<number, Athlete[]>>({});
  const [loadingGyms,  setLoadingGyms]  = useState<Set<number>>(new Set());

  // Gym modal
  const [gymModalOpen, setGymModalOpen] = useState(false);
  const [editingGym,   setEditingGym]   = useState<Gym | undefined>();

  // Team modal
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [editingTeam,   setEditingTeam]   = useState<Team | undefined>();
  const [teamGymId,     setTeamGymId]     = useState<number | null>(null);

  // Athlete modal
  const [athleteModalOpen, setAthleteModalOpen] = useState(false);
  const [editingAthlete,   setEditingAthlete]   = useState<Athlete | undefined>();
  const [athleteGymId,     setAthleteGymId]     = useState<number>(0);

  // Membership add modal
  const [membershipModalOpen, setMembershipModalOpen] = useState(false);
  const [membershipTeam,      setMembershipTeam]      = useState<Team | null>(null);
  const [membershipGymId,     setMembershipGymId]     = useState<number>(0);

  // Payment filter
  const [competitions,  setCompetitions]  = useState<Competition[]>([]);
  const [selectedComp,  setSelectedComp]  = useState('');
  const [paymentMap,    setPaymentMap]    = useState<Record<number, AthleteInvoiceLine>>({});

  const load = useCallback(async () => {
    try {
      const [gymsRes, compRes] = await Promise.all([
        competitionsRepository.listGyms({ page_size: '200' }),
        competitionsRepository.listCompetitions({ page_size: '100' }),
      ]);
      setGyms(gymsRes.data.results);
      setCompetitions(compRes.data.results);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!selectedComp) { setPaymentMap({}); return; }
    competitionsRepository.listGymInvoices({ competition: selectedComp, page_size: '200' }).then(res => {
      const map: Record<number, AthleteInvoiceLine> = {};
      for (const invoice of res.data.results)
        for (const line of invoice.athlete_lines)
          map[line.athlete] = line;
      setPaymentMap(map);
    });
  }, [selectedComp]);

  const fetchGymAthletes = useCallback(async (gymId: number, force = false) => {
    if (!force && gymAthletes[gymId]) return;
    setLoadingGyms(prev => new Set([...prev, gymId]));
    try {
      const res = await athletesRepository.listAthletes({ gym: gymId.toString(), page_size: '500' });
      setGymAthletes(prev => ({ ...prev, [gymId]: res.data.results }));
    } finally {
      setLoadingGyms(prev => { const n = new Set(prev); n.delete(gymId); return n; });
    }
  }, [gymAthletes]);

  const handleGymToggle = (gymId: number) => {
    const expanding = !expanded.has(gymId);
    setExpanded(prev => { const n = new Set(prev); expanding ? n.add(gymId) : n.delete(gymId); return n; });
    if (expanding) fetchGymAthletes(gymId);
  };

  const toggleTeam = (teamId: number) =>
    setExpandedTeams(prev => { const n = new Set(prev); n.has(teamId) ? n.delete(teamId) : n.add(teamId); return n; });

  // ── Gym callbacks ─────────────────────────────────────────────────────────
  const handleGymSaved = (saved: Gym) =>
    setGyms(prev => prev.some(g => g.id === saved.id) ? prev.map(g => g.id === saved.id ? saved : g) : [saved, ...prev]);

  // ── Team callbacks ────────────────────────────────────────────────────────
  const handleTeamSaved = (saved: Team) =>
    setGyms(prev => prev.map(g =>
      g.id === saved.gym
        ? { ...g, teams: g.teams.some(t => t.id === saved.id) ? g.teams.map(t => t.id === saved.id ? saved : t) : [...g.teams, saved] }
        : g
    ));

  // ── Athlete callbacks ─────────────────────────────────────────────────────
  const handleAthleteSaved = (saved: Athlete) => {
    setGymAthletes(prev => {
      const existing = prev[saved.gym] ?? [];
      return {
        ...prev,
        [saved.gym]: existing.some(a => a.id === saved.id)
          ? existing.map(a => a.id === saved.id ? saved : a)
          : [...existing, saved],
      };
    });
  };

  // ── Membership callbacks ──────────────────────────────────────────────────
  const handleMembershipAdded = (membership: TeamMembership) => {
    // Re-fetch athletes for the gym so memberships are up to date
    const gym = gyms.find(g => g.teams.some(t => t.id === membership.team));
    if (gym) fetchGymAthletes(gym.id, true);
  };

  const handleRemoveMembership = async (membershipId: number, athleteId: number, gymId: number) => {
    if (!await confirm({ title: 'Quitar atleta del equipo', message: '¿Seguro que deseas quitar este atleta del equipo?', confirmLabel: 'Quitar' })) return;
    try {
      await athletesRepository.deleteMembership(membershipId);
      toast.success('Atleta quitado del equipo');
      fetchGymAthletes(gymId, true);
    } catch {
      toast.error('No se pudo quitar al atleta');
    }
  };

  // ── Open helpers ──────────────────────────────────────────────────────────
  const openNewTeam = (gymId: number) => { setEditingTeam(undefined); setTeamGymId(gymId); setTeamModalOpen(true); };
  const openEditTeam = (e: React.MouseEvent, team: Team) => { e.stopPropagation(); setEditingTeam(team); setTeamGymId(team.gym); setTeamModalOpen(true); };
  const openNewAthlete = (e: React.MouseEvent, gymId: number) => { e.stopPropagation(); setEditingAthlete(undefined); setAthleteGymId(gymId); setAthleteModalOpen(true); };
  const openEditAthlete = (e: React.MouseEvent, athlete: Athlete) => { e.stopPropagation(); setEditingAthlete(athlete); setAthleteGymId(athlete.gym); setAthleteModalOpen(true); };
  const openAddMember = (e: React.MouseEvent, team: Team, gymId: number) => {
    e.stopPropagation();
    setMembershipTeam(team);
    setMembershipGymId(gymId);
    setMembershipModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Gimnasios</h1>
          <p className="text-sm text-zinc-500">{gyms.length} gimnasio{gyms.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedComp}
            onChange={e => setSelectedComp(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm text-zinc-700"
          >
            <option value="">Estado de pago: todas</option>
            {competitions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Button onClick={() => { setEditingGym(undefined); setGymModalOpen(true); }}>
            <Plus className="h-4 w-4" />
            Nuevo gimnasio
          </Button>
        </div>
      </div>

      {loading ? (
        <PageSpinner />
      ) : gyms.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-zinc-400">
          <Building2 className="h-10 w-10" />
          <p className="text-sm">Aún no hay gimnasios registrados</p>
          <Button variant="secondary" onClick={() => setGymModalOpen(true)}>Crear el primero</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {gyms.map(gym => {
            const isExpanded     = expanded.has(gym.id);
            const isLoadingAths  = loadingGyms.has(gym.id);
            const athletes       = gymAthletes[gym.id] ?? [];

            return (
              <div key={gym.id} className="rounded-xl border border-zinc-200 bg-white overflow-hidden">

                {/* ── Gym row ── */}
                <div
                  className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-zinc-50"
                  onClick={() => handleGymToggle(gym.id)}
                >
                  {isExpanded
                    ? <ChevronDown  className="h-4 w-4 text-zinc-400 shrink-0" />
                    : <ChevronRight className="h-4 w-4 text-zinc-400 shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-zinc-900">{gym.name}</p>
                    <p className="text-xs text-zinc-500">{gym.city} · {gym.country}</p>
                  </div>
                  <span className="text-xs text-zinc-400">
                    {gym.teams.length} equipo{gym.teams.length !== 1 ? 's' : ''}
                    {athletes.length > 0 && ` · ${athletes.length} atleta${athletes.length !== 1 ? 's' : ''}`}
                  </span>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <Button size="sm" variant="outline" onClick={e => openNewAthlete(e, gym.id)}>
                      <UserPlus className="h-3.5 w-3.5" />
                      Atleta
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openNewTeam(gym.id)}>
                      <Plus className="h-3.5 w-3.5" />
                      Equipo
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => { setEditingGym(gym); setGymModalOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* ── Teams + Athletes ── */}
                {isExpanded && (
                  <div className="border-t border-zinc-100">
                    {gym.teams.length === 0 ? (
                      <div className="px-5 py-4 bg-zinc-50">
                        <p className="text-xs text-zinc-400">Sin equipos. Agrega el primero.</p>
                      </div>
                    ) : (
                      gym.teams.map(team => {
                        const isTeamExpanded = expandedTeams.has(team.id);
                        const teamAthletes   = athletes
                          .filter(a => a.memberships.some(m => m.team === team.id))
                          .sort((a, b) => a.full_name.localeCompare(b.full_name));
                        const existingIds    = teamAthletes.map(a => a.id);

                        return (
                          <div key={team.id} className="border-b last:border-0 border-zinc-100">

                            {/* Team row */}
                            <div
                              className="flex items-center gap-3 px-5 py-3 bg-zinc-50 cursor-pointer hover:bg-zinc-100"
                              onClick={() => toggleTeam(team.id)}
                            >
                              <div className="w-4 shrink-0" />
                              {isTeamExpanded
                                ? <ChevronDown  className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                : <ChevronRight className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                              }
                              <p className="flex-1 text-sm font-medium text-zinc-700">{team.name}</p>
                              <span className="text-xs text-zinc-400">
                                {isLoadingAths ? '…' : `${teamAthletes.length} atleta${teamAthletes.length !== 1 ? 's' : ''}`}
                              </span>
                              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                <Button size="sm" variant="outline" onClick={e => openAddMember(e, team, gym.id)}>
                                  <UserPlus className="h-3.5 w-3.5" />
                                  Agregar
                                </Button>
                                <Button size="icon" variant="ghost" onClick={e => openEditTeam(e, team)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>

                            {/* Athletes table */}
                            {isTeamExpanded && (
                              isLoadingAths ? (
                                <div className="py-3 pl-14 text-xs text-zinc-400">Cargando…</div>
                              ) : teamAthletes.length === 0 ? (
                                <div className="py-3 pl-14 text-xs text-zinc-400">
                                  Sin atletas en este equipo.{' '}
                                  <button className="underline text-zinc-500 hover:text-zinc-700" onClick={e => openAddMember(e, team, gym.id)}>
                                    Agregar atleta
                                  </button>
                                </div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">
                                        <th className="pl-14 pr-5 py-2.5">Atleta</th>
                                        <th className="px-5 py-2.5">Cédula</th>
                                        <th className="px-5 py-2.5">Género</th>
                                        <th className="px-5 py-2.5">Edad</th>
                                        <th className="px-5 py-2.5">Rol</th>
                                        {selectedComp && <th className="px-5 py-2.5">Inscripción</th>}
                                        <th className="px-5 py-2.5" />
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100">
                                      {teamAthletes.map(athlete => {
                                        const membership = athlete.memberships.find(m => m.team === team.id);
                                        const payLine    = paymentMap[athlete.id];
                                        const status     = payLine?.payment_status ?? 'pending';
                                        return (
                                          <tr key={athlete.id} className="bg-white hover:bg-zinc-50 transition-colors group">
                                            <td className="pl-14 pr-5 py-3">
                                              <div className="flex items-center gap-2">
                                                {athlete.photo
                                                  // eslint-disable-next-line @next/next/no-img-element
                                                  ? <img src={athlete.photo} alt="" className="h-7 w-7 rounded-full object-cover shrink-0" />
                                                  : <div className="h-7 w-7 rounded-full bg-zinc-100 shrink-0" />
                                                }
                                                <div>
                                                  <p className="font-medium text-zinc-900">{athlete.full_name}</p>
                                                  <p className="text-xs text-zinc-400">
                                                    {new Date(athlete.birth_date + 'T00:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                  </p>
                                                </div>
                                              </div>
                                            </td>
                                            <td className="px-5 py-3 font-mono text-xs text-zinc-600">
                                              {athlete.document_id || '—'}
                                            </td>
                                            <td className="px-5 py-3">
                                              <Badge variant={GENDER_VARIANT[athlete.gender]}>{GENDER_LABELS[athlete.gender]}</Badge>
                                            </td>
                                            <td className="px-5 py-3 font-semibold text-zinc-900">{athlete.age} años</td>
                                            <td className="px-5 py-3 text-xs text-zinc-500">{membership?.role_display ?? '—'}</td>
                                            {selectedComp && (
                                              <td className="px-5 py-3">
                                                {payLine ? (
                                                  <div>
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PAY_BADGE[status]}`}>{PAY_LABEL[status]}</span>
                                                    {status !== 'paid' && <p className="text-xs text-zinc-400 mt-0.5">Saldo: ${parseFloat(payLine.balance_due).toFixed(2)}</p>}
                                                  </div>
                                                ) : (
                                                  <span className="text-xs text-zinc-300">Sin factura</span>
                                                )}
                                              </td>
                                            )}
                                            <td className="px-5 py-3">
                                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                  title="Editar atleta"
                                                  onClick={e => openEditAthlete(e, athlete)}
                                                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
                                                >
                                                  <Pencil className="h-3.5 w-3.5" />
                                                </button>
                                                {membership && (
                                                  <button
                                                    title="Quitar del equipo"
                                                    onClick={() => handleRemoveMembership(membership.id, athlete.id, gym.id)}
                                                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                                                  >
                                                    <UserMinus className="h-3.5 w-3.5" />
                                                  </button>
                                                )}
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )
                            )}
                          </div>
                        );
                      })
                    )}

                    {/* Athletes without team */}
                    {(() => {
                      const unassigned = athletes.filter(a => a.memberships.length === 0);
                      if (unassigned.length === 0) return null;
                      return (
                        <div className="border-t border-zinc-100 bg-amber-50/40 px-5 py-3">
                          <p className="text-xs font-medium text-amber-700 mb-2">
                            Sin equipo asignado ({unassigned.length})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {unassigned.map(a => (
                              <div key={a.id} className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-xs">
                                <span className="text-zinc-700">{a.full_name}</span>
                                <button title="Editar" onClick={e => openEditAthlete(e, a)} className="text-zinc-400 hover:text-zinc-700">
                                  <Pencil className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modals ── */}
      <GymModal open={gymModalOpen} onClose={() => setGymModalOpen(false)} onSaved={handleGymSaved} initial={editingGym} />
      {teamGymId && (
        <TeamModal open={teamModalOpen} onClose={() => setTeamModalOpen(false)} onSaved={handleTeamSaved} gymId={teamGymId} initial={editingTeam} />
      )}
      <AthleteModal
        open={athleteModalOpen}
        onClose={() => setAthleteModalOpen(false)}
        onSaved={handleAthleteSaved}
        gymId={athleteGymId}
        initial={editingAthlete}
      />
      {membershipTeam && (
        <MembershipAddModal
          open={membershipModalOpen}
          onClose={() => setMembershipModalOpen(false)}
          onSaved={handleMembershipAdded}
          teamId={membershipTeam.id}
          teamName={membershipTeam.name}
          gymId={membershipGymId}
          existingIds={gymAthletes[membershipGymId]?.filter(a => a.memberships.some(m => m.team === membershipTeam.id)).map(a => a.id) ?? []}
        />
      )}
    </div>
  );
}
