'use client';

import { useBranding } from '@/contexts/BrandingContext';

export function BrandingBar() {
  const { organization } = useBranding();
  if (!organization) return null;

  return (
    <div
      className="flex items-center gap-3 px-5 py-2 text-sm font-semibold shrink-0"
      style={{ backgroundColor: organization.primary_color, color: organization.text_on_primary }}
    >
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
