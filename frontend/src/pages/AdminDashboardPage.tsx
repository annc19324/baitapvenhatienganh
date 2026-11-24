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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { HomeworkStorageService, StudentSummary } from '../services/homeworkStorage';
import { HomeworkAssignment, HomeworkSubmission, EducationLevelId } from '../types/homework';
import { EDUCATION_LEVELS, EducationLevelBadge } from '../components/EducationLevelBadge';

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, adminUsername, loginAdmin, logoutAdmin } = useAuth();
  const { showToast, copyAndNotify } = useToast();

  // Inline login state when not authenticated
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginErr, setLoginErr] = useState('');

  // Dashboard data
  const [activeTab, setActiveTab] = useState<'students' | 'submissions' | 'assignments'>('students');
  const [assignments, setAssignments] = useState<HomeworkAssignment[]>([]);
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [studentSummaries, setStudentSummaries] = useState<StudentSummary[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('ALL');
  const [selectedLevel, setSelectedLevel] = useState<EducationLevelId | 'ALL'>('ALL');
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = () => {
    setAssignments(HomeworkStorageService.getAssignments());
    setSubmissions(HomeworkStorageService.getSubmissions());
    setStudentSummaries(HomeworkStorageService.getStudentSummaries());
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

  const handleDeleteSubmission = (subId: string, studentName: string) => {
    if (window.confirm(`Xóa kết quả bài làm của "${studentName}"?`)) {
      HomeworkStorageService.deleteSubmission(subId);
      loadData();
      showToast({ message: 'Đã xóa lượt nộp bài', type: 'success' });
    }
  };

  const handleDeleteAssignment = (assignId: string, title: string) => {
    if (window.confirm(`Xóa bài tập "${title}"?`)) {
      HomeworkStorageService.deleteAssignment(assignId);
      loadData();
      showToast({ message: 'Đã xóa bài tập', type: 'success' });
    }
  };

  const handleToggleAssignmentStatus = (assign: HomeworkAssignment) => {
    const nextStatus = assign.status === 'ACTIVE' ? 'CLOSED' : 'ACTIVE';
    HomeworkStorageService.saveAssignment({ ...assign, status: nextStatus });
    loadData();
    showToast({
      message: nextStatus === 'ACTIVE' ? 'Đã mở lại bài tập' : 'Đã khóa bài tập',
      type: 'info',
    });
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

  // Not authenticated view
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto py-8 sm:py-14 animate-slide-up">
        <div className="surface-card rounded-3xl p-6 sm:p-8 shadow-elevated space-y-5">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto border border-blue-200 dark:border-blue-800">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Khu Vực Quản Trị (Admin)
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Đăng nhập tài khoản Admin để quản lý bài tập và xem điểm thi của người làm bài.
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
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-2xl shadow-glow-blue transition"
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
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-teal-500 text-white flex items-center justify-center shadow-glow-blue shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                Quản Trị Hệ Thống
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono text-[11px] font-bold">
                {adminUsername}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Theo dõi người làm bài, tra cứu điểm thi chi tiết và quản lý bộ đề
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/homework/create')}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-glow-blue flex items-center justify-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo bài tập</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={submissions.length === 0}
            className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Xuất CSV</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="px-3.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5 hover:bg-rose-100 dark:hover:bg-rose-950 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất</span>
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
          <button
            type="button"
            onClick={() => setActiveTab('students')}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition ${
              activeTab === 'students'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Học sinh ({studentSummaries.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('submissions')}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition ${
              activeTab === 'submissions'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Điểm thi ({submissions.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('assignments')}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition ${
              activeTab === 'assignments'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Bài tập ({assignments.length})
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm tên học sinh, bài tập..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {activeTab === 'submissions' && (
            <select
              value={selectedAssignmentId}
              onChange={(e) => setSelectedAssignmentId(e.target.value)}
              className="px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value as EducationLevelId | 'ALL')}
              className="px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Mọi trình độ</option>
              {EDUCATION_LEVELS.map((lvl) => (
                <option key={lvl.id} value={lvl.id}>
                  {lvl.emoji} {lvl.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ================= TAB 1: STUDENTS PROFILES & SCORES ================= */}
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
                  <button
                    type="button"
                    onClick={() => setExpandedStudent(isOpen ? null : stu.studentName)}
                    className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center font-extrabold text-sm shrink-0">
                        <UserIcon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                          {stu.studentName}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {stu.attemptCount} lượt làm • {stu.uniqueAssignments} bài khác nhau • Gần nhất:{' '}
                          {new Date(stu.latestSubmittedAt).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-extrabold ${
                            stu.averagePercentage >= 80
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : stu.averagePercentage >= 50
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          TB: {stu.averagePercentage}%
                        </span>
                        <span className="block text-[10px] text-slate-400 font-semibold mt-0.5">
                          Cao nhất: {stu.highestPercentage}%
                        </span>
                      </div>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 p-4 space-y-2.5">
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                        Lịch sử điểm thi của {stu.studentName}
                      </p>
                      {stu.submissions.map((sub) => (
                        <div
                          key={sub.id}
                          className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                                {sub.assignmentCode}
                              </span>
                              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                {sub.assignmentTitle}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {new Date(sub.submittedAt).toLocaleString('vi-VN')} • Làm trong{' '}
                              {Math.floor(sub.timeSpentSeconds / 60)}p {sub.timeSpentSeconds % 60}s
                            </p>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
                            <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                              {sub.totalScore}/{sub.maxTotalScore}đ ({sub.percentage}%)
                            </span>
                            <button
                              type="button"
                              onClick={() => navigate(`/homework/result/${sub.id}`)}
                              className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Chi tiết</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSubmission(sub.id, sub.studentName)}
                              aria-label="Xóa lượt nộp"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
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

      {/* ================= TAB 2: ALL SUBMISSIONS ================= */}
      {activeTab === 'submissions' && (
        <div>
          {filteredSubmissions.length === 0 ? (
            <div className="surface-card rounded-3xl py-12 px-6 text-center text-sm text-slate-500">
              Chưa có lượt nộp bài nào phù hợp.
            </div>
          ) : (
            <>
              {/* Mobile Cards (< md) */}
              <div className="md:hidden space-y-3">
                {filteredSubmissions.map((sub) => (
                  <div key={sub.id} className="surface-card rounded-2xl p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {sub.studentName}
                        </p>
                        <p className="text-xs text-slate-500 line-clamp-1">
                          {sub.assignmentCode} • {sub.assignmentTitle}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white block">
                          {sub.totalScore}/{sub.maxTotalScore}
                        </span>
                        <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                          {sub.percentage}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] text-slate-400">
                        {new Date(sub.submittedAt).toLocaleString('vi-VN')}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => navigate(`/homework/result/${sub.id}`)}
                          className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-bold"
                        >
                          Xem bài
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

              {/* Desktop Table (md+) */}
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
                            <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400 mr-1.5">
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
                                onClick={() => navigate(`/homework/result/${sub.id}`)}
                                className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold hover:bg-blue-100"
                              >
                                Xem bài
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSubmission(sub.id, sub.studentName)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
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

      {/* ================= TAB 3: MANAGE ASSIGNMENTS ================= */}
      {activeTab === 'assignments' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAssignments.map((assign) => {
            const subCount = submissions.filter((s) => s.assignmentId === assign.id).length;
            return (
              <div key={assign.id} className="surface-card rounded-2xl p-4 sm:p-5 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono font-extrabold text-xs">
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

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => navigate(`/homework/do/${assign.code}`)}
                      className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center gap-1"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Mở bài</span>
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
    </div>
  );
};
