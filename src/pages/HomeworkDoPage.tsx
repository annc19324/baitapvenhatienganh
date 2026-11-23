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
} from 'lucide-react';
import { HomeworkStorageService } from '../services/homeworkStorage';
import { HomeworkAiService } from '../services/homeworkAi';
import { HomeworkAssignment, HomeworkQuestion, HomeworkSubmission } from '../types/homework';
import { useToast } from '../context/ToastContext';
import { QuestionTypeBadge } from '../components/QuestionTypeBadge';

const isQuestionAnswered = (q: HomeworkQuestion, ans: any): boolean => {
  if (ans === undefined || ans === null || ans === '') return false;
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
  const { showToast } = useToast();

  const [assignment, setAssignment] = useState<HomeworkAssignment | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [studentName, setStudentName] = useState('');

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [wordReorderIndices, setWordReorderIndices] = useState<Record<string, number[]>>({});
  const [passageCollapsed, setPassageCollapsed] = useState(false);
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState(false);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    if (!codeOrId) return;
    const found = HomeworkStorageService.getAssignment(codeOrId);
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
        if (parsed.studentName) {
          setStudentName(parsed.studentName);
          setAnswers(parsed.answers || {});
          setWordReorderIndices(parsed.wordReorderIndices || {});
        }
      } catch {
        // ignore
      }
    }
  }, [codeOrId]);

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
      showToast({ message: 'Vui lòng nhập họ và tên', type: 'error' });
      return;
    }
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
    setShowConfirmModal(false);
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

      HomeworkStorageService.saveSubmission(submission);
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

  // ================= STEP 1: SIMPLE WELCOME SCREEN =================
  if (!hasStarted) {
    return (
      <div className="max-w-md mx-auto py-6 sm:py-12 animate-slide-up">
        <div className="surface-card rounded-3xl p-6 sm:p-8 shadow-elevated space-y-6">
          <div className="text-center space-y-2">
            <span className="inline-block px-3 py-1 bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-mono font-extrabold text-xs rounded-full border border-blue-200 dark:border-blue-800">
              {assignment.code}
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white leading-snug">
              {assignment.title}
            </h1>
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

          <form onSubmit={handleStartTest} className="space-y-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>Họ và tên học sinh</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Nhập họ và tên của bạn..."
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-base font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-extrabold text-sm rounded-2xl shadow-glow-blue transition flex items-center justify-center gap-2"
            >
              <span>Bắt Đầu Làm Bài</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
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
        onClick={() => {
          setMobilePaletteOpen(false);
          setShowConfirmModal(true);
        }}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-2xl shadow-glow-emerald transition flex items-center justify-center gap-2"
      >
        <Send className="w-4 h-4" />
        <span>Nộp Bài</span>
      </button>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Sticky Progress & Timer Bar */}
      <div className="surface-card rounded-2xl overflow-hidden sticky top-[3.75rem] sm:top-[4.25rem] z-30">
        <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
              {assignment.title}
            </h2>
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
              onClick={() => setShowConfirmModal(true)}
              className="hidden sm:inline-flex px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-sm items-center gap-1.5 transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Nộp Bài</span>
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
        {/* Question Card */}
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
                  const isSelected = answers[currentQ.id] === optIdx;
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => setAnswers((prev) => ({ ...prev, [currentQ.id]: optIdx }))}
                      className={`w-full min-h-[54px] p-3.5 sm:p-4 rounded-2xl border text-left flex items-center gap-3.5 transition active:scale-[0.99] ${
                        isSelected
                          ? 'bg-blue-50/90 dark:bg-blue-950/60 border-blue-600 text-blue-950 dark:text-blue-100 font-bold ring-2 ring-blue-500/20'
                          : 'bg-slate-50/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-blue-300 text-slate-800 dark:text-slate-200 font-semibold'
                      }`}
                    >
                      <span
                        className={`w-8 h-8 rounded-xl font-extrabold text-xs flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                        }`}
                      >
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span className="text-sm sm:text-[15px] leading-relaxed">{option}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* FILL_BLANK */}
            {currentQ.type === 'FILL_BLANK' && (
              <div className="space-y-4">
                {currentQ.sentenceWithBlanks && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700">
                    {renderFillBlankSentence(currentQ.sentenceWithBlanks)}
                  </div>
                )}
                <input
                  type="text"
                  placeholder="Nhập từ cần điền..."
                  value={answers[currentQ.id] || ''}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [currentQ.id]: e.target.value }))}
                  className="w-full px-4 py-3.5 bg-white dark:bg-slate-800 border-2 border-blue-500/40 focus:border-blue-600 rounded-2xl text-base font-bold text-slate-900 dark:text-white focus:outline-none"
                />
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
              </div>
            )}

            {/* MATCHING */}
            {currentQ.type === 'MATCHING' && currentQ.pairs && (
              <div className="space-y-2.5">
                {currentQ.pairs.map((p, pIdx) => (
                  <div
                    key={pIdx}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <span className="font-bold text-sm text-slate-900 dark:text-white sm:w-1/2">
                      {pIdx + 1}. {p.left}
                    </span>
                    <select
                      value={(answers[currentQ.id] || {})[p.left] || ''}
                      onChange={(e) => {
                        const prevMap = answers[currentQ.id] || {};
                        setAnswers((prev) => ({
                          ...prev,
                          [currentQ.id]: { ...prevMap, [p.left]: e.target.value },
                        }));
                      }}
                      className="w-full sm:w-1/2 px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-base sm:text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Chọn đáp án nối --</option>
                      {currentQ.pairs?.map((rightP, rIdx) => (
                        <option key={rIdx} value={rightP.right}>
                          {rightP.right}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
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
                    const isSelected = (answers[currentQ.id] || {}).option === opt.label;
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
                        className={`p-3 rounded-xl border font-bold text-xs sm:text-sm transition ${
                          isSelected
                            ? 'bg-rose-50 border-rose-500 text-rose-700 dark:bg-rose-950/80 dark:text-rose-200 ring-2 ring-rose-500/20'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        ({opt.label}) {opt.text}
                      </button>
                    );
                  })}
                </div>

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
                  onClick={() => setShowConfirmModal(true)}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-glow-emerald flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>Nộp Bài</span>
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

      {/* Mobile / Tablet Bottom Navigation Bar */}
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
              onClick={() => setShowConfirmModal(true)}
              className="px-4 py-3 rounded-xl bg-emerald-600 text-white font-extrabold text-xs flex items-center gap-1"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Nộp</span>
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

      {/* Confirm Submit Modal */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
          onClick={() => !isSubmitting && setShowConfirmModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full space-y-4 shadow-elevated text-center animate-sheet-up sm:animate-slide-up pb-safe"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Nộp bài tập?</h3>
              <p className="text-sm text-slate-500">
                Bạn đã làm <strong>{answeredCount}/{totalQ}</strong> câu hỏi.
                {totalQ - answeredCount > 0 && (
                  <span className="block text-rose-500 font-bold mt-1">
                    Còn {totalQ - answeredCount} câu chưa trả lời.
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl"
              >
                Làm tiếp
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-glow-emerald"
              >
                {isSubmitting ? 'Đang chấm...' : 'Nộp Bài'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
