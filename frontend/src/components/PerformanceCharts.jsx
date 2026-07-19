import { useState, useEffect } from 'react';
import { analyticsAPI } from '@/api/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer as RadarContainer } from 'recharts';
import { LineChart, Line, XAxis as LineXAxis, YAxis as LineYAxis, CartesianGrid as LineGrid, Tooltip as LineTooltip, ResponsiveContainer as LineContainer } from 'recharts';
import { BarChart3, Target, TrendingUp } from 'lucide-react';

const CHART_COLORS = {
  primary: '#18181b',
  success: '#22c55e',
  danger: '#ef4444',
  muted: '#a1a1aa',
  blue: '#3b82f6',
  purple: '#8b5cf6',
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: {entry.value}{entry.name === 'Accuracy' || entry.name === 'accuracy' ? '%' : ''}
        </p>
      ))}
    </div>
  );
}

export default function PerformanceCharts() {
  const [weeklyData, setWeeklyData] = useState([]);
  const [topicData, setTopicData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsAPI.getDashboard().catch(() => ({ data: null })),
      analyticsAPI.getWeakTopics().catch(() => ({ data: { all_topics: [] } })),
    ]).then(([dashRes, topicRes]) => {
      // Build weekly performance from recent attempts
      const attempts = dashRes.data?.recent_attempts || [];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const weeklyMap = {};

      // Initialize last 7 days
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        weeklyMap[key] = {
          day: dayNames[d.getDay()],
          date: key,
          score: 0,
          exams: 0,
        };
      }

      attempts.forEach((a) => {
        if (a.date && weeklyMap[a.date]) {
          weeklyMap[a.date].score += Number(a.percentage);
          weeklyMap[a.date].exams += 1;
        }
      });

      const weekly = Object.values(weeklyMap).map((d) => ({
        ...d,
        score: d.exams > 0 ? Math.round(d.score / d.exams) : 0,
      }));
      setWeeklyData(weekly);

      // Build topic performance for radar chart
      const topics = topicRes.data?.all_topics || [];
      const radarTopics = topics.slice(0, 8).map((t) => ({
        topic: t.topic || 'General',
        accuracy: t.accuracy,
        fullMark: 100,
      }));
      setTopicData(radarTopics);

      // Build score trend from attempts (sorted by date)
      const sortedAttempts = [...attempts].sort((a, b) => a.date?.localeCompare(b.date));
      const trend = sortedAttempts.map((a) => ({
        date: a.date,
        score: Number(a.percentage),
        label: a.exam_title?.substring(0, 20) || '',
      }));
      setTrendData(trend);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-3 stagger-children">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="card-shadow border-0">
            <CardContent className="p-6">
              <div className="h-[250px] bg-muted/30 rounded-lg animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3 stagger-children">
      {/* Weekly Performance Bar Chart */}
      <Card className="card-shadow border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-500" />
            Weekly Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="score"
                  name="Score"
                  fill={CHART_COLORS.blue}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Strong/Weak Areas Radar Chart */}
      <Card className="card-shadow border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Target className="h-4 w-4 text-purple-500" />
            Topic Mastery
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            {topicData.length > 0 ? (
              <RadarContainer width="100%" height="100%">
                <RadarChart data={topicData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="var(--color-border)" />
                  <PolarAngleAxis
                    dataKey="topic"
                    tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                  />
                  <Radar
                    name="Accuracy"
                    dataKey="accuracy"
                    stroke={CHART_COLORS.purple}
                    fill={CHART_COLORS.purple}
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </RadarContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                No topic data yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Score Trend Line Chart */}
      <Card className="card-shadow border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            Score Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            {trendData.length > 0 ? (
              <LineContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
                  <LineGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <LineXAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <LineYAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <LineTooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="score"
                    name="Score"
                    stroke={CHART_COLORS.success}
                    strokeWidth={2}
                    dot={{ r: 4, fill: CHART_COLORS.success }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </LineContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                No score data yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
