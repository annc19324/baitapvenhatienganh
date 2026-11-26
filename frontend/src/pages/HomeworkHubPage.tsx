import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Play,
  Share2,
  Check,
  Clock,
  ArrowRight,
  Search,
  X,
  User,
  Edit2,
  LayoutGrid,
  List,
  CheckCircle2,
  BookOpenText,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';
import { HomeworkStorageService } from '../services/homeworkStorage';
import { HomeworkAssignment, EducationLevelId } from '../types/homework';
import { useAuth } from '../context/AuthContext';
import { useSiteConfig } from '../context/SiteConfigContext';
import { useToast } from '../context/ToastContext';
import {
  EDUCATION_LEVELS,
  EDUCATION_LEVEL_MAP,
  EducationLevelBadge,
} from '../components/EducationLevelBadge';
import { TheoryModal } from '../components/TheoryModal';

export const HomeworkHubPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, studentName, saveStudentName } = useAuth();
  const { config } = useSiteConfig();
  const { copyAndNotify, showToast } = useToast();

  const [assignments, setAssignments] = useState<HomeworkAssignment[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<EducationLevelId | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [theoryAssignment, setTheoryAssignment] = useState<HomeworkAssignment | null>(null);

  const [editingName, setEditingName] = useState(!studentName);
  const [nameDraft, setNameDraft] = useState(studentName);

  useEffect(() => {
    // Initialize + sync from backend, then refresh list
    HomeworkStorageService.initializeAsync().then(() => {
      setAssignments(HomeworkStorageService.getAssignments());
    });
    // Also set immediately from cache for instant display
    setAssignments(HomeworkStorageService.getAssignments());
  }, []);

  useEffect(() => {
    setNameDraft(studentName);
    if (studentName) setEditingName(false);
  }, [studentName]);

  const studentLatestByAssignment = useMemo(() => {
    if (!studentName) return {};
    const subs = HomeworkStorageService.getSubmissionsByStudent(studentName);
    const map: Record<string, { score: number; max: number; percentage: number; subId: string }> = {};
    subs.forEach((s) => {
      if (!map[s.assignmentId]) {
        map[s.assignmentId] = {
          score: s.totalScore,
          max: s.maxTotalScore,
          percentage: s.percentage,
          subId: s.id,
        };
      }
    });
    return map;
  }, [studentName, assignments]);

  const activeIds = useMemo(() => new Set(assignments.map((a) => a.id)), [assignments]);
  const completedCount = Object.keys(studentLatestByAssignment).filter((id) => activeIds.has(id)).length;

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameDraft.trim()) {
      showToast({ message: 'Vui lòng nhập tên của bạn', type: 'error' });
      return;
    }
    saveStudentName(nameDraft);
    setEditingName(false);
    showToast({
      message: `Đã lưu tên "${nameDraft.trim()}"`,
      subMessage: 'Các lần làm bài sau hệ thống sẽ tự động điền tên giúp bạn.',
      type: 'success',
    });
  };

  const handleJoinByPin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pinInput.trim().toUpperCase();
    if (!cleanPin) {
      showToast({ message: 'Vui lòng nhập mã bài tập', type: 'error' });
      return;
    }
    const found = HomeworkStorageService.getAssignment(cleanPin);
    if (!found) {
      showToast({
        message: 'Không tìm thấy bài tập',
        subMessage: `Mã "${cleanPin}" không tồn tại.`,
        type: 'error',
      });
      return;
    }
    navigate(`/homework/do/${found.code}`);
  };

  const handleCopyLink = (assignment: HomeworkAssignment) => {
    const fullUrl = `${window.location.origin}/homework/do/${assignment.code}`;
    copyAndNotify(fullUrl, `Đã sao chép link (${assignment.code})`, assignment.title);
    setCopiedId(assignment.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAdminDelete = (assign: HomeworkAssignment) => {
    if (window.confirm(`Xóa bài tập "${assign.title}"?`)) {
      HomeworkStorageService.deleteAssignment(assign.id);
      setAssignments(HomeworkStorageService.getAssignments());
      showToast({ message: 'Đã xóa bài tập', type: 'success' });
    }
  };

  const filteredAssignments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return assignments.filter((a) => {
      if (selectedLevel !== 'ALL' && a.levelId !== selectedLevel) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.code.toLowerCase().includes(q) ||
        a.topic.toLowerCase().includes(q) ||
        a.gradeLevel.toLowerCase().includes(q)
      );
    });
  }, [assignments, selectedLevel, searchQuery]);

  const activeLevelMeta = selectedLevel !== 'ALL' ? EDUCATION_LEVEL_MAP[selectedLevel] : null;

  return (
    <div className="space-y-6 sm:space-y-7 animate-fade-in">
      {/* ================= CUSTOMIZABLE HERO BANNER ================= */}
      <section className="rounded-3xl bg-hero-custom text-white p-5 sm:p-8 shadow-elevated border border-white/10 relative overflow-hidden">
        {config.heroPattern && <div className="absolute inset-0 bg-dot-grid opacity-30 pointer-events-none" />}

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left: Dynamic Hero Copy & Student Name */}
          <div className="lg:col-span-7 space-y-4">
            <div className="space-y-1.5">
              {config.heroBadge && (
                <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-teal-300 text-xs font-bold border border-white/10">
                  {config.heroBadge}
                </span>
              )}
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-snug">
                {config.heroTitle}{' '}
                <span style={{ color: config.secondaryColor }} className="brightness-125">
                  {config.heroHighlight}
                </span>
              </h1>
              {config.heroDescription && (
                <p className="text-xs sm:text-sm text-slate-200/90 max-w-xl leading-relaxed">
                  {config.heroDescription}
                </p>
              )}
            </div>

            {/* Persistent Student Name Bar */}
            {!editingName && studentName ? (
              <div className="inline-flex flex-wrap items-center gap-2.5 bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-4 py-2.5">
                <span className="flex items-center gap-2 text-sm font-bold text-white">
                  <User className="w-4 h-4 text-teal-300" />
                  <span>Xin chào, {studentName}</span>
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/15 text-white font-bold">
                  Đã làm {completedCount}/{assignments.length} bài
                </span>
                <button
                  type="button"
                  onClick={() => setEditingName(true)}
                  className="text-xs font-bold text-slate-200 hover:text-white inline-flex items-center gap-1 ml-1 underline"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Đổi tên</span>
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSaveName}
                className="flex flex-col sm:flex-row gap-2 max-w-md bg-white/10 backdrop-blur-md border border-white/15 p-2 rounded-2xl"
              >
                <input
                  type="text"
                  placeholder="Nhập tên của bạn (tự lưu cho lần sau)..."
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="flex-1 min-w-0 px-3.5 py-2.5 bg-white text-slate-900 text-base sm:text-sm font-bold rounded-xl placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-white/60"
                />
                <button
                  type="submit"
                  style={{ backgroundColor: config.secondaryColor }}
                  className="px-4 py-2.5 text-white font-extrabold text-xs sm:text-sm rounded-xl hover:brightness-110 transition shrink-0"
                >
                  Lưu tên
                </button>
              </form>
            )}
          </div>

          {/* Right: Quick PIN Entry */}
          <div className="lg:col-span-5">
            <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-extrabold uppercase tracking-wider text-white/80">
                  Vào nhanh bằng mã bài tập
                </p>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => navigate('/homework/create')}
                    className="text-xs font-bold btn-brand px-2.5 py-1 rounded-lg inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tạo mới
                  </button>
                )}
              </div>

              <form onSubmit={handleJoinByPin} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nhập mã bài tập (VD: ENG-XXXX)"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.toUpperCase())}
                  className="flex-1 min-w-0 px-3.5 py-3 bg-white text-slate-900 font-mono font-extrabold tracking-wider text-base sm:text-sm rounded-xl placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 focus:outline-none uppercase"
                />
                <button
                  type="submit"
                  className="px-4 py-3 btn-brand font-extrabold text-sm rounded-xl flex items-center justify-center gap-1 transition shrink-0"
                >
                  <span>Vào</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {assignments.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-white/75">
                  <span>Nhanh:</span>
                  {assignments.slice(0, 4).map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setPinInput(a.code)}
                      className="px-2 py-0.5 rounded-md bg-white/15 hover:bg-white/25 font-mono font-bold text-white transition"
                    >
                      {a.code}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ================= LEVEL ROADMAP FILTER ================= */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setSelectedLevel('ALL')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold border whitespace-nowrap transition shrink-0 ${
              selectedLevel === 'ALL'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-sm'
                : 'surface-card text-slate-600 dark:text-slate-300 hover:border-slate-300'
            }`}
          >
            Tất cả A–Z ({assignments.length})
          </button>

          {EDUCATION_LEVELS.map((lvl) => {
            const count = assignments.filter((a) => a.levelId === lvl.id).length;
            const active = selectedLevel === lvl.id;
            return (
              <button
                key={lvl.id}
                type="button"
                onClick={() => setSelectedLevel(lvl.id)}
                className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold border whitespace-nowrap transition shrink-0 flex items-center gap-1.5 ${
                  active
                    ? `${lvl.activeTabClass} shadow-sm`
                    : 'surface-card text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <span>{lvl.emoji}</span>
                <span>{lvl.shortLabel}</span>
                <span className={`text-[11px] ${active ? 'opacity-85' : 'text-slate-400'}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        {activeLevelMeta && (
          <div className="p-3.5 rounded-2xl surface-card flex items-center gap-2.5 text-xs sm:text-sm">
            <span className="text-lg">{activeLevelMeta.emoji}</span>
            <p className="text-slate-700 dark:text-slate-200">
              <strong className="text-slate-900 dark:text-white">
                {activeLevelMeta.label} ({activeLevelMeta.cefr}):
              </strong>{' '}
              {activeLevelMeta.description}
            </p>
          </div>
        )}
      </section>

      {/* ================= SEARCH & VIEW MODE ================= */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-brand" />
            <span>Bài Học &amp; Bài Tập ({filteredAssignments.length})</span>
          </h2>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm bài học, chủ đề, mã PIN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 text-base sm:text-sm surface-card rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="inline-flex bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                aria-label="Dạng lưới"
                className={`p-2 rounded-lg transition ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-900 text-brand shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                aria-label="Dạng danh sách"
                className={`p-2 rounded-lg transition ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-900 text-brand shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ================= ASSIGNMENTS GRID OR LIST ================= */}
        {filteredAssignments.length === 0 ? (
          <div className="surface-card rounded-3xl text-center py-14 px-6 space-y-2">
            <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
              Không tìm thấy bài học phù hợp
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedLevel('ALL');
                setSearchQuery('');
              }}
              className="text-xs font-bold text-brand hover:underline"
            >
              Xem toàn bộ lộ trình A–Z
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAssignments.map((assignment) => {
              const myResult = studentLatestByAssignment[assignment.id];
              return (
                <article
                  key={assignment.id}
                  className="surface-card rounded-3xl p-5 hover:shadow-elevated transition flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <EducationLevelBadge levelId={assignment.levelId} />
                      <span className="font-mono font-extrabold text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {assignment.code}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-snug line-clamp-2">
                        {assignment.title}
                      </h3>
                      {assignment.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                          {assignment.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="font-semibold">
                        {assignment.questions.length} câu • {assignment.totalPoints}đ
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold">
                        <Clock className="w-3.5 h-3.5" />
                        {assignment.timeLimitMinutes > 0 ? `${assignment.timeLimitMinutes}p` : 'Tự do'}
                      </span>
                    </div>

                    {myResult && (
                      <button
                        type="button"
                        onClick={() => navigate(`/homework/result/${myResult.subId}`)}
                        className="w-full px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/70 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-between"
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Điểm gần nhất</span>
                        </span>
                        <span>
                          {myResult.score}/{myResult.max} ({myResult.percentage}%)
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                    <div className="flex items-center gap-2">
                      {assignment.theory && (
                        <button
                          type="button"
                          onClick={() => setTheoryAssignment(assignment)}
                          className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
                        >
                          <BookOpenText className="w-3.5 h-3.5 text-brand" />
                          <span>Lý thuyết</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => navigate(`/homework/do/${assignment.code}`)}
                        className="flex-1 py-2.5 px-3 btn-brand active:scale-[0.98] rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm transition"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Làm bài</span>
                      </button>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center justify-end gap-1 pt-1">
                        <button
                          type="button"
                          onClick={() => navigate(`/homework/edit/${assignment.id}`)}
                          title="Chỉnh sửa bài tập & lý thuyết"
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold inline-flex items-center gap-1"
                        >
                          <Pencil className="w-3 h-3" /> Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyLink(assignment)}
                          title="Sao chép link"
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                        >
                          {copiedId === assignment.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Share2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdminDelete(assignment)}
                          title="Xóa bài tập"
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredAssignments.map((assignment) => {
              const myResult = studentLatestByAssignment[assignment.id];
              return (
                <article
                  key={assignment.id}
                  className="surface-card rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3.5 transition"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <EducationLevelBadge levelId={assignment.levelId} />
                      <span className="font-mono font-extrabold text-[11px] text-brand">
                        {assignment.code}
                      </span>
                      <span className="text-xs text-slate-400">
                        • {assignment.questions.length} câu •{' '}
                        {assignment.timeLimitMinutes > 0 ? `${assignment.timeLimitMinutes}p` : 'Tự do'}
                      </span>
                      {myResult && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                          ✓ {myResult.score}/{myResult.max} ({myResult.percentage}%)
                        </span>
                      )}
                    </div>
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-snug">
                      {assignment.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {assignment.theory && (
                      <button
                        type="button"
                        onClick={() => setTheoryAssignment(assignment)}
                        className="flex-1 md:flex-none px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-bold flex items-center justify-center gap-1.5"
                      >
                        <BookOpenText className="w-3.5 h-3.5 text-brand" />
                        <span>Lý thuyết</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => navigate(`/homework/do/${assignment.code}`)}
                      className="flex-1 md:flex-none px-4 py-2.5 rounded-xl btn-brand text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Làm bài</span>
                    </button>

                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={() => navigate(`/homework/edit/${assignment.id}`)}
                          className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                          title="Sửa bài tập"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdminDelete(assignment)}
                          className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-rose-600"
                          title="Xóa bài tập"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <TheoryModal
        assignment={theoryAssignment}
        onClose={() => setTheoryAssignment(null)}
        onStartPractice={(assign) => navigate(`/homework/do/${assign.code}`)}
      />
    </div>
  );
};
