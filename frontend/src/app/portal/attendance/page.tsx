'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';

export default function PortalAttendancePage() {
  const { user, token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Teacher state
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [classData, setClassData] = useState<any>(null);
  const [markingStatus, setMarkingStatus] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const isTeacherOrAdmin = user?.role === 'TEACHER' || user?.role === 'ADMIN';

  useEffect(() => {
    if (!token || !user) return;

    if (isTeacherOrAdmin) {
      apiFetch('/admin/classes', { token })
        .then((d) => setClasses(Array.isArray(d) ? d : []))
        .catch(() => setClasses([]))
        .finally(() => setLoading(false));
    } else {
      apiFetch('/attendance/my', { token })
        .then((d) => setData(d))
        .catch(() => setData(null))
        .finally(() => setLoading(false));
    }
  }, [token, user, isTeacherOrAdmin]);

  const loadClassAttendance = async () => {
    if (!selectedClass || !date || !token) return;
    try {
      const d = await apiFetch(`/attendance/class/${selectedClass}?date=${date}`, { token });
      setClassData(d);
      // Pre-fill existing records
      const existing: Record<string, string> = {};
      if (d?.records) {
        for (const rec of d.records) {
          existing[rec.studentId] = rec.status;
        }
      }
      // Default unmarked students to PRESENT
      if (d?.students) {
        for (const s of d.students) {
          if (!existing[s.id]) existing[s.id] = 'PRESENT';
        }
      }
      setMarkingStatus(existing);
    } catch {
      setClassData(null);
    }
  };

  useEffect(() => {
    if (selectedClass && date) loadClassAttendance();
  }, [selectedClass, date]);

  const saveAttendance = async () => {
    if (!token || !selectedClass) return;
    setSaving(true);
    try {
      const records = Object.entries(markingStatus).map(([studentId, status]) => ({ studentId, status }));
      await apiFetch('/attendance/mark', {
        method: 'POST',
        token,
        body: JSON.stringify({ classId: selectedClass, date, records }),
      });
      await loadClassAttendance();
    } catch {}
    setSaving(false);
  };

  const statusColour = (status: string) => {
    switch (status) {
      case 'PRESENT': return 'bg-green-50 text-green-700';
      case 'ABSENT': return 'bg-red-50 text-red-700';
      case 'LATE': return 'bg-amber-50 text-amber-700';
      case 'EXCUSED': return 'bg-blue-50 text-blue-700';
      default: return 'bg-gray-50 text-gray-600';
    }
  };

  // ─── Student / Parent view ────────────────────────────────────────────
  if (!isTeacherOrAdmin) {
    const renderStudentAttendance = (attendanceData: any, studentName?: string) => {
      const summary = attendanceData?.summary;
      const records = attendanceData?.records || [];
      return (
        <div className="card mb-6">
          {studentName && <h2 className="mb-3 text-lg font-semibold text-gray-900">{studentName}</h2>}
          {summary && (
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <div className="text-xl font-bold text-gray-900">{summary.total}</div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
              <div className="rounded-lg bg-green-50 p-3 text-center">
                <div className="text-xl font-bold text-green-700">{summary.present}</div>
                <div className="text-xs text-gray-500">Present</div>
              </div>
              <div className="rounded-lg bg-red-50 p-3 text-center">
                <div className="text-xl font-bold text-red-700">{summary.absent}</div>
                <div className="text-xs text-gray-500">Absent</div>
              </div>
              <div className="rounded-lg bg-amber-50 p-3 text-center">
                <div className="text-xl font-bold text-amber-700">{summary.late}</div>
                <div className="text-xs text-gray-500">Late</div>
              </div>
              <div className="rounded-lg bg-blue-50 p-3 text-center">
                <div className="text-xl font-bold text-blue-700">{summary.rate}%</div>
                <div className="text-xs text-gray-500">Rate</div>
              </div>
            </div>
          )}
          {records.length > 0 && (
            <div className="max-h-64 space-y-1.5 overflow-y-auto">
              {records.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-sm">
                  <span className="text-gray-600">
                    {new Date(r.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColour(r.status)}`}>{r.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    };

    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Attendance</h1>
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : user?.role === 'PARENT' && Array.isArray(data) ? (
          data.length === 0 ? (
            <p className="text-sm text-gray-500">No attendance data available.</p>
          ) : (
            data.map((child: any, i: number) => (
              <div key={i}>
                {renderStudentAttendance(child, `${child.student?.user?.firstName} ${child.student?.user?.lastName}`)}
              </div>
            ))
          )
        ) : data ? (
          renderStudentAttendance(data)
        ) : (
          <p className="text-sm text-gray-500">No attendance data available.</p>
        )}
      </div>
    );
  }

  // ─── Teacher / Admin view ─────────────────────────────────────────────
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Mark Attendance</h1>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap gap-4">
            <select
              className="input-field max-w-xs"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="">Select class…</option>
              {classes.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}{c.section ? ` ${c.section}` : ''}</option>
              ))}
            </select>
            <input
              type="date"
              className="input-field max-w-xs"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {classData?.students && classData.students.length > 0 ? (
            <div className="card">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Student</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {classData.students.map((s: any) => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                          {s.user.firstName} {s.user.lastName}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex gap-1.5">
                            {['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'].map((status) => (
                              <button
                                key={status}
                                onClick={() => setMarkingStatus((prev) => ({ ...prev, [s.id]: status }))}
                                className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${markingStatus[s.id] === status ? statusColour(status) + ' ring-2 ring-offset-1 ring-current' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex justify-end">
                <button onClick={saveAttendance} disabled={saving} className="btn-primary">
                  {saving ? 'Saving…' : 'Save Attendance'}
                </button>
              </div>
            </div>
          ) : selectedClass ? (
            <p className="text-sm text-gray-500">No students in this class.</p>
          ) : (
            <p className="text-sm text-gray-500">Select a class to mark attendance.</p>
          )}
        </>
      )}
    </div>
  );
}
