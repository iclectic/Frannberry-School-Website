export type RoleName = 'ADMIN' | 'STAFF' | 'TEACHER' | 'STUDENT' | 'PARENT' | 'HEAD';

export type ConversationPurpose =
  | 'PARENT_TEACHER'
  | 'PARENT_HEAD'
  | 'TEACHER_TEACHER'
  | 'TEACHER_HEAD'
  | 'PUPIL_TEACHER';

export interface GraphUser {
  userId: string;
  role: RoleName;
  name: string;
  schoolIds: string[];
  classIds: string[];
}

export interface GraphChild {
  studentId: string;
  studentUserId: string | null;
  name: string;
  schoolId: string;
  classId: string | null;
  parentUserIds: string[];
  teacherUserIds: string[];
  headUserId: string | null;
}

export interface ContactChild {
  studentId: string;
  name: string;
  schoolId: string;
}

export interface ContactCandidate {
  userId: string;
  role: RoleName;
  name: string;
  purpose: ConversationPurpose;
  schoolIds: string[];
  children: ContactChild[];
  requiresStudentId: boolean;
}

export type ThreadResolution =
  | {
      ok: true;
      purpose: ConversationPurpose;
      schoolId: string;
      studentId: string | null;
    }
  | { ok: false; status: 400 | 403; reason: string };

function userById(users: GraphUser[], userId: string): GraphUser | undefined {
  return users.find((user) => user.userId === userId);
}

function pushContact(
  raw: Array<Omit<ContactCandidate, 'requiresStudentId'>>,
  contact: Omit<ContactCandidate, 'requiresStudentId'>,
) {
  raw.push(contact);
}

export function contactsFor(viewerId: string, users: GraphUser[], children: GraphChild[]): ContactCandidate[] {
  const viewer = userById(users, viewerId);
  if (!viewer) return [];
  if (viewer.role === 'ADMIN' || viewer.role === 'STAFF') return [];

  const raw: Array<Omit<ContactCandidate, 'requiresStudentId'>> = [];

  if (viewer.role === 'PARENT') {
    const mine = children.filter((child) => child.parentUserIds.includes(viewerId));
    for (const child of mine) {
      for (const teacherId of child.teacherUserIds) {
        const teacher = userById(users, teacherId);
        if (!teacher || teacher.role !== 'TEACHER') continue;
        pushContact(raw, {
          userId: teacher.userId,
          role: 'TEACHER',
          name: teacher.name,
          purpose: 'PARENT_TEACHER',
          schoolIds: [child.schoolId],
          children: [{ studentId: child.studentId, name: child.name, schoolId: child.schoolId }],
        });
      }
      if (child.headUserId) {
        const head = userById(users, child.headUserId);
        if (head && head.role === 'HEAD') {
          pushContact(raw, {
            userId: head.userId,
            role: 'HEAD',
            name: head.name,
            purpose: 'PARENT_HEAD',
            schoolIds: [child.schoolId],
            children: [{ studentId: child.studentId, name: child.name, schoolId: child.schoolId }],
          });
        }
      }
    }
  }

  if (viewer.role === 'TEACHER') {
    const mine = new Set(viewer.schoolIds);
    for (const other of users) {
      if (other.userId === viewerId) continue;
      if (other.role === 'TEACHER') {
        const shared = other.schoolIds.filter((id) => mine.has(id));
        if (shared.length === 0) continue;
        pushContact(raw, {
          userId: other.userId,
          role: 'TEACHER',
          name: other.name,
          purpose: 'TEACHER_TEACHER',
          schoolIds: shared,
          children: [],
        });
      }
      if (other.role === 'HEAD') {
        const shared = other.schoolIds.filter((id) => mine.has(id));
        if (shared.length === 0) continue;
        pushContact(raw, {
          userId: other.userId,
          role: 'HEAD',
          name: other.name,
          purpose: 'TEACHER_HEAD',
          schoolIds: shared,
          children: [],
        });
      }
    }
  }

  if (viewer.role === 'STUDENT') {
    const self = children.find((child) => child.studentUserId === viewerId);
    if (!self) return [];
    for (const teacherId of self.teacherUserIds) {
      const teacher = userById(users, teacherId);
      if (!teacher || teacher.role !== 'TEACHER') continue;
      pushContact(raw, {
        userId: teacher.userId,
        role: 'TEACHER',
        name: teacher.name,
        purpose: 'PUPIL_TEACHER',
        schoolIds: [self.schoolId],
        children: [{ studentId: self.studentId, name: self.name, schoolId: self.schoolId }],
      });
    }
  }

  if (viewer.role === 'HEAD') {
    const schoolId = viewer.schoolIds[0];
    if (!schoolId) return [];
    for (const other of users) {
      if (other.role === 'TEACHER' && other.schoolIds.includes(schoolId)) {
        pushContact(raw, {
          userId: other.userId,
          role: 'TEACHER',
          name: other.name,
          purpose: 'TEACHER_HEAD',
          schoolIds: [schoolId],
          children: [],
        });
      }
    }
    const parents = new Map<string, { name: string; children: ContactChild[] }>();
    for (const child of children) {
      if (child.schoolId !== schoolId) continue;
      for (const parentId of child.parentUserIds) {
        const parent = userById(users, parentId);
        if (!parent || parent.role !== 'PARENT') continue;
        const entry = parents.get(parentId) ?? { name: parent.name, children: [] };
        entry.children.push({ studentId: child.studentId, name: child.name, schoolId: child.schoolId });
        parents.set(parentId, entry);
      }
    }
    for (const [parentId, entry] of parents) {
      pushContact(raw, {
        userId: parentId,
        role: 'PARENT',
        name: entry.name,
        purpose: 'PARENT_HEAD',
        schoolIds: [schoolId],
        children: entry.children,
      });
    }
  }

  return mergeContacts(raw);
}

