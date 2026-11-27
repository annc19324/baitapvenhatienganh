/**
 * HomeworkStorageService — Cross-device sync via PostgreSQL backend API.
 *
 * Strategy:
 *   • Backend (PostgreSQL via /api/engwork/*) is the source of truth across devices.
 *   • localStorage acts as instant local cache + offline fallback.
 *   • Async methods (saveAssignmentAsync, deleteAssignmentAsync, saveSubmissionAsync, etc.)
 *     await the backend so callers can guarantee persistence before navigating.
 *   • Pending offline writes/deletes are queued in localStorage and flushed on next sync,
 *     preventing newly created items (e.g. ENG-GQT8) from ever being wiped by a stale pull.
 */

import { HomeworkAssignment, HomeworkSubmission } from '../types/homework';
import { PRESET_TEMPLATES } from './homeworkPresets';
import { apiGet, apiGetRaw, apiPut, apiDelete, apiPost } from './apiClient';

const ASSIGNMENTS_KEY = 'engwork_assignments_v2';
const SUBMISSIONS_KEY = 'engwork_submissions_v2';
const LEGACY_ASSIGNMENTS_KEY = 'smartdoc_homework_assignments_v1';
const SYNC_TS_KEY = 'engwork_sync_ts';
const PENDING_ASSIGN_UPSERTS_KEY = 'engwork_pending_assign_upserts';
const PENDING_ASSIGN_DELETES_KEY = 'engwork_pending_assign_deletes';
const PENDING_SUB_UPSERTS_KEY = 'engwork_pending_sub_upserts';
const PENDING_SUB_DELETES_KEY = 'engwork_pending_sub_deletes';

function invalidateSyncCache() {
  localStorage.removeItem(SYNC_TS_KEY);
}

