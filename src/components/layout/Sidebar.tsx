'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Trophy, Building2, Users, LogOut, Landmark, UserCog, User as UserIcon, ClipboardList, LayoutDashboard, ImageIcon, Settings, Receipt, Monitor, Upload, Link2 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';
import { clearAuth } from '@/store/auth/slices';
import type { RootState } from '@/core/rootReducer';
import authRepository from '@/repositories/authRepository';
import { useJudge } from '@/hooks/useJudge';

const ADMIN_NAV = [
  { href: '/home',          label: 'Inicio',         icon: LayoutDashboard },
  { href: '/competitions',  label: 'Competencias',   icon: Trophy },
  { href: '/billing',       label: 'Facturación',    icon: Receipt },
  { href: '/athletes',      label: 'Atletas',        icon: Users },
  { href: '/gyms',          label: 'Gimnasios',      icon: Building2 },
  { href: '/organizations', label: 'Organizaciones', icon: Landmark },
  { href: '/users',         label: 'Usuarios',       icon: UserCog },
];

const SETTINGS_NAV = [
  { href: '/hero-images',       label: 'Carrusel',        icon: ImageIcon },
  { href: '/settings/branding', label: 'Paleta de colores', icon: Settings },
];

const JUDGE_NAV = [
  { href: '/assignments',  label: 'Mis asignaciones', icon: ClipboardList },
  { href: '/competitions', label: 'Competencias',     icon: Trophy },
];

const ADMIN_COMPETITION_SUBNAV = [
  { slug: 'backstage', label: 'Backstage',       icon: Monitor },
  { slug: 'import',    label: 'Importar',         icon: Upload },
  { slug: 'billing',   label: 'Facturación',      icon: Receipt },
  { slug: 'tokens',    label: 'Links inscripción', icon: Link2 },
];

const JUDGE_COMPETITION_SUBNAV = [
  { slug: 'backstage', label: 'Backstage', icon: Monitor },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.auth.user);
  const { isJudge, isAdmin } = useJudge();
  const nav         = isJudge ? JUDGE_NAV : ADMIN_NAV;
  const settingsNav = isAdmin ? SETTINGS_NAV : [];

  const competitionIdMatch = pathname.match(/^\/competitions\/(\d+)/);
  const activeCompetitionId = competitionIdMatch ? competitionIdMatch[1] : null;
  const competitionSubNav   = activeCompetitionId
    ? (isJudge ? JUDGE_COMPETITION_SUBNAV : ADMIN_COMPETITION_SUBNAV)
    : [];

  const handleLogout = async () => {
    try {
      await authRepository.logout();
    } catch {
      // Cookies get cleared by backend regardless
    }
    dispatch(clearAuth());
    router.replace('/login');
    toast.success('Sesión cerrada');
  };

  const navLink = (href: string, label: string, Icon: React.ElementType) => {
    const active = href === '/home'
      ? pathname === '/home'
      : pathname === href || pathname.startsWith(href + '/');
    const activeStyle = active
      ? {
          backgroundColor: 'var(--plt-primary)',
          color: 'var(--plt-primary-fg)',
        }
      : undefined;
    return (
      <Link
        key={href}
        href={href}
        style={activeStyle}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          !active ? 'text-plt-muted hover:bg-plt-surface hover:text-plt-text' : '',
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {label}
      </Link>
    );
  };

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-plt-border bg-plt-bg">
      <div className="flex h-16 items-center border-b border-plt-border px-5">
        <span className="text-base font-semibold tracking-tight text-plt-text">Cheer Metrics</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {nav.map(({ href, label, icon: Icon }) => (
          <div key={href}>
            {navLink(href, label, Icon)}
            {href === '/competitions' && competitionSubNav.length > 0 && (
              <div className="ml-3 mt-0.5 flex flex-col gap-0.5 border-l border-plt-border pl-3">
                {competitionSubNav.map(({ slug, label: subLabel, icon: SubIcon }) => {
                  const subHref = `/competitions/${activeCompetitionId}/${slug}`;
                  const active  = pathname === subHref || pathname.startsWith(subHref + '/');
                  const activeStyle = active
                    ? { backgroundColor: 'var(--plt-primary)', color: 'var(--plt-primary-fg)' }
                    : undefined;
                  return (
                    <Link
                      key={slug}
                      href={subHref}
                      style={activeStyle}
                      className={cn(
                        'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
                        !active ? 'text-plt-muted hover:bg-plt-surface hover:text-plt-text' : '',
                      )}
                    >
                      <SubIcon className="h-3.5 w-3.5 shrink-0" />
                      {subLabel}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {settingsNav.length > 0 && (
          <>
            <div className="my-1 border-t border-plt-border" />
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-plt-muted">
              Configuración
            </p>
            {settingsNav.map(({ href, label, icon: Icon }) => navLink(href, label, Icon))}
          </>
        )}
      </nav>

      {/* User + logout */}
      <div className="border-t border-plt-border p-3 flex flex-col gap-1">
        <Link
          href="/profile"
          className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-plt-surface transition-colors group"
        >
          {user?.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar} alt="" className="h-6 w-6 rounded-full object-cover shrink-0" />
          ) : (
            <div className="h-6 w-6 rounded-full bg-plt-surface border border-plt-border flex items-center justify-center shrink-0">
              <UserIcon className="h-3.5 w-3.5 text-plt-muted" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-plt-text group-hover:text-plt-text" title={user?.email}>
              {user?.first_name ? `${user.first_name} ${user.last_name}`.trim() : user?.email}
            </p>
            <p className="text-[10px] text-plt-muted">Ver perfil</p>
          </div>
        </Link>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-plt-muted hover:bg-plt-surface hover:text-plt-text transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
