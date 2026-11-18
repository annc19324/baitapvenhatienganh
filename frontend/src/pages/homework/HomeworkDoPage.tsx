import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Flag,
  ArrowLeft,
  ArrowRight,
  Send,
  RotateCcw,
  Sparkles,
  Check,
  Shield,
  Layers,
  FileText,
  User,
  GraduationCap,
  X,
} from 'lucide-react';
import { HomeworkStorageService } from '../../services/homework/homeworkStorage';
import { HomeworkAiService } from '../../services/homework/homeworkAi';
import { HomeworkAssignment, HomeworkQuestion, HomeworkSubmission } from '../../types/homework';
import { useToast } from '../../context/ToastContext';

export const HomeworkDoPage: React.FC = () => {
  const { codeOrId } = useParams<{ codeOrId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [assignment, setAssignment] = useState<HomeworkAssignment | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  // Test Taking State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Load assignment
  useEffect(() => {
    if (!codeOrId) return;
    const found = HomeworkStorageService.getAssignment(codeOrId);
    if (!found) {
      showToast({
        message: 'Không tìm thấy bài tập',
        subMessage: `Mã PIN "${codeOrId}" không tồn tại.`,
        type: 'error',
      });
      navigate('/homework');
      return;
    }
    setAssignment(found);

    // Check if there was an in-progress session saved in localStorage
    const savedSessionKey = `hw_session_${found.id}`;
    const saved = localStorage.getItem(savedSessionKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.studentName) {
          setStudentName(parsed.studentName);
          setStudentClass(parsed.studentClass || '');
          setAnswers(parsed.answers || {});
          setFlagged(parsed.flagged || {});
        }
      } catch {
        // ignore
      }
    }
  }, [codeOrId]);

  // Timer countdown
  useEffect(() => {
    if (!hasStarted || timeLeftSeconds === null) return;
    if (timeLeftSeconds <= 0) {
      // Auto submit when time runs out!
      handleSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [hasStarted, timeLeftSeconds]);

  // Auto-save answers to localStorage
  useEffect(() => {
    if (!hasStarted || !assignment) return;
    const sessionKey = `hw_session_${assignment.id}`;
    localStorage.setItem(
      sessionKey,
      JSON.stringify({
        studentName,
        studentClass,
        answers,
        flagged,
      })
    );
  }, [answers, flagged, hasStarted]);

  const handleStartTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      showToast({ message: 'Vui lòng nhập họ và tên của bạn', type: 'error' });
      return;
    }

    if (assignment?.password && assignment.password !== passwordInput.trim()) {
      showToast({ message: 'Mật khẩu bài tập không chính xác', type: 'error' });
      return;
    }

    setHasStarted(true);
    setStartTime(Date.now());
    if (assignment && assignment.timeLimitMinutes > 0) {
      setTimeLeftSeconds(assignment.timeLimitMinutes * 60);
    }
  };

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const handleToggleFlag = (questionId: string) => {
    setFlagged((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Submit and calculate results
  const handleSubmit = async () => {
    if (!assignment) return;
    setShowConfirmModal(false);
    setIsSubmitting(true);

    try {
      const timeSpentSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));
      const scores: Record<string, number> = {};
      const aiEvaluations: Record<string, any> = {};

      for (const q of assignment.questions) {
        const studentAns = answers[q.id];
        const maxPoints = q.points || 1;

        if (q.type === 'MULTIPLE_CHOICE' || q.type === 'PRONUNCIATION') {
          if (studentAns !== undefined && studentAns === q.correctOptionIndex) {
            scores[q.id] = maxPoints;
          } else {
            scores[q.id] = 0;
          }
        } else if (q.type === 'FILL_BLANK') {
          const accepted = (q.acceptedAnswers || []).map((a) => a.trim().toLowerCase());
          const textAns = (typeof studentAns === 'string' ? studentAns : '').trim().toLowerCase();
          if (accepted.includes(textAns) || (accepted.length === 0 && textAns.length > 0)) {
            scores[q.id] = maxPoints;
          } else {
            scores[q.id] = 0;
          }
        } else if (q.type === 'WORD_REORDER') {
          const expected = (q.correctSentence || '').replace(/\s+/g, ' ').trim().toLowerCase();
          const given = (typeof studentAns === 'string' ? studentAns : '').replace(/\s+/g, ' ').trim().toLowerCase();
          if (expected === given) {
            scores[q.id] = maxPoints;
          } else {
            scores[q.id] = 0;
          }
        } else if (q.type === 'MATCHING') {
          let correctPairs = 0;
          const totalPairs = (q.pairs || []).length;
          if (totalPairs > 0 && typeof studentAns === 'object' && studentAns !== null) {
            q.pairs?.forEach((p) => {
              if (studentAns[p.left] === p.right) {
                correctPairs++;
              }
            });
            scores[q.id] = Number(((correctPairs / totalPairs) * maxPoints).toFixed(1));
          } else {
            scores[q.id] = 0;
          }
        } else if (q.type === 'ERROR_CORRECTION') {
          if (typeof studentAns === 'object' && studentAns !== null) {
            if (studentAns.option === q.correctOption) {
              scores[q.id] = maxPoints;
            } else {
              scores[q.id] = 0;
            }
          } else {
            scores[q.id] = 0;
          }
        } else if (q.type === 'ESSAY') {
          // AI Essay Evaluation
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
          // Fallback
          scores[q.id] = studentAns !== undefined ? maxPoints : 0;
        }
      }

      // Calculate totals
      const totalScore = Number(Object.values(scores).reduce((sum, s) => sum + s, 0).toFixed(1));
      const maxTotalScore = assignment.totalPoints || 10;
      const percentage = Math.round((totalScore / maxTotalScore) * 100);

      const submission: HomeworkSubmission = {
        id: `sub-${Date.now()}`,
        assignmentId: assignment.id,
        assignmentCode: assignment.code,
        assignmentTitle: assignment.title,
        studentName: studentName.trim(),
        studentClass: studentClass.trim() || undefined,
        answers,
        scores,
        aiEvaluations,
        totalScore,
        maxTotalScore,
        percentage,
        timeSpentSeconds,
        submittedAt: new Date().toISOString(),
      };

      // Save submission
      HomeworkStorageService.saveSubmission(submission);

      // Clear saved in-progress session
      localStorage.removeItem(`hw_session_${assignment.id}`);

      showToast({
        message: 'Nộp bài thành công!',
        subMessage: `Điểm của bạn: ${totalScore}/${maxTotalScore} (${percentage}%)`,
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
      <div className="py-20 text-center text-slate-400">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <span>Đang tải thông tin bài tập...</span>
      </div>
    );
  }

  // STEP 1: WELCOME & STUDENT INFO SCREEN
  if (!hasStarted) {
    return (
      <div className="max-w-xl mx-auto py-8 sm:py-12 space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono font-black text-xs rounded-full border border-indigo-200 dark:border-indigo-800">
              MÃ BÀI TẬP: {assignment.code}
            </span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">{assignment.title}</h1>
            <p className="text-xs text-slate-500 leading-relaxed">{assignment.description || assignment.topic}</p>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-3 gap-2.5 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl text-center">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Số câu</p>
              <p className="text-sm font-black text-slate-800 dark:text-slate-200">{assignment.questions.length}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Thời gian</p>
              <p className="text-sm font-black text-slate-800 dark:text-slate-200">
                {assignment.timeLimitMinutes > 0 ? `${assignment.timeLimitMinutes} phút` : 'Tự do'}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Tổng điểm</p>
              <p className="text-sm font-black text-slate-800 dark:text-slate-200">{assignment.totalPoints} đ</p>
            </div>
          </div>

          {/* Student Info Form */}
          <form onSubmit={handleStartTest} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                <span>Họ và tên của bạn:</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Nhập đầy đủ Họ và Tên (ví dụ: Nguyễn Văn An)"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                <span>Lớp / Trường (Tùy chọn):</span>
              </label>
              <input
                type="text"
                placeholder="Ví dụ: 12A1 - THPT Chuyên"
                value={studentClass}
                onChange={(e) => setStudentClass(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {assignment.password && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-amber-500" />
                  <span>Mật khẩu bài tập (Giáo viên yêu cầu):</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="Nhập mật khẩu bài tập..."
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-black text-sm rounded-2xl shadow-lg shadow-indigo-500/25 transition transform active:scale-98 flex items-center justify-center gap-2"
            >
              <span>Bắt Đầu Làm Bài Ngay</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-[11px] text-slate-400 text-center leading-relaxed">
            Hệ thống tự động lưu bài làm (Auto-save) sau mỗi thao tác. Không lo mất bài khi vô tình tải lại trang.
          </p>
        </div>
      </div>
    );
  }

  // STEP 2: ACTIVE TEST ENVIRONMENT
  const currentQ = assignment.questions[currentIndex];
  const totalQ = assignment.questions.length;
  const answeredCount = Object.keys(answers).length;
  const progressPercent = Math.round((answeredCount / totalQ) * 100);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24">
      {/* Fixed/Sticky Test Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-2 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-mono font-black text-sm flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
            {currentIndex + 1}
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white line-clamp-1">{assignment.title}</h2>
            <p className="text-[11px] text-slate-500">
              Học sinh: <strong>{studentName}</strong> • Đã làm: <strong>{answeredCount}/{totalQ} câu</strong> ({progressPercent}%)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Timer Display */}
          {timeLeftSeconds !== null && (
            <div
              className={`px-3 py-1.5 rounded-xl font-mono font-black text-xs flex items-center gap-1.5 border transition ${
                timeLeftSeconds <= 120
                  ? 'bg-rose-50 text-rose-600 border-rose-300 dark:bg-rose-950/80 animate-pulse'
                  : timeLeftSeconds <= 300
                  ? 'bg-amber-50 text-amber-600 border-amber-300 dark:bg-amber-950/80'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTimer(timeLeftSeconds)}</span>
            </div>
          )}

          <button
            onClick={() => setShowConfirmModal(true)}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow flex items-center gap-1.5 transition active:scale-98"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Nộp Bài</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Main Question Area */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
            {/* Question Top Meta */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                Câu {currentIndex + 1} / {totalQ} ({currentQ.points || 1} điểm)
              </span>

              <button
                type="button"
                onClick={() => handleToggleFlag(currentQ.id)}
                className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                  flagged[currentQ.id]
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300'
                    : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Flag className="w-3.5 h-3.5 fill-current" />
                <span>{flagged[currentQ.id] ? 'Đã gắn cờ xem lại' : 'Gắn cờ xem lại'}</span>
              </button>
            </div>

            {/* Question Prompt */}
            <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
              {currentQ.prompt}
            </div>

            {/* DẠNG 1: MULTIPLE_CHOICE & PRONUNCIATION */}
            {(currentQ.type === 'MULTIPLE_CHOICE' || currentQ.type === 'PRONUNCIATION') && currentQ.options && (
              <div className="space-y-3">
                {currentQ.options.map((option, optIdx) => {
                  const isSelected = answers[currentQ.id] === optIdx;
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleSelectOption(currentQ.id, optIdx)}
                      className={`w-full p-4 rounded-2xl border text-left flex items-center gap-3.5 transition transform active:scale-99 ${
                        isSelected
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/70 border-indigo-600 text-indigo-950 dark:text-indigo-100 font-bold shadow-sm ring-2 ring-indigo-500/30'
                          : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold'
                      }`}
                    >
                      <span
                        className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 transition ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                        }`}
                      >
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span className="text-sm leading-relaxed">{option}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* DẠNG 2: FILL_BLANK */}
            {currentQ.type === 'FILL_BLANK' && (
              <div className="space-y-4">
                <div className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-800 dark:text-slate-200 leading-loose">
                  {currentQ.sentenceWithBlanks}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                    Gõ câu trả lời của bạn vào ô dưới đây (từ/cụm từ cần điền):
                  </label>
                  <input
                    type="text"
                    placeholder="Nhập từ cần điền..."
                    value={answers[currentQ.id] || ''}
                    onChange={(e) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [currentQ.id]: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-indigo-500/40 focus:border-indigo-600 rounded-2xl text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* DẠNG 3: WORD_REORDER */}
            {currentQ.type === 'WORD_REORDER' && (
              <div className="space-y-4">
                {/* Result sentence box */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                    Câu bạn đã ghép:
                  </label>
                  <div className="min-h-16 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-800 flex flex-wrap items-center gap-2">
                    {answers[currentQ.id] ? (
                      (answers[currentQ.id] as string).split(' ').filter(Boolean).map((word, wIdx) => (
                        <button
                          key={wIdx}
                          type="button"
                          onClick={() => {
                            const cur = (answers[currentQ.id] as string).split(' ');
                            cur.splice(wIdx, 1);
                            setAnswers((prev) => ({
                              ...prev,
                              [currentQ.id]: cur.join(' '),
                            }));
                          }}
                          className="px-3 py-1.5 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-sm hover:bg-rose-500 transition flex items-center gap-1"
                        >
                          <span>{word}</span>
                          <X className="w-3 h-3" />
                        </button>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">
                        Bấm vào các từ bên dưới để đưa lên đây tạo thành câu hoàn chỉnh...
                      </span>
                    )}
                  </div>
                </div>

                {/* Available word chips */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      Chọn các từ theo thứ tự:
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setAnswers((prev) => ({
                          ...prev,
                          [currentQ.id]: '',
                        }))
                      }
                      className="text-[11px] font-bold text-rose-500 hover:underline flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" /> Làm lại câu này
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(currentQ.words || []).map((word, wIdx) => (
                      <button
                        key={wIdx}
                        type="button"
                        onClick={() => {
                          const prevStr = (answers[currentQ.id] as string) || '';
                          const nextStr = prevStr ? `${prevStr} ${word}` : word;
                          setAnswers((prev) => ({
                            ...prev,
                            [currentQ.id]: nextStr,
                          }));
                        }}
                        className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:bg-indigo-50 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl shadow-sm transition active:scale-95"
                      >
                        {word}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* DẠNG 4: MATCHING */}
            {currentQ.type === 'MATCHING' && currentQ.pairs && (
              <div className="space-y-4">
                <p className="text-xs text-slate-500">
                  Chọn định nghĩa hoặc vế tương ứng ở cột bên phải cho mỗi từ ở cột bên trái:
                </p>

                <div className="space-y-3">
                  {currentQ.pairs.map((p, pIdx) => {
                    const currentPairSelection = (answers[currentQ.id] || {})[p.left] || '';
                    return (
                      <div
                        key={pIdx}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100 sm:w-1/2">
                          {p.left}
                        </span>

                        <select
                          value={currentPairSelection}
                          onChange={(e) => {
                            const prevMap = answers[currentQ.id] || {};
                            setAnswers((prev) => ({
                              ...prev,
                              [currentQ.id]: {
                                ...prevMap,
                                [p.left]: e.target.value,
                              },
                            }));
                          }}
                          className="w-full sm:w-1/2 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              </div>
            )}

            {/* DẠNG 5: ERROR_CORRECTION */}
            {currentQ.type === 'ERROR_CORRECTION' && currentQ.errorOptions && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
                  {currentQ.sentence}
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                    1. Chọn vị trí bị sai (A, B, C hoặc D):
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {currentQ.errorOptions.map((opt) => {
                      const isSelected = (answers[currentQ.id] || {}).option === opt.label;
                      return (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => {
                            const prevAns = answers[currentQ.id] || {};
                            setAnswers((prev) => ({
                              ...prev,
                              [currentQ.id]: {
                                ...prevAns,
                                option: opt.label,
                              },
                            }));
                          }}
                          className={`p-3 rounded-xl border text-center font-bold text-xs transition ${
                            isSelected
                              ? 'bg-rose-50 border-rose-500 text-rose-700 dark:bg-rose-950/80 dark:text-rose-200 ring-2 ring-rose-500/30'
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          ({opt.label}) {opt.text}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                    2. Nhập từ hoặc cụm từ sửa lại cho đúng:
                  </label>
                  <input
                    type="text"
                    placeholder="Nhập từ sửa đúng..."
                    value={(answers[currentQ.id] || {}).correction || ''}
                    onChange={(e) => {
                      const prevAns = answers[currentQ.id] || {};
                      setAnswers((prev) => ({
                        ...prev,
                        [currentQ.id]: {
                          ...prevAns,
                          correction: e.target.value,
                        },
                      }));
                    }}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* DẠNG 6: ESSAY */}
            {currentQ.type === 'ESSAY' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Bài làm này sẽ được AI chấm điểm ngữ pháp & nhận xét chi tiết</span>
                  </span>
                  <span>
                    Số từ:{' '}
                    <strong>
                      {answers[currentQ.id]
                        ? (answers[currentQ.id] as string).trim().split(/\s+/).filter(Boolean).length
                        : 0}
                    </strong>
                    {currentQ.minWords ? ` (Yêu cầu: ${currentQ.minWords} - ${currentQ.maxWords || 150} từ)` : ''}
                  </span>
                </div>

                <textarea
                  rows={6}
                  placeholder="Gõ bài viết tiếng Anh của bạn tại đây..."
                  value={answers[currentQ.id] || ''}
                  onChange={(e) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [currentQ.id]: e.target.value,
                    }))
                  }
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-medium leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Câu trước</span>
              </button>

              {currentIndex < totalQ - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.min(totalQ - 1, prev + 1))}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5"
                >
                  <span>Câu tiếp theo</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-emerald-600/30 transition flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>Hoàn Thành & Nộp Bài</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right / Question Palette Drawer */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
              Bảng Câu Hỏi ({answeredCount}/{totalQ})
            </h3>

            <div className="grid grid-cols-5 gap-2">
              {assignment.questions.map((q, idx) => {
                const isAnswered = answers[q.id] !== undefined && answers[q.id] !== '';
                const isFlag = flagged[q.id];
                const isCurrent = currentIndex === idx;

                let btnClass = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
                if (isAnswered) {
                  btnClass = 'bg-indigo-600 text-white font-black';
                }
                if (isFlag) {
                  btnClass = 'bg-amber-400 text-slate-900 font-black';
                }

                return (
                  <button
                    key={q.id || idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-11 rounded-xl text-xs font-extrabold transition relative ${btnClass} ${
                      isCurrent ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900 scale-105' : ''
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {isFlag && (
                      <span className="w-2 h-2 rounded-full bg-amber-600 absolute top-1 right-1" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-[11px] text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-md bg-indigo-600 shrink-0" />
                <span>Đã trả lời ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-md bg-slate-100 dark:bg-slate-800 border shrink-0" />
                <span>Chưa trả lời ({totalQ - answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-md bg-amber-400 shrink-0" />
                <span>Gắn cờ xem lại ({Object.values(flagged).filter(Boolean).length})</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow transition"
            >
              Nộp Bài Ngay
            </button>
          </div>
        </div>
      </div>

      {/* CONFIRMATION SUBMIT MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-lg text-slate-900 dark:text-white">Xác nhận nộp bài?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Bạn đã làm <strong>{answeredCount}</strong> / <strong>{totalQ}</strong> câu hỏi.
                {totalQ - answeredCount > 0 && (
                  <span className="block text-rose-500 font-bold mt-1">
                    Cảnh báo: Còn {totalQ - answeredCount} câu bạn chưa trả lời!
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition"
              >
                Quay lại làm tiếp
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Đang Chấm AI...</span>
                  </>
                ) : (
                  <span>Nộp Bài & Chấm Điểm</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