function getIdSet(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addIdToSet(key: string, id: string) {
  const arr = getIdSet(key);
  if (!arr.includes(id)) {
    arr.push(id);
    localStorage.setItem(key, JSON.stringify(arr));
  }
}

function removeIdFromSet(key: string, id: string) {
  const arr = getIdSet(key).filter((x) => x !== id);
  localStorage.setItem(key, JSON.stringify(arr));
}

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

// ─── Main service class ────────────────────────────────────────────────────

let _syncInFlight: Promise<boolean> | null = null;

export class HomeworkStorageService {
  /**
   * Call once on app start or page load. Pulls from backend first; only seeds if backend is uninitialized.
   */
  static async initializeAsync(force = false): Promise<boolean> {
    const synced = await this.syncFromBackend(force).catch(() => false);
    if (!synced) {
      this.initializeIfEmpty();
    }
    return synced;
  }

  static initializeIfEmpty(): void {
    const existing = localStorage.getItem(ASSIGNMENTS_KEY);
    if (!existing) {
      localSetAssignments([]);
    }

    const existingSubs = localStorage.getItem(SUBMISSIONS_KEY);
    if (!existingSubs) {
      localSetSubmissions([]);
    }
  }

  /** Flush any offline pending writes/deletes to the backend before pulling. */
  private static async flushPendingChanges(): Promise<void> {
    const localAssigns = localGetAssignments();
    for (const id of getIdSet(PENDING_ASSIGN_UPSERTS_KEY)) {
      const item = localAssigns.find((a) => a.id === id);
      if (item) {
        const res = await apiPut(`/api/engwork/assignments/${id}`, item, true);
        if (res) removeIdFromSet(PENDING_ASSIGN_UPSERTS_KEY, id);
      } else {
        removeIdFromSet(PENDING_ASSIGN_UPSERTS_KEY, id);
      }
    }

    for (const id of getIdSet(PENDING_ASSIGN_DELETES_KEY)) {
      const ok = await apiDelete(`/api/engwork/assignments/${id}`);
      if (ok) removeIdFromSet(PENDING_ASSIGN_DELETES_KEY, id);
    }

    const localSubs = localGetSubmissions();
    for (const id of getIdSet(PENDING_SUB_UPSERTS_KEY)) {
      const item = localSubs.find((s) => s.id === id);
      if (item) {
        const res = await apiPut(`/api/engwork/submissions/${id}`, item, false);
        if (res) removeIdFromSet(PENDING_SUB_UPSERTS_KEY, id);
      } else {
        removeIdFromSet(PENDING_SUB_UPSERTS_KEY, id);
      }
    }

    for (const id of getIdSet(PENDING_SUB_DELETES_KEY)) {
      const ok = await apiDelete(`/api/engwork/submissions/${id}`);
      if (ok) removeIdFromSet(PENDING_SUB_DELETES_KEY, id);
    }
  }

  /** Pull fresh data from backend; backend is the source of truth so deletions sync too. */
  static async syncFromBackend(force = false): Promise<boolean> {
    if (_syncInFlight && !force) return _syncInFlight;

    const run = async (): Promise<boolean> => {
      try {
        await this.flushPendingChanges();

        const tsData = await apiGetRaw<{ lastUpdated?: string }>('/api/engwork/sync-ts');
        if (!tsData) return false; // backend unreachable

        const remoteTs = tsData.lastUpdated;
        const localTs = localStorage.getItem(SYNC_TS_KEY);
        if (!force && remoteTs && localTs && remoteTs <= localTs && localStorage.getItem(ASSIGNMENTS_KEY)) {
          return true; // already up to date
        }

        const [assignRes, remoteSubmissions, remoteSiteConfig] = await Promise.all([
          apiGetRaw<{ initialized?: boolean; data?: HomeworkAssignment[] }>('/api/engwork/assignments'),
          apiGet<HomeworkSubmission[]>('/api/engwork/submissions'),
          apiGet<Record<string, any>>('/api/engwork/site-config'),
        ]);

        if (assignRes) {
          if (assignRes.initialized) {
            const remoteList = assignRes.data || [];
            // Preserve any still-unsynced local upserts & exclude still-pending deletes
            const pendingUpserts = getIdSet(PENDING_ASSIGN_UPSERTS_KEY);
            const pendingDeletes = new Set(getIdSet(PENDING_ASSIGN_DELETES_KEY));
            const localMap = new Map(localGetAssignments().map((a) => [a.id, a]));
            const merged = remoteList.filter((a) => !pendingDeletes.has(a.id));
            const mergedIds = new Set(merged.map((a) => a.id));
            for (const id of pendingUpserts) {
              const localItem = localMap.get(id);
              if (localItem && !mergedIds.has(id)) {
                merged.unshift(localItem);
              }
            }
            localSetAssignments(merged);
          } else {
            // Brand new server: preserve any unsynced local assignments & push them
            const pendingUpserts = getIdSet(PENDING_ASSIGN_UPSERTS_KEY);
            const localPending = localGetAssignments().filter((a) => pendingUpserts.includes(a.id));
            localSetAssignments(localPending);
            const bulkOk = await apiPost('/api/engwork/assignments/bulk', localPending, true);
            if (bulkOk) {
              localPending.forEach((a) => removeIdFromSet(PENDING_ASSIGN_UPSERTS_KEY, a.id));
            }
          }
        }

        if (remoteSubmissions) {
          const pendingSubUpserts = getIdSet(PENDING_SUB_UPSERTS_KEY);
          const pendingSubDeletes = new Set(getIdSet(PENDING_SUB_DELETES_KEY));
          const localSubMap = new Map(localGetSubmissions().map((s) => [s.id, s]));
          const mergedSubs = remoteSubmissions.filter((s) => !pendingSubDeletes.has(s.id));
          const mergedSubIds = new Set(mergedSubs.map((s) => s.id));
          for (const id of pendingSubUpserts) {
            const localItem = localSubMap.get(id);
            if (localItem && !mergedSubIds.has(id)) {
              mergedSubs.unshift(localItem);
            }
          }
          localSetSubmissions(mergedSubs);
        }

        if (remoteSiteConfig && Object.keys(remoteSiteConfig).length > 0) {
          const existing = JSON.parse(localStorage.getItem('engwork_site_config_v1') || '{}');
          localStorage.setItem('engwork_site_config_v1', JSON.stringify({ ...existing, ...remoteSiteConfig }));
        }

        if (remoteTs) localStorage.setItem(SYNC_TS_KEY, remoteTs);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('engwork:synced', {
              detail: { siteConfig: remoteSiteConfig },
            })
          );
        }
        return true;
      } catch {
        return false;
      } finally {
        _syncInFlight = null;
      }
    };

    _syncInFlight = run();
    return _syncInFlight;
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

  private static upsertAssignmentLocal(assignment: HomeworkAssignment): HomeworkAssignment {
    this.initializeIfEmpty();
    const all = localGetAssignments();
    const updated: HomeworkAssignment = {
      ...assignment,
      createdAt: assignment.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const index = all.findIndex((a) => a.id === assignment.id);
    if (index >= 0) {
      all[index] = updated;
    } else {
      all.unshift(updated);
    }
    localSetAssignments(all);
    removeIdFromSet(PENDING_ASSIGN_DELETES_KEY, assignment.id);
    addIdToSet(PENDING_ASSIGN_UPSERTS_KEY, assignment.id);
    return updated;
  }

  static async saveAssignmentAsync(
    assignment: HomeworkAssignment
  ): Promise<{ assignment: HomeworkAssignment; synced: boolean }> {
    const updated = this.upsertAssignmentLocal(assignment);
    const res = await apiPut(`/api/engwork/assignments/${updated.id}`, updated, true);
    if (res) {
      removeIdFromSet(PENDING_ASSIGN_UPSERTS_KEY, updated.id);
      invalidateSyncCache();
      return { assignment: updated, synced: true };
    }
    return { assignment: updated, synced: false };
  }

  static saveAssignment(assignment: HomeworkAssignment): HomeworkAssignment {
    const updated = this.upsertAssignmentLocal(assignment);
    apiPut(`/api/engwork/assignments/${updated.id}`, updated, true)
      .then((res) => {
        if (res) {
          removeIdFromSet(PENDING_ASSIGN_UPSERTS_KEY, updated.id);
          invalidateSyncCache();
        }
      })
      .catch(() => {});
    return updated;
  }

  static async deleteAssignmentAsync(id: string): Promise<{ deleted: boolean; synced: boolean }> {
    const all = localGetAssignments();
    const filtered = all.filter((a) => a.id !== id);
    if (filtered.length === all.length) return { deleted: false, synced: true };

    localSetAssignments(filtered);
    removeIdFromSet(PENDING_ASSIGN_UPSERTS_KEY, id);
    addIdToSet(PENDING_ASSIGN_DELETES_KEY, id);

    const ok = await apiDelete(`/api/engwork/assignments/${id}`);
    if (ok) {
      removeIdFromSet(PENDING_ASSIGN_DELETES_KEY, id);
      invalidateSyncCache();
    }
    return { deleted: true, synced: ok };
  }

  static deleteAssignment(id: string): boolean {
    const all = localGetAssignments();
    const filtered = all.filter((a) => a.id !== id);
    if (filtered.length !== all.length) {
      localSetAssignments(filtered);
      removeIdFromSet(PENDING_ASSIGN_UPSERTS_KEY, id);
      addIdToSet(PENDING_ASSIGN_DELETES_KEY, id);
      apiDelete(`/api/engwork/assignments/${id}`)
        .then((ok) => {
          if (ok) {
            removeIdFromSet(PENDING_ASSIGN_DELETES_KEY, id);
            invalidateSyncCache();
          }
        })
        .catch(() => {});
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

  private static upsertSubmissionLocal(submission: HomeworkSubmission): HomeworkSubmission {
    this.initializeIfEmpty();
    const all = localGetSubmissions();
    const existingIndex = all.findIndex((s) => s.id === submission.id);
    if (existingIndex >= 0) {
      all[existingIndex] = submission;
    } else {
      all.unshift(submission);
    }
    localSetSubmissions(all);
    removeIdFromSet(PENDING_SUB_DELETES_KEY, submission.id);
    addIdToSet(PENDING_SUB_UPSERTS_KEY, submission.id);
    return submission;
  }

  static async saveSubmissionAsync(
    submission: HomeworkSubmission
  ): Promise<{ submission: HomeworkSubmission; synced: boolean }> {
    const saved = this.upsertSubmissionLocal(submission);
    const res = await apiPut(`/api/engwork/submissions/${saved.id}`, saved, false);
    if (res) {
      removeIdFromSet(PENDING_SUB_UPSERTS_KEY, saved.id);
      invalidateSyncCache();
      return { submission: saved, synced: true };
    }
    return { submission: saved, synced: false };
  }

  static saveSubmission(submission: HomeworkSubmission): HomeworkSubmission {
    const saved = this.upsertSubmissionLocal(submission);
    apiPut(`/api/engwork/submissions/${saved.id}`, saved, false)
      .then((res) => {
        if (res) {
          removeIdFromSet(PENDING_SUB_UPSERTS_KEY, saved.id);
          invalidateSyncCache();
        }
      })
      .catch(() => {});
    return saved;
  }

  static async deleteSubmissionAsync(id: string): Promise<{ deleted: boolean; synced: boolean }> {
    const all = localGetSubmissions();
    const filtered = all.filter((s) => s.id !== id);
    if (filtered.length === all.length) return { deleted: false, synced: true };

    localSetSubmissions(filtered);
    removeIdFromSet(PENDING_SUB_UPSERTS_KEY, id);
    addIdToSet(PENDING_SUB_DELETES_KEY, id);
    const ok = await apiDelete(`/api/engwork/submissions/${id}`);
    if (ok) {
      removeIdFromSet(PENDING_SUB_DELETES_KEY, id);
      invalidateSyncCache();
    }
    return { deleted: true, synced: ok };
  }

  static deleteSubmission(id: string): boolean {
    const all = localGetSubmissions();
    const filtered = all.filter((s) => s.id !== id);
    if (filtered.length !== all.length) {
      localSetSubmissions(filtered);
      removeIdFromSet(PENDING_SUB_UPSERTS_KEY, id);
      addIdToSet(PENDING_SUB_DELETES_KEY, id);
      apiDelete(`/api/engwork/submissions/${id}`)
        .then((ok) => {
          if (ok) {
            removeIdFromSet(PENDING_SUB_DELETES_KEY, id);
            invalidateSyncCache();
          }
        })
        .catch(() => {});
      return true;
    }
    return false;
  }

  static async renameStudentAsync(oldName: string, newName: string): Promise<{ count: number; synced: boolean }> {
    const cleanOld = oldName.trim().toLowerCase();
    const cleanNew = newName.trim();
    if (!cleanOld || !cleanNew) return { count: 0, synced: true };
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
      const res = await apiPost('/api/engwork/submissions/rename-student', { oldName, newName }, true);
      if (res) {
        invalidateSyncCache();
        return { count, synced: true };
      }
      return { count, synced: false };
    }
    return { count: 0, synced: true };
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
      apiPost('/api/engwork/submissions/rename-student', { oldName, newName }, true)
        .then((res) => { if (res) invalidateSyncCache(); })
        .catch(() => {});
    }
    return count;
  }

  static async deleteStudentDataAsync(studentName: string): Promise<{ removed: number; synced: boolean }> {
    const clean = studentName.trim().toLowerCase();
    const all = localGetSubmissions();
    const filtered = all.filter((s) => s.studentName.trim().toLowerCase() !== clean);
    const removed = all.length - filtered.length;
    if (removed > 0) {
      localSetSubmissions(filtered);
      const res = await apiPost('/api/engwork/submissions/bulk-delete', { studentName }, true);
      if (res) {
        invalidateSyncCache();
        return { removed, synced: true };
      }
      return { removed, synced: false };
    }
    return { removed: 0, synced: true };
  }

  static deleteStudentData(studentName: string): number {
    const clean = studentName.trim().toLowerCase();
    const all = localGetSubmissions();
    const filtered = all.filter((s) => s.studentName.trim().toLowerCase() !== clean);
    const removed = all.length - filtered.length;
    if (removed > 0) {
      localSetSubmissions(filtered);
      apiPost('/api/engwork/submissions/bulk-delete', { studentName }, true)
        .then((res) => { if (res) invalidateSyncCache(); })
        .catch(() => {});
    }
    return removed;
  }

  static async restoreDefaultCurriculumAsync(): Promise<{ synced: boolean }> {
    const existing = localGetAssignments();
    const customOnes = existing.filter((a) => !a.id.startsWith('seed-hw-'));
    const seeded = buildSeededAssignments();
    const merged = [...customOnes, ...seeded];
    localSetAssignments(merged);
    const res = await apiPost('/api/engwork/assignments/bulk?force=true', seeded, true);
    if (res) {
      invalidateSyncCache();
      return { synced: true };
    }
    return { synced: false };
  }

  static restoreDefaultCurriculum(): void {
    const existing = localGetAssignments();
    const customOnes = existing.filter((a) => !a.id.startsWith('seed-hw-'));
    const seeded = buildSeededAssignments();
    const merged = [...customOnes, ...seeded];
    localSetAssignments(merged);
    apiPost('/api/engwork/assignments/bulk?force=true', seeded, true)
      .then((res) => { if (res) invalidateSyncCache(); })
      .catch(() => {});
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
