import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Users,
  BookOpen,
  Award,
  FileSpreadsheet,
  Plus,
  LogOut,
  Search,
  Trash2,
  Eye,
  Share2,
  Lock,
  Unlock,
  Clock,
  ChevronDown,
  ChevronUp,
  Play,
  ClipboardCheck,
  User as UserIcon,
  Palette,
  Pencil,
  RotateCcw,
  Save,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { HomeworkStorageService, StudentSummary } from '../services/homeworkStorage';
import { HomeworkAssignment, HomeworkSubmission, EducationLevelId } from '../types/homework';
import { EDUCATION_LEVELS, EducationLevelBadge } from '../components/EducationLevelBadge';
import { AppearanceManager } from '../components/AppearanceManager';

type AdminTab = 'students' | 'submissions' | 'assignments' | 'appearance';

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, adminUsername, loginAdmin, logoutAdmin } = useAuth();
  const { showToast, copyAndNotify } = useToast();

  // Inline login state
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginErr, setLoginErr] = useState('');

  // Dashboard state
  const [activeTab, setActiveTab] = useState<AdminTab>('students');
  const [assignments, setAssignments] = useState<HomeworkAssignment[]>([]);
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [studentSummaries, setStudentSummaries] = useState<StudentSummary[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('ALL');
  const [selectedLevel, setSelectedLevel] = useState<EducationLevelId | 'ALL'>('ALL');
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  // Edit Submission Modal state
  const [editingSub, setEditingSub] = useState<HomeworkSubmission | null>(null);
  const [editSubName, setEditSubName] = useState('');
  const [editSubScore, setEditSubScore] = useState(0);

  // Add Manual Score Modal state
  const [showAddSubModal, setShowAddSubModal] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [newSubAssignId, setNewSubAssignId] = useState('');
  const [newSubScore, setNewSubScore] = useState(8);

  useEffect(() => {
    if (isAdmin) {
      loadData();
      HomeworkStorageService.syncFromBackend(true).then((ok) => {
        if (ok) loadData();
      });
    }
  }, [isAdmin]);

  const loadData = () => {
    const assigns = HomeworkStorageService.getAssignments();
    setAssignments(assigns);
    setSubmissions(HomeworkStorageService.getSubmissions());
    setStudentSummaries(HomeworkStorageService.getStudentSummaries());
    if (!newSubAssignId && assigns.length > 0) {
      setNewSubAssignId(assigns[0].id);
    }
  };

  const handleInlineLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErr('');
    const res = loginAdmin(loginUser, loginPass);
    if (res.ok) {
      showToast({ message: 'Đăng nhập Admin thành công!', type: 'success' });
      setLoginUser('');
      setLoginPass('');
    } else {
      setLoginErr(res.error || 'Sai thông tin đăng nhập.');
    }
  };

  const handleLogout = () => {
    logoutAdmin();
    showToast({ message: 'Đã đăng xuất tài khoản Admin', type: 'info' });
    navigate('/homework');
  };

  const handleRenameStudent = (oldName: string) => {
    const nextName = window.prompt(`Nhập tên mới thay cho "${oldName}":`, oldName);
    if (!nextName || !nextName.trim() || nextName.trim() === oldName) return;
    const updatedCount = HomeworkStorageService.renameStudent(oldName, nextName);
    if (updatedCount > 0) {
      loadData();
      setExpandedStudent(nextName.trim());
      showToast({
        message: `Đã đổi tên thành "${nextName.trim()}"`,
        subMessage: `Cập nhật ${updatedCount} lượt nộp bài.`,
        type: 'success',
      });
    }
  };

  const handleDeleteStudent = (name: string) => {
    if (window.confirm(`Xóa toàn bộ dữ liệu và lịch sử điểm thi của "${name}"?`)) {
      const removed = HomeworkStorageService.deleteStudentData(name);
      loadData();
      showToast({ message: `Đã xóa ${removed} lượt nộp bài của ${name}`, type: 'success' });
    }
  };

  const handleOpenEditSubmission = (sub: HomeworkSubmission) => {
    setEditingSub(sub);
    setEditSubName(sub.studentName);
    setEditSubScore(sub.totalScore);
  };

  const handleSaveEditSubmission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSub || !editSubName.trim()) return;
    const clampedScore = Math.max(0, Math.min(editingSub.maxTotalScore, Number(editSubScore) || 0));
    const percentage = Math.round((clampedScore / (editingSub.maxTotalScore || 10)) * 100);
    HomeworkStorageService.saveSubmission({
      ...editingSub,
      studentName: editSubName.trim(),
      totalScore: Number(clampedScore.toFixed(1)),
      percentage,
      isReviewedByTeacher: true,
    });
    setEditingSub(null);
    loadData();
    showToast({ message: 'Đã cập nhật điểm & thông tin bài nộp', type: 'success' });
  };

  const handleAddManualSubmission = (e: React.FormEvent) => {
    e.preventDefault();
    const targetAssign = assignments.find((a) => a.id === newSubAssignId);
    if (!newSubName.trim() || !targetAssign) {
      showToast({ message: 'Vui lòng nhập tên và chọn bài tập', type: 'error' });
      return;
    }
    const maxScore = targetAssign.totalPoints || 10;
    const score = Math.max(0, Math.min(maxScore, Number(newSubScore) || 0));
    const sub: HomeworkSubmission = {
      id: `sub-admin-${Date.now()}`,
      assignmentId: targetAssign.id,
      assignmentCode: targetAssign.code,
      assignmentTitle: targetAssign.title,
      studentName: newSubName.trim(),
      answers: {},
      scores: {},
      totalScore: Number(score.toFixed(1)),
      maxTotalScore: maxScore,
      percentage: Math.round((score / maxScore) * 100),
      timeSpentSeconds: 0,
      submittedAt: new Date().toISOString(),
      isReviewedByTeacher: true,
    };
    HomeworkStorageService.saveSubmission(sub);
    setShowAddSubModal(false);
    setNewSubName('');
    loadData();
    showToast({ message: 'Đã thêm điểm thi mới thành công!', type: 'success' });
  };

  const handleDeleteSubmission = (subId: string, studentName: string) => {
    if (window.confirm(`Xóa kết quả bài làm của "${studentName}"?`)) {
      HomeworkStorageService.deleteSubmission(subId);
      loadData();
      showToast({ message: 'Đã xóa lượt nộp bài', type: 'success' });
    }
  };

  const handleDeleteAssignment = async (assignId: string, title: string) => {
    if (window.confirm(`Xóa bài tập "${title}"?`)) {
      const { synced } = await HomeworkStorageService.deleteAssignmentAsync(assignId);
      loadData();
      showToast({
        message: 'Đã xóa bài tập',
        subMessage: synced ? 'Đã đồng bộ xóa lên máy chủ' : 'Đã xóa trên máy (đang chờ đồng bộ)',
        type: synced ? 'success' : 'info',
      });
    }
  };

  const handleToggleAssignmentStatus = async (assign: HomeworkAssignment) => {
    const nextStatus = assign.status === 'ACTIVE' ? 'CLOSED' : 'ACTIVE';
    const { synced } = await HomeworkStorageService.saveAssignmentAsync({ ...assign, status: nextStatus });
    loadData();
    showToast({
      message: nextStatus === 'ACTIVE' ? 'Đã mở lại bài tập' : 'Đã khóa bài tập',
      subMessage: synced ? 'Đã đồng bộ lên máy chủ' : undefined,
      type: 'info',
    });
  };

  const handleRestoreDefaults = () => {
    if (window.confirm('Khôi phục lại 12 bài học & bài tập mẫu A–Z mặc định (giữ nguyên các bài bạn tự tạo)?')) {
      HomeworkStorageService.restoreDefaultCurriculum();
      loadData();
      showToast({ message: 'Đã khôi phục bộ bài tập A–Z mặc định!', type: 'success' });
    }
  };

  const handleExportCsv = () => {
    const csv = HomeworkStorageService.exportSubmissionsToCsv(filteredSubmissions);
    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csv], {
      type: 'text/csv;charset=utf-8;',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Diem_thi_EngWork_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    showToast({ message: 'Đã xuất bảng điểm CSV thành công', type: 'success' });
  };

  const avgPercentage = useMemo(() => {
    if (submissions.length === 0) return 0;
    return Math.round(submissions.reduce((s, item) => s + item.percentage, 0) / submissions.length);
  }, [submissions]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return studentSummaries;
    return studentSummaries.filter((s) => s.studentName.toLowerCase().includes(q));
  }, [studentSummaries, searchQuery]);

  const filteredSubmissions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return submissions.filter((s) => {
      if (selectedAssignmentId !== 'ALL' && s.assignmentId !== selectedAssignmentId) return false;
      if (!q) return true;
      return (
        s.studentName.toLowerCase().includes(q) ||
        s.assignmentTitle.toLowerCase().includes(q) ||
        s.assignmentCode.toLowerCase().includes(q)
      );
    });
  }, [submissions, searchQuery, selectedAssignmentId]);

  const filteredAssignments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return assignments.filter((a) => {
      if (selectedLevel !== 'ALL' && a.levelId !== selectedLevel) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.code.toLowerCase().includes(q) ||
        a.topic.toLowerCase().includes(q)
      );
    });
  }, [assignments, searchQuery, selectedLevel]);

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto py-8 sm:py-14 animate-slide-up">
        <div className="surface-card rounded-3xl p-6 sm:p-8 shadow-elevated space-y-5">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-brand-gradient text-white flex items-center justify-center mx-auto shadow-sm">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Khu Vực Quản Trị (Admin)
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Đăng nhập để quản lý toàn bộ dữ liệu, điểm thi, bài tập, logo &amp; giao diện.
            </p>
          </div>

          <form onSubmit={handleInlineLogin} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tài khoản Admin
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Nhập tên đăng nhập..."
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Mật khẩu
              </label>
              <input
                type="password"
                required
                placeholder="Nhập mật khẩu..."
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {loginErr && (
              <p className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 text-xs font-bold">
                {loginErr}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3.5 btn-brand font-extrabold text-sm rounded-2xl transition"
            >
              Đăng Nhập Admin
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ================= ADMIN HEADER ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-brand-gradient text-white flex items-center justify-center shadow-sm shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                Quản Trị Toàn Hệ Thống
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-brand font-mono text-[11px] font-bold">
                {adminUsername}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Thêm, sửa, xóa bài tập, điểm thi, học sinh, logo, màu sắc &amp; hình nền
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/homework/create')}
            className="flex-1 sm:flex-none px-4 py-2.5 btn-brand font-extrabold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo bài tập</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddSubModal(true)}
            className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-teal-600" />
            <span>Thêm điểm</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={submissions.length === 0}
            className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 disabled:opacity-40"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="px-3.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span>Thoát</span>
          </button>
        </div>
      </div>

      {/* ================= KPI STATS ================= */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="surface-card rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white leading-none">
              {studentSummaries.length}
            </p>
            <p className="text-xs font-semibold text-slate-500 mt-1">Người làm bài</p>
          </div>
        </div>

        <div className="surface-card rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white leading-none">
              {submissions.length}
            </p>
            <p className="text-xs font-semibold text-slate-500 mt-1">Lượt nộp bài</p>
          </div>
        </div>

        <div className="surface-card rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white leading-none">
              {avgPercentage}%
            </p>
            <p className="text-xs font-semibold text-slate-500 mt-1">Điểm trung bình</p>
          </div>
        </div>

        <div className="surface-card rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white leading-none">
              {assignments.length}
            </p>
            <p className="text-xs font-semibold text-slate-500 mt-1">Tổng bài tập</p>
          </div>
        </div>
      </section>

      {/* ================= TABS & SEARCH ================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800/80 p-1 rounded-2xl overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'students', label: `Học sinh (${studentSummaries.length})` },
              { id: 'submissions', label: `Điểm thi (${submissions.length})` },
              { id: 'assignments', label: `Bài tập (${assignments.length})` },
              { id: 'appearance', label: 'Logo & Giao diện', icon: Palette },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                activeTab === t.id
                  ? 'bg-white dark:bg-slate-900 text-brand shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {'icon' in t && <Palette className="w-3.5 h-3.5" />}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {activeTab !== 'appearance' && (
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm tên học sinh, bài tập..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 surface-card rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {activeTab === 'submissions' && (
              <select
                value={selectedAssignmentId}
                onChange={(e) => setSelectedAssignmentId(e.target.value)}
                className="px-3.5 py-2.5 surface-card rounded-xl text-xs font-bold"
              >
                <option value="ALL">Tất cả bài tập</option>
                {assignments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} — {a.title.slice(0, 35)}
                  </option>
                ))}
              </select>
            )}

            {activeTab === 'assignments' && (
              <div className="flex gap-2">
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value as EducationLevelId | 'ALL')}
                  className="flex-1 px-3.5 py-2.5 surface-card rounded-xl text-xs font-bold"
                >
                  <option value="ALL">Mọi trình độ</option>
                  {EDUCATION_LEVELS.map((lvl) => (
                    <option key={lvl.id} value={lvl.id}>
                      {lvl.emoji} {lvl.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleRestoreDefaults}
                  title="Khôi phục 12 bài A-Z mặc định"
                  className="px-3 py-2.5 surface-card rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-brand flex items-center gap-1 shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Khôi phục mẫu</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ================= TAB 1: STUDENTS ================= */}
      {activeTab === 'students' && (
        <div className="space-y-3">
          {filteredStudents.length === 0 ? (
            <div className="surface-card rounded-3xl py-12 px-6 text-center text-sm text-slate-500">
              Chưa có dữ liệu học sinh phù hợp.
            </div>
          ) : (
            filteredStudents.map((stu) => {
              const isOpen = expandedStudent === stu.studentName;
              return (
                <div key={stu.studentName} className="surface-card rounded-2xl overflow-hidden">
                  <div className="p-4 sm:p-5 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setExpandedStudent(isOpen ? null : stu.studentName)}
                      className="flex items-center gap-3 min-w-0 flex-1 text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-brand flex items-center justify-center font-extrabold text-sm shrink-0">
                        <UserIcon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                          {stu.studentName}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {stu.attemptCount} lượt làm • TB: <strong>{stu.averagePercentage}%</strong> • Cao nhất:{' '}
                          <strong>{stu.highestPercentage}%</strong>
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRenameStudent(stu.studentName)}
                        title="Đổi tên học sinh"
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-brand"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteStudent(stu.studentName)}
                        title="Xóa toàn bộ dữ liệu học sinh này"
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedStudent(isOpen ? null : stu.studentName)}
                        className="p-2 rounded-xl text-slate-400"
                      >
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 p-4 space-y-2.5">
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                        Chi tiết điểm thi của {stu.studentName}
                      </p>
                      {stu.submissions.map((sub) => (
                        <div
                          key={sub.id}
                          className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-brand">
                                {sub.assignmentCode}
                              </span>
                              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                {sub.assignmentTitle}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {new Date(sub.submittedAt).toLocaleString('vi-VN')}
                            </p>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                            <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                              {sub.totalScore}/{sub.maxTotalScore}đ ({sub.percentage}%)
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenEditSubmission(sub)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold text-xs inline-flex items-center gap-1"
                            >
                              <Pencil className="w-3 h-3" /> Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate(`/homework/result/${sub.id}`)}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-xs inline-flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" /> Xem
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSubmission(sub.id, sub.studentName)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ================= TAB 2: SUBMISSIONS ================= */}
      {activeTab === 'submissions' && (
        <div>
          {filteredSubmissions.length === 0 ? (
            <div className="surface-card rounded-3xl py-12 px-6 text-center text-sm text-slate-500">
              Chưa có lượt nộp bài nào phù hợp.
            </div>
          ) : (
            <>
              <div className="md:hidden space-y-3">
                {filteredSubmissions.map((sub) => (
                  <div key={sub.id} className="surface-card rounded-2xl p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-extrabold text-sm text-slate-900 dark:text-white">{sub.studentName}</p>
                        <p className="text-xs text-slate-500 line-clamp-1">
                          {sub.assignmentCode} • {sub.assignmentTitle}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white block">
                          {sub.totalScore}/{sub.maxTotalScore}
                        </span>
                        <span className="text-[11px] font-bold text-brand">{sub.percentage}%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] text-slate-400">
                        {new Date(sub.submittedAt).toLocaleDateString('vi-VN')}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditSubmission(sub)}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-bold"
                        >
                          Sửa điểm
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/homework/result/${sub.id}`)}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-bold"
                        >
                          Xem
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSubmission(sub.id, sub.studentName)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block surface-card rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200/80 dark:border-slate-800">
                      <tr>
                        <th className="py-3.5 px-4">Học sinh</th>
                        <th className="py-3.5 px-4">Bài tập</th>
                        <th className="py-3.5 px-4">Điểm</th>
                        <th className="py-3.5 px-4">Tỷ lệ</th>
                        <th className="py-3.5 px-4">Ngày nộp</th>
                        <th className="py-3.5 px-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm">
                      {filteredSubmissions.map((sub) => (
                        <tr key={sub.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          <td className="py-3.5 px-4 font-extrabold text-slate-900 dark:text-white">
                            {sub.studentName}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-bold text-xs text-brand mr-1.5">
                              {sub.assignmentCode}
                            </span>
                            <span className="text-slate-700 dark:text-slate-200">{sub.assignmentTitle}</span>
                          </td>
                          <td className="py-3.5 px-4 font-extrabold text-slate-900 dark:text-white">
                            {sub.totalScore}/{sub.maxTotalScore}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                sub.percentage >= 80
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                  : sub.percentage >= 50
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                              }`}
                            >
                              {sub.percentage}%
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-500">
                            {new Date(sub.submittedAt).toLocaleString('vi-VN')}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditSubmission(sub)}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-bold"
                              >
                                Sửa
                              </button>
                              <button
                                type="button"
                                onClick={() => navigate(`/homework/result/${sub.id}`)}
                                className="px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold"
                              >
                                Xem
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSubmission(sub.id, sub.studentName)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ================= TAB 3: ASSIGNMENTS (FULL CRUD) ================= */}
      {activeTab === 'assignments' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAssignments.map((assign) => {
            const subCount = submissions.filter((s) => s.assignmentId === assign.id).length;
            return (
              <div
                key={assign.id}
                className="surface-card rounded-2xl p-4 sm:p-5 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-brand font-mono font-extrabold text-xs">
                        {assign.code}
                      </span>
                      <EducationLevelBadge levelId={assign.levelId} />
                    </div>
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {assign.timeLimitMinutes > 0 ? `${assign.timeLimitMinutes}p` : 'Tự do'}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-snug">
                    {assign.title}
                  </h3>

                  <p className="text-xs text-slate-500">
                    {assign.questions.length} câu ({assign.totalPoints}đ) • {subCount} lượt nộp •{' '}
                    <strong className={assign.status === 'ACTIVE' ? 'text-emerald-600' : 'text-slate-400'}>
                      {assign.status === 'ACTIVE' ? 'Đang mở' : 'Đã khóa'}
                    </strong>
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => navigate(`/homework/edit/${assign.id}`)}
                      className="px-3 py-1.5 rounded-xl btn-brand text-xs font-bold flex items-center gap-1"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Sửa bài</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(`/homework/do/${assign.code}`)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Mở</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        copyAndNotify(
                          `${window.location.origin}/homework/do/${assign.code}`,
                          `Đã chép link (${assign.code})`,
                          assign.title
                        )
                      }
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                      title="Sao chép link"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleAssignmentStatus(assign)}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                      title={assign.status === 'ACTIVE' ? 'Khóa bài tập' : 'Mở bài tập'}
                    >
                      {assign.status === 'ACTIVE' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteAssignment(assign.id, assign.title)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60"
                    title="Xóa bài tập"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= TAB 4: LOGO, COLORS & BACKGROUND ================= */}
      {activeTab === 'appearance' && <AppearanceManager />}

      {/* ================= EDIT SUBMISSION MODAL ================= */}
      {editingSub && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setEditingSub(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-elevated animate-sheet-up sm:animate-slide-up pb-safe relative"
          >
            <button
              type="button"
              onClick={() => setEditingSub(null)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              Sửa Điểm &amp; Thông Tin Bài Nộp
            </h3>

            <form onSubmit={handleSaveEditSubmission} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Tên người làm bài
                </label>
                <input
                  type="text"
                  required
                  value={editSubName}
                  onChange={(e) => setEditSubName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Điểm số (tối đa {editingSub.maxTotalScore}đ)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max={editingSub.maxTotalScore}
                  required
                  value={editSubScore}
                  onChange={(e) => setEditSubScore(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm font-extrabold"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 btn-brand font-extrabold text-sm rounded-xl flex items-center justify-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Lưu Thay Đổi</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= ADD MANUAL SUBMISSION MODAL ================= */}
      {showAddSubModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowAddSubModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-elevated animate-sheet-up sm:animate-slide-up pb-safe relative"
          >
            <button
              type="button"
              onClick={() => setShowAddSubModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              Thêm Điểm Thi Thủ Công
            </h3>

            <form onSubmit={handleAddManualSubmission} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Tên học sinh
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nhập họ và tên..."
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Bài tập
                </label>
                <select
                  value={newSubAssignId}
                  onChange={(e) => setNewSubAssignId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                >
                  {assignments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} — {a.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Điểm đạt được
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max={assignments.find((a) => a.id === newSubAssignId)?.totalPoints || 10}
                  required
                  value={newSubScore}
                  onChange={(e) => setNewSubScore(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm font-extrabold"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 btn-brand font-extrabold text-sm rounded-xl flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Lưu Điểm Mới</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
