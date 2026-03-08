'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';

interface Slot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  meetingUrl?: string;
  status: string;
  notes?: string;
  teacher?: { user: { firstName: string; lastName: string; email: string } };
  parent?: { user: { firstName: string; lastName: string; email: string } };
  student?: { user: { firstName: string; lastName: string } };
}

const STATUS_COLOURS: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  BOOKED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  COMPLETED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export default function ConferencesPage() {
  const { user, token } = useAuth();
  const [mySlots, setMySlots] = useState<Slot[]>([]);
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);

  // Teacher create form
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!token) return;
    fetchData();
  }, [token]);

  async function fetchData() {
    setLoading(true);
    try {
      const my = await apiFetch('/conferences/my', { token: token! });
      setMySlots(Array.isArray(my) ? my : []);
    } catch { setMySlots([]); }

    if (user?.role === 'PARENT') {
      try {
        const avail = await apiFetch('/conferences/available', { token: token! });
        setAvailableSlots(Array.isArray(avail) ? avail : []);
      } catch { setAvailableSlots([]); }
    }
    setLoading(false);
  }

  async function handleCreateSlot(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !startTime || !endTime) return;
    setCreating(true);
    setMsg('');
    try {
      await apiFetch('/conferences/slots', {
        token: token!,
        method: 'POST',
        body: JSON.stringify({
          date,
          slots: [{ startTime, endTime }],
          location: location || undefined,
          meetingUrl: meetingUrl || undefined,
        }),
      });
      setMsg('Slot created!');
      setStartTime('');
      setEndTime('');
      fetchData();
    } catch (err: any) {
      setMsg(err.message || 'Failed to create slot');
    }
    setCreating(false);
  }

  async function handleBook(slotId: string) {
    const studentId = prompt('Enter the student profile ID for this conference:');
    if (!studentId) return;
    const notes = prompt('Any notes? (optional)') || '';
    try {
      await apiFetch(`/conferences/${slotId}/book`, {
        token: token!,
        method: 'POST',
        body: JSON.stringify({ studentId, notes }),
      });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Booking failed');
    }
  }

  async function handleCancel(slotId: string) {
    if (!confirm('Cancel this conference slot?')) return;
    try {
      await apiFetch(`/conferences/${slotId}/cancel`, { token: token!, method: 'PATCH' });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Cancel failed');
    }
  }

  if (!user) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        {user.role === 'TEACHER' ? 'My Conference Slots' : user.role === 'PARENT' ? 'Parent-Teacher Conferences' : 'All Conferences'}
      </h1>

      {/* Teacher: create slot form */}
      {user.role === 'TEACHER' && (
        <form onSubmit={handleCreateSlot} className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 p-6 mb-6">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Create Available Slot</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="mt-1 w-full border dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Start Time</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required className="mt-1 w-full border dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">End Time</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required className="mt-1 w-full border dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Location</label>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Room 101" className="mt-1 w-full border dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Meeting URL</label>
              <input type="url" value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} placeholder="https://meet.google.com/..." className="mt-1 w-full border dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button type="submit" disabled={creating} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {creating ? 'Creating…' : 'Create Slot'}
            </button>
            {msg && <span className="text-sm text-green-600 dark:text-green-400">{msg}</span>}
          </div>
        </form>
      )}

      {/* Parent: available slots to book */}
      {user.role === 'PARENT' && availableSlots.length > 0 && (
        <div className="mb-8">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Available Slots</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {availableSlots.map((s) => (
              <div key={s.id} className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 p-4">
                <p className="font-medium text-gray-900 dark:text-gray-100">{s.teacher?.user.firstName} {s.teacher?.user.lastName}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(s.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">{s.startTime} – {s.endTime}</p>
                {s.location && <p className="text-xs text-gray-400 mt-1">{s.location}</p>}
                <button onClick={() => handleBook(s.id)} className="mt-3 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
                  Book
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My conferences list */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>
      ) : mySlots.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-12">No conferences found.</p>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Date</th>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Time</th>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
                    {user.role === 'TEACHER' ? 'Parent' : 'Teacher'}
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Student</th>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Status</th>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Location</th>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {mySlots.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{new Date(s.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{s.startTime} – {s.endTime}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {user.role === 'TEACHER' ? (s.parent ? `${s.parent.user.firstName} ${s.parent.user.lastName}` : '—') : (s.teacher ? `${s.teacher.user.firstName} ${s.teacher.user.lastName}` : '—')}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{s.student ? `${s.student.user.firstName} ${s.student.user.lastName}` : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOURS[s.status] || ''}`}>{s.status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {s.meetingUrl ? <a href={s.meetingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">Join</a> : (s.location || '—')}
                    </td>
                    <td className="px-4 py-3">
                      {(s.status === 'AVAILABLE' || s.status === 'BOOKED') && (
                        <button onClick={() => handleCancel(s.id)} className="text-xs text-red-600 dark:text-red-400 hover:underline">Cancel</button>
                      )}
                    </td>
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
