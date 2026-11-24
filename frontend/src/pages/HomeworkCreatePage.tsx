import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Plus,
  Trash2,
  ArrowLeft,
  Save,
  BookOpen,
  ShieldCheck,
  BookOpenText,
  Copy,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  HomeworkQuestion,
  HomeworkQuestionType,
  HomeworkAssignment,
  EducationLevelId,
  TheorySection,
} from '../types/homework';
import { HomeworkStorageService, generatePinCode } from '../services/homeworkStorage';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { QUESTION_TYPE_META, QuestionTypeBadge } from '../components/QuestionTypeBadge';
import { EDUCATION_LEVELS, EDUCATION_LEVEL_MAP } from '../components/EducationLevelBadge';

const CREATABLE_TYPES: HomeworkQuestionType[] = [
  'MULTIPLE_CHOICE',
  'FILL_BLANK',
  'WORD_REORDER',
  'MATCHING',
  'ERROR_CORRECTION',
  'PRONUNCIATION',
  'ESSAY',
];

export const HomeworkCreatePage: React.FC = () => {
  const { id: editId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { isAdmin, adminUsername } = useAuth();
  const { showToast } = useToast();

  const isEditMode = Boolean(editId);

  const [existingAssignment, setExistingAssignment] = useState<HomeworkAssignment | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState(() => generatePinCode());
  const [levelId, setLevelId] = useState<EducationLevelId>('THCS');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(15);
  const [status, setStatus] = useState<'ACTIVE' | 'CLOSED'>('ACTIVE');

  // Full Theory Editor state
  const [theoryOpen, setTheoryOpen] = useState(false);
  const [theorySummary, setTheorySummary] = useState('');
  const [theorySections, setTheorySections] = useState<TheorySection[]>([]);

  const [questions, setQuestions] = useState<HomeworkQuestion[]>([]);

  useEffect(() => {
    if (!editId) return;
    const found = HomeworkStorageService.getAssignment(editId);
    if (!found) {
      showToast({ message: 'Không tìm thấy bài tập để sửa', type: 'error' });
      navigate('/admin');
      return;
    }
    setExistingAssignment(found);
    setTitle(found.title);
    setDescription(found.description || '');
    setCode(found.code);
    setLevelId(found.levelId || 'THCS');
    setTimeLimitMinutes(found.timeLimitMinutes);
    setStatus(found.status === 'CLOSED' ? 'CLOSED' : 'ACTIVE');
    setQuestions(JSON.parse(JSON.stringify(found.questions)));
    if (found.theory) {
      setTheorySummary(found.theory.summary || '');
      setTheorySections(JSON.parse(JSON.stringify(found.theory.sections || [])));
    }
  }, [editId]);

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto py-12 text-center animate-slide-up">
        <div className="surface-card rounded-3xl p-8 space-y-4 shadow-elevated">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/70 text-brand flex items-center justify-center mx-auto">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Chỉ dành cho Quản trị viên (Admin)
          </h1>
          <p className="text-sm text-slate-500">
            Vui lòng đăng nhập tài khoản Admin để thêm, sửa hoặc xóa bài tập.
          </p>
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="w-full py-3.5 btn-brand font-extrabold text-sm rounded-2xl"
          >
            Đăng Nhập Admin
          </button>
        </div>
      </div>
    );
  }

  const totalPoints = Number(questions.reduce((sum, q) => sum + (q.points || 1), 0).toFixed(1));

  // Theory section handlers
  const handleAddTheorySection = () => {
    setTheorySections((prev) => [
      ...prev,
      {
        heading: `Mục ${prev.length + 1}: Tiêu đề kiến thức`,
        formula: '',
        points: ['Ý chính 1...'],
        examples: [{ en: '', vi: '' }],
        tip: '',
      },
    ]);
    setTheoryOpen(true);
  };

  const updateTheorySection = (index: number, updater: (sec: TheorySection) => TheorySection) => {
    setTheorySections((prev) => prev.map((sec, i) => (i === index ? updater({ ...sec }) : sec)));
  };

  const handleDeleteTheorySection = (index: number) => {
    setTheorySections((prev) => prev.filter((_, i) => i !== index));
  };

  // Question handlers
  const handleAddQuestion = (type: HomeworkQuestionType) => {
    const newQ: HomeworkQuestion = {
      id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      prompt: '',
      points: 1,
      explanation: '',
    };

    if (type === 'MULTIPLE_CHOICE' || type === 'PRONUNCIATION') {
      newQ.prompt =
        type === 'PRONUNCIATION'
          ? 'Chọn từ có phần phát âm / trọng âm khác với các từ còn lại:'
          : 'Chọn đáp án đúng nhất để hoàn thành câu sau:';
      newQ.options = ['', '', '', ''];
      newQ.correctOptionIndex = 0;
    } else if (type === 'FILL_BLANK') {
      newQ.prompt = 'Điền từ thích hợp vào chỗ trống:';
      newQ.sentenceWithBlanks = 'She is interested [in] learning English.';
      newQ.acceptedAnswers = ['in'];
    } else if (type === 'WORD_REORDER') {
      newQ.prompt = 'Sắp xếp các từ sau thành câu hoàn chỉnh:';
      newQ.correctSentence = 'English is very useful.';
      newQ.words = ['useful.', 'is', 'English', 'very'];
    } else if (type === 'MATCHING') {
      newQ.prompt = 'Nối từ ở cột trái với nghĩa tương ứng ở cột phải:';
      newQ.pairs = [
        { left: 'Call off', right: 'Hủy bỏ' },
        { left: 'Look forward to', right: 'Mong chờ' },
      ];
      newQ.points = 2;
    } else if (type === 'ERROR_CORRECTION') {
      newQ.prompt = 'Tìm lỗi sai trong câu sau và sửa lại cho đúng:';
      newQ.sentence = 'She (A) go (B) to (C) school (D) yesterday.';
      newQ.errorOptions = [
        { label: 'A', text: 'go' },
        { label: 'B', text: 'to' },
        { label: 'C', text: 'school' },
        { label: 'D', text: 'yesterday' },
      ];
      newQ.correctOption = 'A';
      newQ.correction = 'went';
    } else if (type === 'ESSAY') {
      newQ.prompt = 'Write a short paragraph (50 - 80 words) about your favorite hobby.';
      newQ.minWords = 40;
      newQ.maxWords = 100;
      newQ.points = 2;
    }

    setQuestions((prev) => [...prev, newQ]);
  };

  const updateQuestion = (index: number, updater: (q: HomeworkQuestion) => HomeworkQuestion) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? updater({ ...q }) : q)));
  };

  const handleDuplicateQuestion = (index: number) => {
    const dup: HomeworkQuestion = {
      ...JSON.parse(JSON.stringify(questions[index])),
      id: `q-dup-${Date.now()}`,
    };
    setQuestions((prev) => {
      const next = [...prev];
      next.splice(index + 1, 0, dup);
      return next;
    });
  };

  const handleMoveQuestion = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    setQuestions((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleDeleteQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDeleteAssignment = () => {
    if (!existingAssignment) return;
    if (window.confirm(`Xóa vĩnh viễn bài tập "${existingAssignment.title}"?`)) {
      HomeworkStorageService.deleteAssignment(existingAssignment.id);
      showToast({ message: 'Đã xóa bài tập', type: 'success' });
      navigate('/admin');
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      showToast({ message: 'Vui lòng nhập tên bài tập', type: 'error' });
      return;
    }
    if (questions.length === 0) {
      showToast({ message: 'Hãy thêm ít nhất 1 câu hỏi', type: 'error' });
      return;
    }

    const levelMeta = EDUCATION_LEVEL_MAP[levelId];
    const cleanSections = theorySections
      .filter((s) => s.heading.trim() || s.points.some((p) => p.trim()))
      .map((s) => ({
        ...s,
        points: s.points.filter((p) => p.trim()),
        examples: s.examples?.filter((ex) => ex.en.trim() || ex.vi.trim()),
        formula: s.formula?.trim() || undefined,
        tip: s.tip?.trim() || undefined,
      }));
    const hasTheory = theorySummary.trim() || cleanSections.length > 0;

    const assignment: HomeworkAssignment = {
      ...(existingAssignment || {}),
      id: existingAssignment?.id || `hw-${Date.now()}`,
      code: code.trim().toUpperCase() || generatePinCode(),
      title: title.trim(),
      description: description.trim(),
      subject: 'Tiếng Anh',
      topic: title.trim(),
      levelId,
      orderIndex: existingAssignment?.orderIndex,
      gradeLevel: `${levelMeta.label} (${levelMeta.cefr})`,
      difficulty:
        levelId === 'MAM_NON' || levelId === 'TIEU_HOC'
          ? 'EASY'
          : levelId === 'DAI_HOC'
          ? 'HARD'
          : 'MEDIUM',
      timeLimitMinutes: Math.max(0, Number(timeLimitMinutes) || 0),
      shuffleQuestions: false,
      showResultsImmediately: true,
      allowRetake: true,
      createdByName: existingAssignment?.createdByName || adminUsername || 'Admin',
      createdAt: existingAssignment?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status,
      theory: hasTheory
        ? {
            summary: theorySummary.trim() || 'Tóm tắt kiến thức trọng tâm.',
            sections: cleanSections,
          }
        : undefined,
      questions,
      totalPoints,
    };

    HomeworkStorageService.saveAssignment(assignment);
    showToast({
      message: isEditMode ? 'Đã lưu chỉnh sửa bài tập!' : 'Đã tạo bài tập mới!',
      subMessage: `Mã PIN: ${assignment.code}`,
      type: 'success',
    });
    navigate('/admin');
  };

  return (
    <div className="space-y-6 pb-20 sm:pb-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/admin')}
            aria-label="Quay lại"
            className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white truncate">
              {isEditMode ? 'Chỉnh Sửa Bài Tập & Lý Thuyết' : 'Tạo Bài Tập Mới'}
            </h1>
            <p className="text-xs text-slate-500">
              Mã PIN: <strong className="font-mono text-brand">{code}</strong> • {questions.length} câu ({totalPoints}đ)
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 shrink-0">
          {isEditMode && (
            <button
              type="button"
              onClick={handleDeleteAssignment}
              className="px-3.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 font-bold text-xs flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>Xóa bài</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 btn-brand font-extrabold text-xs rounded-xl shadow-sm flex items-center gap-2 transition"
          >
            <Save className="w-4 h-4" />
            <span>{isEditMode ? 'Lưu Thay Đổi' : 'Lưu Bài Tập'}</span>
          </button>
        </div>
      </div>

      {/* Basic Metadata */}
      <section className="surface-card rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
          <div className="sm:col-span-6">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Tên bài tập <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="VD: Bài tập Thì Hiện Tại Đơn"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Trình độ
            </label>
            <select
              value={levelId}
              onChange={(e) => setLevelId(e.target.value as EducationLevelId)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm font-semibold"
            >
              {EDUCATION_LEVELS.map((lvl) => (
                <option key={lvl.id} value={lvl.id}>
                  {lvl.emoji} {lvl.label}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Mã PIN
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm font-extrabold uppercase"
            />
          </div>

          <div className="sm:col-span-6">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Mô tả ngắn (hiển thị ngoài thẻ bài)
            </label>
            <input
              type="text"
              placeholder="Mô tả ngắn gọn nội dung bài học..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Thời gian (phút, 0 = tự do)
            </label>
            <input
              type="number"
              min="0"
              max="180"
              value={timeLimitMinutes}
              onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm font-semibold"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Trạng thái
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'CLOSED')}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm font-bold"
            >
              <option value="ACTIVE">Đang mở nhận bài</option>
              <option value="CLOSED">Đang khóa</option>
            </select>
          </div>
        </div>
      </section>

      {/* ================= THEORY EDITOR (Collapsible) ================= */}
      <section className="surface-card rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setTheoryOpen(!theoryOpen)}
          className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
        >
          <div className="flex items-center gap-2.5">
            <BookOpenText className="w-5 h-5 text-brand" />
            <div>
              <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white block">
                Nội Dung Lý Thuyết ({theorySections.length} mục)
              </span>
              <span className="text-xs text-slate-500">
                Thêm, sửa hoặc xóa công thức, quy tắc, ví dụ &amp; mẹo nhớ của bài học
              </span>
            </div>
          </div>
          {theoryOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {theoryOpen && (
          <div className="p-4 sm:p-5 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                Tóm tắt tổng quan bài học
              </label>
              <textarea
                rows={2}
                placeholder="Tóm tắt ngắn gọn học sinh sẽ học được gì..."
                value={theorySummary}
                onChange={(e) => setTheorySummary(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm"
              />
            </div>

            {theorySections.map((sec, sIdx) => (
              <div
                key={sIdx}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={sec.heading}
                    placeholder="Tiêu đề mục lý thuyết..."
                    onChange={(e) =>
                      updateTheorySection(sIdx, (cur) => ({ ...cur, heading: e.target.value }))
                    }
                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-extrabold"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteTheorySection(sIdx)}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-600"
                    title="Xóa mục lý thuyết này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Công thức nổi bật (tùy chọn, VD: S + V(s/es))..."
                  value={sec.formula || ''}
                  onChange={(e) =>
                    updateTheorySection(sIdx, (cur) => ({ ...cur, formula: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs font-bold text-blue-700 dark:text-blue-300"
                />

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Các ý chính (mỗi dòng 1 ý)
                  </label>
                  <textarea
                    rows={3}
                    value={sec.points.join('\n')}
                    onChange={(e) =>
                      updateTheorySection(sIdx, (cur) => ({
                        ...cur,
                        points: e.target.value.split('\n'),
                      }))
                    }
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs leading-relaxed"
                  />
                </div>

                <input
                  type="text"
                  placeholder="Mẹo nhớ nhanh (tùy chọn)..."
                  value={sec.tip || ''}
                  onChange={(e) => updateTheorySection(sIdx, (cur) => ({ ...cur, tip: e.target.value }))}
                  className="w-full px-3 py-2 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 rounded-xl text-xs font-semibold"
                />
              </div>
            ))}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleAddTheorySection}
                className="px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm mục lý thuyết</span>
              </button>

              {(theorySummary || theorySections.length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setTheorySummary('');
                    setTheorySections([]);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 text-xs font-bold"
                >
                  Xóa hết lý thuyết
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ================= ADD QUESTION BAR ================= */}
      <section className="surface-card rounded-2xl p-4 sm:p-5 space-y-3">
        <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
          Thêm câu hỏi theo dạng bài
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {CREATABLE_TYPES.map((typeKey) => {
            const meta = QUESTION_TYPE_META[typeKey];
            const Icon = meta.icon;
            return (
              <button
                key={typeKey}
                type="button"
                onClick={() => handleAddQuestion(typeKey)}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 text-center transition active:scale-95 ${meta.badgeClass}`}
              >
                <Icon className="w-4 h-4" />
                <span>{meta.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ================= QUESTIONS LIST ================= */}
      <section className="space-y-3.5">
        {questions.length === 0 ? (
          <div className="surface-card rounded-3xl border-dashed py-12 px-6 text-center space-y-2">
            <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-sm font-extrabold text-slate-700 dark:text-slate-200">Chưa có câu hỏi nào</h3>
            <p className="text-xs text-slate-500">Chọn một dạng bài ở khung phía trên để thêm câu hỏi.</p>
          </div>
        ) : (
          questions.map((q, idx) => (
            <div key={q.id} className="surface-card rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <QuestionTypeBadge type={q.type} compact />
                </div>

                <div className="flex items-center gap-1">
                  <label className="flex items-center gap-1 text-xs text-slate-500 mr-1">
                    <span>Điểm:</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="20"
                      value={q.points || 1}
                      onChange={(e) =>
                        updateQuestion(idx, (cur) => ({ ...cur, points: Number(e.target.value) }))
                      }
                      className="w-14 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-center text-slate-900 dark:text-white"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMoveQuestion(idx, -1)}
                    title="Chuyển lên"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === questions.length - 1}
                    onClick={() => handleMoveQuestion(idx, 1)}
                    title="Chuyển xuống"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicateQuestion(idx)}
                    title="Nhân bản câu"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteQuestion(idx)}
                    title="Xóa câu"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Nội dung câu hỏi</label>
                <textarea
                  rows={2}
                  value={q.prompt}
                  onChange={(e) => updateQuestion(idx, (cur) => ({ ...cur, prompt: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm font-semibold"
                />
              </div>

              {(q.type === 'MULTIPLE_CHOICE' || q.type === 'PRONUNCIATION') && q.options && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {q.options.map((opt, oIdx) => {
                    const isCorrect = q.correctOptionIndex === oIdx;
                    return (
                      <div
                        key={oIdx}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border ${
                          isCorrect
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            updateQuestion(idx, (cur) => ({ ...cur, correctOptionIndex: oIdx }))
                          }
                          className={`w-7 h-7 rounded-lg font-extrabold text-xs flex items-center justify-center shrink-0 ${
                            isCorrect
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                          }`}
                        >
                          {String.fromCharCode(65 + oIdx)}
                        </button>
                        <input
                          type="text"
                          placeholder={`Đáp án ${String.fromCharCode(65 + oIdx)}`}
                          value={opt}
                          onChange={(e) =>
                            updateQuestion(idx, (cur) => {
                              const opts = [...(cur.options || [])];
                              opts[oIdx] = e.target.value;
                              return { ...cur, options: opts };
                            })
                          }
                          className="w-full bg-transparent text-base sm:text-xs font-semibold focus:outline-none"
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {q.type === 'FILL_BLANK' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500">
                    Đặt từ đúng trong ngoặc vuông <code className="font-mono">[từ_đúng]</code>
                  </label>
                  <input
                    type="text"
                    value={q.sentenceWithBlanks || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const matches = val.match(/\[([^\]]+)\]/g);
                      updateQuestion(idx, (cur) => ({
                        ...cur,
                        sentenceWithBlanks: val,
                        acceptedAnswers: matches
                          ? matches.map((m) => m.slice(1, -1).trim())
                          : cur.acceptedAnswers,
                      }));
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm sm:text-xs font-semibold"
                  />
                </div>
              )}

              {q.type === 'WORD_REORDER' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Câu đúng hoàn chỉnh (tự xáo trộn từ)
                  </label>
                  <input
                    type="text"
                    value={q.correctSentence || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const parts = val.split(/\s+/).filter(Boolean);
                      const shuffled = [...parts].sort(() => Math.random() - 0.5);
                      updateQuestion(idx, (cur) => ({
                        ...cur,
                        correctSentence: val,
                        words: shuffled,
                      }));
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm font-semibold"
                  />
                </div>
              )}

              {q.type === 'MATCHING' && q.pairs && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500">Các cặp nối (Trái ↔ Phải)</label>
                    <button
                      type="button"
                      onClick={() =>
                        updateQuestion(idx, (cur) => ({
                          ...cur,
                          pairs: [...(cur.pairs || []), { left: '', right: '' }],
                        }))
                      }
                      className="text-xs font-bold text-brand hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Thêm cặp
                    </button>
                  </div>
                  {q.pairs.map((pair, pIdx) => (
                    <div key={pIdx} className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Vế trái..."
                        value={pair.left}
                        onChange={(e) =>
                          updateQuestion(idx, (cur) => {
                            const pairs = [...(cur.pairs || [])];
                            pairs[pIdx] = { ...pairs[pIdx], left: e.target.value };
                            return { ...cur, pairs };
                          })
                        }
                        className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-xs font-semibold"
                      />
                      <input
                        type="text"
                        placeholder="Vế phải..."
                        value={pair.right}
                        onChange={(e) =>
                          updateQuestion(idx, (cur) => {
                            const pairs = [...(cur.pairs || [])];
                            pairs[pIdx] = { ...pairs[pIdx], right: e.target.value };
                            return { ...cur, pairs };
                          })
                        }
                        className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-xs font-semibold"
                      />
                      {q.pairs && q.pairs.length > 2 && (
                        <button
                          type="button"
                          onClick={() =>
                            updateQuestion(idx, (cur) => ({
                              ...cur,
                              pairs: (cur.pairs || []).filter((_, i) => i !== pIdx),
                            }))
                          }
                          className="p-2 text-slate-400 hover:text-rose-500 self-end sm:self-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {q.type === 'ERROR_CORRECTION' && (
                <div className="space-y-2.5">
                  <input
                    type="text"
                    value={q.sentence || ''}
                    onChange={(e) => updateQuestion(idx, (cur) => ({ ...cur, sentence: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-xs font-semibold"
                  />
                  <div className="grid grid-cols-2 gap-2.5">
                    <select
                      value={q.correctOption || 'A'}
                      onChange={(e) =>
                        updateQuestion(idx, (cur) => ({
                          ...cur,
                          correctOption: e.target.value as 'A' | 'B' | 'C' | 'D',
                        }))
                      }
                      className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                    >
                      <option value="A">Sai ở (A)</option>
                      <option value="B">Sai ở (B)</option>
                      <option value="C">Sai ở (C)</option>
                      <option value="D">Sai ở (D)</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Từ sửa đúng..."
                      value={q.correction || ''}
                      onChange={(e) => updateQuestion(idx, (cur) => ({ ...cur, correction: e.target.value }))}
                      className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                    />
                  </div>
                </div>
              )}

              {q.type === 'READING_COMPREHENSION' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Đoạn văn đọc hiểu</label>
                  <textarea
                    rows={5}
                    value={q.passage || ''}
                    onChange={(e) => updateQuestion(idx, (cur) => ({ ...cur, passage: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs leading-relaxed"
                  />
                </div>
              )}

              {q.type === 'ESSAY' && (
                <textarea
                  rows={2}
                  placeholder="Đoạn văn mẫu tham khảo (tùy chọn)..."
                  value={q.sampleAnswer || ''}
                  onChange={(e) => updateQuestion(idx, (cur) => ({ ...cur, sampleAnswer: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-xs"
                />
              )}

              <input
                type="text"
                placeholder="Giải thích ngắn gọn sau khi nộp bài (tùy chọn)..."
                value={q.explanation || ''}
                onChange={(e) => updateQuestion(idx, (cur) => ({ ...cur, explanation: e.target.value }))}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-xs"
              />
            </div>
          ))
        )}
      </section>

      {/* Mobile Sticky Save Bar */}
      <div className="sm:hidden fixed bottom-16 inset-x-0 z-30 glass-bar border-t px-4 py-2.5 flex gap-2">
        {isEditMode && (
          <button
            type="button"
            onClick={handleDeleteAssignment}
            className="px-3.5 py-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 font-bold text-xs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          className="flex-1 py-3 btn-brand font-extrabold text-sm rounded-xl flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          <span>{isEditMode ? 'Lưu Thay Đổi' : `Lưu Bài Tập (${questions.length} câu)`}</span>
        </button>
      </div>
    </div>
  );
};
