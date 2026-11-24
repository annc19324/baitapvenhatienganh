import React from 'react';
import { BookOpen, X, Lightbulb, Play, CheckCircle2 } from 'lucide-react';
import { HomeworkAssignment } from '../types/homework';
import { EducationLevelBadge } from './EducationLevelBadge';

interface TheoryModalProps {
  assignment: HomeworkAssignment | null;
  onClose: () => void;
  onStartPractice?: (assignment: HomeworkAssignment) => void;
}

export const TheoryModal: React.FC<TheoryModalProps> = ({
  assignment,
  onClose,
  onStartPractice,
}) => {
  if (!assignment || !assignment.theory) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/65 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 w-full sm:max-w-2xl max-h-[92vh] rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col shadow-elevated overflow-hidden animate-sheet-up sm:animate-slide-up"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3 shrink-0">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-mono font-extrabold text-xs border border-blue-200/80 dark:border-blue-800">
                {assignment.code}
              </span>
              <EducationLevelBadge levelId={assignment.levelId} />
            </div>
            <h2 className="font-extrabold text-base sm:text-xl text-slate-900 dark:text-white leading-snug">
              {assignment.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng lý thuyết"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Summary */}
          <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/70 flex items-start gap-3">
            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm font-medium text-blue-950 dark:text-blue-100 leading-relaxed">
              {assignment.theory.summary}
            </p>
          </div>

          {/* Sections */}
          {assignment.theory.sections.map((sec, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 sm:p-5 space-y-3.5"
            >
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                {sec.heading}
              </h3>

              {sec.formula && (
                <div className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-blue-200/80 dark:border-blue-900/70 font-mono text-xs sm:text-sm font-bold text-blue-700 dark:text-blue-300 leading-relaxed overflow-x-auto">
                  {sec.formula}
                </div>
              )}

              <ul className="space-y-2">
                {sec.points.map((pt, pIdx) => (
                  <li
                    key={pIdx}
                    className="flex items-start gap-2 text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed"
                  >
                    <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>

              {sec.examples && sec.examples.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                    Ví dụ minh họa
                  </p>
                  <div className="space-y-1.5">
                    {sec.examples.map((ex, eIdx) => (
                      <div
                        key={eIdx}
                        className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 text-xs sm:text-sm"
                      >
                        <span className="font-bold text-slate-900 dark:text-white block">{ex.en}</span>
                        <span className="text-slate-500 dark:text-slate-400 text-xs">→ {ex.vi}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sec.tip && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/70 flex items-start gap-2 text-xs font-semibold text-amber-900 dark:text-amber-200 leading-relaxed">
                  <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span>{sec.tip}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Sticky Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 shrink-0 pb-safe">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs"
          >
            Đóng lại
          </button>

          {onStartPractice && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onStartPractice(assignment);
              }}
              className="flex-1 sm:flex-none px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm shadow-glow-blue flex items-center justify-center gap-2 transition"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Làm Bài Tập Ngay ({assignment.questions.length} câu)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
