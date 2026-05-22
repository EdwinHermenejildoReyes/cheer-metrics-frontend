'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import competitionsRepository from '@/repositories/competitionsRepository';
import type { Organization } from '@/types/competitions';

interface BrandingContextValue {
  organization: Organization | null;
}

const BrandingContext = createContext<BrandingContextValue>({ organization: null });

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [organization, setOrganization] = useState<Organization | null>(null);
  // Cache fetched orgs to avoid redundant API calls within the same session
  const cache = useRef<Map<number, Organization | null>>(new Map());
  const lastCompId = useRef<number | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (organization) {
      root.style.setProperty('--brand-primary', organization.primary_color);
      root.style.setProperty('--brand-primary-text', organization.text_on_primary);
      root.style.setProperty('--brand-secondary', organization.secondary_color);
      root.style.setProperty('--brand-accent', organization.accent_color);
    } else {
      root.style.removeProperty('--brand-primary');
      root.style.removeProperty('--brand-primary-text');
      root.style.removeProperty('--brand-secondary');
      root.style.removeProperty('--brand-accent');
    }
  }, [organization]);

  useEffect(() => {
    const match = pathname.match(/^\/competitions\/(\d+)/);
    const compId = match ? Number(match[1]) : null;

    if (compId === lastCompId.current) return;
    lastCompId.current = compId;

    if (!compId) {
      setOrganization(null);
      return;
    }

    if (cache.current.has(compId)) {
      setOrganization(cache.current.get(compId) ?? null);
      return;
    }

    competitionsRepository.getCompetition(compId)
      .then((res) => {
        const org = res.data.organization_detail ?? null;
        cache.current.set(compId, org);
        setOrganization(org);
      })
      .catch(() => {
        cache.current.set(compId, null);
        setOrganization(null);
      });
  }, [pathname]);

  return (
    <BrandingContext.Provider value={{ organization }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
