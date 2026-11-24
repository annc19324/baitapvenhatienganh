import { HomeworkAssignment, HomeworkSubmission } from '../types/homework';
import { PRESET_TEMPLATES } from './homeworkPresets';

const ASSIGNMENTS_KEY = 'engwork_assignments_v2';
const SUBMISSIONS_KEY = 'engwork_submissions_v2';
const LEGACY_ASSIGNMENTS_KEY = 'smartdoc_homework_assignments_v1';

export interface StudentSummary {
  studentName: string;
  attemptCount: number;
  uniqueAssignments: number;
  averagePercentage: number;
  highestPercentage: number;
  latestSubmittedAt: string;
  submissions: HomeworkSubmission[];
}

export function generatePinCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let pin = '';
  for (let i = 0; i < 4; i++) {
    pin += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ENG-${pin}`;
}

function buildSeededAssignments(): HomeworkAssignment[] {
  return PRESET_TEMPLATES.map((tpl) => {
    const totalPoints = Number(tpl.questions.reduce((sum, q) => sum + (q.points || 1), 0).toFixed(1));
    return {
      id: `seed-hw-${tpl.id}`,
      code: tpl.code,
      title: tpl.title,
      description: tpl.description,
      subject: 'Tiếng Anh',
      topic: tpl.topic,
      levelId: tpl.levelId,
      orderIndex: tpl.orderIndex,
      gradeLevel: tpl.gradeLevel,
      difficulty: tpl.difficulty,
      timeLimitMinutes: tpl.timeLimitMinutes,
      shuffleQuestions: false,
      showResultsImmediately: true,
      allowRetake: true,
      createdByName: 'Hệ Thống A–Z',
      createdAt: new Date(Date.now() - (20 - tpl.orderIndex) * 3600000).toISOString(),
      updatedAt: new Date(Date.now() - (20 - tpl.orderIndex) * 3600000).toISOString(),
      status: 'ACTIVE',
      theory: tpl.theory,
      questions: tpl.questions,
      totalPoints,
    };
  });
}

export class HomeworkStorageService {
  static initializeIfEmpty(): void {
    const existing = localStorage.getItem(ASSIGNMENTS_KEY);
    if (!existing) {
      const seeded = buildSeededAssignments();

      // Migrate custom (non-seed) assignments from legacy v1 if any exist
      try {
        const legacyRaw = localStorage.getItem(LEGACY_ASSIGNMENTS_KEY);
        if (legacyRaw) {
          const legacyList: HomeworkAssignment[] = JSON.parse(legacyRaw);
          const customOnes = legacyList.filter((a) => !a.id.startsWith('seed-hw-'));
          if (customOnes.length > 0) {
            seeded.unshift(...customOnes);
          }
        }
      } catch {
        // ignore migration error
      }

      localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(seeded));
    }

    const existingSubs = localStorage.getItem(SUBMISSIONS_KEY);
    if (!existingSubs) {
      const demoSubmissions: HomeworkSubmission[] = [
        {
          id: 'sub-demo-1',
          assignmentId: 'seed-hw-tpl-th-present-tenses',
          assignmentCode: 'ENG-TH2',
          assignmentTitle: 'Bài 4: Thì Hiện Tại Đơn & Hiện Tại Tiếp Diễn',
          studentName: 'Nguyễn Minh Anh',
          answers: {
            'th2-q1': 2,
            'th2-q2': 'watches',
            'th2-q3': { option: 'C', correction: 'like' },
            'th2-q4': {
              'every day / usually': 'Hiện tại đơn (Present Simple)',
              'right now / Look!': 'Hiện tại tiếp diễn (Present Continuous)',
              'Water boils at 100°C.': 'Sự thật hiển nhiên (Present Simple)',
            },
            'th2-q5': 'The children are playing in the park.',
          },
          scores: { 'th2-q1': 2, 'th2-q2': 2, 'th2-q3': 2, 'th2-q4': 2, 'th2-q5': 2 },
          totalScore: 10,
          maxTotalScore: 10,
          percentage: 100,
          timeSpentSeconds: 245,
          submittedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        },
        {
          id: 'sub-demo-2',
          assignmentId: 'seed-hw-tpl-pt-12-tenses',
          assignmentCode: 'ENG-PT1',
          assignmentTitle: 'Bài 8: Tổng Ôn 12 Thì & Quy Tắc Phối Hợp Thì (THPTQG)',
          studentName: 'Trần Hoàng Nam',
          answers: {
            'pt1-q1': 2,
            'pt1-q2': 'has been working',
            'pt1-q3': 'They have been living in Hanoi since 2019.',
            'pt1-q4': {
              'Water freezes at 0°C.': 'Present Simple (Hiện tại đơn)',
              'I had eaten before they arrived.': 'Past Perfect (Quá khứ hoàn thành)',
              'This time tomorrow, I will be flying.': 'Future Continuous (Tương lai tiếp diễn)',
              'By 2030, I will have graduated.': 'Future Perfect (Tương lai hoàn thành)',
            },
            'pt1-q5': { option: 'A', correction: 'send' },
          },
          scores: { 'pt1-q1': 2, 'pt1-q2': 2, 'pt1-q3': 2, 'pt1-q4': 2, 'pt1-q5': 0 },
          totalScore: 8,
          maxTotalScore: 10,
          percentage: 80,
          timeSpentSeconds: 410,
          submittedAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
        },
      ];
      localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(demoSubmissions));
    }
  }

  static getAssignments(): HomeworkAssignment[] {
    this.initializeIfEmpty();
    try {
      const data = localStorage.getItem(ASSIGNMENTS_KEY);
      const list: HomeworkAssignment[] = data ? JSON.parse(data) : [];
      return list.sort((a, b) => {
        const orderA = a.orderIndex ?? 999;
        const orderB = b.orderIndex ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    } catch {
      return [];
    }
  }

  static getAssignment(idOrCode: string): HomeworkAssignment | null {
    if (!idOrCode) return null;
    const all = this.getAssignments();
    const cleanQuery = idOrCode.trim().toUpperCase();
    return (
      all.find(
        (a) =>
          a.id.toLowerCase() === idOrCode.toLowerCase() ||
          a.code.toUpperCase() === cleanQuery ||
          a.code.replace('-', '').toUpperCase() === cleanQuery.replace('-', '')
      ) || null
    );
  }

  static saveAssignment(assignment: HomeworkAssignment): HomeworkAssignment {
    this.initializeIfEmpty();
    const all = this.getAssignments();
    const index = all.findIndex((a) => a.id === assignment.id);

    if (index >= 0) {
      all[index] = { ...assignment, updatedAt: new Date().toISOString() };
    } else {
      all.unshift({
        ...assignment,
        createdAt: assignment.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(all));
    return assignment;
  }

  static deleteAssignment(id: string): boolean {
    const all = this.getAssignments();
    const filtered = all.filter((a) => a.id !== id);
    if (filtered.length !== all.length) {
      localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(filtered));
      return true;
    }
    return false;
  }

  static getSubmissions(): HomeworkSubmission[] {
    this.initializeIfEmpty();
    try {
      const data = localStorage.getItem(SUBMISSIONS_KEY);
      const list: HomeworkSubmission[] = data ? JSON.parse(data) : [];
      return list.sort(
        (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );
    } catch {
      return [];
    }
  }

  static getSubmissionsForAssignment(assignmentId: string): HomeworkSubmission[] {
    return this.getSubmissions().filter((s) => s.assignmentId === assignmentId);
  }

  static getSubmissionsByStudent(studentName: string): HomeworkSubmission[] {
    const norm = studentName.trim().toLowerCase();
    if (!norm) return [];
    return this.getSubmissions().filter((s) => s.studentName.trim().toLowerCase() === norm);
  }

  static getSubmission(id: string): HomeworkSubmission | null {
    return this.getSubmissions().find((s) => s.id === id) || null;
  }

  static saveSubmission(submission: HomeworkSubmission): HomeworkSubmission {
    this.initializeIfEmpty();
    const all = this.getSubmissions();
    const existingIndex = all.findIndex((s) => s.id === submission.id);
    if (existingIndex >= 0) {
      all[existingIndex] = submission;
    } else {
      all.unshift(submission);
    }
    localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(all));
    return submission;
  }

  static deleteSubmission(id: string): boolean {
    const all = this.getSubmissions();
    const filtered = all.filter((s) => s.id !== id);
    if (filtered.length !== all.length) {
      localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(filtered));
      return true;
    }
    return false;
  }

  static renameStudent(oldName: string, newName: string): number {
    const cleanOld = oldName.trim().toLowerCase();
    const cleanNew = newName.trim();
    if (!cleanOld || !cleanNew) return 0;
    const all = this.getSubmissions();
    let count = 0;
    const updated = all.map((s) => {
      if (s.studentName.trim().toLowerCase() === cleanOld) {
        count++;
        return { ...s, studentName: cleanNew };
      }
      return s;
    });
    if (count > 0) {
      localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(updated));
    }
    return count;
  }

  static deleteStudentData(studentName: string): number {
    const clean = studentName.trim().toLowerCase();
    const all = this.getSubmissions();
    const filtered = all.filter((s) => s.studentName.trim().toLowerCase() !== clean);
    const removed = all.length - filtered.length;
    if (removed > 0) {
      localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(filtered));
    }
    return removed;
  }

  static restoreDefaultCurriculum(): void {
    const existing = this.getAssignments();
    const customOnes = existing.filter((a) => !a.id.startsWith('seed-hw-'));
    const seeded = buildSeededAssignments();
    localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify([...customOnes, ...seeded]));
  }

  static getStudentSummaries(): StudentSummary[] {
    const submissions = this.getSubmissions();
    const map = new Map<string, HomeworkSubmission[]>();

    submissions.forEach((sub) => {
      const key = sub.studentName.trim().toLowerCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(sub);
    });

    const summaries: StudentSummary[] = [];
    map.forEach((subs) => {
      const sorted = [...subs].sort(
        (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );
      const avgPct = Math.round(
        sorted.reduce((sum, s) => sum + s.percentage, 0) / sorted.length
      );
      const maxPct = Math.max(...sorted.map((s) => s.percentage));
      const uniqueIds = new Set(sorted.map((s) => s.assignmentId));

      summaries.push({
        studentName: sorted[0].studentName,
        attemptCount: sorted.length,
        uniqueAssignments: uniqueIds.size,
        averagePercentage: avgPct,
        highestPercentage: maxPct,
        latestSubmittedAt: sorted[0].submittedAt,
        submissions: sorted,
      });
    });

    return summaries.sort(
      (a, b) =>
        new Date(b.latestSubmittedAt).getTime() - new Date(a.latestSubmittedAt).getTime()
    );
  }

  static exportSubmissionsToCsv(submissions?: HomeworkSubmission[]): string {
    const list = submissions ?? this.getSubmissions();
    const headers = [
      'STT',
      'Họ Và Tên',
      'Mã Bài Tập',
      'Tên Bài Tập',
      'Điểm Đạt Được',
      'Điểm Tối Đa',
      'Tỷ Lệ (%)',
      'Thời Gian (giây)',
      'Ngày Nộp',
    ];
    const rows = list.map((s, idx) => [
      idx + 1,
      `"${s.studentName.replace(/"/g, '""')}"`,
      `"${s.assignmentCode}"`,
      `"${s.assignmentTitle.replace(/"/g, '""')}"`,
      s.totalScore,
      s.maxTotalScore,
      `${s.percentage}%`,
      s.timeSpentSeconds,
      `"${new Date(s.submittedAt).toLocaleString('vi-VN')}"`,
    ]);
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  }
}
