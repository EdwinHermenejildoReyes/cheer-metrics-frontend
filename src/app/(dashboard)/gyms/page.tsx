'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Building2, ChevronDown, ChevronRight, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageSpinner } from '@/components/ui/spinner';
import { GymModal } from '@/components/competitions/GymModal';
import { TeamModal } from '@/components/competitions/TeamModal';
import competitionsRepository from '@/repositories/competitionsRepository';
import athletesRepository from '@/repositories/athletesRepository';
import type { Gym, Team } from '@/types/competitions';
import type { Athlete } from '@/types/athletes';
import { GENDER_LABELS } from '@/types/athletes';

export default function GymsPage() {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [expandedTeams, setExpandedTeams] = useState<Set<number>>(new Set());
  const [gymAthletes, setGymAthletes] = useState<Record<number, Athlete[]>>({});
  const [loadingGyms, setLoadingGyms] = useState<Set<number>>(new Set());

  const [gymModalOpen, setGymModalOpen] = useState(false);
  const [editingGym, setEditingGym] = useState<Gym | undefined>();
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | undefined>();
  const [teamGymId, setTeamGymId] = useState<number | null>(null);

  const load = async () => {
    try {
      const res = await competitionsRepository.listGyms({ page_size: '200' });
      setGyms(res.data.results);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const fetchGymAthletes = async (gymId: number) => {
    if (gymAthletes[gymId]) return;
    setLoadingGyms(prev => new Set([...prev, gymId]));
    try {
      const res = await athletesRepository.listAthletes({ gym: gymId.toString(), page_size: '500' });
      setGymAthletes(prev => ({ ...prev, [gymId]: res.data.results }));
    } finally {
      setLoadingGyms(prev => { const next = new Set(prev); next.delete(gymId); return next; });
    }
  };

  const handleGymToggle = (gymId: number) => {
    const isExpanding = !expanded.has(gymId);
    setExpanded(prev => {
      const next = new Set(prev);
      isExpanding ? next.add(gymId) : next.delete(gymId);
      return next;
    });
    if (isExpanding) fetchGymAthletes(gymId);
  };

  const toggleTeam = (teamId: number) => {
    setExpandedTeams(prev => {
      const next = new Set(prev);
      next.has(teamId) ? next.delete(teamId) : next.add(teamId);
      return next;
    });
  };

  const handleGymSaved = (saved: Gym) => {
    setGyms(prev =>
      prev.some(g => g.id === saved.id)
        ? prev.map(g => g.id === saved.id ? saved : g)
        : [saved, ...prev]
    );
  };

  const handleTeamSaved = (saved: Team) => {
    setGyms(prev =>
      prev.map(g =>
        g.id === saved.gym
          ? {
              ...g,
              teams: g.teams.some(t => t.id === saved.id)
                ? g.teams.map(t => t.id === saved.id ? saved : t)
                : [...g.teams, saved],
            }
          : g
      )
    );
  };

  const openNewTeam = (gymId: number) => {
    setEditingTeam(undefined);
    setTeamGymId(gymId);
    setTeamModalOpen(true);
  };

  const openEditTeam = (e: React.MouseEvent, team: Team) => {
    e.stopPropagation();
    setEditingTeam(team);
    setTeamGymId(team.gym);
    setTeamModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Gimnasios</h1>
          <p className="text-sm text-zinc-500">{gyms.length} gimnasio{gyms.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => { setEditingGym(undefined); setGymModalOpen(true); }}>
          <Plus className="h-4 w-4" />
          Nuevo gimnasio
        </Button>
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
            const isExpanded = expanded.has(gym.id);
            const isLoadingAthletes = loadingGyms.has(gym.id);
            const athletes = gymAthletes[gym.id] ?? [];

            return (
              <div key={gym.id} className="rounded-xl border border-zinc-200 bg-white overflow-hidden">

                {/* Gym row */}
                <div
                  className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-zinc-50"
                  onClick={() => handleGymToggle(gym.id)}
                >
                  {isExpanded
                    ? <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
                    : <ChevronRight className="h-4 w-4 text-zinc-400 shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-zinc-900">{gym.name}</p>
                    <p className="text-xs text-zinc-500">{gym.city} · {gym.country}</p>
                  </div>
                  <span className="text-xs text-zinc-400">
                    {gym.teams.length} equipo{gym.teams.length !== 1 ? 's' : ''}
                  </span>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <Button size="sm" variant="outline" onClick={() => openNewTeam(gym.id)}>
                      <Plus className="h-3.5 w-3.5" />
                      Equipo
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => { setEditingGym(gym); setGymModalOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Teams + Athletes */}
                {isExpanded && (
                  <div className="border-t border-zinc-100">
                    {gym.teams.length === 0 ? (
                      <div className="px-5 py-4 bg-zinc-50">
                        <p className="text-xs text-zinc-400">Sin equipos. Agrega el primero.</p>
                      </div>
                    ) : (
                      gym.teams.map(team => {
                        const isTeamExpanded = expandedTeams.has(team.id);
                        const teamAthletes = athletes
                          .filter(a => a.memberships.some(m => m.team === team.id))
                          .sort((a, b) => a.full_name.localeCompare(b.full_name));

                        return (
                          <div key={team.id} className="border-b last:border-0 border-zinc-100">

                            {/* Team row */}
                            <div
                              className="flex items-center gap-3 px-5 py-3 bg-zinc-50 cursor-pointer hover:bg-zinc-100"
                              onClick={() => toggleTeam(team.id)}
                            >
                              <div className="w-4 shrink-0" />
                              {isTeamExpanded
                                ? <ChevronDown className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                : <ChevronRight className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                              }
                              <p className="flex-1 text-sm font-medium text-zinc-700">{team.name}</p>
                              <span className="text-xs text-zinc-400">
                                {isLoadingAthletes
                                  ? '…'
                                  : `${teamAthletes.length} atleta${teamAthletes.length !== 1 ? 's' : ''}`
                                }
                              </span>
                              <div onClick={e => e.stopPropagation()}>
                                <Button size="icon" variant="ghost" onClick={e => openEditTeam(e, team)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>

                            {/* Athletes */}
                            {isTeamExpanded && (
                              <div className="divide-y divide-zinc-100">
                                {isLoadingAthletes ? (
                                  <div className="py-3 pl-14 text-xs text-zinc-400">Cargando atletas…</div>
                                ) : teamAthletes.length === 0 ? (
                                  <div className="py-3 pl-14 text-xs text-zinc-400">Sin atletas en este equipo.</div>
                                ) : (
                                  teamAthletes.map(athlete => {
                                    const membership = athlete.memberships.find(m => m.team === team.id);
                                    return (
                                      <div key={athlete.id} className="flex items-center gap-3 py-2 pl-14 pr-5 bg-white hover:bg-zinc-50">
                                        {athlete.photo ? (
                                          <img
                                            src={athlete.photo}
                                            alt={athlete.full_name}
                                            className="h-7 w-7 rounded-full object-cover shrink-0"
                                          />
                                        ) : (
                                          <div className="h-7 w-7 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
                                            <User className="h-3.5 w-3.5 text-zinc-400" />
                                          </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm text-zinc-800">{athlete.full_name}</p>
                                          <p className="text-xs text-zinc-400">
                                            {membership?.role_display}
                                            {membership && ' · '}
                                            {GENDER_LABELS[athlete.gender]}
                                          </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <p className="text-xs text-zinc-400">{athlete.birth_date} · {athlete.age} años</p>
                                          <p className="text-xs text-zinc-400 font-mono">{athlete.document_id}</p>
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <GymModal
        open={gymModalOpen}
        onClose={() => setGymModalOpen(false)}
        onSaved={handleGymSaved}
        initial={editingGym}
      />
      {teamGymId && (
        <TeamModal
          open={teamModalOpen}
          onClose={() => setTeamModalOpen(false)}
          onSaved={handleTeamSaved}
          gymId={teamGymId}
          initial={editingTeam}
        />
      )}
    </div>
  );
}
