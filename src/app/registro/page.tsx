'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, ChevronLeft, ChevronRight, Loader2, Search, Plus, Trash2, UserPlus, Trophy } from 'lucide-react';
import publicRegistrationRepository, {
  WizardCompetition,
  WizardDivision,
  WizardGym,
  WizardStaff,
  WizardAthleteSearch,
} from '@/repositories/publicRegistrationRepository';

// ── Age group validation ────────────────────────────────────────────────────────

const AGE_GROUP_RANGES: Record<string, [number, number]> = {
  tiny:   [4,  6],
  mini:   [5,  9],
  youth:  [8,  12],
  junior: [9,  16],
  senior: [12, 19],
  open:   [12, 99],
};

function calcAge(birthDate: string): number {
  const today = new Date();
  const bd = new Date(birthDate);
  let age = today.getFullYear() - bd.getFullYear();
  if (today.getMonth() < bd.getMonth() || (today.getMonth() === bd.getMonth() && today.getDate() < bd.getDate())) age--;
  return age;
}

function ageError(birthDate: string, ageGroup: string, ageGroupLabel: string): string | null {
  const range = AGE_GROUP_RANGES[ageGroup];
  if (!range || !birthDate) return null;
  const age = calcAge(birthDate);
  const [min, max] = range;
  if (age < min || age > max) {
    return `El atleta tiene ${age} años y no cumple el rango de edad para la categoría ${ageGroupLabel} (${min}–${max === 99 ? '12+' : max} años).`;
  }
  return null;
}

// ── Types ──────────────────────────────────────────────────────────────────────

type Step = 'loading' | 'invalid' | 'gym' | 'team' | 'athletes' | 'done';

interface AddedAthlete {
  id: number;
  full_name: string;
  document_id: string | null;
  role: string;
}

