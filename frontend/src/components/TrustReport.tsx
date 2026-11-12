export default function TrustReport({ report }: { report: any }) {
  if (!report?.schools) return null;
  return (
    <section className="mb-8" aria-label="Trust report">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Trust report</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Office report for Nursery, Primary, and Secondary. This account is the office admin, not a headteacher.
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {report.schools.map((school: any) => (
          <article key={school.phase} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">{school.phase}</p>
            <h3 className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">{school.schoolName}</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Headteacher: {school.headteacher || 'Not assigned'}</p>
            <p className="mt-3 text-sm text-gray-800 dark:text-gray-200">
              {school.pupils} pupils · {school.canSignIn} can sign in · {school.cannotSignIn} cannot sign in
            </p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {school.teacherCount} teachers · key stages {school.keyStages.length ? school.keyStages.join(', ') : 'none'}
            </p>
            <ul className="mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-300">
              {school.classes.map((schoolClass: any) => (
                <li key={`${schoolClass.name}-${schoolClass.section}`}>
                  {schoolClass.name}{schoolClass.section ? ` ${schoolClass.section}` : ''} · {schoolClass.keyStage} · {schoolClass.pupils} pupils
                </li>
              ))}
              {school.classes.length === 0 && <li>No classes</li>}
            </ul>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
              Attendance {school.attendance.present} present, {school.attendance.absent} absent, {school.attendance.late} late, of {school.attendance.total}
            </p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Applications {school.admissions.received} received, {school.admissions.enrolled} enrolled, {school.admissions.declined} declined
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
