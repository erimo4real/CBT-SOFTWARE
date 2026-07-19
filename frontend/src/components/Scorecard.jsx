import { forwardRef } from 'react';
import { GraduationCap, CheckCircle2, XCircle } from 'lucide-react';

const Scorecard = forwardRef(({ result, user }, ref) => {
  const passed = result.passed;
  const date = result.start_time ? new Date(result.start_time).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  }) : '';

  return (
    <div ref={ref} className="scorecard-print">
      <style>{`
        @media print {
          .scorecard-print { all: initial; font-family: 'Segoe UI', Arial, sans-serif; width: 100%; }
          .scorecard-no-print { display: none !important; }
          .scorecard-print * { all: revert; }
        }
        .scorecard-print {
          max-width: 600px;
          margin: 0 auto;
          padding: 0;
          display: none;
        }
        @media screen {
          .scorecard-print { display: none; }
        }
        @media print {
          .scorecard-print { display: block; }
        }
      `}</style>

      <div style={{
        border: '2px solid #1a1a1a',
        borderRadius: '16px',
        padding: '40px',
        background: '#fff',
        color: '#1a1a1a',
        fontFamily: "'Segoe UI', Arial, sans-serif",
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px', borderBottom: '2px solid #e5e5e5', paddingBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '8px' }}>
            <GraduationCap size={32} />
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>CBT</h1>
          </div>
          <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>Examination Scorecard</p>
        </div>

        {/* Student Info */}
        <div style={{ marginBottom: '24px' }}>
          <table style={{ width: '100%', fontSize: '14px' }}>
            <tbody>
              <tr>
                <td style={{ padding: '6px 0', color: '#666', width: '140px' }}>Student Name</td>
                <td style={{ padding: '6px 0', fontWeight: '600' }}>{user?.full_name || user?.email}</td>
              </tr>
              <tr>
                <td style={{ padding: '6px 0', color: '#666' }}>Email</td>
                <td style={{ padding: '6px 0' }}>{user?.email}</td>
              </tr>
              <tr>
                <td style={{ padding: '6px 0', color: '#666' }}>Exam</td>
                <td style={{ padding: '6px 0', fontWeight: '600' }}>{result.exam_title}</td>
              </tr>
              <tr>
                <td style={{ padding: '6px 0', color: '#666' }}>Date</td>
                <td style={{ padding: '6px 0' }}>{date}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Result */}
        <div style={{
          textAlign: 'center',
          padding: '24px',
          borderRadius: '12px',
          background: passed ? '#f0fdf4' : '#fef2f2',
          border: `2px solid ${passed ? '#22c55e' : '#ef4444'}`,
          marginBottom: '24px',
        }}>
          <div style={{ marginBottom: '8px' }}>
            {passed ? (
              <CheckCircle2 size={48} style={{ color: '#22c55e', margin: '0 auto' }} />
            ) : (
              <XCircle size={48} style={{ color: '#ef4444', margin: '0 auto' }} />
            )}
          </div>
          <p style={{
            fontSize: '28px',
            fontWeight: 'bold',
            margin: '8px 0 4px',
            color: passed ? '#16a34a' : '#dc2626',
          }}>
            {passed ? 'PASSED' : 'FAILED'}
          </p>
        </div>

        {/* Score Details */}
        <table style={{ width: '100%', fontSize: '14px', marginBottom: '32px' }}>
          <tbody>
            <tr style={{ borderBottom: '1px solid #e5e5e5' }}>
              <td style={{ padding: '10px 0', color: '#666' }}>Score</td>
              <td style={{ padding: '10px 0', fontWeight: '600', textAlign: 'right' }}>
                {result.score} / {result.total_marks || '—'}
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e5e5e5' }}>
              <td style={{ padding: '10px 0', color: '#666' }}>Percentage</td>
              <td style={{ padding: '10px 0', fontWeight: '600', textAlign: 'right', fontSize: '18px' }}>
                {result.percentage}%
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e5e5e5' }}>
              <td style={{ padding: '10px 0', color: '#666' }}>Passing Score</td>
              <td style={{ padding: '10px 0', textAlign: 'right' }}>{result.passing_score || '—'}%</td>
            </tr>
            <tr>
              <td style={{ padding: '10px 0', color: '#666' }}>Attempt</td>
              <td style={{ padding: '10px 0', textAlign: 'right' }}>#{result.attempt_number || 1}</td>
            </tr>
          </tbody>
        </table>

        {/* Footer */}
        <div style={{ textAlign: 'center', borderTop: '2px solid #e5e5e5', paddingTop: '16px' }}>
          <p style={{ fontSize: '12px', color: '#999', margin: 0 }}>
            This is a computer-generated scorecard. No signature required.
          </p>
          <p style={{ fontSize: '11px', color: '#bbb', margin: '4px 0 0' }}>
            Reference: {result.id}
          </p>
        </div>
      </div>
    </div>
  );
});

Scorecard.displayName = 'Scorecard';
export default Scorecard;
