// Round History List Page
import { Link } from 'react-router';
import type { Route } from './+types/_layout.history';
import { PageContainer } from '~/components/layout/page-container';
import { Header } from '~/components/layout/header';
import { GolfIcon } from '~/components/ui/icons';
import { RoundCard } from '~/components/history/round-card';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

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
  companions: string[];
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
                  <RoundCard
                    key={round.id}
                    id={round.id}
                    courseName={round.course_name}
                    playDate={round.play_date}
                    teeTime={round.tee_time}
                    status={round.status}
                    companions={round.companions}
                    totalScore={round.total_score}
                    scoreToPar={round.score_to_par}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
