'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';

function formatDate(value: string | null) {
  if (!value) return 'Not recorded';
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/London',
  });
}

export default function ChildRecordPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const { token } = useAuth();
  const [child, setChild] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !studentId) return;
    setLoading(true);
    apiFetch(`/school/children/${studentId}`, { token })
      .then(setChild)
      .catch((err) => setError(err.message || 'Child not found'))
      .finally(() => setLoading(false));
  }, [token, studentId]);

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;
  if (error || !child) {
    return (
      <div>
        <p className="text-sm text-red-700" role="alert">{error || 'Child not found'}</p>
        <Link href="/portal/children" className="mt-4 inline-block text-sm text-brand-700 hover:underline">Back to your children</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <Link href="/portal/children" className="text-sm text-brand-700 hover:underline">Your children</Link>
      <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">{child.firstName} {child.lastName}</h1>
      <p className="mt-1 text-sm text-gray-500">{child.relation ? `${child.relation} · ` : ''}{child.admissionNo}</p>

      <div className={`mt-6 rounded-xl border p-4 text-sm ${child.canLogin ? 'border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200' : 'border-amber-200 bg-amber-50 text-amber-900'}`} role="status">
        {child.notice}
      </div>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">School</dt>
          <dd className="mt-1 font-semibold text-gray-900 dark:text-gray-100">{child.school?.name || 'No school'}</dd>
          {child.school && <dd className="text-sm text-gray-500">{child.school.phase} · ages {child.school.ageMin}–{child.school.ageMax}</dd>}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">Class</dt>
          <dd className="mt-1 font-semibold text-gray-900 dark:text-gray-100">{child.class?.name || 'No class yet'}</dd>
          {child.class && <dd className="text-sm text-gray-500">{child.class.keyStage}</dd>}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">Date of birth</dt>
          <dd className="mt-1 font-semibold text-gray-900 dark:text-gray-100">{formatDate(child.dateOfBirth)}</dd>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">Enrolled</dt>
          <dd className="mt-1 font-semibold text-gray-900 dark:text-gray-100">{formatDate(child.enrollmentDate)}</dd>
        </div>
      </dl>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">Teachers</h2>
        {child.teachers?.length ? (
          <ul className="space-y-2">
            {child.teachers.map((teacher: any) => (
              <li key={`${teacher.name}-${teacher.subject}`} className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-900">
                <span className="font-medium text-gray-900 dark:text-gray-100">{teacher.name}</span>
                <span className="text-gray-500"> · {teacher.subject}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No teacher is assigned to this class yet.</p>
        )}
      </section>
    </div>
  );
}
