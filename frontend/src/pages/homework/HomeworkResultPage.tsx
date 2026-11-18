import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Trophy,
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ArrowLeft,
  RotateCcw,
  Printer,
  Share2,
  User,
  HelpCircle,
  BookOpen,
  MessageSquare,
  Flame,
  ChevronRight,
} from 'lucide-react';
import { HomeworkStorageService } from '../../services/homework/homeworkStorage';
import { HomeworkSubmission, HomeworkAssignment } from '../../types/homework';
import { useToast } from '../../context/ToastContext';

export const HomeworkResultPage: React.FC = () => {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();
  const { copyAndNotify } = useToast();

  const [submission, setSubmission] = useState<HomeworkSubmission | null>(null);
  const [assignment, setAssignment] = useState<HomeworkAssignment | null>(null);
  const [allSubmissions, setAllSubmissions] = useState<HomeworkSubmission[]>([]);
  const [activeTab, setActiveTab] = useState<'review' | 'leaderboard'>('review');

  useEffect(() => {
    if (!submissionId) return;
    const sub = HomeworkStorageService.getSubmission(submissionId);
    if (!sub) {
      navigate('/homework');
      return;
    }
    setSubmission(sub);

    const assign = HomeworkStorageService.getAssignment(sub.assignmentId);
    if (assign) setAssignment(assign);

    const subs = HomeworkStorageService.getSubmissionsForAssignment(sub.assignmentId);
    // Sort leaderboard by score desc, then timeSpent asc
    subs.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return a.timeSpentSeconds - b.timeSpentSeconds;
    });
    setAllSubmissions(subs);
  }, [submissionId]);

  if (!submission || !assignment) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <span>Đang tải kết quả bài làm...</span>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs} giây`;
    return `${mins} phút ${secs} giây`;
  };

  const getGradeInfo = (pct: number) => {
    if (pct >= 90) return { label: 'Xuất Sắc', color: 'bg-emerald-500', text: 'text-emerald-500' };
    if (pct >= 80) return { label: 'Giỏi', color: 'bg-teal-500', text: 'text-teal-500' };
    if (pct >= 65) return { label: 'Khá', color: 'bg-indigo-500', text: 'text-indigo-500' };
    if (pct >= 50) return { label: 'Trung Bình', color: 'bg-amber-500', text: 'text-amber-500' };
    return { label: 'Cần Cố Gắng', color: 'bg-rose-500', text: 'text-rose-500' };
  };

  const gradeInfo = getGradeInfo(submission.percentage);

  // Count correct questions
  let correctCount = 0;
  assignment.questions.forEach((q) => {
    const earned = submission.scores[q.id] || 0;
    const max = q.points || 1;
    if (earned >= max * 0.7) correctCount++;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 print:p-0">
      {/* Top Navigation */}
      <div className="flex items-center justify-between print:hidden">
        <button
          onClick={() => navigate('/homework')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Về Cổng Bài Tập</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>In Kết Quả</span>
          </button>

          {assignment.allowRetake && (
            <button
              onClick={() => navigate(`/homework/do/${assignment.code}`)}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 flex items-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Làm Lại Bài</span>
            </button>
          )}
        </div>
      </div>

      {/* Hero Score Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 text-white p-6 sm:p-10 shadow-xl border border-indigo-500/20">
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-8 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-cyan-300 text-xs font-bold">
              <Trophy className="w-3.5 h-3.5" />
              <span>Kết Quả Bài Tập Tiếng Anh</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white">{assignment.title}</h1>

            <p className="text-xs text-indigo-200">
              Học sinh: <strong>{submission.studentName}</strong>
              {submission.studentClass && ` • Lớp: ${submission.studentClass}`}
              {` • Mã PIN: `}
              <span className="font-mono font-bold text-cyan-300">{submission.assignmentCode}</span>
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-cyan-300" />
                <span>Thời gian: {formatTime(submission.timeSpentSeconds)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>
                  Đúng: {correctCount}/{assignment.questions.length} câu
                </span>
              </div>
            </div>
          </div>

          {/* Big Score Circular Card */}
          <div className="md:col-span-4 flex justify-center md:justify-end">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 text-center space-y-1 w-48 shadow-2xl">
              <span className="text-[10px] uppercase font-bold text-indigo-200">Điểm tổng kết</span>
              <div className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                {submission.totalScore}
                <span className="text-lg font-bold text-indigo-200">/{submission.maxTotalScore}</span>
              </div>
              <div className="pt-2">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase text-white ${gradeInfo.color}`}>
                  {gradeInfo.label} ({submission.percentage}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-2 print:hidden">
        <button
          onClick={() => setActiveTab('review')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
            activeTab === 'review'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Xem Lại Chi Tiết & Giải Thích ({assignment.questions.length} câu)</span>
        </button>

        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
            activeTab === 'leaderboard'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Bảng Xếp Hạng Lớp ({allSubmissions.length} người)</span>
        </button>
      </div>

      {/* TAB 1: DETAILED QUESTION REVIEW */}
      {activeTab === 'review' && (
        <div className="space-y-6">
          {/* AI Essay Highlights if any */}
          {submission.aiEvaluations && Object.keys(submission.aiEvaluations).length > 0 && (
            <div className="bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-transparent p-5 rounded-3xl border border-purple-300 dark:border-purple-800/60 space-y-3">
              <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-extrabold text-sm">Nhận Xét Chấm Bài Tự Luận Bằng AI</h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Hệ thống AI đã phân tích câu tự luận của bạn về Ngữ pháp (Grammar), Vốn từ vựng (Vocabulary) và Tính mạch lạc (Coherence). Hãy xem chi tiết bên dưới để biết cách viết tự nhiên hơn!
              </p>
            </div>
          )}

          {/* List of questions */}
          {assignment.questions.map((q, idx) => {
            const studentAns = submission.answers[q.id];
            const earnedPoints = submission.scores[q.id] || 0;
            const maxPoints = q.points || 1;
            const isFullScore = earnedPoints >= maxPoints;
            const isPartial = earnedPoints > 0 && earnedPoints < maxPoints;
            const aiEval = submission.aiEvaluations?.[q.id];

            return (
              <div
                key={q.id || idx}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-sm space-y-5"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center text-white ${
                        isFullScore ? 'bg-emerald-600' : isPartial ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">
                      {q.type === 'MULTIPLE_CHOICE' && 'Trắc nghiệm 1 đáp án'}
                      {q.type === 'FILL_BLANK' && 'Điền từ vào chỗ trống'}
                      {q.type === 'WORD_REORDER' && 'Sắp xếp từ thành câu'}
                      {q.type === 'ESSAY' && 'Tự luận (AI Chấm Điểm)'}
                      {q.type === 'MATCHING' && 'Nối từ / Nối cặp'}
                      {q.type === 'ERROR_CORRECTION' && 'Tìm và sửa lỗi sai'}
                      {q.type === 'PRONUNCIATION' && 'Phát âm & Trọng âm'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-xl font-black text-xs ${
                        isFullScore
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : isPartial
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      +{earnedPoints} / {maxPoints} điểm
                    </span>
                  </div>
                </div>

                {/* Prompt */}
                <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
                  {q.prompt}
                </div>

                {/* Question Review by Type */}
                {/* 1. MCQ Review */}
                {(q.type === 'MULTIPLE_CHOICE' || q.type === 'PRONUNCIATION') && q.options && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {q.options.map((opt, oIdx) => {
                      const isCorrect = q.correctOptionIndex === oIdx;
                      const isChosen = studentAns === oIdx;

                      let style = 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
                      if (isCorrect) {
                        style = 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-500 text-emerald-950 dark:text-emerald-200 font-bold';
                      } else if (isChosen && !isCorrect) {
                        style = 'bg-rose-50 dark:bg-rose-950/70 border-rose-500 text-rose-950 dark:text-rose-200 line-through';
                      }

                      return (
                        <div
                          key={oIdx}
                          className={`p-3 rounded-2xl border flex items-center justify-between gap-2 text-xs transition ${style}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center font-bold text-[10px]">
                              {String.fromCharCode(65 + oIdx)}
                            </span>
                            <span>{opt}</span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 text-[11px]">
                            {isChosen && !isCorrect && <span className="text-rose-600 font-bold">(Bạn chọn)</span>}
                            {isCorrect && (
                              <span className="text-emerald-600 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" /> (Đáp án đúng)
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 2. Fill Blank Review */}
                {q.type === 'FILL_BLANK' && (
                  <div className="space-y-2 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
                    <div className="text-slate-500">
                      Câu hỏi: <strong>{q.sentenceWithBlanks}</strong>
                    </div>
                    <div>
                      Câu trả lời của bạn:{' '}
                      <strong className={isFullScore ? 'text-emerald-600' : 'text-rose-600'}>
                        {studentAns || '(Chưa điền)'}
                      </strong>
                    </div>
                    <div className="text-emerald-600 font-bold">
                      Đáp án đúng được chấp nhận: {(q.acceptedAnswers || []).join(', ')}
                    </div>
                  </div>
                )}

                {/* 3. Word Reorder Review */}
                {q.type === 'WORD_REORDER' && (
                  <div className="space-y-2 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
                    <div>
                      Câu bạn đã ghép:{' '}
                      <strong className={isFullScore ? 'text-emerald-600' : 'text-rose-600'}>
                        {studentAns || '(Chưa ghép)'}
                      </strong>
                    </div>
                    <div className="text-emerald-600 font-bold">Câu chuẩn: {q.correctSentence}</div>
                  </div>
                )}

                {/* 4. Essay Review with AI Evaluation */}
                {q.type === 'ESSAY' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
                      <p className="font-bold text-slate-500 mb-1">Bài viết của bạn:</p>
                      <p className="text-slate-800 dark:text-slate-200 italic leading-relaxed whitespace-pre-wrap">
                        {studentAns || '(Không có nội dung)'}
                      </p>
                    </div>

                    {/* AI Evaluation Box */}
                    {aiEval && (
                      <div className="p-5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4" />
                            <span>Đánh Giá Chi Tiết Từ AI</span>
                          </span>
                          <span className="font-black text-xs text-purple-700 dark:text-purple-300">
                            Điểm AI: {aiEval.score} / {aiEval.maxScore}
                          </span>
                        </div>

                        {/* Breakdown */}
                        <div className="grid grid-cols-3 gap-2 text-center text-[11px] bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-purple-100 dark:border-purple-900">
                          <div>
                            <span className="text-slate-400 block font-semibold">Ngữ Pháp</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{aiEval.grammarScore} đ</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-semibold">Từ Vựng</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{aiEval.vocabScore} đ</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-semibold">Tính Mạch Lạc</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{aiEval.coherenceScore} đ</span>
                          </div>
                        </div>

                        {/* Feedback */}
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                          {aiEval.feedback}
                        </p>

                        {/* Suggested Improvement */}
                        {aiEval.suggestedImprovement && (
                          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-purple-100 dark:border-purple-900 text-xs">
                            <span className="font-bold text-purple-600 block mb-1">
                              Gợi ý viết lại tự nhiên hơn:
                            </span>
                            <p className="text-slate-600 dark:text-slate-300 italic leading-relaxed">
                              &ldquo;{aiEval.suggestedImprovement}&rdquo;
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Explanation Box */}
                {q.explanation && (
                  <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-xs space-y-1">
                    <span className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Giải thích ngữ pháp chi tiết:</span>
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {q.explanation}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: LEADERBOARD */}
      {activeTab === 'leaderboard' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <span>Bảng Xếp Hạng Bài Tập</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Vinh danh những học sinh đạt điểm cao nhất theo bài tập này
              </p>
            </div>
            <span className="text-xs font-bold text-slate-400">{allSubmissions.length} người tham gia</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4 text-center">Hạng</th>
                  <th className="py-3 px-4">Họ Và Tên</th>
                  <th className="py-3 px-4">Lớp</th>
                  <th className="py-3 px-4">Điểm Số</th>
                  <th className="py-3 px-4">Tỷ Lệ</th>
                  <th className="py-3 px-4">Thời Gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {allSubmissions.map((sub, rankIdx) => {
                  const isCurrent = sub.id === submission.id;
                  return (
                    <tr
                      key={sub.id}
                      className={`transition ${
                        isCurrent
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/60 font-bold'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3 px-4 text-center">
                        {rankIdx === 0 ? (
                          <span className="inline-block w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-xs leading-6">
                            🥇
                          </span>
                        ) : rankIdx === 1 ? (
                          <span className="inline-block w-6 h-6 rounded-full bg-slate-300 text-slate-950 font-black text-xs leading-6">
                            🥈
                          </span>
                        ) : rankIdx === 2 ? (
                          <span className="inline-block w-6 h-6 rounded-full bg-amber-700 text-white font-black text-xs leading-6">
                            🥉
                          </span>
                        ) : (
                          <span className="font-bold text-slate-400">#{rankIdx + 1}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-900 dark:text-slate-100">
                        {sub.studentName}
                        {isCurrent && (
                          <span className="ml-2 px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                            Bạn
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{sub.studentClass || '-'}</td>
                      <td className="py-3 px-4 font-black text-slate-900 dark:text-slate-100 text-sm">
                        {sub.totalScore} / {sub.maxTotalScore}
                      </td>
                      <td className="py-3 px-4 font-bold text-indigo-600 dark:text-indigo-400">{sub.percentage}%</td>
                      <td className="py-3 px-4 text-slate-500">{formatTime(sub.timeSpentSeconds)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
