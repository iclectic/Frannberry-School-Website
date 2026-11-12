import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { canViewTrustReport, shapeTrustReport, TrustSchoolSource } from './trust-report';

const nursery: TrustSchoolSource = {
  phase: 'NURSERY',
  headteacher: 'Helen Green',
  teacherIds: ['anna', 'anna'],
  pupils: [{ userId: null }, { userId: 'should-not-count' }],
  classes: [{ name: 'Nursery', section: 'A', keyStage: 'EYFS', pupilCount: 2 }],
  attendance: [{ status: 'PRESENT' }],
  admissions: [{ status: 'ENROLLED' }, { status: 'RECEIVED' }],
};

const primary: TrustSchoolSource = {
  phase: 'PRIMARY',
  headteacher: 'Priya Shah',
  teacherIds: ['mei'],
  pupils: [{ userId: 'isla' }, { userId: null }],
  classes: [
    { name: 'Reception', section: 'A', keyStage: 'EYFS', pupilCount: 0 },
    { name: 'Year 3', section: 'A', keyStage: 'KS2', pupilCount: 2 },
  ],
  attendance: [{ status: 'LATE' }],
  admissions: [{ status: 'ENROLLED' }],
};

const secondary: TrustSchoolSource = {
  phase: 'SECONDARY',
  headteacher: 'Samuel Adeyemi',
  teacherIds: ['james', 'sunita'],
  pupils: [{ userId: 'oliver' }, { userId: 'amara' }, { userId: 'liam' }],
  classes: [{ name: 'Year 7A', section: 'A', keyStage: 'KS3', pupilCount: 2 }],
  attendance: [{ status: 'PRESENT' }, { status: 'ABSENT' }],
  admissions: [],
};

test('only the office admin can open the trust report', () => {
  assert.equal(canViewTrustReport('ADMIN'), true);
  for (const role of ['HEAD', 'TEACHER', 'PARENT', 'STUDENT', 'STAFF']) {
    assert.equal(canViewTrustReport(role), false);
  }
});

test('the office report keeps Nursery, Primary, and Secondary apart', () => {
  const report = shapeTrustReport([secondary, nursery, primary]);
  assert.equal(report.viewer, 'office');
  assert.equal(report.isHeadteacher, false);
  assert.deepEqual(report.schools.map((school) => school.schoolName), ['Nursery', 'Primary', 'Secondary']);
  assert.deepEqual(report.schools.map((school) => school.headteacher), ['Helen Green', 'Priya Shah', 'Samuel Adeyemi']);

  const [nurserySchool, primarySchool, secondarySchool] = report.schools;
  assert.equal(nurserySchool.pupils, 2);
  assert.equal(nurserySchool.canSignIn, 0);
  assert.equal(nurserySchool.cannotSignIn, 2);
  assert.equal(nurserySchool.teacherCount, 1);
  assert.deepEqual(nurserySchool.keyStages, ['EYFS']);
  assert.equal(nurserySchool.attendance.present, 1);
  assert.equal(nurserySchool.admissions.received, 1);

  assert.equal(primarySchool.canSignIn, 1);
  assert.equal(primarySchool.cannotSignIn, 1);
  assert.deepEqual(primarySchool.keyStages, ['EYFS', 'KS2']);
  assert.equal(primarySchool.classes[0].name, 'Reception');

  assert.equal(secondarySchool.pupils, 3);
  assert.equal(secondarySchool.attendance.absent, 1);
  assert.equal(report.totals.pupils, 7);
  assert.equal(report.totals.canSignIn, 4);
  assert.equal(report.totals.cannotSignIn, 3);
});

test('a missing school is still listed with empty figures', () => {
  const report = shapeTrustReport([nursery]);
  assert.equal(report.schools[1].schoolName, 'Primary');
  assert.equal(report.schools[1].pupils, 0);
  assert.equal(report.schools[2].schoolName, 'Secondary');
  assert.equal(report.totals.schools, 3);
});
