import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  RotateCcw,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';
import { HomeworkStorageService } from '../services/homeworkStorage';
import { HomeworkSubmission, HomeworkAssignment } from '../types/homework';
import { useAuth } from '../context/AuthContext';
import { QuestionTypeBadge } from '../components/QuestionTypeBadge';
import { EducationLevelBadge } from '../components/EducationLevelBadge';

export const HomeworkResultPage: React.FC = () => {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [submission, setSubmission] = useState<HomeworkSubmission | null>(null);
  const [assignment, setAssignment] = useState<HomeworkAssignment | null>(null);

  useEffect(() => {
    if (!submissionId) return;
    let cancelled = false;

    const loadResult = async () => {
      let sub = HomeworkStorageService.getSubmission(submissionId);
      if (!sub) {
        await HomeworkStorageService.syncFromBackend(true);
        if (cancelled) return;
        sub = HomeworkStorageService.getSubmission(submissionId);
      }
      if (!sub) {
        navigate('/homework');
        return;
      }
      setSubmission(sub);
      let assign = HomeworkStorageService.getAssignment(sub.assignmentId);
      if (!assign) {
        await HomeworkStorageService.syncFromBackend(true);
        if (cancelled) return;
        assign = HomeworkStorageService.getAssignment(sub.assignmentId);
      }
      if (assign) setAssignment(assign);
    };

    loadResult();
    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  if (!submission || !assignment) {
    return (
      <div className="py-24 text-center text-slate-400">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <span className="text-sm font-semibold">Đang tải kết quả...</span>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins === 0 ? `${secs} giây` : `${mins}p ${secs}s`;
  };

  let correctCount = 0;
  assignment.questions.forEach((q) => {
    const earned = submission.scores[q.id] || 0;
    const max = q.points || 1;
    if (earned >= max * 0.7) correctCount++;
  });

  const strokeColor =
    submission.percentage >= 80 ? '#10b981' : submission.percentage >= 50 ? '#f59e0b' : '#f43f5e';
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (Math.min(100, Math.max(0, submission.percentage)) / 100) * circumference;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/homework')}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Về bài tập A–Z</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 text-xs font-bold"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Quản trị Admin</span>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => navigate(`/homework/do/${assignment.code}`)}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-glow-blue transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Làm lại</span>
        </button>
      </div>

      {/* Score Summary Card */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-900 via-[#0F2557] to-slate-900 text-white p-6 sm:p-8 shadow-elevated flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
            <span className="px-3 py-0.5 rounded-full bg-white/10 text-teal-300 font-mono font-bold text-xs">
              {submission.assignmentCode}
            </span>
            <EducationLevelBadge levelId={assignment.levelId} />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold leading-snug">{assignment.title}</h1>
          <p className="text-sm text-slate-300">
            Người làm bài: <strong className="text-white">{submission.studentName}</strong>
          </p>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1 text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Đúng {correctCount}/{assignment.questions.length} câu
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10">
              <Clock className="w-4 h-4 text-sky-300" />
              {formatTime(submission.timeSpentSeconds)}
            </span>
          </div>
        </div>

        <div className="shrink-0 flex flex-col items-center">
          <div className="relative w-28 h-28 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 112 112">
              <circle cx="56" cy="56" r={radius} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="9" />
              <circle
                cx="56"
                cy="56"
                r={radius}
                fill="none"
                stroke={strokeColor}
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-extrabold leading-none">{submission.totalScore}</span>
              <span className="text-xs text-slate-300 font-bold">/{submission.maxTotalScore}đ</span>
            </div>
          </div>
          <span className="text-xs font-extrabold text-teal-300 mt-1">{submission.percentage}%</span>
        </div>
      </section>

      {/* Answer Review */}
      <section className="space-y-4">
        <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
          Xem Lại Đáp Án ({assignment.questions.length} câu)
        </h2>

        {assignment.questions.map((q, idx) => {
          const studentAns = submission.answers[q.id];
          const earnedPoints = submission.scores[q.id] || 0;
          const maxPoints = q.points || 1;
          const isFull = earnedPoints >= maxPoints;
          const isPartial = earnedPoints > 0 && earnedPoints < maxPoints;

          return (
            <article key={q.id || idx} className="surface-card rounded-2xl p-5 space-y-3.5">
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-7 h-7 rounded-lg font-extrabold text-xs flex items-center justify-center text-white ${
                      isFull ? 'bg-emerald-600' : isPartial ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <QuestionTypeBadge type={q.type} compact />
                </div>
                <span
                  className={`px-2.5 py-1 rounded-lg font-extrabold text-xs ${
                    isFull
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : isPartial
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                  }`}
                >
                  +{earnedPoints}/{maxPoints}đ
                </span>
              </div>

              <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-relaxed">
                {q.prompt}
              </p>

              {(q.type === 'MULTIPLE_CHOICE' || q.type === 'PRONUNCIATION') && q.options && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {q.options.map((opt, oIdx) => {
                    const isCorrect = q.correctOptionIndex === oIdx;
                    const isChosen = studentAns === oIdx;
                    return (
                      <div
                        key={oIdx}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-xs sm:text-sm ${
                          isCorrect
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-950 dark:text-emerald-100 font-bold'
                            : isChosen
                            ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-950 dark:text-rose-200 line-through'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <span>
                          <strong className="mr-1.5">{String.fromCharCode(65 + oIdx)}.</strong>
                          {opt}
                        </span>
                        {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                        {isChosen && !isCorrect && <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              )}

              {q.type === 'FILL_BLANK' && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 text-xs sm:text-sm space-y-1">
                  <p>
                    Bạn điền:{' '}
                    <strong className={isFull ? 'text-emerald-600' : 'text-rose-600'}>
                      {studentAns || '(Trống)'}
                    </strong>
                  </p>
                  <p className="text-emerald-600 dark:text-emerald-400 font-bold">
                    Đáp án đúng: {(q.acceptedAnswers || []).join(' / ')}
                  </p>
                </div>
              )}

              {q.type === 'WORD_REORDER' && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 text-xs sm:text-sm space-y-1">
                  <p>
                    Bạn ghép:{' '}
                    <strong className={isFull ? 'text-emerald-600' : 'text-rose-600'}>
                      {studentAns || '(Trống)'}
                    </strong>
                  </p>
                  <p className="text-emerald-600 dark:text-emerald-400 font-bold">
                    Câu chuẩn: {q.correctSentence}
                  </p>
                </div>
              )}

              {q.type === 'MATCHING' && q.pairs && (
                <div className="space-y-1.5">
                  {q.pairs.map((p, pIdx) => {
                    const chosen = (studentAns || {})[p.left];
                    const ok = chosen === p.right;
                    return (
                      <div
                        key={pIdx}
                        className={`p-3 rounded-xl border text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-1 ${
                          ok
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                            : 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
                        }`}
                      >
                        <span className="font-bold">{p.left}</span>
                        <span>
                          <span
                            className={
                              ok
                                ? 'text-emerald-700 dark:text-emerald-300 font-bold'
                                : 'text-rose-600 line-through mr-2'
                            }
                          >
                            {chosen || '(Trống)'}
                          </span>
                          {!ok && <strong className="text-emerald-700 dark:text-emerald-300">→ {p.right}</strong>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {q.type === 'ERROR_CORRECTION' && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 text-xs sm:text-sm space-y-1">
                  <p className="font-semibold">{q.sentence}</p>
                  <p>
                    Bạn chọn:{' '}
                    <strong className={isFull ? 'text-emerald-600' : 'text-rose-600'}>
                      {studentAns?.option ? `(${studentAns.option})` : '(Chưa chọn)'}
                      {studentAns?.correction ? ` → ${studentAns.correction}` : ''}
                    </strong>
                  </p>
                  <p className="text-emerald-600 dark:text-emerald-400 font-bold">
                    Đáp án đúng: ({q.correctOption}) → {q.correction}
                  </p>
                </div>
              )}

              {q.type === 'READING_COMPREHENSION' && q.subQuestions && (
                <div className="space-y-2">
                  {q.subQuestions.map((sq, sqIdx) => {
                    const subVal = (studentAns || {})[sq.id];
                    return (
                      <div key={sq.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 text-xs sm:text-sm space-y-1">
                        <p className="font-bold">
                          {idx + 1}.{sqIdx + 1} {sq.prompt}
                        </p>
                        <p>
                          Bạn trả lời:{' '}
                          <strong className="text-blue-600 dark:text-blue-400">
                            {sq.type === 'MULTIPLE_CHOICE' && typeof subVal === 'number' && sq.options
                              ? `${String.fromCharCode(65 + subVal)}. ${sq.options[subVal]}`
                              : subVal || '(Trống)'}
                          </strong>
                        </p>
                        {sq.type === 'MULTIPLE_CHOICE' && sq.options && sq.correctOptionIndex !== undefined && (
                          <p className="text-emerald-600 dark:text-emerald-400 font-bold">
                            Đáp án đúng: {String.fromCharCode(65 + sq.correctOptionIndex)}.{' '}
                            {sq.options[sq.correctOptionIndex]}
                          </p>
                        )}
                        {sq.type === 'FILL_BLANK' && sq.acceptedAnswers && (
                          <p className="text-emerald-600 dark:text-emerald-400 font-bold">
                            Đáp án đúng: {sq.acceptedAnswers.join(' / ')}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {q.type === 'ESSAY' && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 text-xs sm:text-sm space-y-2">
                  <p className="font-bold text-slate-500">Bài viết của bạn:</p>
                  <p className="italic whitespace-pre-wrap">{studentAns || '(Trống)'}</p>
                  {q.sampleAnswer && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                      <p className="font-bold text-emerald-600 dark:text-emerald-400">Bài viết mẫu tham khảo:</p>
                      <p className="text-slate-600 dark:text-slate-300 mt-0.5">{q.sampleAnswer}</p>
                    </div>
                  )}
                </div>
              )}

              {q.explanation && (
                <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/60 text-xs sm:text-sm flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{q.explanation}</p>
                </div>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
};
