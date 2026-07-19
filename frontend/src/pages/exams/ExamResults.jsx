import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectUser } from '@/store/slices/authSlice';
import { examsAPI } from '@/api/exams';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PageTransition from '@/components/PageTransition';
import Scorecard from '@/components/Scorecard';
import { ListSkeleton } from '@/components/Skeletons';
import { Trophy, Clock, CheckCircle2, Eye, ArrowLeft, Printer, Download, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/format';
import { toast } from 'sonner';

export default function ExamResults() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [printResult, setPrintResult] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const scorecardRef = useRef(null);

  useEffect(() => {
    examsAPI.getExamResults(id)
      .then((res) => setResults(Array.isArray(res.data) ? res.data : []))
      .catch(() => toast.error('Failed to load results'))
      .finally(() => setLoading(false));
  }, [id]);

  const handlePrint = (result) => {
    setPrintResult(result);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleDownloadPDF = async (result) => {
    setDownloading(result.id);
    setPrintResult(result);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      // Wait for scorecard to render
      await new Promise(r => setTimeout(r, 200));
      const el = scorecardRef.current;
      if (!el) {
        toast.error('Failed to generate PDF');
        return;
      }
      // Make the scorecard visible temporarily
      el.style.display = 'block';
      el.style.position = 'absolute';
      el.style.left = '-9999px';
      el.style.top = '0';

      await html2pdf()
        .set({
          margin: 10,
          filename: `scorecard-${result.exam_title || 'exam'}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(el)
        .save();

      // Reset visibility
      el.style.display = '';
      el.style.position = '';
      el.style.left = '';
      el.style.top = '';
      toast.success('PDF downloaded');
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return <ListSkeleton />;
  }

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Screen-only header */}
        <div className="scorecard-no-print">
          <Button variant="ghost" size="sm" onClick={() => navigate('/exams')} className="w-fit">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to exams
          </Button>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">Exam Results</h1>
            <p className="text-muted-foreground">{results.length > 0 ? results[0].exam_title : 'Exam results'}</p>
          </div>
        </div>

        {results.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground scorecard-no-print">
            <Trophy className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No attempts yet</p>
            <Link to={`/exams/${id}/take`}>
              <Button className="mt-4">Take Exam</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3 scorecard-no-print">
            {results.map((result, idx) => (
              <Card key={result.id} className="card-shadow border-0">
                <CardContent className="pt-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Attempt #{result.attempt_number || idx + 1}</span>
                      <Badge variant={result.passed ? 'default' : 'destructive'}>
                        {result.passed ? 'Passed' : 'Failed'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Score: {result.score} ({result.percentage}%)
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDate(result.start_time)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadPDF(result)}
                      disabled={downloading === result.id}
                      className="btn-press"
                    >
                      {downloading === result.id ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-1" />
                      )}
                      PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePrint(result)}
                      className="btn-press"
                    >
                      <Printer className="h-4 w-4 mr-1" />
                      Print
                    </Button>
                    <Link to={`/exams/attempts/${result.id}/review`}>
                      <Button variant="outline" size="sm" className="btn-press">
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Hidden scorecard for printing */}
        {printResult && (
          <Scorecard ref={scorecardRef} result={printResult} user={user} />
        )}
      </div>
    </PageTransition>
  );
}
