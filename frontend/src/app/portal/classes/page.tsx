'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';

export default function PortalClassesPage() {
  const { token } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    apiFetch('/admin/classes', { token })
      .then((data) => setClasses(Array.isArray(data) ? data : []))
      .catch(() => setClasses([]))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Classes</h1>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : classes.length === 0 ? (
        <p className="text-sm text-gray-500">No classes found.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls: any) => (
            <div key={cls.id} className="card">
              <h2 className="text-lg font-semibold text-gray-900">{cls.name}</h2>
              <p className="mt-1 text-sm text-gray-500">{cls.section || 'No section'}</p>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Form Teacher</span>
                  <span className="font-medium text-gray-900">
                    {cls.formTeacher?.user
                      ? `${cls.formTeacher.user.firstName} ${cls.formTeacher.user.lastName}`
                      : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Students</span>
                  <span className="font-medium text-gray-900">{cls.students?.length ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Subjects</span>
                  <span className="font-medium text-gray-900">{cls.subjects?.length ?? 0}</span>
                </div>
              </div>

              {cls.subjects && cls.subjects.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {cls.subjects.map((sub: any) => (
                    <span key={sub.id} className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                      {sub.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
