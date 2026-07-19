import { useState, useEffect, useMemo } from 'react';
import { certificatesAPI } from '@/api/certificates';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PageTransition from '@/components/PageTransition';
import { ListSkeleton } from '@/components/Skeletons';
import Pagination from '@/components/Pagination';
import { Award, Download, ExternalLink, Calendar } from 'lucide-react';
import { formatDate } from '@/lib/format';
import { toast } from 'sonner';
import TableFilters from '@/components/TableFilters';

const PAGE_SIZE = 10;

export default function Certificates() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    certificatesAPI.getCertificates()
      .then((res) => setCertificates(Array.isArray(res.data) ? res.data : []))
      .catch(() => toast.error('Failed to load certificates'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search) return certificates;
    const q = search.toLowerCase();
    return certificates.filter(c =>
      c.course_title?.toLowerCase().includes(q) || c.user_name?.toLowerCase().includes(q)
    );
  }, [certificates, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search]);

  if (loading) {
    return <ListSkeleton />;
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Certificates</h1>
          <p className="text-muted-foreground">Your earned certificates of completion</p>
        </div>

        {certificates.length > 0 && (
          <TableFilters
            search={search}
            onSearch={setSearch}
            searchPlaceholder="Search certificates..."
          />
        )}

      {paged.length === 0 ? (
        <div className="text-center py-12">
          <Award className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground mb-2">{search ? 'No matching certificates' : 'No certificates yet'}</p>
          <p className="text-sm text-muted-foreground">{search ? 'Try a different search' : 'Complete a course to earn your first certificate'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {paged.map((cert) => (
            <Card key={cert.id}>
              <CardContent className="pt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="p-3 rounded-lg bg-amber-100 shrink-0">
                  <Award className="h-8 w-8 text-amber-600" />
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <h3 className="font-semibold">{cert.course_title}</h3>
                  <p className="text-sm text-muted-foreground">
                    Issued to {cert.user_name} by {cert.instructor_name}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(cert.issued_at)}
                    </span>
                    {cert.score !== null && (
                      <Badge variant="secondary" className="text-xs">Score: {cert.score}%</Badge>
                    )}
                    <span className="font-mono text-[10px]">{cert.certificate_id}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {cert.pdf_file && (
                    <a href={cert.pdf_file} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        PDF
                      </Button>
                    </a>
                  )}
                  {cert.verification_url && (
                    <a href={cert.verification_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} totalItems={filtered.length} onPageChange={setPage} />
      </div>
    </PageTransition>
  );
}
