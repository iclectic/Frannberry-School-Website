'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';

const KEY_STAGES = ['EYFS', 'KS1', 'KS2', 'KS3', 'KS4', 'KS5'];

export default function PortalClassesPage() {
  const { token } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({ name: '', year: '1', section: 'A', schoolId: '', keyStage: 'EYFS' });

  function load() {
    if (!token) return;
    setLoading(true);
    Promise.all([
      apiFetch('/admin/classes', { token }),
      apiFetch('/school/phases'),
    ])
      .then(([classData, phaseData]) => {
        setClasses(Array.isArray(classData) ? classData : []);
        const list = phaseData?.schools ?? [];
        setSchools(list);
        setForm((current) => ({ ...current, schoolId: current.schoolId || list.find((school: any) => school.id)?.id || '' }));
      })
      .catch(() => setClasses([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function createClass(event: FormEvent) {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      await apiFetch('/admin/classes', {
        method: 'POST',
        token: token!,
        body: JSON.stringify({
          name: form.name,
          year: Number(form.year),
          section: form.section || undefined,
          schoolId: form.schoolId,
          keyStage: form.keyStage,
        }),
      });
      setNotice(`${form.name} was placed in the selected school.`);
      setForm((current) => ({ ...current, name: '' }));
      load();
    } catch (err: any) {
      setError(err.message || 'This class could not be created');
    }
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Classes</h1>
      <p className="mb-6 text-sm text-gray-500">A class belongs to one school and one key stage that school teaches. Reception stays in Primary and is still EYFS.</p>

      <form onSubmit={createClass} className="card mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <input className="input-field lg:col-span-2" placeholder="Class name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="input-field" type="number" min={0} required value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} aria-label="Year" />
        <select className="input-field" value={form.schoolId} onChange={(e) => setForm({ ...form, schoolId: e.target.value })} aria-label="School">
          {schools.map((school) => (
            <option key={school.phase} value={school.id || ''}>{school.name}</option>
          ))}
        </select>
        <select className="input-field" value={form.keyStage} onChange={(e) => setForm({ ...form, keyStage: e.target.value })} aria-label="Key stage">
          {KEY_STAGES.map((stage) => <option key={stage}>{stage}</option>)}
        </select>
        <button className="btn-primary" type="submit">Add class</button>
        {error && <p className="text-sm text-red-700 sm:col-span-2 lg:col-span-6" role="alert">{error}</p>}
        {notice && <p className="text-sm text-green-700 sm:col-span-2 lg:col-span-6">{notice}</p>}
      </form>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : classes.length === 0 ? (
        <p className="text-sm text-gray-500">No classes found.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls: any) => (
            <div key={cls.id} className="card">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">{cls.school?.name || 'School'}</p>
              <h2 className="text-lg font-semibold text-gray-900">{cls.name}</h2>
              <p className="mt-1 text-sm text-gray-500">{cls.keyStage} · Year {cls.year}{cls.section ? ` · ${cls.section}` : ''}</p>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-gray-500">Pupils</span>
                <span className="font-medium text-gray-900">{cls._count?.students ?? cls.students?.length ?? 0}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
