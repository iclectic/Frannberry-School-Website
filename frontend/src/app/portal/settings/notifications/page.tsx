'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';

interface Prefs {
  emailAnnouncements: boolean;
  emailMessages: boolean;
  emailAssignments: boolean;
  emailResults: boolean;
  emailEvents: boolean;
  emailFees: boolean;
  pushEnabled: boolean;
  digestEnabled: boolean;
  digestFrequency: string;
}

const DEFAULT_PREFS: Prefs = {
  emailAnnouncements: true,
  emailMessages: true,
  emailAssignments: true,
  emailResults: true,
  emailEvents: true,
  emailFees: true,
  pushEnabled: true,
  digestEnabled: false,
  digestFrequency: 'daily',
};

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
      >
        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

export default function NotificationPreferencesPage() {
  const { token } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiFetch('/notification-preferences', { token })
      .then((data) => {
        const { id, userId, ...rest } = data;
        setPrefs({ ...DEFAULT_PREFS, ...rest });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await apiFetch('/notification-preferences', {
        token: token!,
        method: 'PATCH',
        body: JSON.stringify(prefs),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    setSaving(false);
  }

  function update(key: keyof Prefs, value: boolean | string) {
    setPrefs((p) => ({ ...p, [key]: value }));
  }

  if (loading) {
    return <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Notification Preferences</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Choose how and when you receive notifications.</p>

      {/* Email Notifications */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 p-6 mb-6">
        <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Email Notifications</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Control which types of events trigger an email.</p>
        <div className="divide-y dark:divide-gray-700">
          <Toggle label="Announcements" description="New school and class announcements" checked={prefs.emailAnnouncements} onChange={(v) => update('emailAnnouncements', v)} />
          <Toggle label="Messages" description="New direct messages and conversations" checked={prefs.emailMessages} onChange={(v) => update('emailMessages', v)} />
          <Toggle label="Assignments" description="New assignments and submission deadlines" checked={prefs.emailAssignments} onChange={(v) => update('emailAssignments', v)} />
          <Toggle label="Results" description="Grade releases and report cards" checked={prefs.emailResults} onChange={(v) => update('emailResults', v)} />
          <Toggle label="Events" description="Upcoming school events and calendar changes" checked={prefs.emailEvents} onChange={(v) => update('emailEvents', v)} />
          <Toggle label="Fees" description="Invoice generation and payment reminders" checked={prefs.emailFees} onChange={(v) => update('emailFees', v)} />
        </div>
      </div>

      {/* Push Notifications */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 p-6 mb-6">
        <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Push Notifications</h2>
        <Toggle label="Enable Push" description="Real-time in-app and browser push notifications" checked={prefs.pushEnabled} onChange={(v) => update('pushEnabled', v)} />
      </div>

      {/* Digest */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 p-6 mb-6">
        <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Email Digest</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Receive a summary email instead of individual notifications.</p>
        <Toggle label="Enable Digest" description="Batch notifications into a periodic summary" checked={prefs.digestEnabled} onChange={(v) => update('digestEnabled', v)} />
        {prefs.digestEnabled && (
          <div className="mt-3">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Frequency</label>
            <select
              value={prefs.digestFrequency}
              onChange={(e) => update('digestFrequency', e.target.value)}
              className="mt-1 block w-full border dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
        )}
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Preferences'}
        </button>
        {saved && <span className="text-sm text-green-600 dark:text-green-400">Saved successfully!</span>}
      </div>
    </div>
  );
}
