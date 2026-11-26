/**
 * HomeworkStorageService — Cross-device sync via backend API.
 *
 * Strategy:
 *   • Writes go to BOTH backend API (fire-and-forget) AND localStorage.
 *   • Reads: on page load we pull from API and merge into localStorage.
 *     Subsequent reads in the same session use the merged localStorage.
 *   • If the backend is unreachable, the app keeps working offline from cache.
 */

import { HomeworkAssignment, HomeworkSubmission } from '../types/homework';
import { PRESET_TEMPLATES } from './homeworkPresets';
import { apiGet, apiGetRaw, apiPut, apiDelete, apiPost } from './apiClient';

const ASSIGNMENTS_KEY = 'engwork_assignments_v2';
const SUBMISSIONS_KEY = 'engwork_submissions_v2';
const LEGACY_ASSIGNMENTS_KEY = 'smartdoc_homework_assignments_v1';
const SYNC_TS_KEY = 'engwork_sync_ts';

// ─── Seed helpers ──────────────────────────────────────────────────────────

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
      status: 'ACTIVE' as const,
      theory: tpl.theory,
      questions: tpl.questions,
      totalPoints,
    };
  });
}

// ─── Local-cache helpers ───────────────────────────────────────────────────

function localGetAssignments(): HomeworkAssignment[] {
  try {
    const data = localStorage.getItem(ASSIGNMENTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function localSetAssignments(list: HomeworkAssignment[]): void {
  localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(list));
}

function localGetSubmissions(): HomeworkSubmission[] {
  try {
    const data = localStorage.getItem(SUBMISSIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function localSetSubmissions(list: HomeworkSubmission[]): void {
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(list));
}

// ─── Merge helpers (server wins for same id, then local custom) ────────────

function mergeAssignments(local: HomeworkAssignment[], remote: HomeworkAssignment[]): HomeworkAssignment[] {
  const map = new Map<string, HomeworkAssignment>();
  local.forEach((a) => map.set(a.id, a));
  remote.forEach((a) => map.set(a.id, a)); // remote wins
  return Array.from(map.values());
}

function mergeSubmissions(local: HomeworkSubmission[], remote: HomeworkSubmission[]): HomeworkSubmission[] {
  const map = new Map<string, HomeworkSubmission>();
  local.forEach((s) => map.set(s.id, s));
  remote.forEach((s) => map.set(s.id, s));
  return Array.from(map.values());
}

// ─── Main service class ────────────────────────────────────────────────────

export class HomeworkStorageService {
  /**
   * Call once on app start. Pulls from backend first; only seeds if backend is uninitialized.
   */
  static async initializeAsync(): Promise<void> {
    const synced = await this.syncFromBackend().catch(() => false);
    if (!synced) {
      this.initializeIfEmpty();
    }
  }

  static initializeIfEmpty(): void {
    const existing = localStorage.getItem(ASSIGNMENTS_KEY);
    if (!existing) {
      const seeded = buildSeededAssignments();
      try {
        const legacyRaw = localStorage.getItem(LEGACY_ASSIGNMENTS_KEY);
        if (legacyRaw) {
          const legacyList: HomeworkAssignment[] = JSON.parse(legacyRaw);
          const customOnes = legacyList.filter((a) => !a.id.startsWith('seed-hw-'));
          if (customOnes.length > 0) seeded.unshift(...customOnes);
        }
      } catch { /* ignore */ }
      localSetAssignments(seeded);
    }

    const existingSubs = localStorage.getItem(SUBMISSIONS_KEY);
    if (!existingSubs) {
      localSetSubmissions([]);
    }
  }

  /** Pull fresh data from backend; backend is the source of truth so deletions sync too. */
  static async syncFromBackend(): Promise<boolean> {
    try {
      const tsData = await apiGetRaw<{ lastUpdated?: string }>('/api/engwork/sync-ts');
      if (!tsData) return false; // backend unreachable
      const remoteTs = tsData.lastUpdated;
      const localTs = localStorage.getItem(SYNC_TS_KEY);
      if (remoteTs && localTs && remoteTs <= localTs && localStorage.getItem(ASSIGNMENTS_KEY)) {
        return true; // already up to date
      }

      const [assignRes, remoteSubmissions, remoteSiteConfig] = await Promise.all([
        apiGetRaw<{ initialized?: boolean; data?: HomeworkAssignment[] }>('/api/engwork/assignments'),
        apiGet<HomeworkSubmission[]>('/api/engwork/submissions'),
        apiGet<Record<string, any>>('/api/engwork/site-config'),
      ]);

      if (assignRes) {
        if (assignRes.initialized) {
          // Server is source of truth — replace local cache so deletions are respected
          localSetAssignments(assignRes.data || []);
        } else {
          // Brand new server: seed locally & push to server once
          this.initializeIfEmpty();
          const seeded = localGetAssignments();
          await apiPost('/api/engwork/assignments/bulk', seeded, true).catch(() => {});
        }
      }
      if (remoteSubmissions) {
        localSetSubmissions(remoteSubmissions);
      }
      if (remoteSiteConfig && Object.keys(remoteSiteConfig).length > 0) {
        const existing = JSON.parse(localStorage.getItem('engwork_site_config_v1') || '{}');
        localStorage.setItem('engwork_site_config_v1', JSON.stringify({ ...existing, ...remoteSiteConfig }));
      }

      if (remoteTs) localStorage.setItem(SYNC_TS_KEY, remoteTs);
      return true;
    } catch {
      return false;
    }
  }

  // ── Assignments ──────────────────────────────────────────────────────────

  static getAssignments(): HomeworkAssignment[] {
    this.initializeIfEmpty();
    try {
      const list = localGetAssignments();
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
    const all = localGetAssignments();
    const updated = { ...assignment, updatedAt: new Date().toISOString() };
    const index = all.findIndex((a) => a.id === assignment.id);
    if (index >= 0) {
      all[index] = updated;
    } else {
      updated.createdAt = updated.createdAt || new Date().toISOString();
      all.unshift(updated);
    }
    localSetAssignments(all);

    // Sync to backend
    apiPut(`/api/engwork/assignments/${assignment.id}`, updated, true).catch(() => {});

    return updated;
  }

  static deleteAssignment(id: string): boolean {
    const all = localGetAssignments();
    const filtered = all.filter((a) => a.id !== id);
    if (filtered.length !== all.length) {
      localSetAssignments(filtered);
      apiDelete(`/api/engwork/assignments/${id}`).catch(() => {});
      return true;
    }
    return false;
  }

  // ── Submissions ──────────────────────────────────────────────────────────

  static getSubmissions(): HomeworkSubmission[] {
    this.initializeIfEmpty();
    try {
      return localGetSubmissions().sort(
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
    const all = localGetSubmissions();
    const existingIndex = all.findIndex((s) => s.id === submission.id);
    if (existingIndex >= 0) {
      all[existingIndex] = submission;
    } else {
      all.unshift(submission);
    }
    localSetSubmissions(all);

    // Any client can POST a submission; admin writes use PUT
    apiPut(`/api/engwork/submissions/${submission.id}`, submission, false).catch(() => {});

    return submission;
  }

  static deleteSubmission(id: string): boolean {
    const all = localGetSubmissions();
    const filtered = all.filter((s) => s.id !== id);
    if (filtered.length !== all.length) {
      localSetSubmissions(filtered);
      apiDelete(`/api/engwork/submissions/${id}`).catch(() => {});
      return true;
    }
    return false;
  }

  static renameStudent(oldName: string, newName: string): number {
    const cleanOld = oldName.trim().toLowerCase();
    const cleanNew = newName.trim();
    if (!cleanOld || !cleanNew) return 0;
    const all = localGetSubmissions();
    let count = 0;
    const updated = all.map((s) => {
      if (s.studentName.trim().toLowerCase() === cleanOld) {
        count++;
        return { ...s, studentName: cleanNew };
      }
      return s;
    });
    if (count > 0) {
      localSetSubmissions(updated);
      apiPost('/api/engwork/submissions/rename-student', { oldName, newName }, true).catch(() => {});
    }
    return count;
  }

  static deleteStudentData(studentName: string): number {
    const clean = studentName.trim().toLowerCase();
    const all = localGetSubmissions();
    const filtered = all.filter((s) => s.studentName.trim().toLowerCase() !== clean);
    const removed = all.length - filtered.length;
    if (removed > 0) {
      localSetSubmissions(filtered);
      apiPost('/api/engwork/submissions/bulk-delete', { studentName }, true).catch(() => {});
    }
    return removed;
  }

  static restoreDefaultCurriculum(): void {
    const existing = localGetAssignments();
    const customOnes = existing.filter((a) => !a.id.startsWith('seed-hw-'));
    const seeded = buildSeededAssignments();
    const merged = [...customOnes, ...seeded];
    localSetAssignments(merged);
    apiPost('/api/engwork/assignments/bulk', seeded, true).catch(() => {});
  }

  // ── Student summaries ────────────────────────────────────────────────────

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
      const avgPct = Math.round(sorted.reduce((sum, s) => sum + s.percentage, 0) / sorted.length);
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
      (a, b) => new Date(b.latestSubmittedAt).getTime() - new Date(a.latestSubmittedAt).getTime()
    );
  }

  // ── CSV Export ────────────────────────────────────────────────────────────

  static exportSubmissionsToCsv(submissions?: HomeworkSubmission[]): string {
    const list = submissions ?? this.getSubmissions();
    const headers = [
      'STT', 'Họ Và Tên', 'Mã Bài Tập', 'Tên Bài Tập',
      'Điểm Đạt Được', 'Điểm Tối Đa', 'Tỷ Lệ (%)', 'Thời Gian (giây)', 'Ngày Nộp',
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
