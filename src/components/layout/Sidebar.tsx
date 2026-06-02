'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Trophy, Building2, Users, LogOut, Landmark, UserCog, User as UserIcon, ClipboardList, LayoutDashboard, ImageIcon } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';
import { clearAuth } from '@/store/auth/slices';
import type { RootState } from '@/core/rootReducer';
import authRepository from '@/repositories/authRepository';
import { useBranding } from '@/contexts/BrandingContext';
import { useJudge } from '@/hooks/useJudge';

const ADMIN_NAV = [
  { href: '/home',          label: 'Inicio',          icon: LayoutDashboard },
  { href: '/competitions',  label: 'Competencias',    icon: Trophy },
  { href: '/organizations', label: 'Organizaciones',  icon: Landmark },
  { href: '/athletes',      label: 'Atletas',         icon: Users },
  { href: '/gyms',          label: 'Gimnasios',       icon: Building2 },
  { href: '/users',         label: 'Usuarios',        icon: UserCog },
  { href: '/hero-images',   label: 'Carrusel',        icon: ImageIcon },
];

const JUDGE_NAV = [
  { href: '/assignments',  label: 'Mis asignaciones', icon: ClipboardList },
  { href: '/competitions', label: 'Competencias',      icon: Trophy },
];

const COMMON_NAV = [
  { href: '/profile', label: 'Mi perfil', icon: UserIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.auth.user);
  const { organization } = useBranding();
  const { isJudge } = useJudge();
  const nav = [...(isJudge ? JUDGE_NAV : ADMIN_NAV), ...COMMON_NAV];

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

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-zinc-200 bg-white">
      <div className="flex h-16 items-center border-b border-zinc-200 px-5">
        <span className="text-base font-semibold tracking-tight text-zinc-900">Cheer Metrics</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === '/home' ? pathname === '/home' : pathname === href || pathname.startsWith(href + '/');
          const activeStyle = active && organization
            ? { backgroundColor: organization.primary_color, color: organization.text_on_primary }
            : undefined;
          return (
            <Link
              key={href}
              href={href}
              style={activeStyle}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active && !organization
                  ? 'bg-zinc-900 text-white'
                  : !active
                  ? 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                  : '',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User + logout */}
      <div className="border-t border-zinc-200 p-3 flex flex-col gap-1">
        <Link
          href="/profile"
          className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-zinc-100 transition-colors group"
        >
          {user?.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar} alt="" className="h-6 w-6 rounded-full object-cover shrink-0" />
          ) : (
            <div className="h-6 w-6 rounded-full bg-zinc-200 flex items-center justify-center shrink-0">
              <UserIcon className="h-3.5 w-3.5 text-zinc-500" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-zinc-700 group-hover:text-zinc-900" title={user?.email}>
              {user?.first_name ? `${user.first_name} ${user.last_name}`.trim() : user?.email}
            </p>
            <p className="text-[10px] text-zinc-400">Ver perfil</p>
          </div>
        </Link>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
