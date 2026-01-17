// Par Input Component for each hole
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';
import type { HoleInfo } from '~/types';

interface ParInputProps {
  holes: HoleInfo[];
  onChange: (holes: HoleInfo[]) => void;
}

export function ParInput({ holes, onChange }: ParInputProps) {
  const handleParChange = (holeIndex: number, newPar: 3 | 4 | 5) => {
    const updated = [...holes];
    updated[holeIndex] = { ...updated[holeIndex], par: newPar };
    onChange(updated);
  };

  const outHoles = holes.filter((h) => h.hole <= 9);
  const inHoles = holes.filter((h) => h.hole > 9);

  const outPar = outHoles.reduce((sum, h) => sum + h.par, 0);
  const inPar = inHoles.reduce((sum, h) => sum + h.par, 0);
  const totalPar = outPar + inPar;

  return (
    <div className="space-y-6">
      {/* 전반 (OUT) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">전반 (OUT)</h3>
          <span className="text-sm text-muted-foreground">Par {outPar}</span>
        </div>
        <div className="grid grid-cols-9 gap-1">
          {outHoles.map((hole, i) => (
            <div key={hole.hole} className="flex flex-col items-center gap-1">
              <span className="text-xs text-muted-foreground">{hole.hole}</span>
              <div className="flex flex-col gap-0.5">
                {([3, 4, 5] as const).map((par) => (
                  <button
                    key={par}
                    type="button"
                    onClick={() => handleParChange(i, par)}
                    className={cn(
                      'w-7 h-7 text-xs rounded transition-colors',
                      hole.par === par
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    )}
                  >
                    {par}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 후반 (IN) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">후반 (IN)</h3>
          <span className="text-sm text-muted-foreground">Par {inPar}</span>
        </div>
        <div className="grid grid-cols-9 gap-1">
          {inHoles.map((hole, i) => (
            <div key={hole.hole} className="flex flex-col items-center gap-1">
              <span className="text-xs text-muted-foreground">{hole.hole}</span>
              <div className="flex flex-col gap-0.5">
                {([3, 4, 5] as const).map((par) => (
                  <button
                    key={par}
                    type="button"
                    onClick={() => handleParChange(i + 9, par)}
                    className={cn(
                      'w-7 h-7 text-xs rounded transition-colors',
                      hole.par === par
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    )}
                  >
                    {par}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 총 Par */}
      <div className="flex justify-end">
        <span className="text-sm font-medium">
          Total Par: <span className="text-primary">{totalPar}</span>
        </span>
      </div>
    </div>
  );
}
