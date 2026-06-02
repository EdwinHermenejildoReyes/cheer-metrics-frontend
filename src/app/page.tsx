import Link from 'next/link';
import {
  Trophy, Users, Building2, ClipboardList,
  BarChart3, Shield, CheckCircle, ChevronRight,
  Star, Zap,
} from 'lucide-react';
import { HeroCarousel } from '@/components/landing/HeroCarousel';

// ── Navbar ────────────────────────────────────────────────────────────────────

function Navbar() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-orange-500 p-1.5">
            <Trophy className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-semibold text-white">Cheer Metrics</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/schedule" className="text-sm font-medium text-zinc-300 hover:text-white transition-colors">
            Calendario
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-orange-500 hover:bg-orange-600 transition-colors px-4 py-2 text-sm font-semibold text-white"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    </header>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative min-h-screen flex items-center bg-zinc-950 overflow-hidden">
      {/* Background carousel */}
      <HeroCarousel />

      <div className="relative z-20 max-w-6xl mx-auto px-6 pt-24 pb-20">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/50 bg-orange-500/20 backdrop-blur-sm px-4 py-1.5 text-xs font-semibold text-orange-300 mb-8">
            <Star className="w-3 h-3" />
            Plataforma oficial · Ecuador
          </div>

          <h1 className="text-5xl font-bold text-white leading-tight mb-6 drop-shadow-lg">
            La plataforma para{' '}
            <span className="bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">
              competencias de cheerleading
            </span>
          </h1>

          <p className="text-lg text-zinc-200 mb-10 max-w-2xl leading-relaxed drop-shadow">
            Gestión completa de competencias, planillas de puntuación digital,
            rankings en tiempo real y control de jueces. Todo en una sola plataforma.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 transition-colors px-6 py-3 text-sm font-semibold text-white"
            >
              Iniciar sesión
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 transition-colors px-6 py-3 text-sm font-semibold text-white"
            >
              Solicitar acceso
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Stats ─────────────────────────────────────────────────────────────────────

const STATS = [
  { value: '50+',  label: 'Competencias gestionadas' },
  { value: '500+', label: 'Atletas registrados' },
  { value: '20+',  label: 'Gimnasios afiliados' },
  { value: '100%', label: 'Resultados digitales' },
];

function Stats() {
  return (
    <section className="bg-zinc-900 py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent mb-2">
                {value}
              </p>
              <p className="text-sm text-zinc-400">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Features ──────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Trophy,
    color: '#F97316',
    title: 'Gestión de competencias',
    description:
      'Crea competencias, organiza divisiones por categoría y nivel, administra inscripciones y define el orden de actuación de cada equipo.',
  },
  {
    icon: ClipboardList,
    color: '#3B82F6',
    title: 'Planillas de puntuación',
    description:
      'Planillas digitales especializadas por tipo: Building, Tumbling, Overall y Partner Stunt. Cálculo automático de puntajes y deducciones.',
  },
  {
    icon: BarChart3,
    color: '#22C55E',
    title: 'Rankings en tiempo real',
    description:
      'Clasifica automáticamente equipos por división, con puntajes finales, porcentajes y desgloses detallados disponibles al instante.',
  },
];

function Features() {
  return (
    <section className="bg-white py-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-1.5 text-xs font-semibold text-orange-600 mb-5">
            Lo que ofrecemos
          </div>
          <h2 className="text-3xl font-bold text-zinc-900">
            Todo lo que necesitas para{' '}
            <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              gestionar
            </span>{' '}
            tus competencias
          </h2>
          <p className="text-zinc-500 mt-3 max-w-xl mx-auto">
            Desde la inscripción de equipos hasta la publicación de resultados, cubrimos cada etapa del evento.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, color, title, description }) => (
            <div
              key={title}
              className="rounded-2xl border border-zinc-100 bg-white p-6 hover:shadow-lg transition-shadow group"
            >
              <div
                className="rounded-xl p-3 w-fit mb-5 transition-transform group-hover:scale-110"
                style={{ backgroundColor: color }}
              >
                <Icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-base font-semibold text-zinc-900 mb-2">{title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Why us ────────────────────────────────────────────────────────────────────

const WHY_ITEMS = [
  { icon: Shield,       title: 'Control de acceso',        desc: 'Jueces con acceso limitado al tiempo del evento. Sin accesos no autorizados.' },
  { icon: Zap,          title: 'Resultados instantáneos',  desc: 'Los puntajes se calculan en tiempo real. Sin hojas de cálculo manuales.' },
  { icon: Users,        title: 'Multi-juez',               desc: 'Soporte para múltiples jueces por planilla, promediando criterios cruzados.' },
  { icon: CheckCircle,  title: 'Regulación UCA Ecuador',   desc: 'Configurado conforme al reglamento UCA Ecuador 2025 vigente.' },
];

function WhyUs() {
  return (
    <section className="bg-zinc-900 py-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-xs font-semibold text-orange-400 mb-6">
              Por qué elegirnos
            </div>
            <h2 className="text-3xl font-bold text-white leading-snug mb-4">
              Precisión y control{' '}
              <span className="bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">
                en cada competencia
              </span>
            </h2>
            <p className="text-zinc-400 leading-relaxed mb-8">
              Diseñada específicamente para cheerleading competitivo en Ecuador.
              Elimina el papel, reduce errores y entrega resultados confiables a jueces, entrenadores y atletas.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 transition-colors px-6 py-3 text-sm font-semibold text-white"
            >
              Solicitar acceso
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {WHY_ITEMS.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors p-5"
              >
                <Icon className="h-6 w-6 text-orange-400 mb-3" />
                <h4 className="text-sm font-semibold text-white mb-1">{title}</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── CTA ───────────────────────────────────────────────────────────────────────

function CTA() {
  return (
    <section className="relative bg-zinc-950 py-20 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="w-[600px] h-[600px] rounded-full bg-orange-500/10 blur-3xl" />
      </div>
      <div className="relative max-w-2xl mx-auto px-6 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">
          ¿Listo para digitalizar tus competencias?
        </h2>
        <p className="text-zinc-400 mb-8">
          Únete a las organizaciones que ya gestionan sus eventos con Cheer Metrics.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 transition-colors px-6 py-3 text-sm font-semibold text-white"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 transition-colors px-6 py-3 text-sm font-semibold text-white"
          >
            Solicitar acceso
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="bg-zinc-950 border-t border-white/5 py-10">
      <div className="max-w-6xl mx-auto px-6 flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-orange-500 p-1.5">
            <Trophy className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-white">Cheer Metrics</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-zinc-500">
          <Link href="/schedule" className="hover:text-white transition-colors">Calendario</Link>
          <Link href="/login"    className="hover:text-white transition-colors">Iniciar sesión</Link>
          <Link href="/register" className="hover:text-white transition-colors">Registrarse</Link>
        </div>
        <p className="text-xs text-zinc-600">© {new Date().getFullYear()} Cheer Metrics. Ecuador.</p>
      </div>
    </footer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <Hero />
      <Stats />
      <Features />
      <WhyUs />
      <CTA />
      <Footer />
    </>
  );
}
