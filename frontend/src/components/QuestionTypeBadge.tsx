import React from 'react';
import {
  CheckSquare,
  ListChecks,
  TextCursorInput,
  PenTool,
  Link2,
  Shuffle,
  AlertTriangle,
  BookOpenText,
  Volume2,
  LucideIcon,
} from 'lucide-react';
import { HomeworkQuestionType } from '../types/homework';

export interface QuestionTypeMeta {
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  badgeClass: string;
  accentBg: string;
}

export const QUESTION_TYPE_META: Record<HomeworkQuestionType, QuestionTypeMeta> = {
  MULTIPLE_CHOICE: {
    label: 'Trắc nghiệm 1 đáp án',
    shortLabel: 'Trắc nghiệm',
    icon: CheckSquare,
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60',
    accentBg: 'bg-blue-600',
  },
  MULTI_SELECT: {
    label: 'Trắc nghiệm nhiều đáp án',
    shortLabel: 'Nhiều đáp án',
    icon: ListChecks,
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/60',
    accentBg: 'bg-sky-600',
  },
  FILL_BLANK: {
    label: 'Điền từ vào chỗ trống',
    shortLabel: 'Điền từ',
    icon: TextCursorInput,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
    accentBg: 'bg-emerald-600',
  },
  WORD_REORDER: {
    label: 'Sắp xếp từ thành câu',
    shortLabel: 'Sắp xếp câu',
    icon: Shuffle,
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200/80 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800/60',
    accentBg: 'bg-teal-600',
  },
  MATCHING: {
    label: 'Nối từ / Nối cặp',
    shortLabel: 'Nối từ',
    icon: Link2,
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
    accentBg: 'bg-amber-600',
  },
  ERROR_CORRECTION: {
    label: 'Tìm & Sửa lỗi sai',
    shortLabel: 'Sửa lỗi sai',
    icon: AlertTriangle,
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60',
    accentBg: 'bg-rose-600',
  },
  PRONUNCIATION: {
    label: 'Phát âm & Trọng âm',
    shortLabel: 'Phát âm',
    icon: Volume2,
    badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200/80 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800/60',
    accentBg: 'bg-cyan-600',
  },
  READING_COMPREHENSION: {
    label: 'Đọc hiểu đoạn văn',
    shortLabel: 'Đọc hiểu',
    icon: BookOpenText,
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200/80 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/60',
    accentBg: 'bg-orange-600',
  },
  ESSAY: {
    label: 'Tự luận (AI chấm điểm)',
    shortLabel: 'Tự luận AI',
    icon: PenTool,
    badgeClass: 'bg-violet-50 text-violet-700 border-violet-200/80 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800/60',
    accentBg: 'bg-violet-600',
  },
};

export const QuestionTypeBadge: React.FC<{
  type: HomeworkQuestionType;
  compact?: boolean;
}> = ({ type, compact = false }) => {
  const meta = QUESTION_TYPE_META[type] || QUESTION_TYPE_META.MULTIPLE_CHOICE;
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold tracking-tight ${meta.badgeClass}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{compact ? meta.shortLabel : meta.label}</span>
    </span>
  );
};

export const DifficultyBadge: React.FC<{ difficulty: 'EASY' | 'MEDIUM' | 'HARD' }> = ({ difficulty }) => {
  const map = {
    EASY: {
      label: 'Cơ bản',
      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
    },
    MEDIUM: {
      label: 'Trung bình',
      cls: 'bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
    },
    HARD: {
      label: 'Nâng cao',
      cls: 'bg-rose-50 text-rose-700 border-rose-200/70 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60',
    },
  };
  const info = map[difficulty] || map.MEDIUM;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-bold ${info.cls}`}>
      {info.label}
    </span>
  );
};
