'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import TrustReport from '@/components/TrustReport';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export default function ReportsPage() {
  const { token } = useAuth();
  const [enrollment, setEnrollment] = useState<any>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [fees, setFees] = useState<any>(null);
  const [grades, setGrades] = useState<any>(null);
  const [trust, setTrust] = useState<any>(null);
  const [trustError, setTrustError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      apiFetch('/reports/trust', { token }).then((data) => {
        setTrust(data);
        setTrustError('');
      }).catch((err) => setTrustError(err instanceof Error ? err.message : 'The trust report is for the office admin.')),
      apiFetch('/reports/enrollment', { token }).catch(() => null),
      apiFetch('/reports/attendance', { token }).catch(() => null),
      apiFetch('/reports/fees', { token }).catch(() => null),
      apiFetch('/reports/grades', { token }).catch(() => null),
    ]).then(([, e, a, f, g]) => {
      setEnrollment(e);
      setAttendance(a);
      setFees(f);
      setGrades(g);
      setLoading(false);
    });
  }, [token]);

  function downloadCsv(endpoint: string, filename: string) {
    const a = document.createElement('a');
    a.href = `${API_URL}/reports/export/${endpoint}`;
    a.download = filename;
    fetch(`${API_URL}/reports/export/${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
      });
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reports</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Nursery, Primary, and Secondary, for the office admin</p>
        </div>
      </div>

      {trustError && <p role="alert" className="mb-4 text-sm text-red-700">{trustError}</p>}
      <TrustReport report={trust} />

      {/* Export Buttons */}
      <div className="flex flex-wrap gap-3 mb-8">
        <button onClick={() => downloadCsv('users', 'users-export.csv')} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
          Export Users CSV
        </button>
        <button onClick={() => downloadCsv('users?role=STUDENT', 'students-export.csv')} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
          Export Students CSV
        </button>
        <button onClick={() => downloadCsv('attendance', 'attendance-export.csv')} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
          Export Attendance CSV
        </button>
      </div>

      {/* Enrollment Report */}
      {enrollment && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Enrollment Summary</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{enrollment.totalStudents}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">Students</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{enrollment.totalTeachers}</p>
              <p className="text-xs text-purple-600 dark:text-purple-400">Teachers</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/30 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{enrollment.totalParents}</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">Parents</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">{enrollment.totalStaff}</p>
              <p className="text-xs text-green-600 dark:text-green-400">Staff</p>
            </div>
          </div>
          {enrollment.classCounts?.length > 0 && (
            <div className="overflow-x-auto bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Class</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Year</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Section</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Students</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {enrollment.classCounts.map((c: any) => (
                    <tr key={c.id}>
                      <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{c.year}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{c.section || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{c._count?.students || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Attendance Report */}
      {attendance && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Attendance Overview</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 p-4 text-center">
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{attendance.total}</p>
              <p className="text-xs text-gray-500">Total Records</p>
            </div>
            {attendance.breakdown?.map((b: any) => (
              <div key={b.status} className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 p-4 text-center">
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{b.count}</p>
                <p className="text-xs text-gray-500">{b.status}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fee Report */}
      {fees && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Fee Collection</h2>
          <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-xl p-4 text-center mb-4">
            <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
              {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(fees.totalRevenue || 0)}
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">Total Revenue Collected</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {fees.invoiceBreakdown?.map((i: any) => (
              <div key={i.status} className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 p-4">
                <p className="font-semibold text-gray-900 dark:text-gray-100">{i.status}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{i.count} invoices</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Billed: {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(i.totalAmount || 0)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grade Report */}
      {grades && grades.subjectAverages?.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Grade Distribution</h2>
          <div className="overflow-x-auto bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Subject</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Avg Score</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Highest</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Lowest</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Entries</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {grades.subjectAverages.map((s: any) => (
                  <tr key={s.subject}>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{s.subject}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{s.average.toFixed(1)}%</td>
                    <td className="px-4 py-3 text-green-600 dark:text-green-400">{s.highest}</td>
                    <td className="px-4 py-3 text-red-600 dark:text-red-400">{s.lowest}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{s.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
