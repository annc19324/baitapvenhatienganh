import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Clock,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Send,
  RotateCcw,
  User,
  X,
  LayoutGrid,
  BookOpenText,
  ChevronDown,
  ChevronUp,
  Lock,
  XCircle,
  BookOpenCheck,
  ClipboardCheck,
  Check,
} from 'lucide-react';
import { HomeworkStorageService } from '../services/homeworkStorage';
import { HomeworkAiService } from '../services/homeworkAi';
import { HomeworkAssignment, HomeworkQuestion, HomeworkSubmission } from '../types/homework';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { QuestionTypeBadge } from '../components/QuestionTypeBadge';
import { EducationLevelBadge } from '../components/EducationLevelBadge';
import { TheoryModal } from '../components/TheoryModal';

const isQuestionAnswered = (q: HomeworkQuestion, ans: any): boolean => {
  if (ans === undefined || ans === null || ans === '') return false;
  if (q.type === 'MULTI_SELECT') {
    return Array.isArray(ans) && ans.length > 0;
  }
  if (q.type === 'MATCHING') {
    return typeof ans === 'object' && Object.values(ans).some((v) => Boolean(v));
  }
  if (q.type === 'ERROR_CORRECTION') {
    return typeof ans === 'object' && Boolean(ans.option);
  }
  if (q.type === 'READING_COMPREHENSION') {
    return typeof ans === 'object' && Object.values(ans).some((v) => v !== undefined && v !== '');
  }
  return true;
};

