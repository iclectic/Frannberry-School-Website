import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  // Grade trends for a single student across all terms
  async getStudentTrends(studentProfileId: string) {
    const results = await this.prisma.result.findMany({
      where: { studentId: studentProfileId },
      include: {
        subject: { select: { name: true, code: true } },
        term: { select: { id: true, name: true } },
      },
      orderBy: { term: { startDate: 'asc' } },
    });

    // Group by term, then by subject
    const termMap: Record<string, { termName: string; subjects: Record<string, number[]> }> = {};
    for (const r of results) {
      if (!termMap[r.termId]) {
        termMap[r.termId] = { termName: r.term.name, subjects: {} };
      }
      const key = r.subject.name;
      if (!termMap[r.termId].subjects[key]) termMap[r.termId].subjects[key] = [];
      termMap[r.termId].subjects[key].push((r.score / r.maxScore) * 100);
    }

    const trends = Object.entries(termMap).map(([termId, data]) => {
      const subjectAverages: Record<string, number> = {};
      let totalScore = 0;
      let count = 0;
      for (const [subj, scores] of Object.entries(data.subjects)) {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        subjectAverages[subj] = Math.round(avg * 10) / 10;
        totalScore += avg;
        count++;
      }
      return {
        termId,
        termName: data.termName,
        subjectAverages,
        overallAverage: count > 0 ? Math.round((totalScore / count) * 10) / 10 : 0,
      };
    });

    return trends;
  }

  // Class averages for each subject in a given term
  async getClassAverages(classId: string, termId?: string) {
    const where: any = {};
    if (termId) where.termId = termId;

    // Get students in the class
    const students = await this.prisma.studentProfile.findMany({
      where: { classId },
      select: { id: true },
    });
    const studentIds = students.map((s) => s.id);
    if (studentIds.length === 0) return [];

    where.studentId = { in: studentIds };

    const results = await this.prisma.result.findMany({
      where,
      include: {
        subject: { select: { name: true, code: true } },
        term: { select: { name: true } },
      },
    });

    // Group by subject
    const subjectMap: Record<string, { name: string; scores: number[] }> = {};
    for (const r of results) {
      if (!subjectMap[r.subjectId]) {
        subjectMap[r.subjectId] = { name: r.subject.name, scores: [] };
      }
      subjectMap[r.subjectId].scores.push((r.score / r.maxScore) * 100);
    }

    return Object.entries(subjectMap).map(([subjectId, data]) => ({
      subjectId,
      subjectName: data.name,
      average: Math.round((data.scores.reduce((a, b) => a + b, 0) / data.scores.length) * 10) / 10,
      highest: Math.round(Math.max(...data.scores) * 10) / 10,
      lowest: Math.round(Math.min(...data.scores) * 10) / 10,
      count: data.scores.length,
    }));
  }

  // Subject comparison for a student: how they compare to class average
  async getSubjectComparison(studentProfileId: string, termId?: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      select: { classId: true },
    });
    if (!student?.classId) return [];

    const where: any = { studentId: studentProfileId };
    if (termId) where.termId = termId;

    const myResults = await this.prisma.result.findMany({
      where,
      include: { subject: { select: { name: true } }, term: { select: { name: true } } },
    });

    const classAvgs = await this.getClassAverages(student.classId, termId);
    const classAvgMap: Record<string, number> = {};
    for (const ca of classAvgs) {
      classAvgMap[ca.subjectName] = ca.average;
    }

    // Aggregate student scores per subject
    const subjectMap: Record<string, number[]> = {};
    for (const r of myResults) {
      if (!subjectMap[r.subject.name]) subjectMap[r.subject.name] = [];
      subjectMap[r.subject.name].push((r.score / r.maxScore) * 100);
    }

    return Object.entries(subjectMap).map(([subjectName, scores]) => ({
      subject: subjectName,
      myAverage: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
      classAverage: classAvgMap[subjectName] ?? 0,
    }));
  }
}
