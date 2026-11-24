import React from 'react';
import { EducationLevelId } from '../types/homework';

export interface EducationLevelMeta {
  id: EducationLevelId;
  label: string;
  shortLabel: string;
  cefr: string;
  description: string;
  emoji: string;
  badgeClass: string;
  activeTabClass: string;
}

export const EDUCATION_LEVELS: EducationLevelMeta[] = [
  {
    id: 'MAM_NON',
    label: 'Mầm non',
    shortLabel: 'Mầm non',
    cefr: 'Pre-A1',
    description: 'Làm quen bảng chữ cái, số đếm, màu sắc, chào hỏi & từ vựng quen thuộc',
    emoji: '🌱',
    badgeClass: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/60 dark:text-pink-300 dark:border-pink-800/70',
    activeTabClass: 'bg-pink-600 text-white border-pink-600',
  },
  {
    id: 'TIEU_HOC',
    label: 'Tiểu học',
    shortLabel: 'Tiểu học',
    cefr: 'A1',
    description: 'Động từ To Be, mạo từ a/an/the, Hiện tại đơn & Hiện tại tiếp diễn',
    emoji: '📘',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/70',
    activeTabClass: 'bg-sky-600 text-white border-sky-600',
  },
  {
    id: 'THCS',
    label: 'THCS (Lớp 6–9)',
    shortLabel: 'THCS',
    cefr: 'A2–B1',
    description: 'Quá khứ, Tương lai, So sánh, Modals, Hiện tại hoàn thành & Bị động',
    emoji: '📗',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/70',
    activeTabClass: 'bg-emerald-600 text-white border-emerald-600',
  },
  {
    id: 'THPT',
    label: 'THPT (Lớp 10–12)',
    shortLabel: 'THPT',
    cefr: 'B1–B2',
    description: '12 Thì & phối hợp thì, Câu điều kiện, Mệnh đề quan hệ, Ngữ âm & Phrasal Verbs',
    emoji: '📙',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/70',
    activeTabClass: 'bg-amber-600 text-white border-amber-600',
  },
  {
    id: 'DAI_HOC',
    label: 'Đại học & IELTS',
    shortLabel: 'Đại học',
    cefr: 'C1–C2',
    description: 'Đảo ngữ, Giả định, Câu chẻ, Đọc hiểu học thuật & Viết luận IELTS',
    emoji: '🎓',
    badgeClass: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800/70',
    activeTabClass: 'bg-violet-600 text-white border-violet-600',
  },
];

export const EDUCATION_LEVEL_MAP: Record<EducationLevelId, EducationLevelMeta> = EDUCATION_LEVELS.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<EducationLevelId, EducationLevelMeta>
);

export const EducationLevelBadge: React.FC<{ levelId?: EducationLevelId }> = ({ levelId }) => {
  if (!levelId || !EDUCATION_LEVEL_MAP[levelId]) return null;
  const meta = EDUCATION_LEVEL_MAP[levelId];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold ${meta.badgeClass}`}
    >
      <span>{meta.emoji}</span>
      <span>{meta.shortLabel}</span>
      <span className="opacity-70">• {meta.cefr}</span>
    </span>
  );
};