interface RegistrationResult {
  registration_id: number;
  team_id: number;
  team_name: string;
  gym_name: string;
  division_name: string;
  age_group: string;
  division_id: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const AGE_GROUP_LABELS: Record<string, string> = {
  tiny:   'Tiny (4–6)',
  mini:   'Mini (5–9)',
  youth:  'Youth (8–12)',
  junior: 'Junior (9–16)',
  senior: 'Senior (12–19)',
  open:   'Open (12+)',
};

const ROLE_LABELS: Record<string, string> = {
  flyer:    'Flyer',
  base:     'Base',
  backspot: 'Backspot',
  spotter:  'Spotter',
  tumbler:  'Tumbler',
};

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('es-EC', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

// ── Step indicator ─────────────────────────────────────────────────────────────

function StepDots({ current }: { current: number }) {
  const steps = ['Gimnasio', 'Equipo', 'Atletas'];
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold transition-colors ${
            i < current ? 'bg-green-500 text-white' :
            i === current ? 'bg-blue-600 text-white' :
            'bg-zinc-200 text-zinc-500'
          }`}>
            {i < current ? <CheckCircle className="w-4 h-4" /> : i + 1}
          </div>
          <span className={`text-xs font-medium ${i === current ? 'text-zinc-800' : 'text-zinc-400'}`}>{label}</span>
          {i < steps.length - 1 && <div className="w-6 h-px bg-zinc-300 mx-1" />}
        </div>
      ))}
    </div>
  );
}

// ── Step 1: Gym ────────────────────────────────────────────────────────────────

function Step1Gym({
  token,
  onSelect,
}: {
  token: string;
  onSelect: (gym: WizardGym) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WizardGym[]>([]);
  const [searching, setSearching] = useState(false);
  const [mode, setMode] = useState<'search' | 'create'>('search');
  const [newName, setNewName] = useState('');
  const [newCity, setNewCity] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const data = await publicRegistrationRepository.searchGyms(token, q);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [token]);

  useEffect(() => {
    const t = setTimeout(() => search(query), 350);
    return () => clearTimeout(t);
  }, [query, search]);

  async function handleCreate() {
    if (!newName.trim() || !newCity.trim()) { setError('Nombre y ciudad son obligatorios.'); return; }
    setSaving(true); setError('');
    try {
      const gym = await publicRegistrationRepository.createGym(token, { name: newName.trim(), city: newCity.trim(), country: 'ECU' });
      onSelect(gym);
    } catch (e: unknown) {
      const err = e as { response?: { data?: Record<string, unknown> } };
      const detail = err?.response?.data;
      setError(typeof detail === 'object' ? Object.values(detail).flat().join(' ') : 'Error al crear el gimnasio.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <StepDots current={0} />
      <h2 className="text-lg font-semibold text-zinc-800 mb-1">¿A qué gimnasio pertenece su equipo?</h2>
      <p className="text-sm text-zinc-500 mb-4">Busque su gimnasio o regístrelo si es la primera vez.</p>

      {mode === 'search' && (
        <>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              className="w-full pl-9 pr-3 py-2.5 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nombre del gimnasio…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>

          {searching && <p className="text-xs text-zinc-400 text-center py-2">Buscando…</p>}

          {results.length > 0 && (
            <ul className="divide-y divide-zinc-100 border border-zinc-200 rounded-lg mb-3 overflow-hidden">
              {results.map((g) => (
                <li key={g.id}>
                  <button
                    onClick={() => onSelect(g)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors"
                  >
                    <p className="font-medium text-sm text-zinc-800">{g.name}</p>
                    <p className="text-xs text-zinc-500">{g.city}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {query.trim() && !searching && results.length === 0 && (
            <p className="text-sm text-zinc-500 mb-3">No se encontraron resultados para &ldquo;{query}&rdquo;.</p>
          )}

          <button
            onClick={() => { setMode('create'); setNewName(query); }}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            <Plus className="w-4 h-4" />
            Registrar nuevo gimnasio
          </button>
        </>
      )}

      {mode === 'create' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Nombre del gimnasio *</label>
            <input
              className="w-full px-3 py-2.5 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ej. Gym Stars Quito"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Ciudad *</label>
            <input
              className="w-full px-3 py-2.5 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
              placeholder="Ej. Quito"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setMode('search')}
              className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700"
            >
              <ChevronLeft className="w-4 h-4" /> Volver
            </button>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="ml-auto flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Crear gimnasio
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Step 2: Team + Division + Staff ────────────────────────────────────────────

function Step2Team({
  token,
  gym,
  divisions,
  onBack,
  onSuccess,
}: {
  token: string;
  gym: WizardGym;
  divisions: WizardDivision[];
  onBack: () => void;
  onSuccess: (result: RegistrationResult) => void;
}) {
  const [teamName, setTeamName] = useState('');
  const [divisionId, setDivisionId] = useState<number | ''>('');
  const [staff, setStaff] = useState<WizardStaff[]>([
    { full_name: '', role: 'head_coach', phone: '', email: '' },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function addStaff() {
    setStaff((s) => [...s, { full_name: '', role: 'assistant', phone: '', email: '' }]);
  }

  function removeStaff(i: number) {
    setStaff((s) => s.filter((_, idx) => idx !== i));
  }

  function updateStaff(i: number, field: keyof WizardStaff, value: string) {
    setStaff((s) => s.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  }

  async function handleSubmit() {
    if (!teamName.trim()) { setError('Ingrese el nombre del equipo.'); return; }
    if (!divisionId) { setError('Seleccione una división.'); return; }
    const hasHead = staff.some((s) => s.role === 'head_coach' && s.full_name.trim());
    if (!hasHead) { setError('El Head Coach es obligatorio.'); return; }

    setSaving(true); setError('');
    try {
      const result = await publicRegistrationRepository.createTeam({
        token,
        gym_id: gym.id,
        division_id: Number(divisionId),
        team_name: teamName.trim(),
        staff: staff.filter((s) => s.full_name.trim()).map((s) => ({
          ...s,
          phone: s.phone || '',
          email: s.email || '',
        })),
      });
      onSuccess(result);
    } catch (e: unknown) {
      const err = e as { response?: { data?: Record<string, unknown> } };
      const detail = err?.response?.data;
      setError(typeof detail === 'object' ? Object.values(detail).flat().join(' ') : 'Error al registrar el equipo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <StepDots current={1} />
      <h2 className="text-lg font-semibold text-zinc-800 mb-1">Equipo y división</h2>
      <p className="text-sm text-zinc-500 mb-4">Gimnasio: <span className="font-medium text-zinc-700">{gym.name}</span> — {gym.city}</p>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Nombre del equipo *</label>
          <input
            className="w-full px-3 py-2.5 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Ej. Stars Senior Level 4"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">División *</label>
          <select
            className="w-full px-3 py-2.5 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            value={divisionId}
            onChange={(e) => setDivisionId(Number(e.target.value))}
          >
            <option value="">Seleccione una división…</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} — {AGE_GROUP_LABELS[d.age_group] ?? d.age_group} · {d.skill_level}
                {d.athlete_fee !== '0.00' && ` · $${d.athlete_fee}/atleta`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-zinc-600">Cuerpo técnico</label>
            <button
              onClick={addStaff}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              <Plus className="w-3.5 h-3.5" /> Agregar asistente
            </button>
          </div>
          <div className="space-y-3">
            {staff.map((s, i) => (
              <div key={i} className="border border-zinc-200 rounded-lg p-3 space-y-2 bg-zinc-50">
                <div className="flex items-center justify-between">
                  <select
                    className="text-xs font-medium border-0 bg-transparent text-zinc-600 focus:outline-none"
                    value={s.role}
                    onChange={(e) => updateStaff(i, 'role', e.target.value)}
                    disabled={i === 0}
                  >
                    <option value="head_coach">Head Coach</option>
                    <option value="assistant">Asistente</option>
                    <option value="trainer">Entrenador</option>
                  </select>
                  {i > 0 && (
                    <button onClick={() => removeStaff(i)} className="text-zinc-400 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <input
                  className="w-full px-2.5 py-1.5 border border-zinc-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  placeholder={`Nombre completo${i === 0 ? ' *' : ''}`}
                  value={s.full_name}
                  onChange={(e) => updateStaff(i, 'full_name', e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="px-2.5 py-1.5 border border-zinc-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    placeholder="Teléfono"
                    value={s.phone}
                    onChange={(e) => updateStaff(i, 'phone', e.target.value)}
                  />
                  <input
                    className="px-2.5 py-1.5 border border-zinc-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    placeholder="Email"
                    value={s.email}
                    onChange={(e) => updateStaff(i, 'email', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700"
          >
            <ChevronLeft className="w-4 h-4" /> Volver
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="ml-auto flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-lg disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Step 3: Athletes ────────────────────────────────────────────────────────────

function Step3Athletes({
  token,
  gymId,
  teamId,
  registrationId,
  teamName,
  divisionName,
  ageGroup,
  onFinish,
}: {
  token: string;
  gymId: number;
  teamId: number;
  registrationId: number;
  teamName: string;
  divisionName: string;
  ageGroup: string;
  onFinish: () => void;
}) {
  const [ci, setCi] = useState('');
  const [found, setFound] = useState<WizardAthleteSearch | null>(null);
  const [searching, setSearching] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', birth_date: '', gender: 'F', document_id: '' });
  const [role, setRole] = useState('flyer');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [added, setAdded] = useState<AddedAthlete[]>([]);
  const ageValidationError = form.birth_date ? ageError(form.birth_date, ageGroup, AGE_GROUP_LABELS[ageGroup] ?? ageGroup) : null;

  const handleCiChange = useCallback(async (value: string) => {
    setCi(value);
    if (value.length !== 10) { setFound(null); return; }
    setSearching(true);
    try {
      const results = await publicRegistrationRepository.searchAthlete(token, value);
      if (results.length > 0) {
        const a = results[0];
        setFound(a);
        setForm({
          first_name:  a.first_name,
          last_name:   a.last_name,
          birth_date:  a.birth_date,
          gender:      a.gender,
          document_id: a.document_id ?? value,
        });
      } else {
        setFound(null);
        setForm((f) => ({ ...f, document_id: value }));
      }
    } catch {
      setFound(null);
    } finally {
      setSearching(false);
    }
  }, [token]);

  useEffect(() => {
    const t = setTimeout(() => handleCiChange(ci), 300);
    return () => clearTimeout(t);
  }, [ci, handleCiChange]);

  function updateForm(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleAddAthlete() {
    if (!form.first_name.trim() || !form.last_name.trim()) { setError('Nombre y apellido son obligatorios.'); return; }
    if (!form.birth_date) { setError('La fecha de nacimiento es obligatoria.'); return; }
    if (!form.document_id || form.document_id.length !== 10) { setError('Ingrese una cédula de 10 dígitos.'); return; }
    if (ageValidationError) { setError(ageValidationError); return; }

    setSaving(true); setError('');
    try {
      const result = await publicRegistrationRepository.saveAthlete({
        token,
        team_id:         teamId,
        registration_id: registrationId,
        role,
        first_name:  form.first_name.trim(),
        last_name:   form.last_name.trim(),
        birth_date:  form.birth_date,
        gender:      form.gender,
        document_id: form.document_id,
        gym:         gymId,
      });
      setAdded((a) => [...a, {
        id:          result.id,
        full_name:   `${result.first_name} ${result.last_name}`,
        document_id: result.document_id,
        role,
      }]);
      setCi('');
      setFound(null);
      setForm({ first_name: '', last_name: '', birth_date: '', gender: 'F', document_id: '' });
      setRole('flyer');
    } catch (e: unknown) {
      const err = e as { response?: { data?: Record<string, unknown> } };
      const detail = err?.response?.data;
      setError(typeof detail === 'object' ? Object.values(detail).flat().join(' ') : 'Error al agregar el atleta.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <StepDots current={2} />
      <h2 className="text-lg font-semibold text-zinc-800 mb-0.5">Registro de atletas</h2>
      <p className="text-sm text-zinc-500 mb-4">
        Equipo: <span className="font-medium text-zinc-700">{teamName}</span> · {divisionName}
      </p>

      {added.length > 0 && (
        <div className="mb-4 border border-zinc-200 rounded-lg overflow-hidden">
          <div className="bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-500 border-b border-zinc-200">
            {added.length} atleta{added.length !== 1 ? 's' : ''} agregado{added.length !== 1 ? 's' : ''}
          </div>
          <ul className="divide-y divide-zinc-100">
            {added.map((a) => (
              <li key={a.id} className="flex items-center gap-2 px-3 py-2">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800 truncate">{a.full_name}</p>
                  <p className="text-xs text-zinc-400">{a.document_id} · {ROLE_LABELS[a.role] ?? a.role}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border border-zinc-200 rounded-lg p-4 space-y-3 mb-4">
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Cédula (CI) *</label>
          <div className="relative">
            <input
              className="w-full px-3 py-2.5 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              placeholder="0000000000"
              maxLength={10}
              value={ci}
              onChange={(e) => setCi(e.target.value.replace(/\D/g, ''))}
              autoFocus
            />
            {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 animate-spin" />}
          </div>
          {found && <p className="mt-1 text-xs text-green-600 font-medium">Atleta encontrado — datos precargados.</p>}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Nombre *</label>
            <input className="w-full px-2.5 py-2 border border-zinc-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" value={form.first_name} onChange={(e) => updateForm('first_name', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Apellido *</label>
            <input className="w-full px-2.5 py-2 border border-zinc-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" value={form.last_name} onChange={(e) => updateForm('last_name', e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Fecha de nacimiento *</label>
            <input
              type="date"
              className={`w-full px-2.5 py-2 border rounded text-sm focus:outline-none focus:ring-1 ${ageValidationError ? 'border-red-400 focus:ring-red-400' : 'border-zinc-300 focus:ring-blue-500'}`}
              value={form.birth_date}
              onChange={(e) => updateForm('birth_date', e.target.value)}
            />
            {ageValidationError && (
              <p className="mt-1 text-[11px] text-red-600 leading-tight">{ageValidationError}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Género *</label>
            <select className="w-full px-2.5 py-2 border border-zinc-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" value={form.gender} onChange={(e) => updateForm('gender', e.target.value)}>
              <option value="F">Femenino</option>
              <option value="M">Masculino</option>
              <option value="O">Otro</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Rol en el equipo *</label>
          <select className="w-full px-2.5 py-2 border border-zinc-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" value={role} onChange={(e) => setRole(e.target.value)}>
            {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</p>}

        <button
          onClick={handleAddAthlete}
          disabled={saving || !!ageValidationError}
          className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          Agregar atleta
        </button>
      </div>

      <button
        onClick={onFinish}
        disabled={added.length === 0}
        className="w-full flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg disabled:opacity-40 transition-colors"
      >
        <CheckCircle className="w-4 h-4" />
        Finalizar inscripción ({added.length} atleta{added.length !== 1 ? 's' : ''})
      </button>
    </div>
  );
}

// ── Done ───────────────────────────────────────────────────────────────────────

function Done({
  result,
  competitionName,
  competitionDate,
  onAnotherTeam,
}: {
  result: RegistrationResult;
  competitionName: string;
  competitionDate: string;
  onAnotherTeam: () => void;
}) {
  return (
    <div className="text-center py-4">
      <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-4">
        <CheckCircle className="w-9 h-9 text-green-600" />
      </div>
      <h2 className="text-xl font-bold text-zinc-800 mb-1">¡Inscripción exitosa!</h2>
      <p className="text-sm text-zinc-500 mb-5">{competitionName} · {fmtDate(competitionDate)}</p>

      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-left mb-6 space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">Gimnasio</span>
          <span className="font-medium text-zinc-800">{result.gym_name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">Equipo</span>
          <span className="font-medium text-zinc-800">{result.team_name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">División</span>
          <span className="font-medium text-zinc-800">{result.division_name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">N° inscripción</span>
          <span className="font-mono text-xs text-zinc-600">#{result.registration_id}</span>
        </div>
      </div>

      <button
        onClick={onAnotherTeam}
        className="w-full flex items-center justify-center gap-1.5 border border-blue-600 text-blue-600 hover:bg-blue-50 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
        Registrar otro equipo en este gimnasio
      </button>
    </div>
  );
}

// ── Main Wizard Page ───────────────────────────────────────────────────────────

export default function RegistroPage() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>('loading');
  const [competition, setCompetition] = useState<WizardCompetition | null>(null);
  const [token, setToken] = useState('');
  const [invalidMsg, setInvalidMsg] = useState('');
  const [selectedGym, setSelectedGym] = useState<WizardGym | null>(null);
  const [registrationResult, setRegistrationResult] = useState<RegistrationResult | null>(null);

  useEffect(() => {
    const t = searchParams.get('token') ?? '';
    if (!t) { setInvalidMsg('No se proporcionó un token de acceso.'); setStep('invalid'); return; }
    setToken(t);
    publicRegistrationRepository.validateToken(t)
      .then((comp) => { setCompetition(comp); setStep('gym'); })
      .catch(() => { setInvalidMsg('El enlace de inscripción es inválido o ha expirado.'); setStep('invalid'); });
  }, [searchParams]);

  function handleGymSelect(gym: WizardGym) {
    setSelectedGym(gym);
    setStep('team');
  }

  function handleTeamSuccess(result: RegistrationResult) {
    setRegistrationResult(result);
    setStep('athletes');
  }

  function handleAthletesFinish() {
    setStep('done');
  }

  function handleAnotherTeam() {
    setRegistrationResult(null);
    setStep('team');
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      <header className="bg-white border-b border-zinc-200 px-4 py-3 flex items-center gap-3">
        <Trophy className="w-5 h-5 text-blue-600" />
        <span className="font-semibold text-zinc-800 text-sm">
          {competition ? competition.name : 'Inscripción de Equipos'}
        </span>
        {competition && (
          <span className="ml-auto text-xs text-zinc-400">{fmtDate(competition.date)}</span>
        )}
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-zinc-200 p-6">
          {step === 'loading' && (
            <div className="flex flex-col items-center py-10 gap-3">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-sm text-zinc-500">Verificando enlace…</p>
            </div>
          )}

          {step === 'invalid' && (
            <div className="text-center py-8">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">⚠️</span>
              </div>
              <h2 className="text-base font-semibold text-zinc-800 mb-1">Enlace inválido</h2>
              <p className="text-sm text-zinc-500">{invalidMsg}</p>
            </div>
          )}

          {step === 'gym' && (
            <Step1Gym token={token} onSelect={handleGymSelect} />
          )}

          {step === 'team' && competition && selectedGym && (
            <Step2Team
              token={token}
              gym={selectedGym}
              divisions={competition.divisions}
              onBack={() => setStep('gym')}
              onSuccess={handleTeamSuccess}
            />
          )}

          {step === 'athletes' && registrationResult && selectedGym && (
            <Step3Athletes
              token={token}
              gymId={selectedGym.id}
              teamId={registrationResult.team_id}
              registrationId={registrationResult.registration_id}
              teamName={registrationResult.team_name}
              divisionName={registrationResult.division_name}
              ageGroup={registrationResult.age_group}
              onFinish={handleAthletesFinish}
            />
          )}

          {step === 'done' && registrationResult && competition && (
            <Done
              result={registrationResult}
              competitionName={competition.name}
              competitionDate={competition.date}
              onAnotherTeam={handleAnotherTeam}
            />
          )}
        </div>
      </main>
    </div>
  );
}
