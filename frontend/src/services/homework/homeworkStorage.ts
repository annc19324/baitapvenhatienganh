import { HomeworkAssignment, HomeworkSubmission, HomeworkTemplate } from '../../types/homework';
import { PRESET_TEMPLATES } from './homeworkPresets';

const ASSIGNMENTS_KEY = 'smartdoc_homework_assignments_v1';
const SUBMISSIONS_KEY = 'smartdoc_homework_submissions_v1';

// Generate a random PIN code like ENG-4819
export function generatePinCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let pin = '';
  for (let i = 0; i < 4; i++) {
    pin += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ENG-${pin}`;
}

export class HomeworkStorageService {
  /**
   * Initializes storage with preset templates if empty
   */
  static initializeIfEmpty(): void {
    const existing = localStorage.getItem(ASSIGNMENTS_KEY);
    if (!existing || JSON.parse(existing).length === 0) {
      const seeded: HomeworkAssignment[] = PRESET_TEMPLATES.map((tpl, idx) => {
        const pinCodes = ['ENG-101', 'ENG-102', 'ENG-103', 'ENG-104', 'ENG-105', 'ENG-106', 'ENG-107', 'ENG-108'];
        const totalPoints = tpl.questions.reduce((sum, q) => sum + (q.points || 1), 0);
        return {
          id: `seed-hw-${tpl.id}`,
          code: pinCodes[idx] || generatePinCode(),
          title: tpl.title,
          description: tpl.description,
          subject: 'Tiếng Anh',
          topic: tpl.topic,
          gradeLevel: tpl.gradeLevel,
          difficulty: tpl.difficulty,
          timeLimitMinutes: tpl.timeLimitMinutes,
          shuffleQuestions: false,
          showResultsImmediately: true,
          allowRetake: true,
          createdByName: 'Giáo Viên Tiếng Anh (Mẫu Hệ Thống)',
          createdAt: new Date(Date.now() - (idx + 1) * 86400000).toISOString(),
          updatedAt: new Date(Date.now() - (idx + 1) * 86400000).toISOString(),
          status: 'ACTIVE',
          questions: tpl.questions,
          totalPoints,
        };
      });

      localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(seeded));

      // Seed a couple of demo student submissions for ENG-101 so the teacher can see the statistics immediately
      const demoSubmissions: HomeworkSubmission[] = [
        {
          id: 'sub-demo-1',
          assignmentId: seeded[0].id,
          assignmentCode: seeded[0].code,
          assignmentTitle: seeded[0].title,
          studentName: 'Nguyễn Văn An',
          studentClass: '12A1',
          answers: {
            'q-tense-1': 2,
            'q-tense-2': 'has been working',
            'q-tense-3': 'They have been living in Hanoi since 2019.',
            'q-tense-4': { option: 'D', correction: 'went out' },
            'q-tense-5': {
              'Water freezes at 0 degrees Celsius.': 'Present Simple (Hiện tại đơn)',
              'Look! The bus is coming.': 'Present Continuous (Hiện tại tiếp diễn)',
              'I had already eaten before they arrived.': 'Past Perfect (Quá khứ hoàn thành)',
              'This time tomorrow, I will be flying to Tokyo.': 'Future Continuous (Tương lai tiếp diễn)',
            },
            'q-tense-6': 'Last weekend, I went camping with my friends. We pitched tents and sang around the fire. Since Monday, I have finished my English assignments and prepared for the midterm test.',
          },
          scores: {
            'q-tense-1': 1.5,
            'q-tense-2': 1.5,
            'q-tense-3': 2,
            'q-tense-4': 1.5,
            'q-tense-5': 2,
            'q-tense-6': 1.4,
          },
          aiEvaluations: {
            'q-tense-6': {
              score: 1.4,
              maxScore: 1.5,
              grammarScore: 1.4,
              vocabScore: 1.4,
              coherenceScore: 1.5,
              feedback: 'Bài viết rất xuất sắc! Sử dụng thì Quá khứ đơn (went, pitched, sang) và Hiện tại hoàn thành (have finished, prepared) chuẩn xác. Bố cục tự nhiên, liên kết câu mượt mà.',
              suggestedImprovement: 'Câu văn đã rất chuẩn. Bạn có thể bổ sung thêm một câu kết ngắn gọn (e.g., "It has been an exhausting yet memorable week.") để bài viết trọn vẹn hơn.',
            },
          },
          totalScore: 9.9,
          maxTotalScore: 10,
          percentage: 99,
          timeSpentSeconds: 680,
          submittedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
          isReviewedByTeacher: true,
        },
        {
          id: 'sub-demo-2',
          assignmentId: seeded[0].id,
          assignmentCode: seeded[0].code,
          assignmentTitle: seeded[0].title,
          studentName: 'Trần Thị Mai',
          studentClass: '12A1',
          answers: {
            'q-tense-1': 1,
            'q-tense-2': 'has been working',
            'q-tense-3': 'They have been living in Hanoi since 2019.',
            'q-tense-4': { option: 'D', correction: 'went out' },
            'q-tense-5': {
              'Water freezes at 0 degrees Celsius.': 'Present Simple (Hiện tại đơn)',
              'Look! The bus is coming.': 'Present Continuous (Hiện tại tiếp diễn)',
              'I had already eaten before they arrived.': 'Past Perfect (Quá khứ hoàn thành)',
              'This time tomorrow, I will be flying to Tokyo.': 'Future Continuous (Tương lai tiếp diễn)',
            },
            'q-tense-6': 'I visit my grandparents last Sunday. We cook together. This week I study hard and read two books.',
          },
          scores: {
            'q-tense-1': 0,
            'q-tense-2': 1.5,
            'q-tense-3': 2,
            'q-tense-4': 1.5,
            'q-tense-5': 2,
            'q-tense-6': 0.9,
          },
          aiEvaluations: {
            'q-tense-6': {
              score: 0.9,
              maxScore: 1.5,
              grammarScore: 0.8,
              vocabScore: 1.0,
              coherenceScore: 1.0,
              feedback: 'Bạn đã nắm được ý chính nhưng còn nhầm thì. Với "last Sunday", cần dùng Quá khứ đơn ("visited", "cooked"). Với hành động tuần này nên dùng Hiện tại hoàn thành ("have studied", "have read").',
              suggestedImprovement: 'Viết lại: "Last Sunday, I visited my grandparents and we cooked together. This week, I have studied hard and have read two books."',
            },
          },
          totalScore: 7.9,
          maxTotalScore: 10,
          percentage: 79,
          timeSpentSeconds: 840,
          submittedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          isReviewedByTeacher: false,
        },
      ];

      localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(demoSubmissions));
    }
  }

  /**
   * Retrieves all assignments
   */
  static getAssignments(): HomeworkAssignment[] {
    this.initializeIfEmpty();
    try {
      const data = localStorage.getItem(ASSIGNMENTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Retrieves an assignment by ID or Code (e.g. ENG-101)
   */
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

  /**
   * Saves or updates an assignment
   */
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

  /**
   * Deletes an assignment
   */
  static deleteAssignment(id: string): boolean {
    const all = this.getAssignments();
    const filtered = all.filter((a) => a.id !== id);
    if (filtered.length !== all.length) {
      localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(filtered));
      return true;
    }
    return false;
  }

  /**
   * Duplicates an existing assignment
   */
  static duplicateAssignment(id: string): HomeworkAssignment | null {
    const original = this.getAssignment(id);
    if (!original) return null;

    const duplicated: HomeworkAssignment = {
      ...original,
      id: `hw-${Date.now()}`,
      code: generatePinCode(),
      title: `${original.title} (Bản sao)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return this.saveAssignment(duplicated);
  }

  /**
   * Retrieves all submissions
   */
  static getSubmissions(): HomeworkSubmission[] {
    this.initializeIfEmpty();
    try {
      const data = localStorage.getItem(SUBMISSIONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Gets submissions for a specific assignment
   */
  static getSubmissionsForAssignment(assignmentId: string): HomeworkSubmission[] {
    const all = this.getSubmissions();
    return all.filter((s) => s.assignmentId === assignmentId);
  }

  /**
   * Gets a specific submission by ID
   */
  static getSubmission(id: string): HomeworkSubmission | null {
    const all = this.getSubmissions();
    return all.find((s) => s.id === id) || null;
  }

  /**
   * Saves a new student submission
   */
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

  /**
   * Updates an existing submission (e.g., teacher manual grading)
   */
  static updateSubmission(submission: HomeworkSubmission): HomeworkSubmission {
    return this.saveSubmission(submission);
  }

  /**
   * Calculates statistics for an assignment
   */
  static getAssignmentStats(assignmentId: string) {
    const assignment = this.getAssignment(assignmentId);
    if (!assignment) return null;

    const submissions = this.getSubmissionsForAssignment(assignmentId);
    const count = submissions.length;

    if (count === 0) {
      return {
        totalSubmissions: 0,
        averageScore: 0,
        averagePercentage: 0,
        highestScore: 0,
        lowestScore: 0,
        itemAnalysis: assignment.questions.map((q) => ({
          questionId: q.id,
          prompt: q.prompt,
          type: q.type,
          correctRate: 0,
          totalAttempts: 0,
        })),
      };
    }

    const totalScores = submissions.reduce((sum, s) => sum + s.totalScore, 0);
    const avgScore = Number((totalScores / count).toFixed(1));
    const avgPercent = Number(
      ((submissions.reduce((sum, s) => sum + s.percentage, 0)) / count).toFixed(1)
    );
    const scores = submissions.map((s) => s.totalScore);
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);

    // Item Analysis: % correct for each question
    const itemAnalysis = assignment.questions.map((q) => {
      let correctCount = 0;
      submissions.forEach((sub) => {
        const earned = sub.scores[q.id] || 0;
        const max = q.points || 1;
        if (earned >= max * 0.7) {
          correctCount++;
        }
      });

      const correctRate = Math.round((correctCount / count) * 100);
      return {
        questionId: q.id,
        prompt: q.prompt,
        type: q.type,
        correctRate,
        totalAttempts: count,
      };
    });

    return {
      totalSubmissions: count,
      averageScore: avgScore,
      averagePercentage: avgPercent,
      highestScore,
      lowestScore,
      itemAnalysis,
    };
  }

  /**
   * Exports submissions to CSV format string
   */
  static exportSubmissionsToCsv(assignmentId: string): string {
    const assignment = this.getAssignment(assignmentId);
    const submissions = this.getSubmissionsForAssignment(assignmentId);

    const headers = ['STT', 'Họ Và Tên', 'Lớp/Phòng', 'Mã Bài Tập', 'Điểm Đạt Được', 'Điểm Tối Đa', 'Tỷ Lệ (%)', 'Thời Gian Làm (giây)', 'Ngày Nộp'];
    const rows = submissions.map((s, idx) => [
      idx + 1,
      `"${s.studentName.replace(/"/g, '""')}"`,
      `"${(s.studentClass || '').replace(/"/g, '""')}"`,
      `"${s.assignmentCode}"`,
      s.totalScore,
      s.maxTotalScore,
      `${s.percentage}%`,
      s.timeSpentSeconds,
      `"${new Date(s.submittedAt).toLocaleString('vi-VN')}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  }
}
