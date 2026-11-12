'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
const DAY_LABELS: Record<string, string> = {
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
};

function slotColor(index: number) {
  const colours = [
    'bg-blue-50 border-blue-200 text-blue-800',
    'bg-green-50 border-green-200 text-green-800',
    'bg-purple-50 border-purple-200 text-purple-800',
    'bg-amber-50 border-amber-200 text-amber-800',
    'bg-rose-50 border-rose-200 text-rose-800',
    'bg-teal-50 border-teal-200 text-teal-800',
  ];
  return colours[index % colours.length];
}

function GroupDays({ groupSlots, userRole }: { groupSlots: any[]; userRole?: string }) {
  const grouped: Record<string, any[]> = {};
  for (const day of DAYS) {
    grouped[day] = groupSlots.filter((slot) => slot.day === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }
  return (
    <div className="grid gap-4 md:grid-cols-5">
      {DAYS.map((day) => (
        <div key={day}>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">{DAY_LABELS[day]}</h3>
          <div className="space-y-2">
            {grouped[day].length === 0 ? (
              <p className="rounded-lg bg-gray-50 p-3 text-center text-xs text-gray-400">No lessons</p>
            ) : (
              grouped[day].map((slot: any, idx: number) => (
                <div key={slot.id} className={`rounded-lg border p-3 ${slotColor(idx)}`}>
                  <div className="text-xs font-bold">{slot.startTime} – {slot.endTime}</div>
                  <div className="mt-1 text-sm font-semibold">{slot.subject?.name || '—'}</div>
                  {userRole !== 'TEACHER' && slot.teacher?.user && (
                    <div className="mt-0.5 text-xs opacity-70">{slot.teacher.user.firstName} {slot.teacher.user.lastName}</div>
                  )}
                  {userRole === 'TEACHER' && slot.class && (
                    <div className="mt-0.5 text-xs opacity-70">{slot.class.name}{slot.class.section ? ` ${slot.class.section}` : ''}</div>
                  )}
                  {slot.room && <div className="mt-0.5 text-xs opacity-60">Room: {slot.room}</div>}
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PortalTimetablePage() {
  const { user, token } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    apiFetch('/timetable/my', { token })
      .then((data) => {
        if (Array.isArray(data)) setGroups([{ slots: data }]);
        else setGroups(Array.isArray(data?.groups) ? data.groups : []);
      })
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Timetable</h1>
      <p className="mb-6 text-sm text-gray-500">Lessons are the pupil’s own class, in that school and key stage.</p>
      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-gray-500">No timetable slots found.</p>
      ) : (
        groups.map((group) => (
          <section key={`${group.pupilId ?? ''}-${group.className ?? ''}-${group.keyStage ?? ''}`} className="mb-8">
            {(group.pupilName || group.schoolName) && (
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                {[group.pupilName, group.schoolName, group.keyStage, group.className].filter(Boolean).join(' · ')}
              </h2>
            )}
            {(group.slots || []).length === 0 ? (
              <p className="text-sm text-gray-500">No lessons in this class.</p>
            ) : (
              <GroupDays groupSlots={group.slots || []} userRole={user?.role} />
            )}
          </section>
        ))
      )}
    </div>
  );
}
