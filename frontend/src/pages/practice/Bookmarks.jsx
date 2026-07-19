import { useState, useEffect } from 'react';
import { examsAPI } from '@/api/exams';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PageTransition from '@/components/PageTransition';
import { ListSkeleton } from '@/components/Skeletons';
import { Bookmark, Trash2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

export default function Bookmarks() {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    examsAPI.getBookmarks()
      .then((res) => setBookmarks(Array.isArray(res.data) ? res.data : []))
      .catch(() => toast.error('Failed to load bookmarks'))
      .finally(() => setLoading(false));
  }, []);

  const removeBookmark = async (id) => {
    try {
      await examsAPI.deleteBookmark(id);
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
      toast.success('Bookmark removed');
    } catch {
      toast.error('Failed to remove bookmark');
    }
  };

  if (loading) {
    return <ListSkeleton />;
  }

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bookmarks</h1>
        <p className="text-muted-foreground">Questions you've saved for review</p>
      </div>

      {bookmarks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Bookmark className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>No bookmarked questions yet</p>
          <p className="text-sm mt-1">Bookmark questions during practice or exams to review them later</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookmarks.map((bm) => {
            const content = bm.content;
            const text = typeof content === 'string' ? content : content?.text || '';
            return (
              <Card key={bm.id}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{bm.question_type}</Badge>
                      {bm.difficulty && <Badge variant="secondary">{bm.difficulty}</Badge>}
                      {bm.subject && (
                        <span className="text-xs text-muted-foreground">
                          {bm.subject}{bm.topic ? ` › ${bm.topic}` : ''}
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeBookmark(bm.id)}
                      className="text-destructive hover:text-destructive shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm">{text}</p>
                  {bm.options && (
                    <div className="flex flex-wrap gap-2">
                      {bm.options.map((opt, idx) => (
                        <span key={idx} className="text-xs bg-muted px-2 py-1 rounded">{opt}</span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      </div>
    </PageTransition>
  );
}
