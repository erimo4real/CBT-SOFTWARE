import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import { BarChart3, Target, PieChart as PieIcon } from 'lucide-react';

const COLORS = {
  correct: '#22c55e',
  incorrect: '#ef4444',
  ungraded: '#eab308',
  topics: ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#6366f1', '#84cc16', '#f43f5e'],
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color || entry.fill }}>
          {entry.name}: {entry.value}{entry.name?.includes('Rate') ? '%' : ''}
        </p>
      ))}
    </div>
  );
}

export default function ExamResultCharts({ questions }) {
  const chartData = useMemo(() => {
    if (!questions?.length) return null;

    // 1. By topic — accuracy per topic
    const topicMap = {};
    questions.forEach((q) => {
      const topic = q.topic || q.subject || 'General';
      if (!topicMap[topic]) topicMap[topic] = { total: 0, correct: 0 };
      topicMap[topic].total += 1;
      if (q.is_correct === true) topicMap[topic].correct += 1;
    });
    const topicData = Object.entries(topicMap).map(([topic, s]) => ({
      topic,
      total: s.total,
      correct: s.correct,
      incorrect: s.total - s.correct,
      accuracy: Math.round((s.correct / s.total) * 100),
    }));

    // 2. By question type — correct vs incorrect
    const typeMap = {};
    questions.forEach((q) => {
      const type = q.question_type || 'unknown';
      if (!typeMap[type]) typeMap[type] = { correct: 0, incorrect: 0, ungraded: 0 };
      if (q.is_correct === true) typeMap[type].correct += 1;
      else if (q.is_correct === false) typeMap[type].incorrect += 1;
      else typeMap[type].ungraded += 1;
    });
    const typeData = Object.entries(typeMap).map(([type, s]) => ({
      type: type.replace('_', ' '),
      Correct: s.correct,
      Incorrect: s.incorrect,
      Ungraded: s.ungraded,
    }));

    // 3. Difficulty breakdown — pie chart
    const diffMap = {};
    questions.forEach((q) => {
      const diff = q.difficulty || 'unknown';
      if (!diffMap[diff]) diffMap[diff] = { count: 0, correct: 0 };
      diffMap[diff].count += 1;
      if (q.is_correct === true) diffMap[diff].correct += 1;
    });
    const diffData = Object.entries(diffMap).map(([diff, s]) => ({
      name: diff.charAt(0).toUpperCase() + diff.slice(1),
      value: s.count,
      accuracy: Math.round((s.correct / s.count) * 100),
    }));

    // 4. Time analysis — avg time per question by correctness
    const timedCorrect = questions.filter((q) => q.is_correct === true && q.time_spent > 0);
    const timedIncorrect = questions.filter((q) => q.is_correct === false && q.time_spent > 0);
    const avgCorrect = timedCorrect.length > 0
      ? Math.round(timedCorrect.reduce((s, q) => s + q.time_spent, 0) / timedCorrect.length)
      : 0;
    const avgIncorrect = timedIncorrect.length > 0
      ? Math.round(timedIncorrect.reduce((s, q) => s + q.time_spent, 0) / timedIncorrect.length)
      : 0;

    return { topicData, typeData, diffData, avgCorrect, avgIncorrect };
  }, [questions]);

  if (!chartData) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Performance Breakdown</h2>

      <div className="grid gap-4 md:grid-cols-2 stagger-children">
        {/* Topic accuracy bar chart */}
        {chartData.topicData.length > 0 && (
          <Card className="card-shadow border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                Accuracy by Topic
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.topicData} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis
                      dataKey="topic"
                      tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="accuracy" name="Accuracy" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      {chartData.topicData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={entry.accuracy >= 70 ? COLORS.correct : entry.accuracy >= 40 ? '#eab308' : COLORS.incorrect}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Question type stacked bar */}
        <Card className="card-shadow border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-500" />
              Results by Question Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.typeData} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="type"
                    tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="Correct" stackId="a" fill={COLORS.correct} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Incorrect" stackId="a" fill={COLORS.incorrect} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Difficulty pie chart */}
        <Card className="card-shadow border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-amber-500" />
              Difficulty Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.diffData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {chartData.diffData.map((_, index) => (
                      <Cell key={index} fill={COLORS.topics[index % COLORS.topics.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-lg border bg-background p-3 shadow-md text-sm">
                          <p className="font-medium">{d.name}</p>
                          <p>{d.value} question{d.value !== 1 ? 's' : ''}</p>
                          <p className="text-muted-foreground">{d.accuracy}% accuracy</p>
                        </div>
                      );
                    }}
                  />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Time analysis */}
        <Card className="card-shadow border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-teal-500" />
              Time Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between p-3 rounded-xl bg-green-50 dark:bg-green-900/10">
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">Correct Answers</p>
                  <p className="text-xs text-green-600 dark:text-green-400">Avg time per question</p>
                </div>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">{chartData.avgCorrect}s</p>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-red-50 dark:bg-red-900/10">
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">Incorrect Answers</p>
                  <p className="text-xs text-red-600 dark:text-red-400">Avg time per question</p>
                </div>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">{chartData.avgIncorrect}s</p>
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total questions</span>
                  <span className="font-medium">{questions.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Correct</span>
                  <span className="font-medium text-green-600">{questions.filter(q => q.is_correct === true).length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Incorrect</span>
                  <span className="font-medium text-red-600">{questions.filter(q => q.is_correct === false).length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ungraded</span>
                  <span className="font-medium text-amber-600">{questions.filter(q => q.is_correct === null).length}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
