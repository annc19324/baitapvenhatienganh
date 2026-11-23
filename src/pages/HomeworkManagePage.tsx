import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Users,
  Award,
  Share2,
  Check,
  FileSpreadsheet,
  BarChart2,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  QrCode,
  X,
  Save,
  Clock,
  Lock,
  Unlock,
  Play,
} from 'lucide-react';
import { HomeworkStorageService } from '../services/homeworkStorage';
import { HomeworkAssignment, HomeworkQuestion, HomeworkSubmission } from '../types/homework';
import { useToast } from '../context/ToastContext';
import { QrShareModal } from '../components/QrShareModal';
import { QuestionTypeBadge } from '../components/QuestionTypeBadge';

const formatStudentAnswer = (q: HomeworkQuestion, ans: any): string => {
  if (ans === undefined || ans === null || ans === '') return '(Bỏ trống)';
  if ((q.type === 'MULTIPLE_CHOICE' || q.type === 'PRONUNCIATION') && q.options && typeof ans === 'number') {
    return `${String.fromCharCode(65 + ans)}. ${q.options[ans] || ''}`;
  }
  if (q.type === 'ERROR_CORRECTION' && typeof ans === 'object') {
    return `Vị trí (${ans.option || '?'})${ans.correction ? ` → Sửa thành: "${ans.correction}"` : ''}`;
  }
  if (q.type === 'MATCHING' && typeof ans === 'object') {
    return Object.entries(ans)
      .map(([k, v]) => `${k} → ${v || '(trống)'}`)
      .join(' | ');
  }
  if (q.type === 'READING_COMPREHENSION' && typeof ans === 'object' && q.subQuestions) {
    return q.subQuestions
      .map((sq, i) => {
        const val = ans[sq.id];
        if (sq.type === 'MULTIPLE_CHOICE' && typeof val === 'number' && sq.options) {
          return `(${i + 1}) ${String.fromCharCode(65 + val)}`;
        }
        return `(${i + 1}) ${val || '(trống)'}`;
      })
      .join(' • ');
  }
  return String(ans);
};

