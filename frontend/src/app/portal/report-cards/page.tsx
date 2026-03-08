'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export default function PortalReportCardsPage() {
  const { user, token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiFetch('/report-cards/my', { token })
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [token]);

  const viewCard = async (id: string) => {
    if (!token) return;
    setDetailLoading(true);
    try {
      const card = await apiFetch(`/report-cards/${id}`, { token });
      setSelectedCard(card);
    } catch {
      setSelectedCard(null);
    }
    setDetailLoading(false);
  };

  const downloadPdf = (id: string) => {
    window.open(`${API_URL}/report-cards/${id}/pdf`, '_blank');
  };

  const gradeColour = (grade: string) => {
    if (grade === 'A' || grade === 'A*') return 'bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-200';
    if (grade === 'B') return 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200';
    if (grade === 'C') return 'bg-amber-50 text-amber-700 dark:bg-amber-900 dark:text-amber-200';
    return 'bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  };

  // Render a list of report cards
  const renderCardList = (cards: any[], studentName?: string) => (
    <div className="mb-6">
      {studentName && <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">{studentName}</h2>}
      {cards.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No report cards available.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card: any) => (
            <div key={card.id} className="card dark:bg-gray-900 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    {card.term?.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{card.term?.session?.name}</p>
                  <p className="text-xs text-gray-400">{card.class?.name}{card.class?.section ? ` ${card.class.section}` : ''}</p>
                </div>
                {card.overallGrade && (
                  <span className={`rounded-full px-3 py-1 text-sm font-bold ${gradeColour(card.overallGrade)}`}>
                    {card.overallGrade}
                  </span>
                )}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-2">
                  <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{card.averageScore ?? '—'}%</div>
                  <div className="text-xs text-gray-400">Average</div>
                </div>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-2">
                  <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{card.totalScore ?? '—'}</div>
                  <div className="text-xs text-gray-400">Total</div>
                </div>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-2">
                  <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{card.subjectCount ?? '—'}</div>
                  <div className="text-xs text-gray-400">Subjects</div>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button onClick={() => viewCard(card.id)} className="btn-primary flex-1 text-xs">
                  View Details
                </button>
                <button onClick={() => downloadPdf(card.id)} className="flex-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                  Download PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Detail view
  if (selectedCard) {
    return (
      <div>
        <button onClick={() => setSelectedCard(null)} className="mb-4 text-sm font-medium text-brand-700 hover:text-brand-800">
          ← Back to Report Cards
        </button>

        <div className="card dark:bg-gray-900 dark:border-gray-700">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {selectedCard.student?.user?.firstName} {selectedCard.student?.user?.lastName}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {selectedCard.class?.name}{selectedCard.class?.section ? ` ${selectedCard.class.section}` : ''} — {selectedCard.term?.name} ({selectedCard.term?.session?.name})
              </p>
            </div>
            <div className="text-right">
              {selectedCard.overallGrade && (
                <span className={`inline-block rounded-full px-4 py-1.5 text-lg font-bold ${gradeColour(selectedCard.overallGrade)}`}>
                  {selectedCard.overallGrade}
                </span>
              )}
              <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">Average: {selectedCard.averageScore}%</div>
            </div>
          </div>

          {/* Results table */}
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Subject</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Score</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Max</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">%</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {(selectedCard.results || []).map((r: any) => {
                  const pct = r.maxScore > 0 ? Math.round((r.score / r.maxScore) * 100) : 0;
                  let grade = '—';
                  for (const scale of (selectedCard.gradingScales || [])) {
                    if (pct >= scale.minScore && pct <= scale.maxScore) {
                      grade = scale.grade;
                      break;
                    }
                  }
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{r.subject?.name}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{r.score}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{r.maxScore}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{pct}%</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${gradeColour(grade)}`}>{grade}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Comments */}
          {selectedCard.teacherComment && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Form Teacher&apos;s Comment</h3>
              <p className="mt-1 rounded-lg bg-gray-50 dark:bg-gray-800 p-3 text-sm text-gray-600 dark:text-gray-400">{selectedCard.teacherComment}</p>
            </div>
          )}
          {selectedCard.principalComment && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Principal&apos;s Comment</h3>
              <p className="mt-1 rounded-lg bg-gray-50 dark:bg-gray-800 p-3 text-sm text-gray-600 dark:text-gray-400">{selectedCard.principalComment}</p>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button onClick={() => downloadPdf(selectedCard.id)} className="btn-primary">
              Download PDF
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">Report Cards</h1>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : detailLoading ? (
        <p className="text-sm text-gray-500">Loading report card…</p>
      ) : user?.role === 'PARENT' && Array.isArray(data) ? (
        data.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No report cards available.</p>
        ) : (
          data.map((child: any, i: number) => (
            <div key={i}>
              {renderCardList(child.reportCards || [], `${child.student?.user?.firstName} ${child.student?.user?.lastName}`)}
            </div>
          ))
        )
      ) : Array.isArray(data) ? (
        renderCardList(data)
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">No report cards available.</p>
      )}
    </div>
  );
}
