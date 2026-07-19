import { useState, useEffect } from 'react';
import { examsAPI } from '../../api/exams';
import { analyticsAPI } from '../../api/analytics';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '../../components/ui/select';
import { toast } from 'sonner';
import PageTransition from '../../components/PageTransition';
import { PageSkeleton, ListSkeleton } from '../../components/Skeletons';
import {
  BarChart3, TrendingUp, AlertTriangle, CheckCircle,
} from 'lucide-react';

const qualityColors = {
  Excellent: 'bg-emerald-100 text-emerald-700',
  Good: 'bg-blue-100 text-blue-700',
  'Poor Discrimination': 'bg-amber-100 text-amber-700',
  'Too Difficult': 'bg-red-100 text-red-700',
  'Too Easy': 'bg-orange-100 text-orange-700',
};

export default function ItemAnalysis() {
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [analysis, setAnalysis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    loadExams();
  }, []);

  async function loadExams() {
    try {
      const res = await examsAPI.getExams({ published: 'true' });
      setExams(res.data.results || res.data);
    } catch {
      toast.error('Failed to load exams');
    } finally {
      setLoading(false);
    }
  }

  async function loadAnalysis(examId) {
    setSelectedExam(examId);
    if (!examId) { setAnalysis([]); return; }
    setAnalyzing(true);
    try {
      const res = await analyticsAPI.getItemAnalysis(examId);
      setAnalysis(res.data);
    } catch {
      toast.error('Failed to load item analysis');
    } finally {
      setAnalyzing(false);
    }
  }

  const avgDI = analysis.length > 0 ? (analysis.reduce((s, a) => s + a.difficulty_index, 0) / analysis.length) : 0;
  const avgDisc = analysis.length > 0 ? (analysis.reduce((s, a) => s + a.discrimination_index, 0) / analysis.length) : 0;
  const excellentCount = analysis.filter(a => a.quality === 'Excellent').length;
  const poorCount = analysis.filter(a => a.quality === 'Too Difficult' || a.quality === 'Too Easy' || a.quality === 'Poor Discrimination').length;

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Item Analysis</h1>
        <p className="text-muted-foreground">Analyze question quality and difficulty</p>
      </div>

      <div className="max-w-md">
        <Select value={selectedExam} onValueChange={loadAnalysis}>
          <SelectTrigger><SelectValue placeholder="Select an exam to analyze" /></SelectTrigger>
          <SelectContent>
            {exams.map(e => <SelectItem key={e.id} value={e.id}>{e.title} ({e.question_count} questions)</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {analyzing ? (
        <ListSkeleton />
      ) : analysis.length > 0 ? (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Questions</p>
                <p className="text-2xl font-bold">{analysis.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Avg Difficulty Index</p>
                <p className="text-2xl font-bold">{(avgDI * 100).toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">{avgDI >= 0.3 && avgDI <= 0.9 ? 'Good range' : 'Needs review'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Avg Discrimination</p>
                <p className="text-2xl font-bold">{(avgDisc * 100).toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">{avgDisc >= 0.4 ? 'Excellent' : avgDisc >= 0.2 ? 'Good' : 'Poor'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Quality</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-emerald-600">{excellentCount}</p>
                  <p className="text-muted-foreground">/</p>
                  <p className="text-2xl font-bold text-red-600">{poorCount}</p>
                </div>
                <p className="text-xs text-muted-foreground">excellent / poor</p>
              </CardContent>
            </Card>
          </div>

          {/* Questions Table */}
          <Card>
            <CardHeader><CardTitle>Question Details</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto table-responsive">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Question</th>
                      <th className="pb-2 font-medium">Type</th>
                      <th className="pb-2 font-medium">Difficulty</th>
                      <th className="pb-2 font-medium">Attempts</th>
                      <th className="pb-2 font-medium">DI</th>
                      <th className="pb-2 font-medium">Discrimination</th>
                      <th className="pb-2 font-medium">Quality</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.map((item, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-3 max-w-[300px]">
                          <p className="line-clamp-1">{item.question_text}</p>
                          <p className="text-xs text-muted-foreground">{item.subject} · {item.topic}</p>
                        </td>
                        <td className="py-3"><Badge variant="outline" className="text-xs">{item.question_type}</Badge></td>
                        <td className="py-3"><Badge variant="outline" className="text-xs">{item.difficulty}</Badge></td>
                        <td className="py-3">{item.total_attempts}</td>
                        <td className="py-3">
                          <span className={item.difficulty_index < 0.3 ? 'text-red-600' : item.difficulty_index > 0.9 ? 'text-orange-600' : 'text-emerald-600'}>
                            {(item.difficulty_index * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={item.discrimination_index < 0.2 ? 'text-red-600' : item.discrimination_index >= 0.4 ? 'text-emerald-600' : 'text-amber-600'}>
                            {(item.discrimination_index * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3">
                          <Badge variant="outline" className={`text-xs ${qualityColors[item.quality] || ''}`}>{item.quality}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : selectedExam ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12">
          <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No data available</p>
          <p className="text-sm text-muted-foreground">This exam has no attempted questions to analyze</p>
        </CardContent></Card>
      ) : (
        <Card><CardContent className="flex flex-col items-center justify-center py-12">
          <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">Select an exam</p>
          <p className="text-sm text-muted-foreground">Choose an exam above to view item analysis</p>
        </CardContent></Card>
      )}
      </div>
    </PageTransition>
  );
}
