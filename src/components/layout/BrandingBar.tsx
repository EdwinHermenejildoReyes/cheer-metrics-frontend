'use client';

import { Menu } from 'lucide-react';
import { useBranding } from '@/contexts/BrandingContext';

export function BrandingBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { organization } = useBranding();

  const bgColor   = organization?.primary_color   ?? '#18181b';
  const textColor = organization?.text_on_primary ?? '#ffffff';

  return (
    <div
      className="flex items-center gap-3 px-4 py-2 text-sm font-semibold shrink-0"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <button
        onClick={onMenuClick}
        className="md:hidden -ml-1 rounded p-1 opacity-80 hover:opacity-100 transition-opacity"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>
      {organization?.logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={organization.logo}
          alt={organization.name}
          className="h-7 w-auto object-contain"
        />
      )}
      {organization && <span>{organization.name}</span>}
    </div>
  );
}
