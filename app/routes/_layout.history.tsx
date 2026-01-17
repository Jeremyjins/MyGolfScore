// Round History List Page
import { Link } from 'react-router';
import type { Route } from './+types/_layout.history';
import { PageContainer } from '~/components/layout/page-container';
import { Header } from '~/components/layout/header';
import { Card, CardContent } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { GolfIcon } from '~/components/ui/icons';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { formatScoreToPar } from '~/lib/score-utils';

export { loader } from '~/loaders/history.server';

interface RoundSummary {
  id: string;
  play_date: string;
  tee_time: string | null;
  status: string;
  course_name: string;
  total_score: number | null;
  score_to_par: number | null;
  player_count: number;
}

export default function HistoryPage({ loaderData }: Route.ComponentProps) {
  const { rounds } = loaderData as { rounds: RoundSummary[] };

  // 월별로 그룹핑
  const groupedRounds: Record<string, RoundSummary[]> = {};
  rounds.forEach((round) => {
    const monthKey = format(new Date(round.play_date), 'yyyy년 M월', {
      locale: ko,
    });
    if (!groupedRounds[monthKey]) {
      groupedRounds[monthKey] = [];
    }
    groupedRounds[monthKey].push(round);
  });

  return (
    <PageContainer>
      <Header title="라운드 기록" subtitle={`총 ${rounds.length}개의 라운드`} />

      {rounds.length === 0 ? (
        <div className="text-center py-12">
          <GolfIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">
            아직 기록된 라운드가 없습니다
          </p>
          <Link to="/round/new">
            <button className="text-primary hover:underline">
              첫 라운드 시작하기
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedRounds).map(([month, monthRounds]) => (
            <div key={month}>
              <h2 className="text-sm font-medium text-muted-foreground mb-2">
                {month}
              </h2>
              <div className="space-y-2">
                {monthRounds.map((round) => (
                  <Link key={round.id} to={`/history/${round.id}`}>
                    <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                      <CardContent className="flex items-center justify-between py-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{round.course_name}</p>
                            {round.status === 'in_progress' && (
                              <Badge variant="secondary" className="text-xs">
                                진행중
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(round.play_date), 'M월 d일 (E)', {
                              locale: ko,
                            })}
                            {round.tee_time && ` ${round.tee_time.slice(0, 5)}`}
                            {round.player_count > 1 &&
                              ` · ${round.player_count}명`}
                          </p>
                        </div>
                        {round.total_score !== null && (
                          <div className="text-right">
                            <p className="text-xl font-bold">
                              {round.total_score}
                            </p>
                            <p
                              className={
                                (round.score_to_par ?? 0) > 0
                                  ? 'text-sm text-blue-600'
                                  : (round.score_to_par ?? 0) < 0
                                  ? 'text-sm text-red-600'
                                  : 'text-sm text-green-600'
                              }
                            >
                              {formatScoreToPar(round.score_to_par ?? 0)}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
