import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Users,
  Award,
  Clock,
  Share2,
  Copy,
  Check,
  FileSpreadsheet,
  BarChart2,
  Settings,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  Sparkles,
  QrCode,
  X,
  Edit3,
  Trash2,
  Save,
} from 'lucide-react';
import { HomeworkStorageService } from '../../services/homework/homeworkStorage';
import { HomeworkAssignment, HomeworkSubmission } from '../../types/homework';
import { useToast } from '../../context/ToastContext';

export const HomeworkManagePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { copyAndNotify, showToast } = useToast();

  const [assignment, setAssignment] = useState<HomeworkAssignment | null>(null);
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'submissions' | 'analysis' | 'settings'>('submissions');
  const [selectedSubmission, setSelectedSubmission] = useState<HomeworkSubmission | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Manual grading adjustments in modal
  const [editingScores, setEditingScores] = useState<Record<string, number>>({});
  const [teacherNote, setTeacherNote] = useState('');

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

    const subs = HomeworkStorageService.getSubmissionsForAssignment(assign.id);
    setSubmissions(subs);

    const st = HomeworkStorageService.getAssignmentStats(assign.id);
    setStats(st);
  };

  const handleCopyLink = () => {
    if (!assignment) return;
    const url = `${window.location.origin}/homework/do/${assignment.code}`;
    copyAndNotify(url, `Đã sao chép link làm bài (${assignment.code})`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleExportCsv = () => {
    if (!assignment) return;
    const csvContent = HomeworkStorageService.exportSubmissionsToCsv(assignment.id);
    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], { type: 'text/csv;charset=utf-8;' });
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

    // Recalculate total score
    const totalScore = Number(Object.values(editingScores).reduce((sum, s) => sum + s, 0).toFixed(1));
    const percentage = Math.round((totalScore / assignment.totalPoints) * 100);

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
    showToast({ message: 'Đã lưu điểm chỉnh sửa thành công', type: 'success' });
  };

  const handleToggleStatus = () => {
    if (!assignment) return;
    const newStatus = assignment.status === 'ACTIVE' ? 'CLOSED' : 'ACTIVE';
    const updated = { ...assignment, status: newStatus as any };
    HomeworkStorageService.saveAssignment(updated);
    setAssignment(updated);
    showToast({
      message: newStatus === 'ACTIVE' ? 'Đã mở nhận bài làm' : 'Đã khóa bài tập (không nhận thêm bài làm)',
      type: 'info',
    });
  };

  if (!assignment || !stats) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <span>Đang tải thông tin quản lý bài tập...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/homework')}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 font-mono font-black text-xs text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                {assignment.code}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  assignment.status === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                }`}
              >
                {assignment.status === 'ACTIVE' ? 'Đang Mở Nhận Bài' : 'Đã Đóng'}
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white mt-1">{assignment.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={submissions.length === 0}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-40"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Xuất Excel/CSV</span>
          </button>

          <button
            onClick={handleCopyLink}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow flex items-center gap-1.5 transition"
          >
            {isCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            <span>{isCopied ? 'Đã Sao Chép Link' : 'Chia Sẻ Link'}</span>
          </button>

          <button
            onClick={() => setShowQrModal(true)}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Hiển thị mã QR"
          >
            <QrCode className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Học sinh đã nộp</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <span>{stats.totalSubmissions}</span>
          </div>
          <p className="text-[11px] text-slate-500">trên tổng số người truy cập</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Điểm trung bình</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-cyan-600" />
            <span>
              {stats.averageScore} <span className="text-sm font-normal text-slate-400">/ {assignment.totalPoints}</span>
            </span>
          </div>
          <p className="text-[11px] text-cyan-600 font-bold">{stats.averagePercentage}% đạt chuẩn</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Điểm cao nhất</span>
          <div className="text-2xl font-black text-emerald-600 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>{stats.highestScore}</span>
          </div>
          <p className="text-[11px] text-slate-500">Thấp nhất: {stats.lowestScore} đ</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Trạng thái bài tập</span>
          <div className="pt-1">
            <button
              onClick={handleToggleStatus}
              className={`px-3 py-1 rounded-xl text-xs font-black transition ${
                assignment.status === 'ACTIVE'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-rose-100 hover:text-rose-700'
                  : 'bg-slate-200 text-slate-700 dark:bg-slate-800 hover:bg-emerald-100'
              }`}
            >
              {assignment.status === 'ACTIVE' ? 'Đang Mở (Bấm để đóng)' : 'Đã Đóng (Bấm để mở)'}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {assignment.timeLimitMinutes > 0 ? `Thời gian: ${assignment.timeLimitMinutes}p` : 'Không giới hạn thời gian'}
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('submissions')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
            activeTab === 'submissions'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Danh Sách Bài Nộp ({submissions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('analysis')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
            activeTab === 'analysis'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Phân Tích Câu Hỏi (Item Analysis)</span>
        </button>
      </div>

      {/* TAB 1: SUBMISSIONS TABLE */}
      {activeTab === 'submissions' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          {submissions.length === 0 ? (
            <div className="text-center py-16 p-8 space-y-3">
              <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">Chưa có ai nộp bài tập này</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Hãy sao chép link hoặc cung cấp mã PIN <strong>{assignment.code}</strong> cho học sinh để bắt đầu làm bài.
              </p>
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow"
              >
                Sao Chép Link Làm Bài
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">STT</th>
                    <th className="py-3.5 px-4">Họ Và Tên</th>
                    <th className="py-3.5 px-4">Lớp</th>
                    <th className="py-3.5 px-4">Thời Gian Nộp</th>
                    <th className="py-3.5 px-4">Thời Lượng Làm</th>
                    <th className="py-3.5 px-4">Điểm Số</th>
                    <th className="py-3.5 px-4">Xếp Loại</th>
                    <th className="py-3.5 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {submissions.map((sub, sIdx) => (
                    <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-400">{sIdx + 1}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                        {sub.studentName}
                        {sub.isReviewedByTeacher && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-bold">
                            Đã duyệt
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">{sub.studentClass || '-'}</td>
                      <td className="py-3.5 px-4 text-[11px] text-slate-500">
                        {new Date(sub.submittedAt).toLocaleDateString('vi-VN')} {new Date(sub.submittedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {Math.floor(sub.timeSpentSeconds / 60)}p {sub.timeSpentSeconds % 60}s
                      </td>
                      <td className="py-3.5 px-4 font-black text-slate-900 dark:text-slate-100 text-sm">
                        {sub.totalScore} / {sub.maxTotalScore}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            sub.percentage >= 80
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                              : sub.percentage >= 50
                              ? 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400'
                              : 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400'
                          }`}
                        >
                          {sub.percentage}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenSubmissionModal(sub)}
                          className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-bold rounded-lg transition"
                        >
                          Xem & Sửa Điểm
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ITEM ANALYSIS */}
      {activeTab === 'analysis' && (
        <div className="space-y-4">
          <div className="bg-indigo-50 dark:bg-indigo-950/40 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900 flex items-center gap-3">
            <BarChart2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <p className="text-xs text-indigo-950 dark:text-indigo-200">
              Phân tích tỷ lệ phần trăm học sinh làm đúng từng câu. Các câu có tỷ lệ đúng dưới 50% được đánh dấu cảnh báo để giáo viên ôn tập lại kiến thức cho cả lớp.
            </p>
          </div>

          <div className="space-y-4">
            {stats.itemAnalysis.map((item: any, idx: number) => {
              const isHard = item.correctRate < 50;
              return (
                <div
                  key={item.questionId}
                  className={`p-5 rounded-2xl border bg-white dark:bg-slate-900 shadow-sm space-y-3 transition ${
                    isHard ? 'border-rose-300 dark:border-rose-900/60' : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-black uppercase text-slate-600 dark:text-slate-300">
                        {item.type}
                      </span>
                      {isHard && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px] flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Học sinh hay sai
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-sm font-black ${
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
                  </div>

                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                    {item.prompt}
                  </p>

                  {/* Progress bar */}
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

      {/* DETAIL & MANUAL GRADING MODAL */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedSubmission(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-lg text-slate-900 dark:text-white">
                Bài Làm Của: {selectedSubmission.studentName}
              </h3>
              <p className="text-xs text-slate-500">
                Lớp: {selectedSubmission.studentClass || 'Tự do'} • Điểm hiện tại: {selectedSubmission.totalScore} / {selectedSubmission.maxTotalScore}
              </p>
            </div>

            <div className="space-y-5">
              {assignment.questions.map((q, idx) => {
                const studentAns = selectedSubmission.answers[q.id];
                const currentScore = editingScores[q.id] !== undefined ? editingScores[q.id] : (selectedSubmission.scores[q.id] || 0);
                const aiEval = selectedSubmission.aiEvaluations?.[q.id];

                return (
                  <div
                    key={q.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        Câu {idx + 1} ({q.type})
                      </span>

                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 font-medium">Chấm điểm:</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max={q.points || 1}
                          value={currentScore}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setEditingScores({
                              ...editingScores,
                              [q.id]: val,
                            });
                          }}
                          className="w-14 px-2 py-1 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-bold text-center"
                        />
                        <span className="text-slate-400">/ {q.points || 1} đ</span>
                      </div>
                    </div>

                    <p className="font-medium text-slate-800 dark:text-slate-200">{q.prompt}</p>

                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 space-y-1">
                      <span className="text-[11px] font-bold text-slate-400 block">Học sinh trả lời:</span>
                      <p className="text-indigo-600 dark:text-indigo-400 font-bold">
                        {typeof studentAns === 'object' && studentAns !== null
                          ? JSON.stringify(studentAns)
                          : String(studentAns || '(Bỏ trống)')}
                      </p>
                    </div>

                    {aiEval && (
                      <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 text-purple-900 dark:text-purple-200 text-[11px] space-y-1">
                        <span className="font-bold flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" /> Điểm gợi ý từ AI: {aiEval.score} đ
                        </span>
                        <p>{aiEval.feedback}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={handleSaveManualGrading}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Lưu Điểm Chỉnh Sửa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR MODAL */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 max-w-sm w-full text-center space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center mx-auto">
              <QrCode className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Mã QR Làm Bài Tập</h3>
              <p className="text-xs text-slate-500 mt-0.5">{assignment.title}</p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex flex-col items-center justify-center space-y-2 border">
              <div className="w-48 h-48 bg-white p-3 rounded-xl shadow-inner flex items-center justify-center border border-slate-200">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    `${window.location.origin}/homework/do/${assignment.code}`
                  )}`}
                  alt="QR Code"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-lg tracking-wider">
                MÃ PIN: {assignment.code}
              </span>
            </div>

            <button
              onClick={() => {
                handleCopyLink();
                setShowQrModal(false);
              }}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition"
            >
              Sao Chép Link Làm Bài
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
