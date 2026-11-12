'use client';

import { useEffect, useState } from 'react';

type SchoolCard = {
  phase: string;
  name: string;
  ageMin: number;
  ageMax: number;
  keyStages: string[];
  pupilsCanLogin: boolean;
  note: string;
  headteacher: { firstName: string; lastName: string } | null;
};

const FALLBACK: SchoolCard[] = [
  { phase: 'NURSERY', name: 'Nursery', ageMin: 2, ageMax: 4, keyStages: ['EYFS'], pupilsCanLogin: false, note: 'Nursery is EYFS only. Children have a pupil record and cannot log in.', headteacher: null },
  { phase: 'PRIMARY', name: 'Primary', ageMin: 4, ageMax: 11, keyStages: ['EYFS', 'KS1', 'KS2'], pupilsCanLogin: true, note: 'Reception stays in Primary and is still EYFS.', headteacher: null },
  { phase: 'SECONDARY', name: 'Secondary', ageMin: 11, ageMax: 18, keyStages: ['KS3', 'KS4', 'KS5'], pupilsCanLogin: true, note: 'Secondary covers KS3, KS4, and KS5.', headteacher: null },
];

export default function SchoolsSection({ heading = 'Three schools, one trust' }: { heading?: string }) {
  const [schools, setSchools] = useState<SchoolCard[]>(FALLBACK);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    fetch(`${base}/school/phases`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data?.schools) && data.schools.length === 3) setSchools(data.schools);
      })
      .catch(() => {});
  }, []);

  return (
    <section className="bg-white py-16" aria-labelledby="schools-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 id="schools-heading" className="text-3xl font-bold text-gray-900 sm:text-4xl">{heading}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            Frannberry is one trust. Families can have children in Nursery, Primary, and Secondary.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {schools.map((school) => (
            <article key={school.phase} className="card">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">{school.phase}</p>
              <h3 className="mt-1 text-2xl font-bold text-gray-900">{school.name}</h3>
              <p className="mt-2 text-sm text-gray-600">Ages {school.ageMin}–{school.ageMax}</p>
              <p className="mt-3 text-sm font-medium text-gray-800">Key stages: {school.keyStages.join(', ')}</p>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">{school.note}</p>
              {school.headteacher && (
                <p className="mt-4 text-sm text-gray-700">
                  Headteacher: {school.headteacher.firstName} {school.headteacher.lastName}
                </p>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
