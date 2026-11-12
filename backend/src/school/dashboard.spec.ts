import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { shapeChildView, shapeHeadDashboard, DashboardClassInput, DashboardPupilInput } from './dashboard';

const nursery = { id: 'sch-n', phase: 'NURSERY', name: 'Nursery', ageMin: 2, ageMax: 4 };
const primary = { id: 'sch-p', phase: 'PRIMARY', name: 'Primary', ageMin: 4, ageMax: 11 };
const secondary = { id: 'sch-s', phase: 'SECONDARY', name: 'Secondary', ageMin: 11, ageMax: 18 };

const classes: DashboardClassInput[] = [
  { id: 'c-n', name: 'Nursery', year: 0, section: 'A', keyStage: 'EYFS', schoolId: nursery.id, teachers: [{ id: 't-n', name: 'Anna Brooks' }] },
  { id: 'c-r', name: 'Reception', year: 0, section: 'A', keyStage: 'EYFS', schoolId: primary.id, teachers: [] },
  { id: 'c-3', name: 'Year 3', year: 3, section: 'A', keyStage: 'KS2', schoolId: primary.id, teachers: [{ id: 't-p', name: 'Mei Chen' }] },
  { id: 'c-7', name: 'Year 7A', year: 7, section: 'A', keyStage: 'KS3', schoolId: secondary.id, teachers: [{ id: 't-s', name: 'James Williams' }] },
];

const pupils: DashboardPupilInput[] = [
  { studentId: 'poppy', firstName: 'Poppy', lastName: 'Smith', admissionNo: 'N01', schoolId: nursery.id, classId: 'c-n', userId: null, parents: [{ name: 'David Smith', relation: 'Father' }] },
  { studentId: 'isla', firstName: 'Isla', lastName: 'Smith', admissionNo: 'P01', schoolId: primary.id, classId: 'c-3', userId: 'user-isla', parents: [{ name: 'David Smith', relation: 'Father' }] },
  { studentId: 'oliver', firstName: 'Oliver', lastName: 'Smith', admissionNo: 'S01', schoolId: secondary.id, classId: 'c-7', userId: 'user-oliver', parents: [{ name: 'David Smith', relation: 'Father' }] },
];

test('a nursery head sees only Nursery pupils, and those pupils cannot sign in', () => {
  const dashboard = shapeHeadDashboard(nursery, classes, pupils);
  assert.equal(dashboard.school.name, 'Nursery');
  assert.deepEqual(dashboard.school.keyStages, ['EYFS']);
  assert.equal(dashboard.counts.pupils, 1);
  assert.equal(dashboard.counts.pupilsWithoutLogin, 1);
  assert.equal(dashboard.counts.classes, 1);
  assert.equal(dashboard.counts.teachers, 1);
  assert.deepEqual(dashboard.pupils.map((pupil) => pupil.firstName), ['Poppy']);
  assert.equal(dashboard.pupils[0].canLogin, false);
  assert.equal(dashboard.classes[0].name, 'Nursery');
  assert.equal(dashboard.classes[0].pupilCount, 1);
  assert.equal(JSON.stringify(dashboard).includes('Isla'), false);
  assert.equal(JSON.stringify(dashboard).includes('Oliver'), false);
});

test('a primary head sees Primary classes, including Reception, and not the other schools', () => {
  const dashboard = shapeHeadDashboard(primary, classes, pupils);
  assert.equal(dashboard.school.name, 'Primary');
  assert.deepEqual(dashboard.classes.map((item) => item.name), ['Reception', 'Year 3']);
  assert.equal(dashboard.classes[0].keyStage, 'EYFS');
  assert.equal(dashboard.classes[0].pupilCount, 0);
  assert.deepEqual(dashboard.pupils.map((pupil) => pupil.firstName), ['Isla']);
  assert.equal(dashboard.pupils[0].canLogin, true);
  assert.equal(dashboard.counts.pupilsWithoutLogin, 0);
  assert.equal(JSON.stringify(dashboard).includes('Poppy'), false);
});

test('a secondary head does not see nursery or primary pupils', () => {
  const dashboard = shapeHeadDashboard(secondary, classes, pupils);
  assert.deepEqual(dashboard.pupils.map((pupil) => pupil.firstName), ['Oliver']);
  assert.equal(dashboard.counts.classes, 1);
  assert.equal(dashboard.pupils[0].canLogin, true);
});

test('a nursery pupil with a user id still cannot sign in', () => {
  const dashboard = shapeHeadDashboard(nursery, classes, [
    { ...pupils[0], userId: 'should-not-count' },
  ]);
  assert.equal(dashboard.pupils[0].canLogin, false);
  assert.equal(dashboard.counts.pupilsWithoutLogin, 1);
});

test('a parent can open a nursery child record, and that child cannot sign in', () => {
  const result = shapeChildView({
    viewerParentId: 'david',
    linkedParentIds: ['david'],
    pupil: {
      studentId: 'poppy',
      firstName: 'Poppy',
      lastName: 'Smith',
      admissionNo: 'N01',
      dateOfBirth: '2023-06-10',
      enrollmentDate: '2026-09-01',
      userId: null,
      relation: 'Father',
      school: nursery,
      class: { id: 'c-n', name: 'Nursery', year: 0, keyStage: 'EYFS' },
      teachers: [{ name: 'Anna Brooks', subject: 'Communication and Language' }],
    },
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.view.canLogin, false);
  assert.equal(result.view.school?.name, 'Nursery');
  assert.equal(result.view.class?.keyStage, 'EYFS');
  assert.match(result.view.notice, /cannot sign in/);
  assert.match(result.view.notice, /pupil record/);
  assert.equal(result.view.teachers[0].name, 'Anna Brooks');
});

test('a parent cannot open a child they are not linked to', () => {
  const result = shapeChildView({
    viewerParentId: 'fatima',
    linkedParentIds: ['david'],
    pupil: {
      studentId: 'poppy',
      firstName: 'Poppy',
      lastName: 'Smith',
      admissionNo: 'N01',
      dateOfBirth: null,
      enrollmentDate: null,
      userId: null,
      relation: 'Father',
      school: nursery,
      class: null,
      teachers: [],
    },
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.status, 404);
});

test('a parent of a primary child is told that child can sign in', () => {
  const result = shapeChildView({
    viewerParentId: 'david',
    linkedParentIds: ['david'],
    pupil: {
      studentId: 'isla',
      firstName: 'Isla',
      lastName: 'Smith',
      admissionNo: 'P01',
      dateOfBirth: '2018-05-02',
      enrollmentDate: null,
      userId: 'user-isla',
      relation: 'Father',
      school: primary,
      class: { id: 'c-3', name: 'Year 3', year: 3, keyStage: 'KS2' },
      teachers: [],
    },
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.view.canLogin, true);
  assert.match(result.view.notice, /can sign in/);
});
