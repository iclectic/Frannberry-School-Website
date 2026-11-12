export function pupilName(student: {
  firstName?: string | null;
  lastName?: string | null;
  user?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null;
}): { firstName: string; lastName: string; email: string } {
  return {
    firstName: student.user?.firstName || student.firstName || 'Pupil',
    lastName: student.user?.lastName || student.lastName || '',
    email: student.user?.email || '',
  };
}
