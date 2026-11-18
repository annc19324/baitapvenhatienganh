import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Sparkles,
  Plus,
  Play,
  CheckCircle2,
  Copy,
  Check,
  Share2,
  Clock,
  Layers,
  Award,
  Users,
  Settings,
  Trash2,
  ArrowRight,
  Search,
  ExternalLink,
  BookOpenCheck,
  FileSpreadsheet,
  BrainCircuit,
  QrCode,
  X,
} from 'lucide-react';
import { HomeworkStorageService } from '../../services/homework/homeworkStorage';
import { PRESET_TEMPLATES } from '../../services/homework/homeworkPresets';
import { HomeworkAssignment, HomeworkSubmission } from '../../types/homework';
import { useToast } from '../../context/ToastContext';

export const HomeworkHubPage: React.FC = () => {
  const navigate = useNavigate();
  const { copyAndNotify, showToast } = useToast();

  const [pinInput, setPinInput] = useState('');
  const [activeTab, setActiveTab] = useState<'my' | 'templates' | 'history'>('my');
  const [searchQuery, setSearchQuery] = useState('');
  const [assignments, setAssignments] = useState<HomeworkAssignment[]>([]);
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [qrModalAssignment, setQrModalAssignment] = useState<HomeworkAssignment | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const list = HomeworkStorageService.getAssignments();
    setAssignments(list);
    const subs = HomeworkStorageService.getSubmissions();
    setSubmissions(subs);
  };

  const handleJoinByPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) {
      showToast({ message: 'Vui lòng nhập mã PIN', type: 'error' });
      return;
    }
    const cleanPin = pinInput.trim().toUpperCase();
    const assignment = HomeworkStorageService.getAssignment(cleanPin);
    if (!assignment) {
      showToast({
        message: 'Không tìm thấy bài tập',
        subMessage: `Mã PIN "${cleanPin}" không tồn tại hoặc đã hết hạn. Hãy kiểm tra lại.`,
        type: 'error',
      });
      return;
    }
    navigate(`/homework/do/${assignment.code}`);
  };

  const handleCopyLink = (assignment: HomeworkAssignment) => {
    const fullUrl = `${window.location.origin}/homework/do/${assignment.code}`;
    copyAndNotify(fullUrl, `Đã sao chép link làm bài (${assignment.code})`);
    setCopiedCode(assignment.id);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleDeleteAssignment = (id: string, title: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa bài tập "${title}"?`)) {
      HomeworkStorageService.deleteAssignment(id);
      loadData();
      showToast({ message: 'Đã xóa bài tập thành công', type: 'success' });
    }
  };

  const handleDuplicate = (id: string) => {
    const dup = HomeworkStorageService.duplicateAssignment(id);
    if (dup) {
      loadData();
      showToast({ message: 'Đã nhân bản bài tập', subMessage: `Mã bài tập mới: ${dup.code}`, type: 'success' });
    }
  };

  const handleUseTemplate = (templateId: string) => {
    navigate(`/homework/create?template=${templateId}`);
  };

  // Filtered lists
  const filteredAssignments = assignments.filter((a) => {
    const q = searchQuery.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      a.code.toLowerCase().includes(q) ||
      a.topic.toLowerCase().includes(q) ||
      a.gradeLevel.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 text-white p-6 sm:p-10 shadow-xl border border-indigo-500/20">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-80 h-80 bg-cyan-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-cyan-300 text-xs font-semibold tracking-wide border border-white/10">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Hệ Thống Bài Tập Tiếng Anh Thông Minh</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Tạo & Giao Bài Tập Về Nhà <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-200 bg-clip-text text-transparent">
                Đầy Đủ Dạng Bài • AI Chấm Điểm
              </span>
            </h1>

            <p className="text-sm sm:text-base text-indigo-100/90 max-w-xl leading-relaxed">
              Hỗ trợ <strong>Trắc nghiệm, Tự luận AI, Điền khuyết, Nối từ, Sắp xếp câu, Đọc hiểu</strong>. 
              Tạo nhanh bằng AI trong 5 giây, chia sẻ mã PIN cho học sinh làm bài không cần tạo tài khoản.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => navigate('/homework/create')}
                className="px-6 py-3.5 bg-cyan-400 hover:bg-cyan-300 text-slate-900 font-extrabold rounded-2xl text-sm flex items-center gap-2 shadow-lg shadow-cyan-500/25 transition transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo Bài Tập Mới (AI / Thủ Công)</span>
              </button>

              <button
                onClick={() => setActiveTab('templates')}
                className="px-5 py-3.5 bg-white/10 hover:bg-white/15 text-white font-bold rounded-2xl text-sm flex items-center gap-2 border border-white/15 transition backdrop-blur-sm"
              >
                <Layers className="w-4 h-4 text-cyan-300" />
                <span>Thư Viện Đề Mẫu (8+ Bộ Đề)</span>
              </button>
            </div>
          </div>

          {/* Quick PIN Code Input Card */}
          <div className="lg:col-span-5">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-cyan-400/20 flex items-center justify-center text-cyan-300 border border-cyan-400/30">
                  <Play className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Làm Bài Tập Ngay</h3>
                  <p className="text-xs text-indigo-200">Dành cho học sinh & người được giao bài</p>
                </div>
              </div>

              <form onSubmit={handleJoinByPin} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-indigo-200 mb-1.5">
                    Nhập Mã Bài Tập (PIN Code):
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Ví dụ: ENG-101 hoặc ENG-4819"
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value.toUpperCase())}
                      className="w-full px-4 py-3.5 bg-white text-slate-900 font-black tracking-wider text-base rounded-2xl placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 uppercase shadow-inner"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 transition transform active:scale-98"
                >
                  <span>Bắt Đầu Làm Bài</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-indigo-200">
                <span>Thử ngay mã mẫu:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPinInput('ENG-101')}
                    className="px-2 py-0.5 rounded bg-white/15 hover:bg-white/25 font-mono font-bold text-cyan-300"
                  >
                    ENG-101
                  </button>
                  <button
                    onClick={() => setPinInput('ENG-102')}
                    className="px-2 py-0.5 rounded bg-white/15 hover:bg-white/25 font-mono font-bold text-cyan-300"
                  >
                    ENG-102
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Highlights Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <BookOpenCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">Đầy Đủ Dạng Bài</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Trắc nghiệm, Tự luận, Điền từ, Nối, Sắp xếp câu</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">Tạo Nhanh AI</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Sinh đề thi tiếng Anh chỉ trong 5 giây</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">AI Chấm Tự Luận</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Chấm ngữ pháp, từ vựng và gợi ý viết lại</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">Thống Kê Chi Tiết</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Bảng điểm, phân tích đúng/sai, xuất Excel</p>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('my')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'my'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Bài Tập Của Tôi & Đang Quản Lý ({assignments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'templates'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Thư Viện Đề Mẫu Chuẩn ({PRESET_TEMPLATES.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Lịch Sử Bài Nộp ({submissions.length})</span>
          </button>
        </div>

        {/* Search */}
        {activeTab === 'my' && (
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên, mã PIN, chủ đề..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}
      </div>

      {/* TAB 1: MY ASSIGNMENTS */}
      {activeTab === 'my' && (
        <div>
          {filteredAssignments.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
              <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">
                {searchQuery ? 'Không tìm thấy bài tập phù hợp' : 'Chưa có bài tập nào'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery
                  ? 'Hãy thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc.'
                  : 'Bấm nút Tạo Bài Tập Mới bên dưới để tự tạo hoặc dùng AI sinh đề nhanh.'}
              </p>
              <button
                onClick={() => navigate('/homework/create')}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo Bài Tập Ngay</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAssignments.map((assignment) => {
                const subCount = HomeworkStorageService.getSubmissionsForAssignment(assignment.id).length;
                return (
                  <div
                    key={assignment.id}
                    className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:border-indigo-500/50 transition flex flex-col justify-between group"
                  >
                    <div className="space-y-3">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-mono font-black text-xs border border-indigo-200 dark:border-indigo-800">
                            {assignment.code}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              assignment.difficulty === 'HARD'
                                ? 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400'
                                : assignment.difficulty === 'EASY'
                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                                : 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400'
                            }`}
                          >
                            {assignment.difficulty}
                          </span>
                        </div>

                        <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {assignment.timeLimitMinutes > 0 ? `${assignment.timeLimitMinutes} phút` : 'Tự do'}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition line-clamp-2">
                          {assignment.title}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                          {assignment.description || assignment.topic}
                        </p>
                      </div>

                      {/* Meta Pills */}
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 pt-1">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-medium">
                          {assignment.gradeLevel}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-medium">
                          {assignment.questions.length} câu hỏi ({assignment.totalPoints} đ)
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 font-bold flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {subCount} bài nộp
                        </span>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-5 mt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => navigate(`/homework/do/${assignment.code}`)}
                          className="py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow transition"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Làm bài</span>
                        </button>

                        <button
                          onClick={() => navigate(`/homework/manage/${assignment.id}`)}
                          className="py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
                        >
                          <Settings className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Quản lý & Điểm</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleCopyLink(assignment)}
                            title="Sao chép link làm bài"
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition"
                          >
                            {copiedCode === assignment.id ? (
                              <Check className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Share2 className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            onClick={() => setQrModalAssignment(assignment)}
                            title="Xem mã QR"
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDuplicate(assignment.id)}
                            title="Nhân bản bài tập này"
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>

                        <button
                          onClick={() => handleDeleteAssignment(assignment.id, assignment.title)}
                          title="Xóa bài tập"
                          className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-500 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TEMPLATES LIBRARY */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-900 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <p className="text-xs text-indigo-950 dark:text-indigo-200">
                Các bộ đề mẫu chuẩn sư phạm tiếng Anh gồm <strong>12 Thì, Câu Bị Động, Câu Điều Kiện, Đọc Hiểu IELTS, Ngữ Âm & Trọng Âm, và Bài Luận Tự Luận AI</strong>. Bạn có thể sử dụng ngay hoặc bấm chỉnh sửa để tạo đề riêng cho lớp.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PRESET_TEMPLATES.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:border-indigo-500/50 transition flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold text-[11px]">
                      {tpl.topic}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {tpl.timeLimitMinutes} phút
                    </span>
                  </div>

                  <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                    {tpl.title}
                  </h3>

                  <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">{tpl.description}</p>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {tpl.tags.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-slate-600 dark:text-slate-400"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-5 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <button
                    onClick={() => handleUseTemplate(tpl.id)}
                    className="flex-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Dùng Mẫu Này</span>
                  </button>

                  <button
                    onClick={() => {
                      const found = assignments.find((a) => a.id === `seed-hw-${tpl.id}`);
                      if (found) {
                        navigate(`/homework/do/${found.code}`);
                      } else {
                        handleUseTemplate(tpl.id);
                      }
                    }}
                    className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Làm Thử</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SUBMISSIONS HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          {submissions.length === 0 ? (
            <div className="text-center py-16 p-8 space-y-3">
              <Award className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">Chưa có bài làm nào</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Khi học sinh hoặc bạn hoàn thành một bài tập, kết quả chi tiết kèm điểm AI sẽ xuất hiện tại đây.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Học Sinh</th>
                    <th className="py-3.5 px-4">Bài Tập</th>
                    <th className="py-3.5 px-4">Mã PIN</th>
                    <th className="py-3.5 px-4">Điểm Số</th>
                    <th className="py-3.5 px-4">Tỷ Lệ</th>
                    <th className="py-3.5 px-4">Thời Gian</th>
                    <th className="py-3.5 px-4 text-right">Chi Tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                        {sub.studentName}
                        {sub.studentClass && (
                          <span className="block text-[10px] font-normal text-slate-400">Lớp: {sub.studentClass}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate font-medium text-slate-800 dark:text-slate-200">
                        {sub.assignmentTitle}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {sub.assignmentCode}
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
                      <td className="py-3.5 px-4 text-[11px] text-slate-500">
                        {new Date(sub.submittedAt).toLocaleDateString('vi-VN')} {new Date(sub.submittedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => navigate(`/homework/result/${sub.id}`)}
                          className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 font-bold rounded-lg transition"
                        >
                          Xem Kết Quả
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

      {/* QR Code Modal */}
      {qrModalAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 max-w-sm w-full text-center space-y-4 shadow-2xl relative">
            <button
              onClick={() => setQrModalAssignment(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
              <QrCode className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">Mã QR Làm Bài Tập</h3>
              <p className="text-xs text-slate-500 mt-0.5">{qrModalAssignment.title}</p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex flex-col items-center justify-center space-y-2 border border-slate-100 dark:border-slate-700">
              {/* Display a high contrast mock QR SVG */}
              <div className="w-48 h-48 bg-white p-3 rounded-xl shadow-inner flex items-center justify-center border border-slate-200">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    `${window.location.origin}/homework/do/${qrModalAssignment.code}`
                  )}`}
                  alt="QR Code"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    // Fallback if network blocked
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-lg tracking-wider">
                MÃ PIN: {qrModalAssignment.code}
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Học sinh dùng camera điện thoại quét mã QR hoặc truy cập trang web và nhập mã PIN để vào làm bài ngay.
            </p>

            <button
              onClick={() => {
                handleCopyLink(qrModalAssignment);
                setQrModalAssignment(null);
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
