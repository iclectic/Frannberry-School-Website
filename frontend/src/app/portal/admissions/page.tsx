'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';

export default function PortalAdmissionsPage() {
  const { user, token } = useAuth();
  const [applications, setApplications] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState('');
  const [classById, setClassById] = useState<Record<string, string>>({});
  const [loginById, setLoginById] = useState<Record<string, boolean>>({});
  const [emailById, setEmailById] = useState<Record<string, string>>({});

  const load = () => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      apiFetch('/admissions/applications', { token }),
      apiFetch('/attendance/classes', { token }).catch(() => []),
    ])
      .then(([data, classList]) => {
        setApplications(Array.isArray(data?.applications) ? data.applications : []);
        setClasses(Array.isArray(classList) ? classList : []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Applications could not be loaded.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [token]);

  const enrol = async (application: any) => {
    if (!token) return;
    setBusyId(application.id);
    setError('');
    setNotice('');
    const createLogin = Boolean(loginById[application.id]) && application.canHaveLogin;
    try {
      const result = await apiFetch(`/admissions/applications/${application.id}/enrol`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          classId: classById[application.id] || undefined,
          createLogin,
          loginEmail: createLogin ? emailById[application.id] : undefined,
        }),
      });
      const password = result.login?.temporaryPassword
        ? ` Login ${result.login.email} / ${result.login.temporaryPassword}. This password is shown once.`
        : ' The pupil record has no login.';
      setNotice(`${result.application.childFirstName} ${result.application.childLastName} is enrolled at ${result.application.schoolName}. Admission number ${result.pupil.admissionNo}.${password}`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The place could not be offered.');
    } finally {
      setBusyId('');
    }
  };

  const decline = async (application: any) => {
    if (!token) return;
    setBusyId(application.id);
    setError('');
    try {
      await apiFetch(`/admissions/applications/${application.id}/decline`, { method: 'POST', token });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The application could not be declined.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Admissions</h1>
      <p className="mb-6 text-sm text-gray-500">
        {user?.role === 'ADMIN'
          ? 'The office can review Nursery, Primary, and Secondary. A headteacher still only sees their own school.'
          : 'Applications for your school. A Nursery place has a pupil record and no login. Primary and Secondary places can include a login.'}
      </p>
      {notice && <p className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
      {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : applications.length === 0 ? (
        <p className="text-sm text-gray-500">No applications for this school.</p>
      ) : (
        <div className="space-y-4">
          {applications.map((application) => {
            const matching = classes.filter((schoolClass) => schoolClass.schoolName === application.schoolName && schoolClass.keyStage === application.keyStage);
            return (
              <article key={application.id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{application.childFirstName} {application.childLastName}</h2>
                    <p className="mt-1 text-sm text-gray-600">
                      {application.schoolName} · {application.keyStage} · aged {application.age} · {application.reference}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {application.parentFirstName} {application.parentLastName} · {application.parentEmail}
                    </p>
                  </div>
                  <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">{application.status}</span>
                </div>
                {application.status === 'ENROLLED' && (
                  <p className="mt-3 text-sm text-gray-700">
                    Admission number {application.admissionNo}. {application.hasLogin ? 'This pupil can sign in.' : 'This pupil has a record and cannot sign in.'}
                  </p>
                )}
                {application.status === 'RECEIVED' && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label-text" htmlFor={`class-${application.id}`}>Class</label>
                      <select
                        id={`class-${application.id}`}
                        className="input-field"
                        value={classById[application.id] ?? ''}
                        onChange={(event) => setClassById((current) => ({ ...current, [application.id]: event.target.value }))}
                      >
                        <option value="">No class yet</option>
                        {matching.map((schoolClass) => (
                          <option key={schoolClass.id} value={schoolClass.id}>
                            {schoolClass.name}{schoolClass.section ? ` ${schoolClass.section}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    {application.canHaveLogin ? (
                      <div>
                        <label className="mt-6 flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={Boolean(loginById[application.id])}
                            onChange={(event) => setLoginById((current) => ({ ...current, [application.id]: event.target.checked }))}
                          />
                          Create a login
                        </label>
                        {loginById[application.id] && (
                          <input
                            className="input-field mt-2"
                            type="email"
                            placeholder="pupil@frannberry.school"
                            aria-label={`Login email for ${application.childFirstName}`}
                            value={emailById[application.id] ?? ''}
                            onChange={(event) => setEmailById((current) => ({ ...current, [application.id]: event.target.value }))}
                          />
                        )}
                      </div>
                    ) : (
                      <p className="self-end text-sm text-gray-600">A Nursery place creates a pupil record and no login.</p>
                    )}
                    <div className="flex flex-wrap gap-2 sm:col-span-2">
                      <button type="button" className="btn-primary" disabled={busyId === application.id} onClick={() => enrol(application)}>Offer place</button>
                      <button type="button" className="btn-secondary" disabled={busyId === application.id} onClick={() => decline(application)}>Decline</button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
