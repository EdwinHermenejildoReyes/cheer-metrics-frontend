import { useSelector } from 'react-redux';
import type { RootState } from '@/core/rootReducer';
import type { SheetType } from '@/types/competitions';

export function useJudge() {
  const user = useSelector((s: RootState) => s.auth.user);
  const assignments = user?.judge_assignments ?? [];
  const isAdmin = user?.is_staff ?? false;
  // A user with no assignments and not staff can still see everything (legacy/setup users)
  const isJudge = !isAdmin && assignments.length > 0;

  const myCompetitionIds = [...new Set(assignments.map((a) => a.competition))];

  const sheetTypesForCompetition = (competitionId: number): SheetType[] =>
    assignments
      .filter((a) => a.competition === competitionId)
      .map((a) => a.sheet_type);

  const canViewSheet = (competitionId: number, sheetType: SheetType): boolean => {
    if (!isJudge) return true;
    return assignments.some(
      (a) => a.competition === competitionId && a.sheet_type === sheetType,
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
    sheetTypesForCompetition,
    canViewSheet,
    canViewCompetition,
  };
}
