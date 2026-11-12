import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  allowanceForSend,
  allowanceScopeForMessage,
  londonLocalToUtc,
  londonWeekBounds,
} from './allowance';

test('a November week in London runs from Monday 00:00 GMT to the next Monday', () => {
  const week = londonWeekBounds(new Date('2026-11-12T15:00:00.000Z'));
  assert.equal(week.start.toISOString(), '2026-11-09T00:00:00.000Z');
  assert.equal(week.end.toISOString(), '2026-11-16T00:00:00.000Z');
});

test('Monday 00:00 London starts the new week and the previous instant stays in the old one', () => {
  const monday = londonWeekBounds(new Date('2026-11-09T00:00:00.000Z'));
  assert.equal(monday.start.toISOString(), '2026-11-09T00:00:00.000Z');
  const justBefore = londonWeekBounds(new Date('2026-11-08T23:59:59.000Z'));
  assert.equal(justBefore.start.toISOString(), '2026-11-02T00:00:00.000Z');
  assert.equal(justBefore.end.toISOString(), '2026-11-09T00:00:00.000Z');
});

test('a summer week uses British Summer Time, so Monday 00:00 London is 23:00 UTC', () => {
  const week = londonWeekBounds(new Date('2026-07-15T12:00:00.000Z'));
  assert.equal(week.start.toISOString(), '2026-07-12T23:00:00.000Z');
  assert.equal(week.end.toISOString(), '2026-07-19T23:00:00.000Z');
  assert.equal(londonLocalToUtc(2026, 7, 13).toISOString(), '2026-07-12T23:00:00.000Z');
});

test('the week that contains the spring clock change ends at Monday 00:00 BST', () => {
  const week = londonWeekBounds(new Date('2026-03-25T12:00:00.000Z'));
  assert.equal(week.start.toISOString(), '2026-03-23T00:00:00.000Z');
  assert.equal(week.end.toISOString(), '2026-03-29T23:00:00.000Z');
});

test('the week that contains the autumn clock change ends at Monday 00:00 GMT', () => {
  const week = londonWeekBounds(new Date('2026-10-25T12:00:00.000Z'));
  assert.equal(week.start.toISOString(), '2026-10-18T23:00:00.000Z');
  assert.equal(week.end.toISOString(), '2026-10-26T00:00:00.000Z');
});

test('parents share five teacher messages a week and get one message per head', () => {
  const teacher = allowanceForSend({ senderRole: 'PARENT', recipientRole: 'TEACHER', used: 4 });
  assert.equal(teacher.allowed, true);
  assert.equal(teacher.remaining, 1);
  assert.equal(teacher.limit, 5);
  assert.equal(teacher.scope, 'teachers');

  const blocked = allowanceForSend({ senderRole: 'PARENT', recipientRole: 'TEACHER', used: 5 });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);

  const head = allowanceForSend({ senderRole: 'PARENT', recipientRole: 'HEAD', used: 0 });
  assert.equal(head.allowed, true);
  assert.equal(head.limit, 1);
  assert.equal(allowanceForSend({ senderRole: 'PARENT', recipientRole: 'HEAD', used: 1 }).allowed, false);
});

test('teachers, pupils, and heads have no weekly limit', () => {
  for (const role of ['TEACHER', 'STUDENT', 'HEAD', 'ADMIN', 'STAFF']) {
    const decision = allowanceForSend({ senderRole: role, recipientRole: 'TEACHER', used: 99 });
    assert.equal(decision.limited, false);
    assert.equal(decision.allowed, true);
    assert.equal(decision.remaining, null);
  }
});

test('a deleted parent message still counts, and a teacher or head reply does not', () => {
  const week = londonWeekBounds(new Date('2026-11-12T12:00:00.000Z'));
  const inside = new Date('2026-11-12T09:00:00.000Z');
  const outside = new Date('2026-11-02T09:00:00.000Z');

  const messages = [
    { senderRole: 'PARENT', recipientRole: 'TEACHER', createdAt: inside, deleted: true },
    { senderRole: 'PARENT', recipientRole: 'TEACHER', createdAt: inside, deleted: true },
    { senderRole: 'PARENT', recipientRole: 'TEACHER', createdAt: inside, deleted: false },
    { senderRole: 'PARENT', recipientRole: 'TEACHER', createdAt: inside, deleted: false },
    { senderRole: 'PARENT', recipientRole: 'TEACHER', createdAt: inside, deleted: false },
    { senderRole: 'TEACHER', recipientRole: 'PARENT', createdAt: inside, deleted: false },
    { senderRole: 'HEAD', recipientRole: 'PARENT', createdAt: inside, deleted: false },
    { senderRole: 'PARENT', recipientRole: 'TEACHER', createdAt: outside, deleted: false },
    { senderRole: 'PARENT', recipientRole: 'HEAD', createdAt: inside, deleted: true, schoolId: 'secondary' },
  ];

  const teacherUsed = messages.filter((message) => allowanceScopeForMessage(message, week) === 'teachers').length;
  const headUsed = messages.filter((message) => allowanceScopeForMessage(message, week) === 'head').length;
  assert.equal(teacherUsed, 5);
  assert.equal(headUsed, 1);
  assert.equal(allowanceForSend({ senderRole: 'PARENT', recipientRole: 'TEACHER', used: teacherUsed }).allowed, false);
  assert.equal(allowanceForSend({ senderRole: 'PARENT', recipientRole: 'HEAD', used: headUsed }).allowed, false);
  assert.equal(
    allowanceScopeForMessage(
      { senderRole: 'PARENT', recipientRole: 'TEACHER', createdAt: inside, deleted: true },
      week,
    ),
    'teachers',
  );
});
