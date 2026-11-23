import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Plus,
  Play,
  Share2,
  Check,
  Clock,
  Trash2,
  ArrowRight,
  Search,
  X,
} from 'lucide-react';
import { HomeworkStorageService } from '../services/homeworkStorage';
import { HomeworkAssignment } from '../types/homework';
import { useToast } from '../context/ToastContext';

export const HomeworkHubPage: React.FC = () => {
  const navigate = useNavigate();
  const { copyAndNotify, showToast } = useToast();

  const [pinInput, setPinInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [assignments, setAssignments] = useState<HomeworkAssignment[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setAssignments(HomeworkStorageService.getAssignments());
  }, []);

  const handleJoinByPin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pinInput.trim().toUpperCase();
    if (!cleanPin) {
      showToast({ message: 'Vui lòng nhập mã bài tập', type: 'error' });
      return;
    }
    const assignment = HomeworkStorageService.getAssignment(cleanPin);
    if (!assignment) {
      showToast({
        message: 'Không tìm thấy bài tập',
        subMessage: `Mã "${cleanPin}" không tồn tại. Hãy kiểm tra lại.`,
        type: 'error',
      });
      return;
    }
    navigate(`/homework/do/${assignment.code}`);
  };

  const handleCopyLink = (assignment: HomeworkAssignment) => {
    const fullUrl = `${window.location.origin}/homework/do/${assignment.code}`;
    copyAndNotify(fullUrl, `Đã sao chép link bài tập (${assignment.code})`, assignment.title);
    setCopiedId(assignment.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (id: string, title: string) => {
    if (window.confirm(`Xóa bài tập "${title}"?`)) {
      HomeworkStorageService.deleteAssignment(id);
      setAssignments(HomeworkStorageService.getAssignments());
      showToast({ message: 'Đã xóa bài tập', type: 'success' });
    }
  };

  const filteredAssignments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return assignments;
    return assignments.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.code.toLowerCase().includes(q) ||
        a.topic.toLowerCase().includes(q)
    );
  }, [assignments, searchQuery]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* ================= COMPACT HERO: CREATE OR JOIN ================= */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-900 via-[#0F2557] to-slate-900 text-white p-5 sm:p-8 shadow-elevated border border-slate-800/80 relative overflow-hidden">
        <div className="absolute inset-0 bg-dot-grid opacity-30 pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Left: Teacher CTA */}
          <div className="md:col-span-7 space-y-3.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
              Bài Tập Tiếng Anh{' '}
              <span className="text-teal-300">Tạo Nhanh &amp; Làm Ngay</span>
            </h1>
            <p className="text-sm text-slate-300 max-w-lg leading-relaxed">
              Soạn bài tập đa dạng (Trắc nghiệm, Điền từ, Sắp xếp câu, Nối từ, Sửa lỗi sai, Tự luận) và gửi mã PIN cho học sinh làm ngay trên mọi thiết bị.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => navigate('/homework/create')}
                className="w-full sm:w-auto px-5 py-3 bg-blue-500 hover:bg-blue-400 active:scale-[0.99] text-white font-extrabold rounded-2xl text-sm inline-flex items-center justify-center gap-2 shadow-glow-blue transition"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Tạo Bài Tập Mới</span>
              </button>
            </div>
          </div>

          {/* Right: Student PIN Box */}
          <div className="md:col-span-5">
            <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-2xl p-4 sm:p-5 space-y-3">
              <p className="text-xs font-extrabold uppercase tracking-wider text-teal-300">
                Học sinh nhập mã để làm bài
              </p>

              <form onSubmit={handleJoinByPin} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Mã PIN (VD: ENG-101)"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.toUpperCase())}
                  className="flex-1 min-w-0 px-3.5 py-3 bg-white text-slate-900 font-mono font-extrabold tracking-wider text-base sm:text-sm rounded-xl placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 uppercase"
                />
                <button
                  type="submit"
                  className="px-4 py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-sm rounded-xl flex items-center justify-center gap-1 transition shrink-0"
                >
                  <span>Vào</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="flex items-center gap-2 text-[11px] text-slate-300">
                <span>Mẫu thử:</span>
                {['ENG-101', 'ENG-102'].map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setPinInput(code)}
                    className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 font-mono font-bold text-teal-300 transition"
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= ASSIGNMENTS LIST ================= */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Danh Sách Bài Tập ({filteredAssignments.length})</span>
          </h2>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm tên bài tập hoặc mã PIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 text-base sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {filteredAssignments.length === 0 ? (
          <div className="surface-card rounded-3xl text-center py-14 px-6 space-y-3">
            <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-base font-extrabold text-slate-800 dark:text-white">
              {searchQuery ? 'Không tìm thấy bài tập phù hợp' : 'Chưa có bài tập nào'}
            </h3>
            <button
              type="button"
              onClick={() => navigate('/homework/create')}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo Bài Tập Đầu Tiên</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAssignments.map((assignment) => (
              <article
                key={assignment.id}
                className="surface-card rounded-2xl p-5 hover:shadow-elevated hover:border-blue-300 dark:hover:border-blue-800 transition flex flex-col justify-between gap-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-mono font-extrabold text-xs border border-blue-200/80 dark:border-blue-800/70">
                      {assignment.code}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {assignment.timeLimitMinutes > 0 ? `${assignment.timeLimitMinutes} phút` : 'Tự do'}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white line-clamp-2 leading-snug">
                    {assignment.title}
                  </h3>

                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {assignment.questions.length} câu hỏi • Tổng {assignment.totalPoints} điểm
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/homework/do/${assignment.code}`)}
                    className="flex-1 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm transition"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Làm bài</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyLink(assignment)}
                    title="Sao chép link cho học sinh"
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                  >
                    {copiedId === assignment.id ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Share2 className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(assignment.id, assignment.title)}
                    title="Xóa bài tập"
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-500 hover:text-rose-600 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
