import { useSelector } from 'react-redux';
import type { RootState } from '@/core/rootReducer';
import type { SheetType } from '@/types/competitions';

// Roles combinados: un juez con el tipo compuesto puede ver todas las planillas del array.
const COMPOUND_SHEET_MAP: Partial<Record<SheetType, SheetType[]>> = {
  building_combined:   ['building_difficulty', 'building_execution'],
  tumbling_combined:   ['tumbling_difficulty',  'tumbling_execution'],
  deductions_combined: ['deductions_only',       'safety_rules'],
};

export function useJudge() {
  const user = useSelector((s: RootState) => s.auth.user);
  const assignments = user?.judge_assignments ?? [];
  const isAdmin = user?.is_staff ?? false;
  const isJudge = !isAdmin && user?.role === 'judge';

  const myCompetitionIds = [...new Set(assignments.map((a) => a.competition))];

  const sheetTypesForCompetition = (competitionId: number): SheetType[] =>
    assignments
      .filter((a) => a.competition === competitionId)
      .map((a) => a.sheet_type);

  /**
   * True when the judge has at least one assignment with an active access window.
   * Mirrors backend `_is_judge_access_active`: for legacy assignments (null/null dates)
   * falls back to `competition_is_active` (competition date check).
   */
  const _isAssignmentActive = (a: (typeof assignments)[0]): boolean => {
    if (!a.access_from && !a.access_until) return a.competition_is_active;
    return a.is_access_active;
  };

  const isCompetitionActive = (competitionId: number): boolean =>
    assignments.some((a) => a.competition === competitionId && _isAssignmentActive(a));

  const canViewSheet = (competitionId: number, sheetType: SheetType): boolean => {
    if (!isJudge) return true;
    return assignments.some((a) => {
      if (a.competition !== competitionId || !_isAssignmentActive(a)) return false;
      // Exact match
      if (a.sheet_type === sheetType) return true;
      // Compound role: check if it expands to include the requested sheetType
      const expanded = COMPOUND_SHEET_MAP[a.sheet_type as SheetType];
      return expanded?.includes(sheetType) ?? false;
    });
  };

  const canViewCompetition = (competitionId: number): boolean => {
    if (!isJudge) return true;
    return myCompetitionIds.includes(competitionId);
  };

  /** True when the judge has at least one assignment covering this division (empty divisions = all). */
  const canViewDivision = (competitionId: number, divisionId: number): boolean => {
    if (!isJudge) return true;
    return assignments.some((a) => {
      if (a.competition !== competitionId) return false;
      if (!a.divisions || a.divisions.length === 0) return true;
      return a.divisions.includes(divisionId);
    });
  };

  /**
   * True when the judge has an active assignment for `sheetType` (or a compound role that expands
   * to include it) AND that specific assignment covers `divisionId`.
   * Use this for per-sheet-type button visibility inside a division page instead of combining
   * canViewSheet + canViewDivision (which would leak sheet types from other-division assignments).
   */
  const canViewSheetForDivision = (competitionId: number, divisionId: number, sheetType: SheetType): boolean => {
    if (!isJudge) return true;
    return assignments.some((a) => {
      if (a.competition !== competitionId || !_isAssignmentActive(a)) return false;
      let matchesSheet = a.sheet_type === sheetType;
      if (!matchesSheet) {
        const expanded = COMPOUND_SHEET_MAP[a.sheet_type as SheetType];
        matchesSheet = expanded?.includes(sheetType) ?? false;
      }
      if (!matchesSheet) return false;
      if (!a.divisions || a.divisions.length === 0) return true;
      return a.divisions.includes(divisionId);
    });
  };

  return {
    isAdmin,
    isJudge,
    assignments,
    myCompetitionIds,
    isCompetitionActive,
    sheetTypesForCompetition,
    canViewSheet,
    canViewCompetition,
    canViewDivision,
    canViewSheetForDivision,
  };
}
