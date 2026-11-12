# Frannberry Schools build plan

Frannberry is one trust with three schools: Nursery, Primary, and Secondary. This plan records the work in the order it is being built. Steps 1–5 are done. Steps 6–8 are not started.

## Done

### Step 1. Schools, headteachers, and class placement

- The trust has Nursery (ages 2–4, EYFS only), Primary (ages 4–11, EYFS, KS1, and KS2), and Secondary (ages 11–18, KS3, KS4, and KS5).
- Reception stays in Primary and is still EYFS.
- Each school has one headteacher with a `HEAD` account, separate from the office `ADMIN` account.
- A class belongs to one school and one key stage. A class that breaks the pairing is rejected.
- One parent can be linked to children in different schools. In the seed, David Smith has Poppy in Nursery, Isla in Primary, and Oliver in Secondary.
- Nursery children have a pupil record and cannot sign in. Primary and secondary pupils can.
- The public site names Nursery, Primary, and Secondary.
- `GET /api/v1/school/phases` is public. `GET /api/v1/school/me` returns the signed-in user’s schools, class, and children.

### Step 2. Who may open a conversation

- A parent may write only to a teacher of their own child, or the head of that child’s school.
- A teacher may write to another teacher in a school they both teach in, and to the head of a school they teach in.
- A pupil may write only to a teacher of their own class.
- A head may write to a teacher in their school or a parent of a pupil there.
- Office admin and other staff cannot open threads. Pupils cannot write to other pupils.
- A thread stores its purpose, school, and child. Opening the same pair again returns the existing thread.
- Unread counts include every message from someone else since the reader last opened the thread.
- `GET /api/v1/messaging/contacts` lists who the signed-in user may write to.
- `POST /api/v1/messaging/conversations` takes `participantId` and, when more than one child shares that person, `studentId`.

### Step 3. Parent weekly allowance

- A parent may send 5 messages a week to teachers, shared across every teacher thread, and 1 message a week to the head of each school a child attends.
- The week runs from Monday 00:00 Europe/London to the next Monday 00:00.
- The count and the insert happen in one database transaction. A send past the limit is refused and is not stored.
- Deleting a message does not restore the allowance. A teacher or head reply does not count.
- Teachers, pupils, and heads have no weekly limit.
- The composer shows the remaining count and closes when it reaches zero.
- `GET /api/v1/messaging/conversations/:id/allowance` returns the remaining allowance.

### Step 4. Account security

- Password reset uses its own table and no longer overwrites the authenticator secret.
- Refresh tokens and backup codes are stored as hashes. The authenticator secret is encrypted.
- MFA is marked on only after a valid code. Eight single-use backup codes are shown once.
- An account locks for 15 minutes after 5 failed sign-ins. A successful password reset clears the lock.
- `HEAD`, `ADMIN`, and `TEACHER` may sign in before MFA is confirmed, but that session can only open authenticator setup or sign out. Those roles cannot turn MFA off.
- Parents, pupils, and other staff may turn MFA on if they want to.

### Step 5. School-scoped dashboards

- A headteacher’s dashboard is their own school: its classes, teachers, and pupils. Pupils and classes from the other schools are not included.
- Nursery pupils are shown as unable to sign in. Primary and secondary pupils who have a login are shown as able to sign in.
- `GET /api/v1/school/dashboard` is only for a `HEAD` account.
- A parent can open a pupil record for their own child. A nursery child cannot sign in, so that record is how the parent sees the child’s school, class, and teacher.
- `GET /api/v1/school/children/:studentId` is only for a `PARENT` linked to that child. Another parent receives “Child not found”.

## Later

### Step 6. School-scoped teaching records

Filter attendance, the timetable, announcements, and report cards by the pupil’s school and key stage.

### Step 7. Admissions by school

Take applications for Nursery, Primary, and Secondary. A Nursery place creates a pupil record and no login. Primary and Secondary places can create a login.

### Step 8. Trust reports

Give the office admin reports across Nursery, Primary, and Secondary without turning the office account into a headteacher.
