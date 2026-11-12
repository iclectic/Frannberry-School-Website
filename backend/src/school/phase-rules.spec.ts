import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  PHASE_RULES,
  keyStageFitsSchool,
  placementError,
  pupilCanLogin,
} from './phase-rules';

test('the public phase catalogue names Nursery, Primary, and Secondary', () => {
  assert.deepEqual(
    PHASE_RULES.map((rule) => rule.name),
    ['Nursery', 'Primary', 'Secondary'],
  );
  assert.deepEqual(
    PHASE_RULES.map((rule) => [rule.ageMin, rule.ageMax]),
    [
      [2, 4],
      [4, 11],
      [11, 18],
    ],
  );
});

test('Nursery accepts only EYFS', () => {
  assert.equal(keyStageFitsSchool('NURSERY', 'EYFS'), true);
  for (const stage of ['KS1', 'KS2', 'KS3', 'KS4', 'KS5']) {
    assert.equal(keyStageFitsSchool('NURSERY', stage), false);
    assert.match(placementError('NURSERY', stage) ?? '', /Nursery/);
  }
});

test('Primary accepts EYFS, KS1, and KS2, including Reception', () => {
  assert.equal(keyStageFitsSchool('PRIMARY', 'EYFS'), true);
  assert.equal(keyStageFitsSchool('PRIMARY', 'KS1'), true);
  assert.equal(keyStageFitsSchool('PRIMARY', 'KS2'), true);
  assert.equal(placementError('PRIMARY', 'EYFS'), null);
  assert.match(PHASE_RULES[1].note, /Reception/);
  assert.equal(keyStageFitsSchool('PRIMARY', 'KS3'), false);
  assert.equal(keyStageFitsSchool('PRIMARY', 'KS4'), false);
  assert.equal(keyStageFitsSchool('PRIMARY', 'KS5'), false);
});

test('Secondary accepts KS3, KS4, and KS5 only', () => {
  assert.equal(keyStageFitsSchool('SECONDARY', 'KS3'), true);
  assert.equal(keyStageFitsSchool('SECONDARY', 'KS4'), true);
  assert.equal(keyStageFitsSchool('SECONDARY', 'KS5'), true);
  assert.equal(keyStageFitsSchool('SECONDARY', 'EYFS'), false);
  assert.equal(keyStageFitsSchool('SECONDARY', 'KS1'), false);
  assert.equal(keyStageFitsSchool('SECONDARY', 'KS2'), false);
});

test('an unknown school or key stage is rejected', () => {
  assert.equal(keyStageFitsSchool('TRUST', 'EYFS'), false);
  assert.equal(keyStageFitsSchool('PRIMARY', 'KS9'), false);
});

test('nursery children cannot log in; primary and secondary pupils can', () => {
  assert.equal(pupilCanLogin('NURSERY'), false);
  assert.equal(pupilCanLogin('PRIMARY'), true);
  assert.equal(pupilCanLogin('SECONDARY'), true);
});
