// Club Display Component - 홀별 클럽 순서 표시
import type { HoleClubData } from '~/types';
import { formatScoreToPar } from '~/lib/score-utils';
import { cn } from '~/lib/utils';

interface ClubDisplayProps {
  holeClubs: HoleClubData[];
  holes: { hole: number; par: number }[];
}

export function ClubDisplay({ holeClubs, holes }: ClubDisplayProps) {
  // 클럽 데이터가 있는 홀만 필터링
  const holesWithClubs = holeClubs.filter((h) => h.clubs && h.clubs.length > 0);

  if (holesWithClubs.length === 0) {
    return null;
  }

  const getScoreColor = (strokes: number, par: number) => {
    const diff = strokes - par;
    if (diff <= -2) return 'text-yellow-600';
    if (diff === -1) return 'text-red-500';
    if (diff === 0) return 'text-green-600';
    if (diff === 1) return 'text-blue-500';
    return 'text-blue-700';
  };

  return (
    <div className="space-y-2">
      {holesWithClubs.map((holeData) => {
        const hole = holes.find((h) => h.hole === holeData.hole_number);
        const par = hole?.par ?? 4;
        const diff = holeData.strokes - par;

        return (
          <div
            key={holeData.hole_number}
            className="flex items-center gap-3 py-2 border-b last:border-b-0"
          >
            {/* 홀 번호 */}
            <div className="w-8 text-center">
              <span className="text-sm font-medium">{holeData.hole_number}</span>
            </div>

            {/* 클럽 순서 */}
            <div className="flex-1 flex flex-wrap items-center gap-1">
              {holeData.clubs?.map((club, index) => (
                <span key={index} className="inline-flex items-center gap-0.5">
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded text-xs font-medium',
                      club.isPutt
                        ? 'bg-green-100 text-green-700'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {club.clubCode}
                  </span>
                  {index < (holeData.clubs?.length ?? 0) - 1 && (
                    <span className="text-muted-foreground text-xs">→</span>
                  )}
                </span>
              ))}
            </div>

            {/* 스코어 */}
            <div className={cn('w-10 text-center font-medium', getScoreColor(holeData.strokes, par))}>
              {formatScoreToPar(diff)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
