'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trophy, CalendarDays, MapPin, ChevronRight, ArrowLeft } from 'lucide-react';

interface Competition {
  id: number;
  name: string;
  date: string;
  city: string;
  venue: string;
  regulation: string;
  is_active: boolean;
}

interface PaginatedResponse {
  count: number;
  results: Competition[];
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-EC', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function statusLabel(c: Competition, today: string) {
  if (c.is_active) return { text: 'En curso', color: 'bg-green-100 text-green-700' };
  if (c.date >= today) return { text: 'Próxima', color: 'bg-blue-100 text-blue-700' };
  return { text: 'Finalizada', color: 'bg-zinc-100 text-zinc-500' };
}

function CompCard({ comp, today }: { comp: Competition; today: string }) {
  const status = statusLabel(comp, today);
  const isPast = !comp.is_active && comp.date < today;
  return (
    <div className={`rounded-2xl border bg-white overflow-hidden transition-shadow hover:shadow-md ${isPast ? 'opacity-60' : ''}`}>
      {/* Color bar */}
      <div className={`h-1.5 ${comp.is_active ? 'bg-green-500' : comp.date >= today ? 'bg-orange-500' : 'bg-zinc-200'}`} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <span className={`text-[11px] font-semibold uppercase tracking-wide rounded-full px-2.5 py-0.5 ${status.color}`}>
            {status.text}
          </span>
          <span className="text-[11px] text-zinc-400 font-medium">{comp.regulation}</span>
        </div>

        <h3 className="text-base font-semibold text-zinc-900 leading-snug mb-3">{comp.name}</h3>

        <div className="flex flex-col gap-1.5 text-xs text-zinc-500">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
            <span className="capitalize">{fmtDate(comp.date)}</span>
          </div>
          {comp.venue && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
              <span>{comp.venue}, {comp.city}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SchedulePage() {
  const [upcoming, setUpcoming]   = useState<Competition[]>([]);
  const [active, setActive]       = useState<Competition[]>([]);
  const [past, setPast]           = useState<Competition[]>([]);
  const [loading, setLoading]     = useState(true);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const BASE = process.env.NEXT_PUBLIC_MAIN_API_URL ?? '/api/v1/';
    fetch(`${BASE}competitions/?page_size=100&ordering=date`)
      .then(r => r.ok ? r.json() : null)
      .then((data: PaginatedResponse | null) => {
        if (!data) return;
        const all = data.results;
        setActive(all.filter(c => c.is_active));
        setUpcoming(all.filter(c => !c.is_active && c.date >= today).sort((a, b) => a.date.localeCompare(b.date)));
        setPast(all.filter(c => !c.is_active && c.date < today).sort((a, b) => b.date.localeCompare(a.date)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Navbar */}
      <header className="fixed top-0 inset-x-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="rounded-lg bg-orange-500 p-1.5">
              <Trophy className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-semibold text-white">Cheer Metrics</span>
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-orange-500 hover:bg-orange-600 transition-colors px-4 py-2 text-sm font-semibold text-white"
          >
            Iniciar sesión
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-28 pb-20">
        {/* Back link */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio
        </Link>

        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white">Calendario de competencias</h1>
          <p className="text-zinc-400 mt-2 text-sm">Eventos de cheerleading en Ecuador · Cheer Metrics</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="space-y-12">

            {/* Active */}
            {active.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                  <h2 className="text-xs font-bold uppercase tracking-widest text-green-400">
                    En curso ({active.length})
                  </h2>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {active.map(c => <CompCard key={c.id} comp={c} today={today} />)}
                </div>
              </section>
            )}

            {/* Upcoming */}
            {upcoming.length > 0 && (
              <section>
                <h2 className="text-xs font-bold uppercase tracking-widest text-orange-400 mb-4">
                  Próximas ({upcoming.length})
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {upcoming.map(c => <CompCard key={c.id} comp={c} today={today} />)}
                </div>
              </section>
            )}

            {/* Past */}
            {past.length > 0 && (
              <section>
                <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">
                  Finalizadas ({past.length})
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {past.map(c => <CompCard key={c.id} comp={c} today={today} />)}
                </div>
              </section>
            )}

            {active.length === 0 && upcoming.length === 0 && past.length === 0 && (
              <div className="text-center py-24">
                <Trophy className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-500">No hay competencias registradas aún.</p>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-white/5 py-8 text-center text-xs text-zinc-600">
        © {new Date().getFullYear()} Cheer Metrics · Ecuador
      </footer>
    </div>
  );
}
