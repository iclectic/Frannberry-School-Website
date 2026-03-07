'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface SchoolEvent {
  id: string;
  title: string;
  description?: string;
  type: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  location?: string;
  isPublic: boolean;
  createdBy?: { firstName: string; lastName: string };
}

const EVENT_COLOURS: Record<string, string> = {
  ACADEMIC: 'bg-blue-100 text-blue-800 border-blue-300',
  EXAM: 'bg-red-100 text-red-800 border-red-300',
  HOLIDAY: 'bg-green-100 text-green-800 border-green-300',
  SPORTS: 'bg-orange-100 text-orange-800 border-orange-300',
  CULTURAL: 'bg-purple-100 text-purple-800 border-purple-300',
  MEETING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  OTHER: 'bg-gray-100 text-gray-800 border-gray-300',
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function EventsPage() {
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [role, setRole] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', type: 'OTHER', startDate: '', endDate: '', allDay: true, location: '', isPublic: true });

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setRole(JSON.parse(stored).role);
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  async function fetchEvents() {
    setLoading(true);
    const token = localStorage.getItem('token');
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const startDate = new Date(year, month, 1).toISOString();
    const endDate = new Date(year, month + 1, 0).toISOString();
    try {
      const data = await apiFetch(`/events?startDate=${startDate}&endDate=${endDate}`, { token: token || undefined });
      setEvents(data);
    } catch { setEvents([]); }
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      await apiFetch('/events', {
        method: 'POST',
        token: token || undefined,
        body: JSON.stringify({ ...form, allDay: form.allDay }),
      });
      setShowForm(false);
      setForm({ title: '', description: '', type: 'OTHER', startDate: '', endDate: '', allDay: true, location: '', isPublic: true });
      fetchEvents();
    } catch {}
  }

  async function handleDelete(id: string) {
    const token = localStorage.getItem('token');
    try {
      await apiFetch(`/events/${id}`, { method: 'DELETE', token: token || undefined });
      fetchEvents();
    } catch {}
  }

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = firstDay === 0 ? 6 : firstDay - 1; // Monday-start

  function eventsOnDay(day: number) {
    return events.filter((ev) => {
      const s = new Date(ev.startDate);
      const e = new Date(ev.endDate);
      const d = new Date(year, month, day);
      return d >= new Date(s.getFullYear(), s.getMonth(), s.getDate()) && d <= new Date(e.getFullYear(), e.getMonth(), e.getDate());
    });
  }

  const calendarDays = [];
  for (let i = 0; i < offset; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  const subscribeUrl = typeof window !== 'undefined'
    ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/events/calendar.ics`
    : '';

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Events Calendar</h1>
        <div className="flex items-center gap-2">
          <a
            href={subscribeUrl}
            target="_blank"
            rel="noopener"
            className="text-sm px-3 py-1.5 border rounded-lg hover:bg-gray-50"
          >
            Subscribe (iCal)
          </a>
          <button
            onClick={() => setView(view === 'calendar' ? 'list' : 'calendar')}
            className="text-sm px-3 py-1.5 border rounded-lg hover:bg-gray-50"
          >
            {view === 'calendar' ? 'List View' : 'Calendar View'}
          </button>
          {role === 'ADMIN' && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="text-sm px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + Add Event
            </button>
          )}
        </div>
      </div>

      {/* Create Event Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border p-6 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {['ACADEMIC', 'EXAM', 'HOLIDAY', 'SPORTS', 'CULTURAL', 'MEETING', 'OTHER'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="md:col-span-2 flex gap-3">
            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">Create Event</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
          </div>
        </form>
      )}

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2 hover:bg-gray-100 rounded-lg">
          &larr; Prev
        </button>
        <h2 className="text-lg font-semibold">{MONTHS[month]} {year}</h2>
        <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2 hover:bg-gray-100 rounded-lg">
          Next &rarr;
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>
      ) : view === 'calendar' ? (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="grid grid-cols-7 bg-gray-50">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div key={d} className="p-2 text-center text-xs font-semibold text-gray-600 border-b">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              const dayEvents = day ? eventsOnDay(day) : [];
              const isToday = day && new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
              return (
                <div key={i} className={`min-h-[80px] border-b border-r p-1 ${day ? 'bg-white' : 'bg-gray-50'}`}>
                  {day && (
                    <>
                      <div className={`text-xs font-medium mb-1 ${isToday ? 'bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-full' : 'text-gray-600'}`}>
                        {day}
                      </div>
                      {dayEvents.slice(0, 3).map((ev) => (
                        <div key={ev.id} className={`text-[10px] px-1 py-0.5 rounded border mb-0.5 truncate ${EVENT_COLOURS[ev.type] || EVENT_COLOURS.OTHER}`}>
                          {ev.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && <div className="text-[10px] text-gray-500">+{dayEvents.length - 3} more</div>}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {events.length === 0 ? (
            <p className="text-center text-gray-500 py-12">No events this month.</p>
          ) : (
            events.map((ev) => (
              <div key={ev.id} className="bg-white rounded-xl border p-4 flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${EVENT_COLOURS[ev.type] || EVENT_COLOURS.OTHER}`}>{ev.type}</span>
                    <h3 className="font-semibold text-gray-900">{ev.title}</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    {new Date(ev.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {ev.startDate !== ev.endDate && ` — ${new Date(ev.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                  </p>
                  {ev.location && <p className="text-sm text-gray-500 mt-1">📍 {ev.location}</p>}
                  {ev.description && <p className="text-sm text-gray-500 mt-1">{ev.description}</p>}
                </div>
                {role === 'ADMIN' && (
                  <button onClick={() => handleDelete(ev.id)} className="text-red-500 hover:text-red-700 text-sm ml-4">Delete</button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
