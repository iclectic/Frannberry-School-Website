import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { contactsFor, resolveThread, threadKey, GraphChild, GraphUser } from './contact-graph';
import { unreadCount } from './unread';

const nursery = 'sch-n';
const primary = 'sch-p';
const secondary = 'sch-s';

const users: GraphUser[] = [
  { userId: 'admin', role: 'ADMIN', name: 'Margaret Thornton', schoolIds: [], classIds: [] },
  { userId: 'staff', role: 'STAFF', name: 'Ruth Okonkwo', schoolIds: [], classIds: [] },
  { userId: 'head-n', role: 'HEAD', name: 'Helen Green', schoolIds: [nursery], classIds: [] },
  { userId: 'head-p', role: 'HEAD', name: 'Priya Shah', schoolIds: [primary], classIds: [] },
  { userId: 'head-s', role: 'HEAD', name: 'Samuel Adeyemi', schoolIds: [secondary], classIds: [] },
  { userId: 't-n', role: 'TEACHER', name: 'Anna Brooks', schoolIds: [nursery], classIds: ['c-n'] },
  { userId: 't-p', role: 'TEACHER', name: 'Mei Chen', schoolIds: [primary], classIds: ['c-p'] },
  { userId: 't-s1', role: 'TEACHER', name: 'James Williams', schoolIds: [secondary], classIds: ['c-s'] },
  { userId: 't-s2', role: 'TEACHER', name: 'Sunita Patel', schoolIds: [secondary], classIds: ['c-s'] },
  { userId: 't-other', role: 'TEACHER', name: 'Other School', schoolIds: ['sch-x'], classIds: ['c-x'] },
  { userId: 'pupil-s', role: 'STUDENT', name: 'Oliver Smith', schoolIds: [secondary], classIds: ['c-s'] },
  { userId: 'pupil-s2', role: 'STUDENT', name: 'Amara Jones', schoolIds: [secondary], classIds: ['c-s'] },
  { userId: 'pupil-p', role: 'STUDENT', name: 'Isla Smith', schoolIds: [primary], classIds: ['c-p'] },
  { userId: 'parent', role: 'PARENT', name: 'David Smith', schoolIds: [nursery, primary, secondary], classIds: [] },
  { userId: 'other-parent', role: 'PARENT', name: 'Fatima Jones', schoolIds: [secondary], classIds: [] },
];

const children: GraphChild[] = [
  {
    studentId: 'poppy',
    studentUserId: null,
    name: 'Poppy Smith',
    schoolId: nursery,
    classId: 'c-n',
    parentUserIds: ['parent'],
    teacherUserIds: ['t-n'],
    headUserId: 'head-n',
  },
  {
    studentId: 'isla',
    studentUserId: 'pupil-p',
    name: 'Isla Smith',
    schoolId: primary,
    classId: 'c-p',
    parentUserIds: ['parent'],
    teacherUserIds: ['t-p'],
    headUserId: 'head-p',
  },
  {
    studentId: 'oliver',
    studentUserId: 'pupil-s',
    name: 'Oliver Smith',
    schoolId: secondary,
    classId: 'c-s',
    parentUserIds: ['parent'],
    teacherUserIds: ['t-s1', 't-s2'],
    headUserId: 'head-s',
  },
  {
    studentId: 'noah',
    studentUserId: null,
    name: 'Noah Smith',
    schoolId: secondary,
    classId: 'c-s',
    parentUserIds: ['parent'],
    teacherUserIds: ['t-s1'],
    headUserId: 'head-s',
  },
  {
    studentId: 'amara',
    studentUserId: 'pupil-s2',
    name: 'Amara Jones',
    schoolId: secondary,
    classId: 'c-s',
    parentUserIds: ['other-parent'],
    teacherUserIds: ['t-s1', 't-s2'],
    headUserId: 'head-s',
  },
];

function ids(viewerId: string) {
  return contactsFor(viewerId, users, children).map((contact) => contact.userId).sort();
}

test('a parent may write only to a teacher of their own child or that child\'s head', () => {
  const contacts = contactsFor('parent', users, children);
  assert.deepEqual(ids('parent'), ['head-n', 'head-p', 'head-s', 't-n', 't-p', 't-s1', 't-s2']);
  assert.equal(contacts.some((contact) => contact.userId === 'pupil-s'), false);
  assert.equal(contacts.some((contact) => contact.userId === 't-other'), false);
  assert.equal(contacts.some((contact) => contact.role === 'STUDENT'), false);
});

test('studentId is required when more than one child shares the same person', () => {
  const james = contactsFor('parent', users, children).find((contact) => contact.userId === 't-s1');
  assert.ok(james);
  assert.equal(james.requiresStudentId, true);
  assert.deepEqual(
    james.children.map((child) => child.studentId).sort(),
    ['noah', 'oliver'],
  );

  const missing = resolveThread('parent', 't-s1', undefined, users, children);
  assert.equal(missing.ok, false);
  if (!missing.ok) assert.equal(missing.status, 400);

  const opened = resolveThread('parent', 't-s1', 'oliver', users, children);
  assert.equal(opened.ok, true);
  if (opened.ok) {
    assert.equal(opened.purpose, 'PARENT_TEACHER');
    assert.equal(opened.studentId, 'oliver');
    assert.equal(opened.schoolId, secondary);
  }

  const notTheirs = resolveThread('parent', 't-s1', 'amara', users, children);
  assert.equal(notTheirs.ok, false);
  if (!notTheirs.ok) assert.equal(notTheirs.status, 403);
});