export const HomeworkManagePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { copyAndNotify, showToast } = useToast();

  const [assignment, setAssignment] = useState<HomeworkAssignment | null>(null);
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'submissions' | 'analysis'>('submissions');
  const [selectedSubmission, setSelectedSubmission] = useState<HomeworkSubmission | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [editingScores, setEditingScores] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!id) return;
    loadData();
  }, [id]);

  const loadData = () => {
    if (!id) return;
    const assign = HomeworkStorageService.getAssignment(id);
    if (!assign) {
      showToast({ message: 'Không tìm thấy bài tập', type: 'error' });
      navigate('/homework');
      return;
    }
    setAssignment(assign);
    setSubmissions(HomeworkStorageService.getSubmissionsForAssignment(assign.id));
    setStats(HomeworkStorageService.getAssignmentStats(assign.id));
  };

  const liveModalTotal = useMemo(() => {
    return Number(Object.values(editingScores).reduce((sum, s) => sum + (Number(s) || 0), 0).toFixed(1));
  }, [editingScores]);

  const handleCopyLink = (target?: HomeworkAssignment) => {
    const item = target || assignment;
    if (!item) return;
    const url = `${window.location.origin}/homework/do/${item.code}`;
    copyAndNotify(url, `Đã sao chép link (${item.code})`, item.title);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2400);
  };

  const handleExportCsv = () => {
    if (!assignment) return;
    const csvContent = HomeworkStorageService.exportSubmissionsToCsv(assignment.id);
    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Bang_diem_${assignment.code}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    showToast({ message: 'Đã xuất file bảng điểm CSV thành công', type: 'success' });
  };

  const handleOpenSubmissionModal = (sub: HomeworkSubmission) => {
    setSelectedSubmission(sub);
    setEditingScores({ ...sub.scores });
  };

  const handleSaveManualGrading = () => {
    if (!selectedSubmission || !assignment) return;
    const totalScore = liveModalTotal;
    const percentage = Math.round((totalScore / (assignment.totalPoints || 10)) * 100);

    const updated: HomeworkSubmission = {
      ...selectedSubmission,
      scores: editingScores,
      totalScore,
      percentage,
      isReviewedByTeacher: true,
    };

    HomeworkStorageService.updateSubmission(updated);
    setSelectedSubmission(null);
    loadData();
    showToast({ message: 'Đã lưu điểm chấm sửa thành công', type: 'success' });
  };

  const handleToggleStatus = () => {
    if (!assignment) return;
    const newStatus = assignment.status === 'ACTIVE' ? 'CLOSED' : 'ACTIVE';
    const updated: HomeworkAssignment = { ...assignment, status: newStatus };
    HomeworkStorageService.saveAssignment(updated);
    setAssignment(updated);
    showToast({
      message: newStatus === 'ACTIVE' ? 'Đã mở nhận bài làm' : 'Đã khóa bài tập',
      type: 'info',
    });
  };

  if (!assignment || !stats) {
    return (
      <div className="py-24 text-center text-slate-400">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <span className="text-sm font-semibold">Đang tải thông tin quản lý...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ================= HEADER ================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-start gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/homework')}
            aria-label="Quay lại"
            className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/70 font-mono font-extrabold text-xs text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {assignment.code}
              </span>
              <span
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                  assignment.status === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                    : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {assignment.status === 'ACTIVE' ? 'Đang mở nhận bài' : 'Đã đóng'}
              </span>
            </div>
            <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1 leading-snug">
              {assignment.title}
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/homework/do/${assignment.code}`)}
            className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Play className="w-3.5 h-3.5 text-blue-600 fill-current" />
            <span>Làm thử</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={submissions.length === 0}
            className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-40"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Xuất CSV</span>
          </button>

          <button
            type="button"
            onClick={() => handleCopyLink()}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-glow-blue flex items-center justify-center gap-1.5 transition"
          >
            {isCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            <span>{isCopied ? 'Đã chép link' : 'Chia sẻ link'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            aria-label="Hiện mã QR"
            className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <QrCode className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ================= KPI METRICS GRID ================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="surface-card rounded-2xl p-4 sm:p-5 space-y-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Đã nộp bài</span>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>{stats.totalSubmissions}</span>
          </div>
          <p className="text-xs text-slate-500">học sinh hoàn thành</p>
        </div>

        <div className="surface-card rounded-2xl p-4 sm:p-5 space-y-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Điểm trung bình</span>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <span>
              {stats.averageScore}
              <span className="text-xs font-semibold text-slate-400">/{assignment.totalPoints}</span>
            </span>
          </div>
          <p className="text-xs text-teal-600 dark:text-teal-400 font-bold">{stats.averagePercentage}% trung bình</p>
        </div>

        <div className="surface-card rounded-2xl p-4 sm:p-5 space-y-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Cao nhất / Thấp nhất</span>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>{stats.highestScore}đ</span>
          </div>
          <p className="text-xs text-slate-500">Thấp nhất: {stats.lowestScore}đ</p>
        </div>

        <div className="surface-card rounded-2xl p-4 sm:p-5 space-y-2 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Trạng thái</span>
          <button
            type="button"
            onClick={handleToggleStatus}
            className={`w-full py-2 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
              assignment.status === 'ACTIVE'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
            }`}
          >
            {assignment.status === 'ACTIVE' ? (
              <>
                <Unlock className="w-3.5 h-3.5" />
                <span>Đang mở • Khóa</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>Đã khóa • Mở lại</span>
              </>
            )}
          </button>
          <p className="text-[11px] text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {assignment.timeLimitMinutes > 0 ? `${assignment.timeLimitMinutes} phút` : 'Không giới hạn'}
          </p>
        </div>
      </div>

      {/* ================= TABS ================= */}
      <div className="flex items-center gap-1.5 bg-slate-200/70 dark:bg-slate-800/80 p-1 rounded-2xl w-full sm:w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('submissions')}
          className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition ${
            activeTab === 'submissions'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Bài nộp ({submissions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('analysis')}
          className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition ${
            activeTab === 'analysis'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Phân tích câu hỏi</span>
        </button>
      </div>

      {/* ================= TAB 1: SUBMISSIONS (Cards on Mobile / Table on Desktop) ================= */}
      {activeTab === 'submissions' && (
        <div>
          {submissions.length === 0 ? (
            <div className="surface-card rounded-3xl text-center py-14 px-6 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="text-base font-extrabold text-slate-800 dark:text-white">
                Chưa có học sinh nào nộp bài
              </h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                Chia sẻ đường link hoặc cung cấp mã PIN <strong className="font-mono">{assignment.code}</strong> để học sinh bắt đầu làm bài.
              </p>
              <button
                type="button"
                onClick={() => handleCopyLink()}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-extrabold shadow-glow-blue"
              >
                Sao Chép Link Làm Bài
              </button>
            </div>
          ) : (
            <>
              {/* Mobile Cards (< md) */}
              <div className="md:hidden space-y-3">
                {submissions.map((sub, sIdx) => (
                  <div key={sub.id} className="surface-card rounded-2xl p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-400">#{sIdx + 1}</span>
                          <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                            {sub.studentName}
                          </span>
                          {sub.isReviewedByTeacher && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                              Đã duyệt
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {sub.studentClass ? `Lớp ${sub.studentClass} • ` : ''}
                          Làm trong {Math.floor(sub.timeSpentSeconds / 60)}p {sub.timeSpentSeconds % 60}s
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-extrabold text-base text-slate-900 dark:text-white block leading-none">
                          {sub.totalScore}
                          <span className="text-xs text-slate-400 font-normal">/{sub.maxTotalScore}</span>
                        </span>
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            sub.percentage >= 80
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : sub.percentage >= 50
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {sub.percentage}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800 gap-2">
                      <span className="text-[11px] text-slate-400">
                        {new Date(sub.submittedAt).toLocaleDateString('vi-VN')}{' '}
                        {new Date(sub.submittedAt).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenSubmissionModal(sub)}
                        className="px-3.5 py-2 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-xl"
                      >
                        Xem &amp; Chấm điểm
                      </button>
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
                        <th className="py-3.5 px-4">STT</th>
                        <th className="py-3.5 px-4">Học sinh</th>
                        <th className="py-3.5 px-4">Lớp</th>
                        <th className="py-3.5 px-4">Nộp lúc</th>
                        <th className="py-3.5 px-4">Thời lượng</th>
                        <th className="py-3.5 px-4">Điểm số</th>
                        <th className="py-3.5 px-4">Tỷ lệ</th>
                        <th className="py-3.5 px-5 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs sm:text-sm">
                      {submissions.map((sub, sIdx) => (
                        <tr key={sub.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4 font-bold text-slate-400">{sIdx + 1}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                            <span>{sub.studentName}</span>
                            {sub.isReviewedByTeacher && (
                              <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                                Đã duyệt
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">{sub.studentClass || '—'}</td>
                          <td className="py-3.5 px-4 text-xs text-slate-500">
                            {new Date(sub.submittedAt).toLocaleDateString('vi-VN')}{' '}
                            {new Date(sub.submittedAt).toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-500">
                            {Math.floor(sub.timeSpentSeconds / 60)}p {sub.timeSpentSeconds % 60}s
                          </td>
                          <td className="py-3.5 px-4 font-extrabold text-slate-900 dark:text-white">
                            {sub.totalScore}{' '}
                            <span className="text-xs font-normal text-slate-400">/ {sub.maxTotalScore}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full font-bold text-xs ${
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
                          <td className="py-3.5 px-5 text-right">
                            <button
                              type="button"
                              onClick={() => handleOpenSubmissionModal(sub)}
                              className="px-3.5 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-xl transition"
                            >
                              Xem &amp; Sửa điểm
                            </button>
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

      {/* ================= TAB 2: ITEM ANALYSIS ================= */}
      {activeTab === 'analysis' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/70 flex items-start gap-3">
            <BarChart2 className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm text-blue-950 dark:text-blue-100 leading-relaxed">
              Thống kê tỷ lệ học sinh trả lời đúng cho từng câu hỏi. Các câu dưới <strong>50%</strong> được đánh dấu cảnh báo để giáo viên tập trung chữa bài cho lớp.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.itemAnalysis.map((item: any, idx: number) => {
              const isHard = item.correctRate < 50 && item.totalAttempts > 0;
              return (
                <div
                  key={item.questionId}
                  className={`surface-card rounded-2xl p-5 space-y-3 ${
                    isHard ? 'border-rose-300 dark:border-rose-800/80' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <QuestionTypeBadge type={item.type} compact />
                      {isHard && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold text-[10px] inline-flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Cần ôn lại
                        </span>
                      )}
                    </div>

                    <span
                      className={`text-sm font-extrabold ${
                        item.correctRate >= 70
                          ? 'text-emerald-600'
                          : item.correctRate >= 50
                          ? 'text-amber-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {item.correctRate}% đúng
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 leading-relaxed line-clamp-3">
                    {item.prompt}
                  </p>

                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.correctRate >= 70
                          ? 'bg-emerald-500'
                          : item.correctRate >= 50
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${item.correctRate}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= MANUAL GRADING MODAL ================= */}
      {selectedSubmission && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedSubmission(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full max-h-[92vh] flex flex-col shadow-elevated overflow-hidden animate-sheet-up sm:animate-slide-up"
          >
            {/* Modal Sticky Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3 shrink-0">
              <div>
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                  Chấm bài: {selectedSubmission.studentName}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lớp: {selectedSubmission.studentClass || 'Tự do'} • Tổng điểm mới:{' '}
                  <strong className="text-blue-600 dark:text-blue-400">
                    {liveModalTotal} / {assignment.totalPoints}
                  </strong>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {assignment.questions.map((q, idx) => {
                const studentAns = selectedSubmission.answers[q.id];
                const currentScore =
                  editingScores[q.id] !== undefined
                    ? editingScores[q.id]
                    : selectedSubmission.scores[q.id] || 0;
                const aiEval = selectedSubmission.aiEvaluations?.[q.id];

                return (
                  <div
                    key={q.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-700 dark:text-slate-200">
                          Câu {idx + 1}
                        </span>
                        <QuestionTypeBadge type={q.type} compact />
                      </div>

                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-500 font-semibold">Điểm:</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max={q.points || 1}
                          value={currentScore}
                          onChange={(e) =>
                            setEditingScores({
                              ...editingScores,
                              [q.id]: Number(e.target.value),
                            })
                          }
                          className="w-16 px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 font-extrabold text-center text-slate-900 dark:text-white"
                        />
                        <span className="text-slate-400 font-bold">/ {q.points || 1}đ</span>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                      {q.prompt}
                    </p>

                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-700 space-y-1">
                      <span className="text-[11px] font-bold text-slate-400 block">Học sinh trả lời:</span>
                      <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 font-bold whitespace-pre-wrap break-words">
                        {formatStudentAnswer(q, studentAns)}
                      </p>
                    </div>

                    {aiEval && (
                      <div className="p-3 bg-violet-50 dark:bg-violet-950/40 rounded-xl border border-violet-200/80 dark:border-violet-800/70 text-violet-900 dark:text-violet-200 text-xs space-y-1">
                        <span className="font-extrabold flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" /> Gợi ý AI: {aiEval.score}/{aiEval.maxScore}đ
                        </span>
                        <p className="leading-relaxed">{aiEval.feedback}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal Sticky Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 shrink-0 pb-safe">
              <div className="text-xs font-bold text-slate-500">
                Tổng:{' '}
                <span className="text-base font-extrabold text-slate-900 dark:text-white">
                  {liveModalTotal}/{assignment.totalPoints}đ
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSubmission(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveManualGrading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-glow-blue flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu điểm</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shared QR Modal */}
      <QrShareModal
        assignment={showQrModal ? assignment : null}
        onClose={() => setShowQrModal(false)}
        onCopyLink={handleCopyLink}
      />
    </div>
  );
};
