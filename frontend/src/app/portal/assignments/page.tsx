'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';

const STATUS_COLORS: Record<string, string> = {
  GRADED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  SUBMITTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  LATE: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  PUBLISHED: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  DRAFT: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

function SubmitForm({ assignmentId, token, onDone }: { assignmentId: string; token: string; onDone: () => void }) {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await apiFetch(`/assignments/${assignmentId}/submit`, {
        token,
        method: 'POST',
        body: JSON.stringify({ content }),
      });
      setContent('');
      onDone();
    } catch (err: any) {
      setError(err.message || 'Submission failed');
    }
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 rounded-lg border dark:border-gray-600 p-4 bg-gray-50 dark:bg-gray-800">
      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Submit Your Work</label>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        placeholder="Paste your answer, link to your work, or describe your submission…"
        className="w-full border dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm resize-y"
        required
      />
      {error && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>}
      <button type="submit" disabled={submitting} className="mt-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
        {submitting ? 'Submitting…' : 'Submit'}
      </button>
    </form>
  );
}

function GradePanel({ submission, maxScore, token, onDone }: { submission: any; maxScore: number; token: string; onDone: () => void }) {
  const [score, setScore] = useState(submission.score?.toString() || '');
  const [feedback, setFeedback] = useState(submission.feedback || '');
  const [grading, setGrading] = useState(false);

  async function handleGrade(e: React.FormEvent) {
    e.preventDefault();
    setGrading(true);
    try {
      await apiFetch(`/assignments/submissions/${submission.id}/grade`, {
        token,
        method: 'PATCH',
        body: JSON.stringify({ score: Number(score), feedback }),
      });
      onDone();
    } catch (err: any) {
      alert(err.message || 'Grading failed');
    }
    setGrading(false);
  }

  return (
    <form onSubmit={handleGrade} className="mt-2 flex flex-wrap items-end gap-3">
      <div>
        <label className="text-xs text-gray-500 dark:text-gray-400">Score (/{maxScore})</label>
        <input type="number" min="0" max={maxScore} value={score} onChange={(e) => setScore(e.target.value)} required className="block w-20 border dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 rounded-lg px-2 py-1.5 text-sm mt-0.5" />
      </div>
      <div className="flex-1 min-w-[150px]">
        <label className="text-xs text-gray-500 dark:text-gray-400">Feedback</label>
        <input type="text" value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Optional feedback" className="block w-full border dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 rounded-lg px-2 py-1.5 text-sm mt-0.5" />
      </div>
      <button type="submit" disabled={grading} className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50">
        {grading ? 'Saving…' : 'Grade'}
      </button>
    </form>
  );
}

export default function PortalAssignmentsPage() {
  const { user, token } = useAuth();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetchAssignments();
  }, [token]);

  function fetchAssignments() {
    apiFetch('/assignments', { token: token! })
      .then((data) => setAssignments(Array.isArray(data) ? data : []))
      .catch(() => setAssignments([]))
      .finally(() => setLoading(false));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Assignments</h1>
        {user?.role === 'TEACHER' && (
          <span className="text-xs text-gray-400 dark:text-gray-500">Create assignments from Classes &rarr; Assignments</span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>
      ) : assignments.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-12">No assignments to display.</p>
      ) : (
        <div className="space-y-4">
          {assignments.map((a: any) => {
            const isExpanded = expandedId === a.id;
            const isPastDue = a.dueDate && new Date(a.dueDate) < new Date();
            const submission = a.submissions?.[0];

            return (
              <div key={a.id} className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 p-5 transition hover:shadow-sm">
                <div className="flex items-start justify-between gap-3 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : a.id)}>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{a.title}</h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {a.subject?.name || '—'} &middot; {a.class?.name || '—'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[a.status] || STATUS_COLORS.DRAFT}`}>{a.status}</span>
                    {isPastDue && a.status === 'PUBLISHED' && <span className="text-[10px] text-red-500 dark:text-red-400 font-medium">PAST DUE</span>}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                  {a.dueDate && (
                    <span className={isPastDue ? 'text-red-500 dark:text-red-400' : ''}>
                      Due: {new Date(a.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                  {a.maxScore && <span>Max Score: {a.maxScore}</span>}
                  {a.teacher && <span>By {a.teacher.user?.firstName} {a.teacher.user?.lastName}</span>}
                  {a._count?.submissions !== undefined && <span>{a._count.submissions} submission(s)</span>}
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="mt-4 border-t dark:border-gray-700 pt-4">
                    {a.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 whitespace-pre-wrap">{a.description}</p>
                    )}

                    {/* Student: show submission or submit form */}
                    {user?.role === 'STUDENT' && (
                      <>
                        {submission ? (
                          <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[submission.status] || ''}`}>{submission.status}</span>
                              {submission.score !== null && (
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Score: {submission.score}/{a.maxScore}</span>
                              )}
                              {submission.submittedAt && (
                                <span className="text-xs text-gray-400">Submitted: {new Date(submission.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                              )}
                            </div>
                            {submission.content && <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{submission.content}</p>}
                            {submission.feedback && (
                              <div className="mt-3 border-t dark:border-gray-700 pt-3">
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Teacher Feedback</p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">{submission.feedback}</p>
                              </div>
                            )}
                            {submission.status !== 'GRADED' && (
                              <SubmitForm assignmentId={a.id} token={token!} onDone={fetchAssignments} />
                            )}
                          </div>
                        ) : (
                          a.status === 'PUBLISHED' && <SubmitForm assignmentId={a.id} token={token!} onDone={fetchAssignments} />
                        )}
                      </>
                    )}

                    {/* Teacher: show all submissions with grading */}
                    {user?.role === 'TEACHER' && a.submissions && a.submissions.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Submissions ({a.submissions.length})</h3>
                        <div className="space-y-3">
                          {a.submissions.map((sub: any) => (
                            <div key={sub.id} className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {sub.student?.user?.firstName} {sub.student?.user?.lastName}
                                  </span>
                                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[sub.status] || ''}`}>{sub.status}</span>
                                </div>
                                {sub.score !== null && (
                                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{sub.score}/{a.maxScore}</span>
                                )}
                              </div>
                              {sub.content && <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap line-clamp-3">{sub.content}</p>}
                              {sub.status !== 'GRADED' && (
                                <GradePanel submission={sub} maxScore={a.maxScore} token={token!} onDone={fetchAssignments} />
                              )}
                              {sub.feedback && sub.status === 'GRADED' && (
                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic">&ldquo;{sub.feedback}&rdquo;</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