export const HomeworkDoPage: React.FC = () => {
  const { codeOrId } = useParams<{ codeOrId: string }>();
  const navigate = useNavigate();
  const { studentName: savedName, saveStudentName } = useAuth();
  const { showToast } = useToast();

  const [assignment, setAssignment] = useState<HomeworkAssignment | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [mode, setMode] = useState<'PRACTICE' | 'EXAM'>('PRACTICE');
  const [checkedQuestions, setCheckedQuestions] = useState<Record<string, boolean>>({});
  const [studentName, setStudentName] = useState(savedName);
  const [showTheory, setShowTheory] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [wordReorderIndices, setWordReorderIndices] = useState<Record<string, number[]>>({});
  const [passageCollapsed, setPassageCollapsed] = useState(false);
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState(false);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!codeOrId) return;
    let cancelled = false;

    const loadAssignment = async () => {
      let found = HomeworkStorageService.getAssignment(codeOrId);
      if (!found) {
        await HomeworkStorageService.syncFromBackend(true);
        if (cancelled) return;
        found = HomeworkStorageService.getAssignment(codeOrId);
      } else {
        // Refresh in background so admin edits/locks reflect immediately
        HomeworkStorageService.syncFromBackend().then(() => {
          if (cancelled) return;
          const refreshed = HomeworkStorageService.getAssignment(codeOrId);
          if (refreshed) setAssignment(refreshed);
        });
      }

      if (!found) {
        showToast({
          message: 'Không tìm thấy bài tập',
          subMessage: `Mã "${codeOrId}" không tồn tại.`,
          type: 'error',
        });
        navigate('/homework');
        return;
      }

      setAssignment(found);

      const saved = localStorage.getItem(`hw_session_${found.id}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.studentName && !savedName) {
            setStudentName(parsed.studentName);
          }
          setAnswers(parsed.answers || {});
          setWordReorderIndices(parsed.wordReorderIndices || {});
        } catch {
          // ignore
        }
      }
    };

    loadAssignment();
    return () => {
      cancelled = true;
    };
  }, [codeOrId]);

  useEffect(() => {
    if (savedName && !studentName) {
      setStudentName(savedName);
    }
  }, [savedName]);

  useEffect(() => {
    if (!hasStarted || timeLeftSeconds === null) return;
    if (timeLeftSeconds <= 0) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(timer);
  }, [hasStarted, timeLeftSeconds]);

  useEffect(() => {
    if (!hasStarted || !assignment) return;
    localStorage.setItem(
      `hw_session_${assignment.id}`,
      JSON.stringify({ studentName, answers, wordReorderIndices })
    );
  }, [answers, wordReorderIndices, hasStarted]);

  const answeredCount = useMemo(() => {
    if (!assignment) return 0;
    return assignment.questions.filter((q) => isQuestionAnswered(q, answers[q.id])).length;
  }, [assignment, answers]);

  const handleStartTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      showToast({ message: 'Vui lòng nhập tên của bạn', type: 'error' });
      return;
    }
    // Persist student name for future sessions
    saveStudentName(studentName.trim());

    setHasStarted(true);
    setStartTime(Date.now());
    if (assignment && assignment.timeLimitMinutes > 0) {
      setTimeLeftSeconds(assignment.timeLimitMinutes * 60);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    if (!assignment || isSubmitting) return;
    setMobilePaletteOpen(false);
    setIsSubmitting(true);

    try {
      const timeSpentSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));
      const scores: Record<string, number> = {};
      const aiEvaluations: Record<string, any> = {};

      for (const q of assignment.questions) {
        const studentAns = answers[q.id];
        const maxPoints = q.points || 1;

        if (q.type === 'MULTIPLE_CHOICE' || q.type === 'PRONUNCIATION') {
          scores[q.id] = studentAns !== undefined && studentAns === q.correctOptionIndex ? maxPoints : 0;
        } else if (q.type === 'MULTI_SELECT') {
          const expected = [...(q.correctOptionIndices || [])].sort((a, b) => a - b);
          const given = Array.isArray(studentAns) ? [...studentAns].sort((a, b) => a - b) : [];
          const isExact =
            expected.length > 0 &&
            expected.length === given.length &&
            expected.every((val, i) => val === given[i]);
          scores[q.id] = isExact ? maxPoints : 0;
        } else if (q.type === 'FILL_BLANK') {
          const accepted = (q.acceptedAnswers || []).map((a) => a.trim().toLowerCase());
          const textAns = (typeof studentAns === 'string' ? studentAns : '').trim().toLowerCase();
          scores[q.id] =
            accepted.includes(textAns) || (accepted.length === 0 && textAns.length > 0) ? maxPoints : 0;
        } else if (q.type === 'WORD_REORDER') {
          const expected = (q.correctSentence || '').replace(/\s+/g, ' ').trim().toLowerCase();
          const given = (typeof studentAns === 'string' ? studentAns : '').replace(/\s+/g, ' ').trim().toLowerCase();
          scores[q.id] = expected === given ? maxPoints : 0;
        } else if (q.type === 'MATCHING') {
          let correctPairs = 0;
          const totalPairs = (q.pairs || []).length;
          if (totalPairs > 0 && typeof studentAns === 'object' && studentAns !== null) {
            q.pairs?.forEach((p) => {
              if (studentAns[p.left] === p.right) correctPairs++;
            });
            scores[q.id] = Number(((correctPairs / totalPairs) * maxPoints).toFixed(1));
          } else {
            scores[q.id] = 0;
          }
        } else if (q.type === 'ERROR_CORRECTION') {
          scores[q.id] =
            typeof studentAns === 'object' && studentAns !== null && studentAns.option === q.correctOption
              ? maxPoints
              : 0;
        } else if (q.type === 'READING_COMPREHENSION' && q.subQuestions) {
          let earnedSub = 0;
          const ansMap = typeof studentAns === 'object' && studentAns !== null ? studentAns : {};
          for (const sq of q.subQuestions) {
            const subAns = ansMap[sq.id];
            if (sq.type === 'MULTIPLE_CHOICE') {
              if (subAns !== undefined && subAns === sq.correctOptionIndex) earnedSub += sq.points;
            } else if (sq.type === 'FILL_BLANK') {
              const accepted = (sq.acceptedAnswers || []).map((a) => a.trim().toLowerCase());
              const given = (typeof subAns === 'string' ? subAns : '').trim().toLowerCase();
              if (accepted.includes(given)) earnedSub += sq.points;
            } else if (sq.type === 'ESSAY') {
              const txt = typeof subAns === 'string' ? subAns.trim() : '';
              if (txt.split(/\s+/).filter(Boolean).length >= 5) {
                earnedSub += sq.points;
              }
            }
          }
          scores[q.id] = Number(Math.min(maxPoints, earnedSub).toFixed(1));
        } else if (q.type === 'ESSAY') {
          const essayContent = typeof studentAns === 'string' ? studentAns : '';
          const evaluation = await HomeworkAiService.evaluateEssay(
            q.prompt,
            essayContent,
            q.sampleAnswer,
            q.rubricNotes,
            maxPoints
          );
          aiEvaluations[q.id] = evaluation;
          scores[q.id] = evaluation.score;
        } else {
          scores[q.id] = studentAns !== undefined ? maxPoints : 0;
        }
      }

      const totalScore = Number(Object.values(scores).reduce((sum, s) => sum + s, 0).toFixed(1));
      const maxTotalScore = assignment.totalPoints || 10;
      const percentage = Math.round((totalScore / maxTotalScore) * 100);

      const submission: HomeworkSubmission = {
        id: `sub-${Date.now()}`,
        assignmentId: assignment.id,
        assignmentCode: assignment.code,
        assignmentTitle: assignment.title,
        studentName: studentName.trim(),
        answers,
        scores,
        aiEvaluations,
        totalScore,
        maxTotalScore,
        percentage,
        timeSpentSeconds,
        submittedAt: new Date().toISOString(),
      };

      await HomeworkStorageService.saveSubmissionAsync(submission);
      localStorage.removeItem(`hw_session_${assignment.id}`);

      showToast({
        message: 'Đã nộp bài!',
        subMessage: `Điểm số: ${totalScore}/${maxTotalScore} (${percentage}%)`,
        type: 'success',
      });

      navigate(`/homework/result/${submission.id}`);
    } catch (err: any) {
      showToast({ message: 'Lỗi khi nộp bài', subMessage: err.message, type: 'error' });
      setIsSubmitting(false);
    }
  };

  if (!assignment) {
    return (
      <div className="py-24 text-center text-slate-400">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <span className="text-sm font-semibold">Đang tải bài tập...</span>
      </div>
    );
  }

  if (assignment.status === 'CLOSED') {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <div className="surface-card rounded-3xl p-8 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Bài tập đang tạm khóa</h1>
          <p className="text-sm text-slate-500">
            Admin đã đóng nhận bài cho <strong>{assignment.title}</strong>.
          </p>
          <button
            type="button"
            onClick={() => navigate('/homework')}
            className="w-full py-3 rounded-2xl bg-blue-600 text-white font-bold text-sm"
          >
            Về Trang Chủ
          </button>
        </div>
      </div>
    );
  }

  // ================= STEP 1: WELCOME SCREEN (SAVED NAME) =================
  if (!hasStarted) {
    return (
      <div className="max-w-md mx-auto py-4 sm:py-10 animate-slide-up">
        <div className="surface-card rounded-3xl p-6 sm:p-8 shadow-elevated space-y-5">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span className="px-3 py-0.5 bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-mono font-extrabold text-xs rounded-full border border-blue-200 dark:border-blue-800">
                {assignment.code}
              </span>
              <EducationLevelBadge levelId={assignment.levelId} />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white leading-snug">
              {assignment.title}
            </h1>
            {assignment.description && (
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">{assignment.description}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/70 p-3.5 rounded-2xl text-center border border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Số câu</p>
              <p className="text-base font-extrabold text-slate-900 dark:text-white">{assignment.questions.length}</p>
            </div>
            <div className="border-x border-slate-200/80 dark:border-slate-700">
              <p className="text-[10px] uppercase font-bold text-slate-400">Thời gian</p>
              <p className="text-base font-extrabold text-slate-900 dark:text-white">
                {assignment.timeLimitMinutes > 0 ? `${assignment.timeLimitMinutes}p` : 'Tự do'}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Tổng điểm</p>
              <p className="text-base font-extrabold text-slate-900 dark:text-white">{assignment.totalPoints}đ</p>
            </div>
          </div>

          {assignment.theory && (
            <button
              type="button"
              onClick={() => setShowTheory(true)}
              className="w-full py-3 px-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-800/70 text-blue-700 dark:text-blue-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-blue-100/70 dark:hover:bg-blue-900/50 transition"
            >
              <BookOpenText className="w-4 h-4" />
              <span>Ôn nhanh Lý Thuyết trước khi làm</span>
            </button>
          )}

          <form onSubmit={handleStartTest} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>Tên người làm bài</span>
                  <span className="text-rose-500">*</span>
                </label>
                {savedName && (
                  <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400">
                    ✓ Đã tự lưu tên
                  </span>
                )}
              </div>
              <input
                type="text"
                required
                placeholder="Nhập tên của bạn (tự lưu cho lần sau)..."
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-base font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                Chọn chế độ làm bài
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setMode('PRACTICE')}
                  className={`p-3 rounded-2xl border text-left transition ${
                    mode === 'PRACTICE'
                      ? 'bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                    <BookOpenCheck className={`w-4 h-4 ${mode === 'PRACTICE' ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span>Ôn tập</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    Chọn xong hiện ngay đúng / sai
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('EXAM')}
                  className={`p-3 rounded-2xl border text-left transition ${
                    mode === 'EXAM'
                      ? 'bg-blue-50/90 dark:bg-blue-950/50 border-blue-500 ring-2 ring-blue-500/20'
                      : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                    <ClipboardCheck className={`w-4 h-4 ${mode === 'EXAM' ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span>Kiểm tra</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    Nộp bài xong mới hiện đáp án
                  </p>
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-extrabold text-sm rounded-2xl shadow-glow-blue transition flex items-center justify-center gap-2"
            >
              <span>{mode === 'PRACTICE' ? 'Bắt Đầu Ôn Tập' : 'Bắt Đầu Kiểm Tra'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        <TheoryModal
          assignment={showTheory ? assignment : null}
          onClose={() => setShowTheory(false)}
        />
      </div>
    );
  }

  // ================= STEP 2: ACTIVE TEST =================
  const currentQ = assignment.questions[currentIndex];
  const totalQ = assignment.questions.length;
  const progressPercent = Math.round((answeredCount / totalQ) * 100);
  const usedWordIndices = wordReorderIndices[currentQ.id] || [];
  const essayWordCount =
    currentQ.type === 'ESSAY' && typeof answers[currentQ.id] === 'string'
      ? answers[currentQ.id].trim().split(/\s+/).filter(Boolean).length
      : 0;

  const renderFillBlankSentence = (sentence: string) => {
    const parts = sentence.split(/(\[[^\]]+\])/g);
    return (
      <p className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100 leading-loose">
        {parts.map((part, i) =>
          part.startsWith('[') && part.endsWith(']') ? (
            <span
              key={i}
              className="inline-block mx-1 px-3 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500 font-mono text-sm font-bold"
            >
              {answers[currentQ.id] ? String(answers[currentQ.id]) : '________'}
            </span>
          ) : (
            <React.Fragment key={i}>{part}</React.Fragment>
          )
        )}
      </p>
    );
  };

  const renderPaletteGrid = (onSelect?: () => void) => (
    <div className="space-y-4">
      <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-5 gap-2">
        {assignment.questions.map((q, idx) => {
          const isAns = isQuestionAnswered(q, answers[q.id]);
          const isCurrent = currentIndex === idx;
          return (
            <button
              key={q.id || idx}
              type="button"
              onClick={() => {
                setCurrentIndex(idx);
                onSelect?.();
              }}
              className={`h-11 rounded-xl text-xs font-extrabold transition ${
                isAns
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700'
              } ${isCurrent ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900 scale-105' : ''}`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => {
          setMobilePaletteOpen(false);
          handleSubmit();
        }}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-extrabold text-sm rounded-2xl shadow-glow-emerald transition flex items-center justify-center gap-2"
      >
        <Send className="w-4 h-4" />
        <span>{isSubmitting ? 'Đang chấm...' : 'Nộp Bài'}</span>
      </button>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Sticky Progress & Timer Bar */}
      <div className="surface-card rounded-2xl overflow-hidden sticky top-[3.75rem] sm:top-[4.25rem] z-30">
        <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                {assignment.title}
              </h2>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold shrink-0 ${
                  mode === 'PRACTICE'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                    : 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300'
                }`}
              >
                {mode === 'PRACTICE' ? 'Ôn tập' : 'Kiểm tra'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">
              {studentName} • Đã làm {answeredCount}/{totalQ} câu
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {timeLeftSeconds !== null && (
              <div
                className={`px-3 py-1.5 rounded-xl font-mono font-extrabold text-xs sm:text-sm flex items-center gap-1.5 border ${
                  timeLeftSeconds <= 120
                    ? 'bg-rose-50 text-rose-600 border-rose-300 dark:bg-rose-950/80 animate-pulse'
                    : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTimer(timeLeftSeconds)}</span>
              </div>
            )}

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="hidden sm:inline-flex px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-extrabold text-xs rounded-xl shadow-sm items-center gap-1.5 transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Đang chấm...' : 'Nộp Bài'}</span>
            </button>
          </div>
        </div>
        <div className="h-1 w-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-teal-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-8">
          <div className="surface-card rounded-3xl p-5 sm:p-7 space-y-5">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-xs text-blue-600 dark:text-blue-400">
                  Câu {currentIndex + 1}/{totalQ}
                </span>
                <QuestionTypeBadge type={currentQ.type} compact />
              </div>
              <span className="text-xs font-bold text-slate-400">{currentQ.points || 1} điểm</span>
            </div>

            <div className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-relaxed">
              {currentQ.prompt}
            </div>

            {/* MULTIPLE_CHOICE & PRONUNCIATION */}
            {(currentQ.type === 'MULTIPLE_CHOICE' || currentQ.type === 'PRONUNCIATION') && currentQ.options && (
              <div className="space-y-2.5">
                {currentQ.options.map((option, optIdx) => {
                  const chosen = answers[currentQ.id];
                  const hasChosen = chosen !== undefined;
                  const isSelected = chosen === optIdx;
                  const isCorrectOpt = currentQ.correctOptionIndex === optIdx;
                  const showFeedback = mode === 'PRACTICE' && hasChosen;

                  let cardCls =
                    'bg-slate-50/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-blue-300 text-slate-800 dark:text-slate-200 font-semibold';
                  let badgeCls =
                    'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600';

                  if (showFeedback) {
                    if (isCorrectOpt) {
                      cardCls =
                        'bg-emerald-50/95 dark:bg-emerald-950/60 border-emerald-500 text-emerald-950 dark:text-emerald-100 font-bold ring-2 ring-emerald-500/20';
                      badgeCls = 'bg-emerald-600 text-white';
                    } else if (isSelected) {
                      cardCls =
                        'bg-rose-50/95 dark:bg-rose-950/60 border-rose-500 text-rose-950 dark:text-rose-100 font-bold ring-2 ring-rose-500/20';
                      badgeCls = 'bg-rose-600 text-white';
                    }
                  } else if (isSelected) {
                    cardCls =
                      'bg-blue-50/90 dark:bg-blue-950/60 border-blue-600 text-blue-950 dark:text-blue-100 font-bold ring-2 ring-blue-500/20';
                    badgeCls = 'bg-blue-600 text-white';
                  }

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => setAnswers((prev) => ({ ...prev, [currentQ.id]: optIdx }))}
                      className={`w-full min-h-[54px] p-3.5 sm:p-4 rounded-2xl border text-left flex items-center justify-between gap-3 transition active:scale-[0.99] ${cardCls}`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <span
                          className={`w-8 h-8 rounded-xl font-extrabold text-xs flex items-center justify-center shrink-0 ${badgeCls}`}
                        >
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span className="text-sm sm:text-[15px] leading-relaxed">{option}</span>
                      </div>
                      {showFeedback && isCorrectOpt && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      )}
                      {showFeedback && isSelected && !isCorrectOpt && (
                        <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                      )}
                    </button>
                  );
                })}

                {mode === 'PRACTICE' && answers[currentQ.id] !== undefined && (
                  <div
                    className={`p-3 rounded-xl text-xs font-bold flex items-start gap-2 ${
                      answers[currentQ.id] === currentQ.correctOptionIndex
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    {answers[currentQ.id] === currentQ.correctOptionIndex ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-0.5">
                      <p>
                        {answers[currentQ.id] === currentQ.correctOptionIndex
                          ? 'Chính xác!'
                          : `Chưa đúng. Đáp án đúng là ${String.fromCharCode(65 + (currentQ.correctOptionIndex || 0))}.`}
                      </p>
                      {currentQ.explanation && (
                        <p className="font-normal opacity-90">{currentQ.explanation}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MULTI_SELECT */}
            {currentQ.type === 'MULTI_SELECT' && currentQ.options && (
              <div className="space-y-2.5">
                <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  Có thể chọn nhiều đáp án đúng:
                </p>
                {currentQ.options.map((option, optIdx) => {
                  const selectedList: number[] = Array.isArray(answers[currentQ.id]) ? answers[currentQ.id] : [];
                  const isSelected = selectedList.includes(optIdx);
                  const correctList = currentQ.correctOptionIndices || [];
                  const isCorrectOpt = correctList.includes(optIdx);
                  const showOptFeedback = mode === 'PRACTICE' && isSelected;

                  let cardCls =
                    'bg-slate-50/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-indigo-300 text-slate-800 dark:text-slate-200 font-semibold';
                  let badgeCls =
                    'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600';

                  if (showOptFeedback) {
                    if (isCorrectOpt) {
                      cardCls =
                        'bg-emerald-50/95 dark:bg-emerald-950/60 border-emerald-500 text-emerald-950 dark:text-emerald-100 font-bold ring-2 ring-emerald-500/20';
                      badgeCls = 'bg-emerald-600 text-white';
                    } else {
                      cardCls =
                        'bg-rose-50/95 dark:bg-rose-950/60 border-rose-500 text-rose-950 dark:text-rose-100 font-bold ring-2 ring-rose-500/20';
                      badgeCls = 'bg-rose-600 text-white';
                    }
                  } else if (isSelected) {
                    cardCls =
                      'bg-indigo-50/90 dark:bg-indigo-950/60 border-indigo-600 text-indigo-950 dark:text-indigo-100 font-bold ring-2 ring-indigo-500/20';
                    badgeCls = 'bg-indigo-600 text-white';
                  }

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() =>
                        setAnswers((prev) => {
                          const cur: number[] = Array.isArray(prev[currentQ.id]) ? prev[currentQ.id] : [];
                          const next = cur.includes(optIdx)
                            ? cur.filter((x) => x !== optIdx)
                            : [...cur, optIdx].sort((a, b) => a - b);
                          return { ...prev, [currentQ.id]: next };
                        })
                      }
                      className={`w-full min-h-[54px] p-3.5 sm:p-4 rounded-2xl border text-left flex items-center justify-between gap-3 transition active:scale-[0.99] ${cardCls}`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <span
                          className={`w-8 h-8 rounded-xl font-extrabold text-xs flex items-center justify-center shrink-0 ${badgeCls}`}
                        >
                          {isSelected ? <Check className="w-4 h-4" /> : String.fromCharCode(65 + optIdx)}
                        </span>
                        <span className="text-sm sm:text-[15px] leading-relaxed">{option}</span>
                      </div>
                      {showOptFeedback && isCorrectOpt && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      )}
                      {showOptFeedback && !isCorrectOpt && (
                        <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
                {mode === 'PRACTICE' && Array.isArray(answers[currentQ.id]) && answers[currentQ.id].length > 0 && (() => {
                  const expected = [...(currentQ.correctOptionIndices || [])].sort((a, b) => a - b);
                  const given = [...answers[currentQ.id]].sort((a, b) => a - b);
                  const isExact = expected.length === given.length && expected.every((v, i) => v === given[i]);
                  const wrongPicked = given.some((v) => !expected.includes(v));
                  return (
                    <div
                      className={`p-3 rounded-xl text-xs font-bold flex items-start gap-2 ${
                        isExact
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : wrongPicked
                          ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      {isExact ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p>
                          {isExact
                            ? 'Chính xác tất cả các đáp án!'
                            : wrongPicked
                            ? `Có lựa chọn chưa đúng. Đáp án đúng gồm: ${expected.map((i) => String.fromCharCode(65 + i)).join(', ')}`
                            : `Đúng rồi! Còn thiếu ${expected.length - given.length} đáp án đúng nữa.`}
                        </p>
                        {currentQ.explanation && <p className="font-normal opacity-90 mt-0.5">{currentQ.explanation}</p>}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* FILL_BLANK */}
            {currentQ.type === 'FILL_BLANK' && (
              <div className="space-y-3">
                {currentQ.sentenceWithBlanks && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700">
                    {renderFillBlankSentence(currentQ.sentenceWithBlanks)}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nhập từ cần điền..."
                    value={answers[currentQ.id] || ''}
                    onChange={(e) => {
                      setAnswers((prev) => ({ ...prev, [currentQ.id]: e.target.value }));
                      if (checkedQuestions[currentQ.id]) {
                        setCheckedQuestions((prev) => ({ ...prev, [currentQ.id]: false }));
                      }
                    }}
                    className="flex-1 min-w-0 px-4 py-3 bg-white dark:bg-slate-800 border-2 border-blue-500/40 focus:border-blue-600 rounded-2xl text-sm sm:text-base font-bold text-slate-900 dark:text-white focus:outline-none"
                  />
                  {mode === 'PRACTICE' && (
                    <button
                      type="button"
                      onClick={() => setCheckedQuestions((prev) => ({ ...prev, [currentQ.id]: true }))}
                      className="px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm shrink-0"
                    >
                      Kiểm tra
                    </button>
                  )}
                </div>
                {mode === 'PRACTICE' && checkedQuestions[currentQ.id] && (() => {
                  const accepted = (currentQ.acceptedAnswers || []).map((a) => a.trim().toLowerCase());
                  const given = (typeof answers[currentQ.id] === 'string' ? answers[currentQ.id] : '').trim().toLowerCase();
                  const isOk = accepted.includes(given) || (accepted.length === 0 && given.length > 0);
                  return (
                    <div
                      className={`p-3 rounded-xl text-xs font-bold flex items-start gap-2 ${
                        isOk
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                      }`}
                    >
                      {isOk ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                      <div>
                        <p>{isOk ? 'Chính xác!' : `Chưa đúng. Đáp án: ${(currentQ.acceptedAnswers || []).join(' / ')}`}</p>
                        {currentQ.explanation && <p className="font-normal opacity-90 mt-0.5">{currentQ.explanation}</p>}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* WORD_REORDER */}
            {currentQ.type === 'WORD_REORDER' && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-500">Câu bạn đã ghép:</span>
                    {usedWordIndices.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setWordReorderIndices((prev) => ({ ...prev, [currentQ.id]: [] }));
                          setAnswers((prev) => ({ ...prev, [currentQ.id]: '' }));
                        }}
                        className="text-xs font-bold text-rose-500 hover:underline flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Xếp lại
                      </button>
                    )}
                  </div>
                  <div className="min-h-[68px] p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border-2 border-dashed border-blue-300 dark:border-blue-800 flex flex-wrap items-center gap-2">
                    {usedWordIndices.length > 0 ? (
                      usedWordIndices.map((wordIdx, pos) => {
                        const word = (currentQ.words || [])[wordIdx] || '';
                        return (
                          <button
                            key={`${wordIdx}-${pos}`}
                            type="button"
                            onClick={() => {
                              const nextIndices = usedWordIndices.filter((_, i) => i !== pos);
                              const nextSentence = nextIndices
                                .map((idx) => (currentQ.words || [])[idx])
                                .join(' ');
                              setWordReorderIndices((prev) => ({ ...prev, [currentQ.id]: nextIndices }));
                              setAnswers((prev) => ({ ...prev, [currentQ.id]: nextSentence }));
                            }}
                            className="px-3.5 py-2 bg-blue-600 hover:bg-rose-500 text-white font-bold text-sm rounded-xl flex items-center gap-1.5 transition"
                          >
                            <span>{word}</span>
                            <X className="w-3.5 h-3.5 opacity-80" />
                          </button>
                        );
                      })
                    ) : (
                      <span className="text-xs sm:text-sm text-slate-400 italic">
                        Chạm vào các từ bên dưới để ghép câu...
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(currentQ.words || []).map((word, wIdx) => {
                    const isUsed = usedWordIndices.includes(wIdx);
                    return (
                      <button
                        key={wIdx}
                        type="button"
                        disabled={isUsed}
                        onClick={() => {
                          const nextIndices = [...usedWordIndices, wIdx];
                          const nextSentence = nextIndices
                            .map((idx) => (currentQ.words || [])[idx])
                            .join(' ');
                          setWordReorderIndices((prev) => ({ ...prev, [currentQ.id]: nextIndices }));
                          setAnswers((prev) => ({ ...prev, [currentQ.id]: nextSentence }));
                        }}
                        className={`px-4 py-2.5 rounded-xl font-bold text-sm border transition ${
                          isUsed
                            ? 'bg-slate-100 dark:bg-slate-800/40 border-dashed border-slate-300 dark:border-slate-700 text-transparent select-none'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-500 text-slate-800 dark:text-slate-100 shadow-soft active:scale-95'
                        }`}
                      >
                        {word}
                      </button>
                    );
                  })}
                </div>

                {mode === 'PRACTICE' &&
                  (currentQ.words || []).length > 0 &&
                  usedWordIndices.length === (currentQ.words || []).length &&
                  (() => {
                    const expected = (currentQ.correctSentence || '').replace(/\s+/g, ' ').trim().toLowerCase();
                    const given = (typeof answers[currentQ.id] === 'string' ? answers[currentQ.id] : '')
                      .replace(/\s+/g, ' ')
                      .trim()
                      .toLowerCase();
                    const isOk = expected === given;
                    return (
                      <div
                        className={`p-3 rounded-xl text-xs font-bold flex items-start gap-2 ${
                          isOk
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                        }`}
                      >
                        {isOk ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p>{isOk ? 'Chính xác!' : `Chưa đúng. Đáp án: ${currentQ.correctSentence}`}</p>
                          {currentQ.explanation && <p className="font-normal opacity-90 mt-0.5">{currentQ.explanation}</p>}
                        </div>
                      </div>
                    );
                  })()}
              </div>
            )}

            {/* MATCHING */}
            {currentQ.type === 'MATCHING' && currentQ.pairs && (
              <div className="space-y-2.5">
                {currentQ.pairs.map((p, pIdx) => {
                  const chosenRight = (answers[currentQ.id] || {})[p.left] || '';
                  const showMatchFeedback = mode === 'PRACTICE' && Boolean(chosenRight);
                  const isMatchOk = chosenRight === p.right;
                  return (
                    <div
                      key={pIdx}
                      className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                        showMatchFeedback
                          ? isMatchOk
                            ? 'bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-500'
                            : 'bg-rose-50/90 dark:bg-rose-950/50 border-rose-500'
                          : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200/80 dark:border-slate-700'
                      }`}
                    >
                      <span className="font-bold text-sm text-slate-900 dark:text-white sm:w-1/2">
                        {pIdx + 1}. {p.left}
                      </span>
                      <select
                        value={chosenRight}
                        onChange={(e) => {
                          const prevMap = answers[currentQ.id] || {};
                          setAnswers((prev) => ({
                            ...prev,
                            [currentQ.id]: { ...prevMap, [p.left]: e.target.value },
                          }));
                        }}
                        className="w-full sm:w-1/2 px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm sm:text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Chọn đáp án nối --</option>
                        {currentQ.pairs?.map((rightP, rIdx) => (
                          <option key={rIdx} value={rightP.right}>
                            {rightP.right}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ERROR_CORRECTION */}
            {currentQ.type === 'ERROR_CORRECTION' && currentQ.errorOptions && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm sm:text-base font-semibold text-slate-900 dark:text-white leading-relaxed">
                  {currentQ.sentence}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {currentQ.errorOptions.map((opt) => {
                    const chosenOpt = (answers[currentQ.id] || {}).option;
                    const isSelected = chosenOpt === opt.label;
                    const isCorrectOpt = currentQ.correctOption === opt.label;
                    const showErrFeedback = mode === 'PRACTICE' && Boolean(chosenOpt);

                    let btnCls =
                      'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200';
                    if (showErrFeedback) {
                      if (isCorrectOpt) {
                        btnCls = 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-200 ring-2 ring-emerald-500/20';
                      } else if (isSelected) {
                        btnCls = 'bg-rose-50 border-rose-500 text-rose-700 dark:bg-rose-950/80 dark:text-rose-200 ring-2 ring-rose-500/20';
                      }
                    } else if (isSelected) {
                      btnCls = 'bg-rose-50 border-rose-500 text-rose-700 dark:bg-rose-950/80 dark:text-rose-200 ring-2 ring-rose-500/20';
                    }

                    return (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() =>
                          setAnswers((prev) => ({
                            ...prev,
                            [currentQ.id]: { ...(prev[currentQ.id] || {}), option: opt.label },
                          }))
                        }
                        className={`p-3 rounded-xl border font-bold text-xs sm:text-sm transition ${btnCls}`}
                      >
                        ({opt.label}) {opt.text}
                      </button>
                    );
                  })}
                </div>

                {mode === 'PRACTICE' && (answers[currentQ.id] || {}).option && (
                  <div
                    className={`p-3 rounded-xl text-xs font-bold flex items-start gap-2 ${
                      (answers[currentQ.id] || {}).option === currentQ.correctOption
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    {(answers[currentQ.id] || {}).option === currentQ.correctOption ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p>
                        {(answers[currentQ.id] || {}).option === currentQ.correctOption
                          ? `Chính xác! Sửa thành "${currentQ.correction || ''}"`
                          : `Chưa đúng. Lỗi ở (${currentQ.correctOption}) -> sửa thành "${currentQ.correction || ''}"`}
                      </p>
                      {currentQ.explanation && <p className="font-normal opacity-90 mt-0.5">{currentQ.explanation}</p>}
                    </div>
                  </div>
                )}

                <input
                  type="text"
                  placeholder="Viết lại từ đúng (tùy chọn)..."
                  value={(answers[currentQ.id] || {}).correction || ''}
                  onChange={(e) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [currentQ.id]: { ...(prev[currentQ.id] || {}), correction: e.target.value },
                    }))
                  }
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* READING_COMPREHENSION */}
            {currentQ.type === 'READING_COMPREHENSION' && (
              <div className="space-y-4">
                {currentQ.passage && (
                  <div className="rounded-2xl border border-orange-200/80 dark:border-orange-900/60 bg-orange-50/40 dark:bg-orange-950/20 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setPassageCollapsed(!passageCollapsed)}
                      className="w-full px-4 py-3 flex items-center justify-between text-xs font-extrabold text-orange-800 dark:text-orange-300 bg-orange-100/60 dark:bg-orange-950/50"
                    >
                      <span className="flex items-center gap-2">
                        <BookOpenText className="w-4 h-4" />
                        <span>Đoạn văn đọc hiểu</span>
                      </span>
                      {passageCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                    {!passageCollapsed && (
                      <div className="p-4 max-h-72 overflow-y-auto text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                        {currentQ.passage}
                      </div>
                    )}
                  </div>
                )}

                {currentQ.subQuestions?.map((sq, sqIdx) => {
                  const subVal = (answers[currentQ.id] || {})[sq.id];
                  const updateSub = (val: any) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [currentQ.id]: { ...(prev[currentQ.id] || {}), [sq.id]: val },
                    }));
                  return (
                    <div
                      key={sq.id}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2.5"
                    >
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {currentIndex + 1}.{sqIdx + 1} {sq.prompt}
                      </p>
                      {sq.type === 'MULTIPLE_CHOICE' &&
                        sq.options?.map((opt, oIdx) => (
                          <button
                            key={oIdx}
                            type="button"
                            onClick={() => updateSub(oIdx)}
                            className={`w-full p-3 rounded-xl border text-left text-xs sm:text-sm flex items-center gap-2.5 ${
                              subVal === oIdx
                                ? 'bg-blue-50 dark:bg-blue-950/70 border-blue-500 font-bold'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <span className="font-extrabold">{String.fromCharCode(65 + oIdx)}.</span>
                            <span>{opt}</span>
                          </button>
                        ))}
                      {sq.type === 'FILL_BLANK' && (
                        <input
                          type="text"
                          placeholder="Nhập từ còn thiếu..."
                          value={subVal || ''}
                          onChange={(e) => updateSub(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm font-bold"
                        />
                      )}
                      {sq.type === 'ESSAY' && (
                        <textarea
                          rows={3}
                          placeholder="Nhập câu trả lời..."
                          value={subVal || ''}
                          onChange={(e) => updateSub(e.target.value)}
                          className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ESSAY */}
            {currentQ.type === 'ESSAY' && (
              <div className="space-y-2">
                <div className="flex justify-end text-xs font-bold text-slate-500">
                  Số từ: {essayWordCount}
                </div>
                <textarea
                  rows={6}
                  placeholder="Viết bài làm của bạn tại đây..."
                  value={answers[currentQ.id] || ''}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [currentQ.id]: e.target.value }))}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-base sm:text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Desktop Next / Prev */}
            <div className="hidden lg:flex pt-4 border-t border-slate-100 dark:border-slate-800 items-center justify-between">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Câu trước</span>
              </button>

              {currentIndex < totalQ - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.min(totalQ - 1, prev + 1))}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-glow-blue flex items-center gap-1.5"
                >
                  <span>Câu tiếp theo</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmit}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-extrabold shadow-glow-emerald flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Đang chấm...' : 'Nộp Bài'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Question Navigator */}
        <aside className="hidden lg:block lg:col-span-4 sticky top-36">
          <div className="surface-card rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between text-xs font-extrabold">
              <span className="text-slate-900 dark:text-white uppercase tracking-wider">Danh sách câu</span>
              <span className="text-blue-600 dark:text-blue-400">
                {answeredCount}/{totalQ}
              </span>
            </div>
            {renderPaletteGrid()}
          </div>
        </aside>
      </div>

      {/* Mobile / Tablet Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass-bar border-t px-4 py-2.5 pb-safe">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            className="px-3.5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs disabled:opacity-35 flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Trước</span>
          </button>

          <button
            type="button"
            onClick={() => setMobilePaletteOpen(true)}
            className="flex-1 py-3 px-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold text-xs flex items-center justify-center gap-2"
          >
            <LayoutGrid className="w-4 h-4" />
            <span>
              Câu {currentIndex + 1}/{totalQ}
            </span>
          </button>

          {currentIndex < totalQ - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentIndex((prev) => Math.min(totalQ - 1, prev + 1))}
              className="px-4 py-3 rounded-xl bg-blue-600 text-white font-extrabold text-xs flex items-center gap-1"
            >
              <span>Tiếp</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="px-4 py-3 rounded-xl bg-emerald-600 disabled:opacity-60 text-white font-extrabold text-xs flex items-center gap-1"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? '...' : 'Nộp'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Question Sheet */}
      {mobilePaletteOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex items-end bg-slate-950/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setMobilePaletteOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 w-full rounded-t-3xl border-t border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-elevated animate-sheet-up pb-safe max-h-[80vh] overflow-y-auto"
          >
            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto -mt-1" />
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Chọn Câu Hỏi ({answeredCount}/{totalQ})
              </h3>
              <button
                type="button"
                onClick={() => setMobilePaletteOpen(false)}
                className="p-2 rounded-xl text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderPaletteGrid(() => setMobilePaletteOpen(false))}
          </div>
        </div>
      )}
    </div>
  );
};
