import { PrismaClient, Role, AssessmentType, AnnouncementScope, DayOfWeek, AttendanceStatus, EventType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

async function main() {
  console.log('🌱 Seeding Frannberry School database...\n');

  // ── Clean existing data ─────────────────────────────────────────────────────
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.feeTemplate.deleteMany();
  await prisma.schoolEvent.deleteMany();
  await prisma.reportCard.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.timetableSlot.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.fileAttachment.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversationParticipant.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.result.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.classSubjectTeacher.deleteMany();
  await prisma.parentStudent.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.teacherProfile.deleteMany();
  await prisma.parentProfile.deleteMany();
  await prisma.staffProfile.deleteMany();
  await prisma.term.deleteMany();
  await prisma.academicSession.deleteMany();
  await prisma.gradingScale.deleteMany();
  await prisma.galleryImage.deleteMany();
  await prisma.blogPost.deleteMany();
  await prisma.invite.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.class.deleteMany();
  await prisma.user.deleteMany();

  // ── Hash passwords ──────────────────────────────────────────────────────────
  const adminPass = await bcrypt.hash('Admin123!', SALT_ROUNDS);
  const teacherPass = await bcrypt.hash('Teacher123!', SALT_ROUNDS);
  const studentPass = await bcrypt.hash('Student123!', SALT_ROUNDS);
  const parentPass = await bcrypt.hash('Parent123!', SALT_ROUNDS);
  const staffPass = await bcrypt.hash('Staff123!', SALT_ROUNDS);

  // ── Users ───────────────────────────────────────────────────────────────────
  const admin = await prisma.user.create({
    data: {
      email: 'admin@frannberry.school',
      passwordHash: adminPass,
      firstName: 'Margaret',
      lastName: 'Thornton',
      role: Role.ADMIN,
    },
  });
  console.log(`✅ Admin: ${admin.email} / Admin123!`);

  const teacher1 = await prisma.user.create({
    data: {
      email: 'j.williams@frannberry.school',
      passwordHash: teacherPass,
      firstName: 'James',
      lastName: 'Williams',
      role: Role.TEACHER,
    },
  });

  const teacher2 = await prisma.user.create({
    data: {
      email: 's.patel@frannberry.school',
      passwordHash: teacherPass,
      firstName: 'Sunita',
      lastName: 'Patel',
      role: Role.TEACHER,
    },
  });
  console.log(`✅ Teachers: j.williams@frannberry.school, s.patel@frannberry.school / Teacher123!`);

  const student1 = await prisma.user.create({
    data: {
      email: 'oliver.smith@frannberry.school',
      passwordHash: studentPass,
      firstName: 'Oliver',
      lastName: 'Smith',
      role: Role.STUDENT,
    },
  });

  const student2 = await prisma.user.create({
    data: {
      email: 'amara.jones@frannberry.school',
      passwordHash: studentPass,
      firstName: 'Amara',
      lastName: 'Jones',
      role: Role.STUDENT,
    },
  });

  const student3 = await prisma.user.create({
    data: {
      email: 'liam.brown@frannberry.school',
      passwordHash: studentPass,
      firstName: 'Liam',
      lastName: 'Brown',
      role: Role.STUDENT,
    },
  });
  console.log(`✅ Students: oliver.smith, amara.jones, liam.brown @frannberry.school / Student123!`);

  const parent1 = await prisma.user.create({
    data: {
      email: 'david.smith@example.com',
      passwordHash: parentPass,
      firstName: 'David',
      lastName: 'Smith',
      role: Role.PARENT,
    },
  });

  const parent2 = await prisma.user.create({
    data: {
      email: 'fatima.jones@example.com',
      passwordHash: parentPass,
      firstName: 'Fatima',
      lastName: 'Jones',
      role: Role.PARENT,
    },
  });
  console.log(`✅ Parents: david.smith@example.com, fatima.jones@example.com / Parent123!`);

  const staff1 = await prisma.user.create({
    data: {
      email: 'r.okonkwo@frannberry.school',
      passwordHash: staffPass,
      firstName: 'Ruth',
      lastName: 'Okonkwo',
      role: Role.STAFF,
    },
  });
  console.log(`✅ Staff: r.okonkwo@frannberry.school / Staff123!`);

  // ── Role Profiles ───────────────────────────────────────────────────────────
  const teacherProfile1 = await prisma.teacherProfile.create({
    data: { userId: teacher1.id, employeeId: 'TCH-001', department: 'Mathematics', qualification: 'MSc Mathematics' },
  });

  const teacherProfile2 = await prisma.teacherProfile.create({
    data: { userId: teacher2.id, employeeId: 'TCH-002', department: 'English', qualification: 'MA English Literature' },
  });

  const studentProfile1 = await prisma.studentProfile.create({
    data: { userId: student1.id, admissionNo: 'STU-2026-001', dateOfBirth: new Date('2013-03-15') },
  });

  const studentProfile2 = await prisma.studentProfile.create({
    data: { userId: student2.id, admissionNo: 'STU-2026-002', dateOfBirth: new Date('2013-07-22') },
  });

  const studentProfile3 = await prisma.studentProfile.create({
    data: { userId: student3.id, admissionNo: 'STU-2026-003', dateOfBirth: new Date('2013-11-01') },
  });

  const parentProfile1 = await prisma.parentProfile.create({
    data: { userId: parent1.id, occupation: 'Software Engineer', address: '14 Elm Street, London' },
  });

  const parentProfile2 = await prisma.parentProfile.create({
    data: { userId: parent2.id, occupation: 'Doctor', address: '27 Oak Avenue, Manchester' },
  });

  await prisma.staffProfile.create({
    data: { userId: staff1.id, employeeId: 'STF-001', department: 'Administration', position: 'School Secretary', permissions: ['VIEW_STUDENTS', 'VIEW_RESULTS'] },
  });

  // ── Parent-Student Links ────────────────────────────────────────────────────
  await prisma.parentStudent.create({
    data: { parentId: parentProfile1.id, studentId: studentProfile1.id, relation: 'Father' },
  });

  await prisma.parentStudent.create({
    data: { parentId: parentProfile2.id, studentId: studentProfile2.id, relation: 'Mother' },
  });

  // Parent1 is also linked to student3 (e.g. sibling)
  await prisma.parentStudent.create({
    data: { parentId: parentProfile1.id, studentId: studentProfile3.id, relation: 'Father' },
  });

  console.log('✅ Parent-student links created');

  // ── Academic Structure ──────────────────────────────────────────────────────
  const session = await prisma.academicSession.create({
    data: { name: '2025/2026 Academic Year', startDate: new Date('2025-09-01'), endDate: new Date('2026-07-18'), isCurrent: true },
  });

  const term1 = await prisma.term.create({
    data: { name: 'Autumn Term', sessionId: session.id, startDate: new Date('2025-09-01'), endDate: new Date('2025-12-19'), isCurrent: false },
  });

  const term2 = await prisma.term.create({
    data: { name: 'Spring Term', sessionId: session.id, startDate: new Date('2026-01-06'), endDate: new Date('2026-03-27'), isCurrent: true },
  });

  const term3 = await prisma.term.create({
    data: { name: 'Summer Term', sessionId: session.id, startDate: new Date('2026-04-14'), endDate: new Date('2026-07-18'), isCurrent: false },
  });

  console.log('✅ Academic session & terms created');

  // ── Classes ─────────────────────────────────────────────────────────────────
  const class7A = await prisma.class.create({
    data: { name: 'Year 7A', year: 7, section: 'A', capacity: 30 },
  });

  const class7B = await prisma.class.create({
    data: { name: 'Year 7B', year: 7, section: 'B', capacity: 30 },
  });

  // Assign students to classes
  await prisma.studentProfile.update({ where: { id: studentProfile1.id }, data: { classId: class7A.id } });
  await prisma.studentProfile.update({ where: { id: studentProfile2.id }, data: { classId: class7A.id } });
  await prisma.studentProfile.update({ where: { id: studentProfile3.id }, data: { classId: class7B.id } });

  console.log('✅ Classes created and students assigned');

  // ── Subjects ────────────────────────────────────────────────────────────────
  const maths = await prisma.subject.create({ data: { name: 'Mathematics', code: 'MATHS' } });
  const english = await prisma.subject.create({ data: { name: 'English Language', code: 'ENG' } });
  const science = await prisma.subject.create({ data: { name: 'Science', code: 'SCI' } });

  console.log('✅ Subjects created');

  // ── Class-Subject-Teacher assignments ───────────────────────────────────────
  const cst1 = await prisma.classSubjectTeacher.create({
    data: { classId: class7A.id, subjectId: maths.id, teacherId: teacherProfile1.id },
  });

  await prisma.classSubjectTeacher.create({
    data: { classId: class7A.id, subjectId: english.id, teacherId: teacherProfile2.id },
  });

  await prisma.classSubjectTeacher.create({
    data: { classId: class7B.id, subjectId: maths.id, teacherId: teacherProfile1.id },
  });

  console.log('✅ Teacher-class-subject assignments created');

  // ── Grading Scales ──────────────────────────────────────────────────────────
  const gradingData = [
    { name: 'A*', minScore: 90, maxScore: 100, grade: 'A*', remark: 'Outstanding' },
    { name: 'A', minScore: 80, maxScore: 89, grade: 'A', remark: 'Excellent' },
    { name: 'B', minScore: 70, maxScore: 79, grade: 'B', remark: 'Very Good' },
    { name: 'C', minScore: 60, maxScore: 69, grade: 'C', remark: 'Good' },
    { name: 'D', minScore: 50, maxScore: 59, grade: 'D', remark: 'Satisfactory' },
    { name: 'E', minScore: 40, maxScore: 49, grade: 'E', remark: 'Below Average' },
    { name: 'F', minScore: 0, maxScore: 39, grade: 'F', remark: 'Unsatisfactory' },
  ];

  for (const g of gradingData) {
    await prisma.gradingScale.create({ data: g });
  }

  console.log('✅ Grading scales created');

  // ── Sample Results (Autumn Term) ────────────────────────────────────────────
  await prisma.result.create({
    data: {
      studentId: studentProfile1.id,
      subjectId: maths.id,
      termId: term1.id,
      teacherId: teacherProfile1.id,
      assessmentType: AssessmentType.EXAM,
      score: 78,
      maxScore: 100,
      comment: 'Good understanding of fractions. Needs to practise word problems.',
    },
  });

  await prisma.result.create({
    data: {
      studentId: studentProfile2.id,
      subjectId: maths.id,
      termId: term1.id,
      teacherId: teacherProfile1.id,
      assessmentType: AssessmentType.EXAM,
      score: 92,
      maxScore: 100,
      comment: 'Exceptional work. Very strong in all areas.',
    },
  });

  await prisma.result.create({
    data: {
      studentId: studentProfile1.id,
      subjectId: english.id,
      termId: term1.id,
      teacherId: teacherProfile2.id,
      assessmentType: AssessmentType.EXAM,
      score: 65,
      maxScore: 100,
      comment: 'Good essay writing. Spelling needs improvement.',
    },
  });

  console.log('✅ Sample results created');

  // ── Sample Assignments ──────────────────────────────────────────────────────
  const assignment1 = await prisma.assignment.create({
    data: {
      title: 'Fractions Revision Worksheet',
      description: 'Complete all exercises in the fractions revision sheet. Show your working clearly.',
      teacherId: teacherProfile1.id,
      classId: class7A.id,
      subjectId: maths.id,
      termId: term2.id,
      status: 'PUBLISHED',
      dueDate: new Date('2026-03-20'),
      maxScore: 50,
    },
  });

  const assignment2 = await prisma.assignment.create({
    data: {
      title: 'Creative Writing – My Favourite Place',
      description: 'Write a 500-word essay describing your favourite place. Use descriptive language and sensory details.',
      teacherId: teacherProfile2.id,
      classId: class7A.id,
      subjectId: english.id,
      termId: term2.id,
      status: 'PUBLISHED',
      dueDate: new Date('2026-03-25'),
      maxScore: 100,
    },
  });

  console.log('✅ Sample assignments created');

  // ── Sample Submissions ──────────────────────────────────────────────────────
  await prisma.submission.create({
    data: {
      assignmentId: assignment1.id,
      studentId: studentProfile1.id,
      status: 'GRADED',
      content: 'Completed all 20 questions. See attached worksheet.',
      score: 42,
      feedback: 'Well done, Oliver! Clear working shown. A few errors on Q15 and Q18.',
      submittedAt: new Date('2026-03-18'),
      gradedAt: new Date('2026-03-19'),
    },
  });

  await prisma.submission.create({
    data: {
      assignmentId: assignment1.id,
      studentId: studentProfile2.id,
      status: 'SUBMITTED',
      content: 'All questions completed.',
      submittedAt: new Date('2026-03-19'),
    },
  });

  console.log('✅ Sample submissions created');

  // ── Sample Announcements ────────────────────────────────────────────────────
  await prisma.announcement.create({
    data: {
      title: 'Spring Term Parent-Teacher Evening',
      content: 'We are pleased to invite parents and carers to our Spring Term Parent-Teacher Evening on Thursday 19th March 2026, from 4:00 PM to 7:00 PM. Please book your slot through the portal.',
      scope: AnnouncementScope.SCHOOL,
      authorId: admin.id,
      isPublished: true,
    },
  });

  await prisma.announcement.create({
    data: {
      title: 'Year 7A Maths Revision Sessions',
      content: 'Extra revision sessions for Year 7A Maths will be held every Wednesday after school from 3:30 PM to 4:30 PM in Room 12.',
      scope: AnnouncementScope.CLASS,
      classId: class7A.id,
      authorId: teacher1.id,
      isPublished: true,
    },
  });

  console.log('✅ Sample announcements created');

  // ── Sample Conversation ─────────────────────────────────────────────────────
  const conversation = await prisma.conversation.create({
    data: {
      title: null,
      participants: {
        create: [
          { userId: parent1.id },
          { userId: teacher1.id },
        ],
      },
    },
  });

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: parent1.id,
      content: 'Good afternoon, Mr Williams. I wanted to ask about Oliver\'s progress in Mathematics this term.',
      type: 'TEXT',
    },
  });

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: teacher1.id,
      content: 'Good afternoon, Mr Smith. Oliver is doing well overall. He scored 42/50 on his recent fractions worksheet. His understanding is solid, though he could benefit from extra practice with word problems.',
      type: 'TEXT',
    },
  });

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: parent1.id,
      content: 'Thank you for the update. We\'ll make sure he practises more at home. Are there any resources you\'d recommend?',
      type: 'TEXT',
    },
  });

  console.log('✅ Sample conversation created');

  // ── Sample Blog Posts ───────────────────────────────────────────────────────
  await prisma.blogPost.create({
    data: {
      title: 'Welcome to the New Academic Year',
      slug: 'welcome-new-academic-year-2025',
      excerpt: 'We are thrilled to welcome all pupils, parents, and staff to the 2025/2026 academic year at Frannberry School.',
      content: `<p>Dear Frannberry School Community,</p>
<p>We are thrilled to welcome everyone to the start of a new academic year. This year promises to be filled with exciting learning opportunities, enriching experiences, and continued growth for all our pupils.</p>
<p>Our dedicated team of teachers and staff have been working tirelessly over the summer to prepare an engaging curriculum that challenges and inspires. We look forward to partnering with parents and carers to ensure every child reaches their full potential.</p>
<p>Warm regards,<br/>Mrs Margaret Thornton<br/>Head Teacher</p>`,
      authorId: admin.id,
      isPublished: true,
      publishedAt: new Date('2025-09-01'),
    },
  });

  await prisma.blogPost.create({
    data: {
      title: 'Year 7 Science Fair Results',
      slug: 'year-7-science-fair-results-2026',
      excerpt: 'Congratulations to all participants in our annual Year 7 Science Fair!',
      content: `<p>We are delighted to share the results of this year's Science Fair. The creativity and scientific rigour shown by our Year 7 pupils was truly impressive.</p>
<p><strong>First Place:</strong> Amara Jones – "The Effect of Light on Plant Growth"</p>
<p><strong>Second Place:</strong> Oliver Smith – "Building a Simple Electric Motor"</p>
<p><strong>Third Place:</strong> Liam Brown – "Water Filtration Methods"</p>
<p>Well done to all participants!</p>`,
      authorId: admin.id,
      isPublished: true,
      publishedAt: new Date('2026-02-15'),
    },
  });

  console.log('✅ Sample blog posts created');

  // ── Sample Gallery Images ───────────────────────────────────────────────────
  await prisma.galleryImage.create({
    data: {
      title: 'School Main Building',
      description: 'The main entrance of Frannberry School',
      imageUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800',
      category: 'Campus',
      sortOrder: 1,
      isPublished: true,
    },
  });

  await prisma.galleryImage.create({
    data: {
      title: 'Science Laboratory',
      description: 'Our state-of-the-art science laboratory',
      imageUrl: 'https://images.unsplash.com/photo-1562774053-701939374585?w=800',
      category: 'Facilities',
      sortOrder: 2,
      isPublished: true,
    },
  });

  await prisma.galleryImage.create({
    data: {
      title: 'School Library',
      description: 'The Frannberry School library and resource centre',
      imageUrl: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800',
      category: 'Facilities',
      sortOrder: 3,
      isPublished: true,
    },
  });

  console.log('✅ Sample gallery images created');

  // ── Timetable Slots ─────────────────────────────────────────────────────────
  const timetableData = [
    { classId: class7A.id, subjectId: maths.id, teacherId: teacherProfile1.id, day: DayOfWeek.MONDAY, startTime: '09:00', endTime: '09:50', room: 'Room 12' },
    { classId: class7A.id, subjectId: english.id, teacherId: teacherProfile2.id, day: DayOfWeek.MONDAY, startTime: '10:00', endTime: '10:50', room: 'Room 8' },
    { classId: class7A.id, subjectId: science.id, teacherId: teacherProfile1.id, day: DayOfWeek.MONDAY, startTime: '11:10', endTime: '12:00', room: 'Lab 1' },
    { classId: class7A.id, subjectId: maths.id, teacherId: teacherProfile1.id, day: DayOfWeek.TUESDAY, startTime: '09:00', endTime: '09:50', room: 'Room 12' },
    { classId: class7A.id, subjectId: english.id, teacherId: teacherProfile2.id, day: DayOfWeek.TUESDAY, startTime: '10:00', endTime: '10:50', room: 'Room 8' },
    { classId: class7A.id, subjectId: science.id, teacherId: teacherProfile1.id, day: DayOfWeek.WEDNESDAY, startTime: '09:00', endTime: '09:50', room: 'Lab 1' },
    { classId: class7A.id, subjectId: maths.id, teacherId: teacherProfile1.id, day: DayOfWeek.WEDNESDAY, startTime: '10:00', endTime: '10:50', room: 'Room 12' },
    { classId: class7A.id, subjectId: english.id, teacherId: teacherProfile2.id, day: DayOfWeek.THURSDAY, startTime: '09:00', endTime: '09:50', room: 'Room 8' },
    { classId: class7A.id, subjectId: maths.id, teacherId: teacherProfile1.id, day: DayOfWeek.THURSDAY, startTime: '11:10', endTime: '12:00', room: 'Room 12' },
    { classId: class7A.id, subjectId: science.id, teacherId: teacherProfile1.id, day: DayOfWeek.FRIDAY, startTime: '09:00', endTime: '09:50', room: 'Lab 1' },
    { classId: class7A.id, subjectId: english.id, teacherId: teacherProfile2.id, day: DayOfWeek.FRIDAY, startTime: '10:00', endTime: '10:50', room: 'Room 8' },
    // Year 7B slots
    { classId: class7B.id, subjectId: maths.id, teacherId: teacherProfile1.id, day: DayOfWeek.MONDAY, startTime: '13:00', endTime: '13:50', room: 'Room 12' },
    { classId: class7B.id, subjectId: maths.id, teacherId: teacherProfile1.id, day: DayOfWeek.WEDNESDAY, startTime: '13:00', endTime: '13:50', room: 'Room 12' },
    { classId: class7B.id, subjectId: maths.id, teacherId: teacherProfile1.id, day: DayOfWeek.FRIDAY, startTime: '13:00', endTime: '13:50', room: 'Room 12' },
  ];

  for (const slot of timetableData) {
    await prisma.timetableSlot.create({ data: slot });
  }

  console.log('✅ Timetable slots created');

  // ── Sample Attendance Records ──────────────────────────────────────────────
  const attendanceDates = ['2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05'];
  const students7A = [studentProfile1.id, studentProfile2.id];

  for (const dateStr of attendanceDates) {
    for (const sid of students7A) {
      const isAbsent = sid === studentProfile1.id && dateStr === '2026-03-04';
      const isLate = sid === studentProfile2.id && dateStr === '2026-03-03';
      await prisma.attendanceRecord.create({
        data: {
          studentId: sid,
          classId: class7A.id,
          date: new Date(dateStr),
          status: isAbsent ? AttendanceStatus.ABSENT : isLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT,
          remark: isAbsent ? 'Unwell' : isLate ? 'Arrived 10 minutes late' : null,
          markedById: teacher1.id,
        },
      });
    }
    // student3 in class7B
    await prisma.attendanceRecord.create({
      data: {
        studentId: studentProfile3.id,
        classId: class7B.id,
        date: new Date(dateStr),
        status: AttendanceStatus.PRESENT,
        markedById: teacher1.id,
      },
    });
  }

  console.log('✅ Sample attendance records created');

  // ── Sample Notifications ──────────────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      { userId: student1.id, type: 'ANNOUNCEMENT', title: 'New Announcement', body: 'Spring Term Parent-Teacher Evening has been scheduled.', link: '/portal/announcements' },
      { userId: student1.id, type: 'ASSIGNMENT', title: 'New Assignment', body: 'Fractions Revision Worksheet has been posted.', link: '/portal/assignments' },
      { userId: student1.id, type: 'RESULT', title: 'Results Published', body: 'Your Autumn Term results are now available.', link: '/portal/results' },
      { userId: parent1.id, type: 'ATTENDANCE', title: 'Absence Notification', body: 'Oliver Smith was marked absent on 4th March 2026.', link: '/portal/attendance' },
      { userId: parent1.id, type: 'RESULT', title: 'Results Published', body: "Oliver's Autumn Term results are now available.", link: '/portal/results' },
      { userId: teacher1.id, type: 'ANNOUNCEMENT', title: 'New Announcement', body: 'Spring Term Parent-Teacher Evening has been scheduled.', link: '/portal/announcements' },
    ],
  });

  console.log('✅ Sample notifications created');

  // ── Sample Report Card ────────────────────────────────────────────────────
  await prisma.reportCard.create({
    data: {
      studentId: studentProfile1.id,
      termId: term1.id,
      classId: class7A.id,
      totalScore: 143,
      averageScore: 71.5,
      subjectCount: 2,
      overallGrade: 'B',
      teacherComment: 'Oliver has had a solid Autumn Term. Strong in Mathematics, with room for improvement in English spelling and grammar.',
      principalComment: 'A promising start to the year. Keep up the good work.',
    },
  });

  await prisma.reportCard.create({
    data: {
      studentId: studentProfile2.id,
      termId: term1.id,
      classId: class7A.id,
      totalScore: 92,
      averageScore: 92,
      subjectCount: 1,
      overallGrade: 'A*',
      teacherComment: 'Amara is an outstanding student. Her work in Mathematics has been exemplary this term.',
      principalComment: 'Excellent achievement. We are very proud of your efforts.',
    },
  });

  console.log('✅ Sample report cards created');

  // ── School Events ──────────────────────────────────────────────────────────
  await prisma.schoolEvent.createMany({
    data: [
      { title: 'Autumn Term Begins', type: EventType.ACADEMIC, startDate: new Date('2025-09-01'), endDate: new Date('2025-09-01'), location: 'Frannberry School', createdById: admin.id },
      { title: 'Half-Term Break', type: EventType.HOLIDAY, startDate: new Date('2025-10-27'), endDate: new Date('2025-10-31'), createdById: admin.id },
      { title: 'Year 7 Science Fair', type: EventType.ACADEMIC, startDate: new Date('2026-02-15'), endDate: new Date('2026-02-15'), location: 'Assembly Hall', createdById: admin.id },
      { title: 'Spring Term Exams', type: EventType.EXAM, startDate: new Date('2026-03-16'), endDate: new Date('2026-03-20'), location: 'Exam Hall', createdById: admin.id },
      { title: 'Parent-Teacher Evening', type: EventType.MEETING, startDate: new Date('2026-03-19'), endDate: new Date('2026-03-19'), location: 'Main Building', createdById: admin.id },
      { title: 'Easter Holiday', type: EventType.HOLIDAY, startDate: new Date('2026-03-28'), endDate: new Date('2026-04-13'), createdById: admin.id },
      { title: 'Sports Day', type: EventType.SPORTS, startDate: new Date('2026-06-12'), endDate: new Date('2026-06-12'), location: 'Sports Field', createdById: admin.id },
      { title: 'Summer Concert', type: EventType.CULTURAL, startDate: new Date('2026-07-10'), endDate: new Date('2026-07-10'), location: 'Assembly Hall', createdById: admin.id },
    ],
  });

  console.log('✅ School events created');

  // ── Fee Templates & Invoices ───────────────────────────────────────────────
  const tuitionFee = await prisma.feeTemplate.create({
    data: {
      name: 'Spring Term Tuition',
      description: 'Tuition fee for Spring Term 2026',
      amount: 2500.00,
      termId: term2.id,
      dueDate: new Date('2026-01-15'),
    },
  });

  const labFee = await prisma.feeTemplate.create({
    data: {
      name: 'Science Lab Fee',
      description: 'Laboratory equipment and materials fee',
      amount: 150.00,
      termId: term2.id,
      classId: class7A.id,
      dueDate: new Date('2026-02-01'),
    },
  });

  // Create invoices for students
  let invCounter = 1000;
  for (const sp of [studentProfile1, studentProfile2]) {
    invCounter++;
    await prisma.invoice.create({
      data: {
        invoiceNo: `INV-2026-${invCounter}`,
        studentId: sp.id,
        feeTemplateId: tuitionFee.id,
        amount: 2500.00,
        amountPaid: sp.id === studentProfile1.id ? 2500.00 : 1000.00,
        status: sp.id === studentProfile1.id ? 'PAID' : 'PARTIAL',
        dueDate: new Date('2026-01-15'),
      },
    });

    invCounter++;
    await prisma.invoice.create({
      data: {
        invoiceNo: `INV-2026-${invCounter}`,
        studentId: sp.id,
        feeTemplateId: labFee.id,
        amount: 150.00,
        amountPaid: 0,
        status: 'UNPAID',
        dueDate: new Date('2026-02-01'),
      },
    });
  }

  invCounter++;
  await prisma.invoice.create({
    data: {
      invoiceNo: `INV-2026-${invCounter}`,
      studentId: studentProfile3.id,
      feeTemplateId: tuitionFee.id,
      amount: 2500.00,
      amountPaid: 0,
      status: 'UNPAID',
      dueDate: new Date('2026-01-15'),
    },
  });

  console.log('✅ Fee templates and invoices created');

  console.log('\n🎉 Seeding complete!\n');
  console.log('═══════════════════════════════════════════════');
  console.log('  LOGIN CREDENTIALS');
  console.log('═══════════════════════════════════════════════');
  console.log('  Admin:   admin@frannberry.school / Admin123!');
  console.log('  Teacher: j.williams@frannberry.school / Teacher123!');
  console.log('  Teacher: s.patel@frannberry.school / Teacher123!');
  console.log('  Student: oliver.smith@frannberry.school / Student123!');
  console.log('  Student: amara.jones@frannberry.school / Student123!');
  console.log('  Student: liam.brown@frannberry.school / Student123!');
  console.log('  Parent:  david.smith@example.com / Parent123!');
  console.log('  Parent:  fatima.jones@example.com / Parent123!');
  console.log('  Staff:   r.okonkwo@frannberry.school / Staff123!');
  console.log('═══════════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
