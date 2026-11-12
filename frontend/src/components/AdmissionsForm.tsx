'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';

type Phase = {
  phase: string;
  name: string;
  ageMin: number;
  ageMax: number;
  keyStages: string[];
  pupilsCanLogin: boolean;
  note: string;
};

const FALLBACK: Phase[] = [
  { phase: 'NURSERY', name: 'Nursery', ageMin: 2, ageMax: 4, keyStages: ['EYFS'], pupilsCanLogin: false, note: 'Nursery is EYFS only. Children have a pupil record and cannot log in.' },
  { phase: 'PRIMARY', name: 'Primary', ageMin: 4, ageMax: 11, keyStages: ['EYFS', 'KS1', 'KS2'], pupilsCanLogin: true, note: 'Reception stays in Primary and is still EYFS.' },
  { phase: 'SECONDARY', name: 'Secondary', ageMin: 11, ageMax: 18, keyStages: ['KS3', 'KS4', 'KS5'], pupilsCanLogin: true, note: 'Secondary covers KS3, KS4, and KS5.' },
];

export default function AdmissionsForm() {
  const [phases, setPhases] = useState<Phase[]>(FALLBACK);
  const [phase, setPhase] = useState('NURSERY');
  const [keyStage, setKeyStage] = useState('EYFS');
  const [childFirstName, setChildFirstName] = useState('');
  const [childLastName, setChildLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [parentFirstName, setParentFirstName] = useState('');
  const [parentLastName, setParentLastName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch('/school/phases')
      .then((data) => {
        if (Array.isArray(data?.schools) && data.schools.length) setPhases(data.schools);
      })
      .catch(() => {});
  }, []);

  const selected = useMemo(() => phases.find((item) => item.phase === phase) ?? phases[0], [phases, phase]);

  const choosePhase = (next: string) => {
    const school = phases.find((item) => item.phase === next);
    setPhase(next);
    setKeyStage(school?.keyStages[0] ?? 'EYFS');
    setError('');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const application = await apiFetch('/admissions/applications', {
        method: 'POST',
        body: JSON.stringify({
          phase,
          keyStage,
          childFirstName,
          childLastName,
          dateOfBirth,
          parentFirstName,
          parentLastName,
          parentEmail,
          parentPhone,
        }),
      });
      setResult(application);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The application could not be sent.');
    } finally {
      setSaving(false);
    }
  };

  if (result) {
    return (
      <div className="card border-brand-200 bg-brand-50">
        <h3 className="text-lg font-semibold text-brand-800">Application received</h3>
        <p className="mt-2 text-sm text-gray-700">
          {result.childFirstName} {result.childLastName} has applied to {result.schoolName} ({result.keyStage}). Reference {result.reference}.
        </p>
        <p className="mt-2 text-sm text-gray-700">
          {result.canHaveLogin
            ? 'A Primary or Secondary place can include a login. The school sets that up when a place is offered.'
            : 'A Nursery place creates a pupil record. The child cannot sign in.'}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Apply for a place</h3>
        <p className="mt-1 text-sm text-gray-600">Choose Nursery, Primary, or Secondary. The age and key stage have to fit that school.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="phase" className="label-text">School</label>
          <select id="phase" className="input-field" value={phase} onChange={(event) => choosePhase(event.target.value)}>
            {phases.map((item) => (
              <option key={item.phase} value={item.phase}>{item.name} (ages {item.ageMin}–{item.ageMax})</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="keyStage" className="label-text">Key stage</label>
          <select id="keyStage" className="input-field" value={keyStage} onChange={(event) => setKeyStage(event.target.value)}>
            {selected?.keyStages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="childFirstName" className="label-text">Child’s first name</label>
          <input id="childFirstName" className="input-field" required value={childFirstName} onChange={(event) => setChildFirstName(event.target.value)} />
        </div>
        <div>
          <label htmlFor="childLastName" className="label-text">Child’s last name</label>
          <input id="childLastName" className="input-field" required value={childLastName} onChange={(event) => setChildLastName(event.target.value)} />
        </div>
        <div>
          <label htmlFor="dateOfBirth" className="label-text">Date of birth</label>
          <input id="dateOfBirth" type="date" className="input-field" required value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} />
        </div>
        <div>
          <label htmlFor="parentPhone" className="label-text">Parent phone</label>
          <input id="parentPhone" className="input-field" value={parentPhone} onChange={(event) => setParentPhone(event.target.value)} />
        </div>
        <div>
          <label htmlFor="parentFirstName" className="label-text">Parent’s first name</label>
          <input id="parentFirstName" className="input-field" required value={parentFirstName} onChange={(event) => setParentFirstName(event.target.value)} />
        </div>
        <div>
          <label htmlFor="parentLastName" className="label-text">Parent’s last name</label>
          <input id="parentLastName" className="input-field" required value={parentLastName} onChange={(event) => setParentLastName(event.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="parentEmail" className="label-text">Parent email</label>
          <input id="parentEmail" type="email" className="input-field" required value={parentEmail} onChange={(event) => setParentEmail(event.target.value)} />
        </div>
      </div>
      <p className="text-sm text-gray-600">{selected?.note}</p>
      <p className="text-sm text-gray-600">
        {selected?.pupilsCanLogin
          ? 'A place at this school can include a login.'
          : 'A place at this school creates a pupil record and no login.'}
      </p>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Sending…' : 'Submit application'}</button>
    </form>
  );
}
