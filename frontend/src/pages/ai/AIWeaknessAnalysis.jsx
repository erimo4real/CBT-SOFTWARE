import { useState, useEffect } from 'react';
import { aiAPI } from '../../api/ai';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Brain, Loader2, AlertTriangle, CheckCircle2, TrendingUp, RefreshCw, Target } from 'lucide-react';

export default function AIWeaknessAnalysis() {
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState(null);

  async function fetchAnalysis() {
    setLoading(true);
    try {
      const res = await aiAPI.getWeaknessAnalysis();
      setAnalysis(res.data);
    } catch (err) {
      toast.error('Failed to load weakness analysis');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAnalysis();
  }, []);

  const severityConfig = {
    critical: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: AlertTriangle },
    warning: { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: TrendingUp },
    needs_improvement: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Target },
  };

  const priorityColors = {
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  };

  const chartData = analysis?.raw_stats?.map(t => ({
    topic: t.topic.length > 15 ? t.topic.slice(0, 15) + '...' : t.topic,
    accuracy: t.accuracy,
    fullTopic: t.topic,
  })) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            AI Weakness Analysis
          </h1>
          <p className="text-muted-foreground mt-1">AI-powered analysis of your exam performance</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAnalysis} disabled={loading} className="btn-press">
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
            <p className="text-sm text-muted-foreground">Analyzing your performance patterns...</p>
          </CardContent>
        </Card>
      )}

      {!loading && analysis?.message && !analysis.weak_topics?.length && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Brain className="h-8 w-8 text-primary/60" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No data yet</h3>
            <p className="text-sm text-muted-foreground max-w-md">{analysis.message}</p>
          </CardContent>
        </Card>
      )}

      {!loading && analysis && (
        <div className="space-y-6">
          {analysis.summary && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-5">
                <h2 className="text-sm font-semibold mb-1">Performance Summary</h2>
                <p className="text-sm text-muted-foreground">{analysis.summary}</p>
              </CardContent>
            </Card>
          )}

          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Topic Accuracy</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="topic" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value, name, props) => [`${value}%`, props.payload.fullTopic]}
                      labelFormatter={() => ''}
                    />
                    <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, idx) => (
                        <Cell
                          key={idx}
                          fill={entry.accuracy >= 70 ? '#16a34a' : entry.accuracy >= 50 ? '#eab308' : '#dc2626'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {analysis.weak_topics?.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Weak Topics</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {analysis.weak_topics.map((topic, idx) => {
                  const sev = severityConfig[topic.severity] || severityConfig.needs_improvement;
                  const SevIcon = sev.icon;
                  return (
                    <Card key={idx} className="hover-lift">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-sm font-semibold">{topic.topic}</h3>
                          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${sev.color}`}>
                            <SevIcon className="h-3 w-3" />
                            {topic.severity}
                          </span>
                        </div>
                        {topic.accuracy !== undefined && (
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  topic.accuracy >= 70 ? 'bg-green-500' : topic.accuracy >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${topic.accuracy}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium">{topic.accuracy}%</span>
                          </div>
                        )}
                        {topic.suggestion && (
                          <p className="text-xs text-muted-foreground">{topic.suggestion}</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {analysis.recommendations?.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Recommendations</h2>
              <div className="space-y-3">
                {analysis.recommendations.map((rec, idx) => (
                  <Card key={idx}>
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-semibold">{rec.title}</h3>
                            {rec.priority && (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${priorityColors[rec.priority] || ''}`}>
                                {rec.priority}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">{rec.description}</p>
                          {rec.action && (
                            <p className="text-xs font-medium text-primary">{rec.action}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {analysis.encouragement && (
            <Card className="bg-accent/50 border-accent">
              <CardContent className="pt-5 text-center">
                <p className="text-sm font-medium">{analysis.encouragement}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