test('a single shared child does not ask for studentId and is stored on the thread', () => {
  const sunita = contactsFor('parent', users, children).find((contact) => contact.userId === 't-s2');
  assert.equal(sunita?.requiresStudentId, false);
  const opened = resolveThread('parent', 't-s2', undefined, users, children);
  assert.equal(opened.ok, true);
  if (opened.ok) assert.equal(opened.studentId, 'oliver');
});

test('a teacher may write to colleagues in a shared school and to that school\'s head', () => {
  assert.deepEqual(ids('t-s1'), ['head-s', 't-s2']);
  const opened = resolveThread('t-s1', 't-s2', undefined, users, children);
  assert.equal(opened.ok, true);
  if (opened.ok) {
    assert.equal(opened.purpose, 'TEACHER_TEACHER');
    assert.equal(opened.studentId, null);
    assert.equal(opened.schoolId, secondary);
  }
  assert.equal(resolveThread('t-s1', 't-other', undefined, users, children).ok, false);
  assert.equal(resolveThread('t-s1', 'parent', undefined, users, children).ok, false);
  assert.equal(resolveThread('t-s1', 'head-n', undefined, users, children).ok, false);
});

test('a pupil may write only to a teacher of their own class', () => {
  assert.deepEqual(ids('pupil-s'), ['t-s1', 't-s2']);
  assert.equal(resolveThread('pupil-s', 'pupil-s2', undefined, users, children).ok, false);
  assert.equal(resolveThread('pupil-s', 'head-s', undefined, users, children).ok, false);
  assert.equal(resolveThread('pupil-s', 'parent', undefined, users, children).ok, false);
  const opened = resolveThread('pupil-s', 't-s1', undefined, users, children);
  assert.equal(opened.ok, true);
  if (opened.ok) {
    assert.equal(opened.purpose, 'PUPIL_TEACHER');
    assert.equal(opened.studentId, 'oliver');
  }
});

test('a head may write to a teacher in their school or a parent of a pupil there', () => {
  assert.deepEqual(ids('head-s'), ['other-parent', 'parent', 't-s1', 't-s2']);
  assert.equal(resolveThread('head-s', 'pupil-s', undefined, users, children).ok, false);
  assert.equal(resolveThread('head-s', 't-n', undefined, users, children).ok, false);
  const parentThread = resolveThread('head-s', 'parent', 'isla', users, children);
  assert.equal(parentThread.ok, false);
  const shared = resolveThread('head-s', 'parent', undefined, users, children);
  assert.equal(shared.ok, false);
  if (!shared.ok) assert.equal(shared.status, 400);
  const chosen = resolveThread('head-s', 'parent', 'noah', users, children);
  assert.equal(chosen.ok, true);
  if (chosen.ok) {
    assert.equal(chosen.purpose, 'PARENT_HEAD');
    assert.equal(chosen.schoolId, secondary);
  }
});

test('office admin and other staff cannot open threads', () => {
  assert.deepEqual(contactsFor('admin', users, children), []);
  assert.deepEqual(contactsFor('staff', users, children), []);
  assert.equal(resolveThread('admin', 't-s1', undefined, users, children).ok, false);
  assert.equal(resolveThread('staff', 'parent', undefined, users, children).ok, false);
});

test('re-opening the same pair produces the same thread key', () => {
  const forward = resolveThread('parent', 't-p', undefined, users, children);
  const backward = resolveThread('t-p', 'parent', undefined, users, children);
  assert.equal(forward.ok, true);
  assert.equal(backward.ok, false);
  if (forward.ok) {
    const key = threadKey('parent', 't-p', forward.purpose, forward.studentId);
    assert.equal(key, threadKey('t-p', 'parent', forward.purpose, forward.studentId));
  }
});

test('unread counts include every message from someone else since the thread was opened', () => {
  const opened = new Date('2026-11-12T10:00:00.000Z');
  const messages = [
    { senderId: 'parent', createdAt: new Date('2026-11-12T09:00:00.000Z') },
    { senderId: 'teacher', createdAt: new Date('2026-11-12T09:30:00.000Z') },
    { senderId: 'teacher', createdAt: new Date('2026-11-12T10:00:00.000Z') },
    { senderId: 'teacher', createdAt: new Date('2026-11-12T10:05:00.000Z') },
    { senderId: 'parent', createdAt: new Date('2026-11-12T10:06:00.000Z') },
  ];
  assert.equal(unreadCount(messages, 'parent', opened), 1);
  assert.equal(unreadCount(messages, 'parent', null), 3);
  assert.equal(unreadCount(messages, 'teacher', opened), 1);
});
