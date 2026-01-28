// Vertical Score Table Component - Shows holes vertically, players horizontally
import { cn } from '~/lib/utils';
import type { HoleInfo, PlayerScore } from '~/types';

export type ScoreDisplayMode = 'stroke' | 'par';

interface VerticalScoreTableProps {
  holes: HoleInfo[];
  players: PlayerScore[];
  onCellClick: (playerId: string, holeNumber: number) => void;
  isFirstNine: boolean;
  scoreDisplayMode: ScoreDisplayMode;
}

export function VerticalScoreTable({
  holes,
  players,
  onCellClick,
  isFirstNine,
  scoreDisplayMode,
}: VerticalScoreTableProps) {
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

  const formatScore = (score: number | null, par: number): string => {
    if (score === null) return '-';
    if (scoreDisplayMode === 'stroke') {
      return String(score);
    }
    // Par mode: show relative to par
    const diff = score - par;
    if (diff === 0) return '0';
    if (diff > 0) return `+${diff}`;
    return String(diff);
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

  // 플레이한 홀의 파만 계산
  const calculatePlayedPar = (player: PlayerScore) => {
    return displayHoles
      .filter((hole) => player.scores[hole.hole] !== undefined)
      .reduce((sum, hole) => sum + hole.par, 0);
  };

  const calculateTotalPar = () => {
    return holes.reduce((sum, hole) => sum + hole.par, 0);
  };

  const ninePar = calculateNinePar();

  const getPlayerColor = (index: number) => {
    const colors = ['bg-primary', 'bg-orange-500', 'bg-purple-500', 'bg-teal-500'];
    return colors[index] || 'bg-gray-500';
  };

  const formatTotalScore = (total: number, par: number, hasScores: boolean): string => {
    if (!hasScores) return '-';
    if (scoreDisplayMode === 'stroke') {
      return String(total);
    }
    const diff = total - par;
    if (diff === 0) return '0';
    if (diff > 0) return `+${diff}`;
    return String(diff);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="py-2 px-2 text-center font-medium text-muted-foreground w-12">
              홀
            </th>
            <th className="py-2 px-2 text-center font-medium text-muted-foreground w-10">
              파
            </th>
            {players.map((player, index) => (
              <th key={player.id} className="py-2 px-2 text-center min-w-16">
                <div className="flex flex-col items-center gap-0.5">
                  <span
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs text-white',
                      getPlayerColor(index)
                    )}
                  >
                    {player.name.charAt(0)}
                  </span>
                  <span className="text-xs truncate max-w-16 font-medium">
                    {player.name}
                  </span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayHoles.map((hole) => (
            <tr key={hole.hole} className="border-b">
              <td className="py-2.5 px-2 text-center font-medium">
                {hole.hole}
              </td>
              <td className="py-2.5 px-2 text-center text-muted-foreground">
                {hole.par}
              </td>
              {players.map((player) => {
                const score = player.scores[hole.hole] ?? null;
                return (
                  <td
                    key={`${player.id}-${hole.hole}`}
                    onClick={() => onCellClick(player.id, hole.hole)}
                    className={cn(
                      'py-2.5 px-2 text-center cursor-pointer transition-colors hover:bg-accent',
                      getScoreStyle(score, hole.par)
                    )}
                  >
                    {formatScore(score, hole.par)}
                  </td>
                );
              })}
            </tr>
          ))}
          {/* Nine Total Row */}
          <tr className="border-b bg-muted/50 font-medium">
            <td className="py-2.5 px-2 text-center">
              {isFirstNine ? 'OUT' : 'IN'}
            </td>
            <td className="py-2.5 px-2 text-center text-muted-foreground">
              {ninePar}
            </td>
            {players.map((player) => {
              const nineTotal = calculateNineTotal(player);
              const playedPar = calculatePlayedPar(player);
              const hasScores = displayHoles.some(
                (h) => player.scores[h.hole] !== undefined
              );
              const diff = nineTotal - playedPar;

              return (
                <td
                  key={`${player.id}-nine`}
                  className={cn(
                    'py-2.5 px-2 text-center',
                    hasScores && diff > 0 && 'text-blue-600',
                    hasScores && diff < 0 && 'text-red-600',
                    hasScores && diff === 0 && 'text-green-600'
                  )}
                >
                  {formatTotalScore(nineTotal, playedPar, hasScores)}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
