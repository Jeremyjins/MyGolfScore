// Score Table Component - Shows 9 holes for all players
import { cn } from '~/lib/utils';
import type { HoleInfo, PlayerScore } from '~/types';

interface ScoreTableProps {
  holes: HoleInfo[];
  players: PlayerScore[];
  onCellClick: (playerId: string, holeNumber: number) => void;
  isFirstNine: boolean;
}

export function ScoreTable({
  holes,
  players,
  onCellClick,
  isFirstNine,
}: ScoreTableProps) {
  const displayHoles = isFirstNine
    ? holes.filter((h) => h.hole <= 9)
    : holes.filter((h) => h.hole > 9);

  const getScoreStyle = (score: number | null, par: number) => {
    if (score === null) return '';
    const diff = score - par;
    if (diff <= -2) return 'bg-yellow-100 text-yellow-800 font-bold'; // Eagle+
    if (diff === -1) return 'bg-red-100 text-red-700 font-bold'; // Birdie
    if (diff === 0) return 'bg-green-100 text-green-700'; // Par
    if (diff === 1) return 'bg-blue-100 text-blue-700'; // Bogey
    if (diff === 2) return 'bg-blue-200 text-blue-800'; // Double
    return 'bg-blue-300 text-blue-900'; // Triple+
  };

  const calculateNineTotal = (player: PlayerScore) => {
    return displayHoles.reduce((sum, hole) => {
      const score = player.scores[hole.hole];
      return sum + (score ?? 0);
    }, 0);
  };

  const calculateNinePar = () => {
    return displayHoles.reduce((sum, hole) => sum + hole.par, 0);
  };

  const ninePar = calculateNinePar();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2 px-1 text-left font-medium text-muted-foreground w-20">
              홀
            </th>
            {displayHoles.map((hole) => (
              <th
                key={hole.hole}
                className="py-2 px-1 text-center font-medium w-9"
              >
                {hole.hole}
              </th>
            ))}
            <th className="py-2 px-1 text-center font-medium w-12 bg-muted/50">
              합계
            </th>
          </tr>
          <tr className="border-b bg-muted/30">
            <td className="py-1 px-1 text-xs text-muted-foreground">Par</td>
            {displayHoles.map((hole) => (
              <td
                key={hole.hole}
                className="py-1 px-1 text-center text-xs text-muted-foreground"
              >
                {hole.par}
              </td>
            ))}
            <td className="py-1 px-1 text-center text-xs text-muted-foreground bg-muted/50">
              {ninePar}
            </td>
          </tr>
        </thead>
        <tbody>
          {players.map((player, index) => {
            const nineTotal = calculateNineTotal(player);
            const hasScores = displayHoles.some(
              (h) => player.scores[h.hole] !== undefined
            );

            return (
              <tr key={player.id} className="border-b">
                <td className="py-2 px-1">
                  <div className="flex items-center gap-1">
                    <span
                      className={cn(
                        'w-5 h-5 rounded-full flex items-center justify-center text-xs text-white',
                        index === 0
                          ? 'bg-primary'
                          : index === 1
                          ? 'bg-orange-500'
                          : index === 2
                          ? 'bg-purple-500'
                          : 'bg-teal-500'
                      )}
                    >
                      {player.name.charAt(0)}
                    </span>
                    <span className="text-xs truncate max-w-14">
                      {player.name}
                    </span>
                  </div>
                </td>
                {displayHoles.map((hole) => {
                  const score = player.scores[hole.hole];
                  return (
                    <td
                      key={hole.hole}
                      onClick={() => onCellClick(player.id, hole.hole)}
                      className={cn(
                        'py-2 px-1 text-center cursor-pointer transition-colors hover:bg-accent',
                        getScoreStyle(score ?? null, hole.par)
                      )}
                    >
                      {score ?? '-'}
                    </td>
                  );
                })}
                <td
                  className={cn(
                    'py-2 px-1 text-center font-medium bg-muted/50',
                    hasScores && nineTotal - ninePar > 0
                      ? 'text-blue-600'
                      : hasScores && nineTotal - ninePar < 0
                      ? 'text-red-600'
                      : ''
                  )}
                >
                  {hasScores ? nineTotal : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
