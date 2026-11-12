import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { applicationError, loginForPlace, parseDateOfBirth, reviewScope } from './place';

const on = new Date(Date.UTC(2026, 10, 12));

function dob(value: string) {
  const date = parseDateOfBirth(value);
  if (!date) throw new Error(`bad date ${value}`);
  return date;
}

test('a nursery application is for a child aged 2 or 3 in EYFS', () => {
  assert.equal(applicationError('NURSERY', 'EYFS', dob('2024-06-01'), on), null);
  assert.equal(applicationError('NURSERY', 'EYFS', dob('2023-04-02'), on), null);
  assert.match(applicationError('NURSERY', 'KS1', dob('2023-04-02'), on) ?? '', /EYFS/);
});

test('a child aged 4 belongs in Primary, including Reception', () => {
  const message = applicationError('NURSERY', 'EYFS', dob('2022-11-12'), on) ?? '';
  assert.match(message, /Primary/);
  assert.match(message, /Reception/);
  assert.equal(applicationError('PRIMARY', 'EYFS', dob('2022-09-01'), on), null);
  assert.equal(applicationError('PRIMARY', 'KS2', dob('2016-05-01'), on), null);
});

test('a child aged 11 belongs in Secondary, and 18 is still Secondary', () => {
  assert.match(applicationError('PRIMARY', 'KS2', dob('2015-11-12'), on) ?? '', /Secondary/);
  assert.equal(applicationError('SECONDARY', 'KS3', dob('2015-11-12'), on), null);
  assert.equal(applicationError('SECONDARY', 'KS5', dob('2008-11-12'), on), null);
  assert.match(applicationError('SECONDARY', 'KS1', dob('2014-01-20'), on) ?? '', /does not fit the Secondary/);
  assert.match(applicationError('SECONDARY', 'KS3', dob('2023-04-02'), on) ?? '', /Nursery/);
  assert.match(applicationError('SECONDARY', 'KS5', dob('2007-11-11'), on) ?? '', /outside/);
  assert.match(applicationError('NURSERY', 'EYFS', dob('2025-06-01'), on) ?? '', /outside/);
});

test('a Nursery place cannot create a login, and Primary and Secondary places can', () => {
  assert.equal(loginForPlace('NURSERY', false).createLogin, false);
  assert.match(loginForPlace('NURSERY', true).error ?? '', /no login/);
  assert.equal(loginForPlace('PRIMARY', true).createLogin, true);
  assert.equal(loginForPlace('PRIMARY', false).createLogin, false);
  assert.equal(loginForPlace('SECONDARY', true).createLogin, true);
  assert.equal(loginForPlace('SECONDARY', false).createLogin, false);
});

test('a head reviews only their school, and the office reviews every school', () => {
  assert.deepEqual(reviewScope('ADMIN', null), { all: true, schoolId: null });
  assert.deepEqual(reviewScope('HEAD', 'sch-n'), { all: false, schoolId: 'sch-n' });
  assert.equal('error' in reviewScope('HEAD', null), true);
  const teacher = reviewScope('TEACHER', null);
  assert.equal('error' in teacher, true);
  if ('error' in teacher) assert.match(teacher.error, /office/);
  assert.equal('error' in reviewScope('PARENT', null), true);
});
