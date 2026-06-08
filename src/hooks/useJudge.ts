import { useSelector } from 'react-redux';
import type { RootState } from '@/core/rootReducer';
import type { SheetType } from '@/types/competitions';

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

  /** True when the judge has at least one assignment with an active access window. */
  const isCompetitionActive = (competitionId: number): boolean =>
    assignments.some((a) => a.competition === competitionId && a.is_access_active);

  const canViewSheet = (competitionId: number, sheetType: SheetType): boolean => {
    if (!isJudge) return true;
    return assignments.some(
      (a) =>
        a.competition === competitionId &&
        a.sheet_type === sheetType &&
        a.is_access_active,
    );
  };

  const canViewCompetition = (competitionId: number): boolean => {
    if (!isJudge) return true;
    return myCompetitionIds.includes(competitionId);
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
  };
}
