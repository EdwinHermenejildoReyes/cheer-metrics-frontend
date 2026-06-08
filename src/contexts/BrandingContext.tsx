'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSelector } from 'react-redux';
import competitionsRepository from '@/repositories/competitionsRepository';
import type { Organization } from '@/types/competitions';
import type { RootState } from '@/core/rootReducer';

interface BrandingContextValue {
  organization: Organization | null;
}

const BrandingContext = createContext<BrandingContextValue>({ organization: null });

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname();
  const userOrgId = useSelector((s: RootState) => s.auth.user?.organization ?? null);

  const [competitionOrg, setCompetitionOrg] = useState<Organization | null>(null);
  const [userOrg,        setUserOrg]        = useState<Organization | null>(null);

  // Competition fetch cache (keyed by competition ID)
  const compCache = useRef<Map<number, Organization | null>>(new Map());
  // User-org fetch cache (keyed by org ID)
  const orgCache  = useRef<Map<number, Organization | null>>(new Map());
  const lastCompId = useRef<number | null>(null);

  // Competition org takes precedence; fall back to user's org
  const organization = competitionOrg ?? userOrg;

  // Apply / remove CSS brand variables whenever the resolved org changes
  useEffect(() => {
    const root = document.documentElement;
    if (organization) {
      root.style.setProperty('--brand-primary',      organization.primary_color);
      root.style.setProperty('--brand-primary-text', organization.text_on_primary);
      root.style.setProperty('--brand-secondary',    organization.secondary_color);
      root.style.setProperty('--brand-accent',       organization.accent_color);
    } else {
      root.style.removeProperty('--brand-primary');
      root.style.removeProperty('--brand-primary-text');
      root.style.removeProperty('--brand-secondary');
      root.style.removeProperty('--brand-accent');
    }
  }, [organization]);

  // Load competition org when navigating into a competition route
  useEffect(() => {
    const match  = pathname.match(/^\/competitions\/(\d+)/);
    const compId = match ? Number(match[1]) : null;

    if (compId === lastCompId.current) return;
    lastCompId.current = compId;

    if (!compId) {
      setCompetitionOrg(null);
      return;
    }

    if (compCache.current.has(compId)) {
      setCompetitionOrg(compCache.current.get(compId) ?? null);
      return;
    }

    competitionsRepository.getCompetition(compId)
      .then((res) => {
        const org = res.data.organization_detail ?? null;
        compCache.current.set(compId, org);
        setCompetitionOrg(org);
      })
      .catch(() => {
        compCache.current.set(compId, null);
        setCompetitionOrg(null);
      });
  }, [pathname]);

  // Load user's own org for global branding outside competition routes
  useEffect(() => {
    if (!userOrgId) {
      setUserOrg(null);
      return;
    }

    if (orgCache.current.has(userOrgId)) {
      setUserOrg(orgCache.current.get(userOrgId) ?? null);
      return;
    }

    competitionsRepository.getOrganization(userOrgId)
      .then((res) => {
        orgCache.current.set(userOrgId, res.data);
        setUserOrg(res.data);
      })
      .catch(() => {
        orgCache.current.set(userOrgId, null);
        setUserOrg(null);
      });
  }, [userOrgId]);

  return (
    <BrandingContext.Provider value={{ organization }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
