'use client';

import { Menu } from 'lucide-react';
import { useBranding } from '@/contexts/BrandingContext';

export function BrandingBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { organization } = useBranding();
  if (!organization) return null;

  return (
    <div
      className="flex items-center gap-3 px-4 py-2 text-sm font-semibold shrink-0"
      style={{ backgroundColor: organization.primary_color, color: organization.text_on_primary }}
    >
      <button
        onClick={onMenuClick}
        className="md:hidden -ml-1 rounded p-1 opacity-80 hover:opacity-100 transition-opacity"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>
      {organization.logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={organization.logo}
          alt={organization.name}
          className="h-7 w-auto object-contain"
        />
      )}
      <span>{organization.name}</span>
    </div>
  );
}