function mergeContacts(raw: Array<Omit<ContactCandidate, 'requiresStudentId'>>): ContactCandidate[] {
  const map = new Map<string, ContactCandidate>();
  for (const item of raw) {
    const key = `${item.userId}|${item.purpose}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        ...item,
        schoolIds: [...item.schoolIds],
        children: [...item.children],
        requiresStudentId: false,
      });
      continue;
    }
    for (const schoolId of item.schoolIds) {
      if (!existing.schoolIds.includes(schoolId)) existing.schoolIds.push(schoolId);
    }
    for (const child of item.children) {
      if (!existing.children.some((current) => current.studentId === child.studentId)) {
        existing.children.push(child);
      }
    }
  }
  for (const contact of map.values()) {
    contact.requiresStudentId = contact.children.length > 1;
  }
  return [...map.values()];
}

export function resolveThread(
  viewerId: string,
  participantId: string,
  studentId: string | undefined,
  users: GraphUser[],
  children: GraphChild[],
): ThreadResolution {
  if (viewerId === participantId) {
    return { ok: false, status: 403, reason: 'You cannot open a conversation with yourself' };
  }

  const contacts = contactsFor(viewerId, users, children).filter((contact) => contact.userId === participantId);
  if (contacts.length === 0) {
    return { ok: false, status: 403, reason: 'You cannot open a conversation with this person' };
  }

  let contact = contacts[0];
  if (studentId) {
    const matched = contacts.find((item) => item.children.some((child) => child.studentId === studentId));
    if (!matched && contacts.some((item) => item.children.length > 0)) {
      return { ok: false, status: 403, reason: 'That child does not share this person' };
    }
    if (matched) contact = matched;
  }

  if (contact.requiresStudentId && !studentId) {
    return {
      ok: false,
      status: 400,
      reason: 'studentId is required because more than one child shares this person',
    };
  }

  let child: ContactChild | null = null;
  if (studentId) {
    child = contact.children.find((item) => item.studentId === studentId) ?? null;
    if (!child && contact.children.length > 0) {
      return { ok: false, status: 403, reason: 'That child does not share this person' };
    }
  } else if (contact.children.length === 1) {
    child = contact.children[0];
  }

  const schoolId = child?.schoolId ?? [...contact.schoolIds].sort()[0];
  if (!schoolId) {
    return { ok: false, status: 403, reason: 'You cannot open a conversation with this person' };
  }

  return {
    ok: true,
    purpose: contact.purpose,
    schoolId,
    studentId: child?.studentId ?? null,
  };
}

/** Identity of a thread. The same pair, purpose, and child always match, whoever opens it. */
export function threadKey(
  userA: string,
  userB: string,
  purpose: ConversationPurpose,
  studentId: string | null,
): string {
  const [first, second] = [userA, userB].sort();
  return `${first}|${second}|${purpose}|${studentId ?? ''}`;
}
