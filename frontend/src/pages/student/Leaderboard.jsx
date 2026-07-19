import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectUser } from '@/store/slices/authSlice';
import { analyticsAPI } from '@/api/analytics';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Flame, Star, TrendingUp, Medal } from 'lucide-react';

const SORT_OPTIONS = [
  { value: 'xp', label: 'XP Points', icon: Star },
  { value: 'streak', label: 'Streak', icon: Flame },
  { value: 'score', label: 'Avg Score', icon: TrendingUp },
];

const RANK_STYLES = {
  1: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300',
  2: 'bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800/50 dark:text-zinc-300',
  3: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300',
};

export default function Leaderboard() {
  const user = useSelector(selectUser);
  const [sortBy, setSortBy] = useState('xp');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    analyticsAPI.getLeaderboard({ sort: sortBy, limit: 20 })
      .then((res) => setData(res.data.leaderboard || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sortBy]);

  const myRank = data.find(e => e.user_id === user?.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <p className="text-muted-foreground">See how you rank among your peers</p>
      </div>

      {/* My rank card */}
      {myRank && (
        <Card className="card-shadow border-0 bg-primary/5 border-primary/20">
          <CardContent className="pt-4 pb-3 px-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
              #{myRank.rank}
            </div>
            <div className="flex-1">
              <p className="font-semibold">Your Rank</p>
              <p className="text-sm text-muted-foreground">
                {myRank.xp_points} XP &middot; Level {myRank.level} &middot; {myRank.streak_days}-day streak
              </p>
            </div>
            <Badge className="bg-primary/10 text-primary border-primary/20">
              {myRank.average_score}% avg
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Sort tabs */}
      <div className="flex gap-2">
        {SORT_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setSortBy(opt.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              sortBy === opt.value
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
            }`}
          >
            <opt.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        ))}
      </div>

      {/* Leaderboard list */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No leaderboard data yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {data.map((entry) => {
            const isMe = entry.user_id === user?.id;
            const rankStyle = RANK_STYLES[entry.rank];
            return (
              <Card
                key={entry.user_id}
                className={`card-shadow border-0 transition-all ${
                  isMe ? 'ring-2 ring-primary/30 bg-primary/5' : ''
                }`}
              >
                <CardContent className="py-3 px-4 flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center text-sm font-bold border ${
                    rankStyle || 'bg-muted text-muted-foreground'
                  }`}>
                    {entry.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm truncate ${isMe ? 'text-primary' : ''}`}>
                      {entry.full_name}
                      {isMe && <span className="text-xs ml-1 text-muted-foreground">(You)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Level {entry.level} &middot; {entry.total_exams} exam{entry.total_exams !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{sortBy === 'xp' ? `${entry.xp_points} XP` : sortBy === 'streak' ? `${entry.streak_days}d` : `${entry.average_score}%`}</p>
                    {sortBy === 'xp' && (
                      <p className="text-xs text-muted-foreground">{entry.average_score}% avg</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
