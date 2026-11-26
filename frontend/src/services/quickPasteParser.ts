/**
 * Quick-Paste Parser — converts raw pasted text into HomeworkQuestion objects.
 *
 * Supported formats:
 *
 * ── MCQ / Multi-select ──────────────────────────────────────────
 * Đề bài câu N:          (or just the prompt text, followed by options)
 * A. Option text
 * *B. Option text        ← asterisk marks correct answer(s)
 * C. Option text
 * D. Option text
 * (blank line separates questions)
 *
 * ── Fill-in-the-blank ───────────────────────────────────────────
 * [ĐIỀN] She [has worked] here for [five] years.
 * (words in [] are the accepted answers; they're hidden from the student)
 *
 * ── Matching ────────────────────────────────────────────────────
 * [NỐI]
 * Give up :: Từ bỏ
 * Break down :: Hỏng hóc
 *
 * ── Word Reorder ────────────────────────────────────────────────
 * [SẮP XẾP] English is spoken globally.
 * (The sentence is auto-shuffled for the student)
 *
 * ── Error Correction ────────────────────────────────────────────
 * [SỬA LỖI] She (A)don't (B)like (C)apples (D)very much.
 * ĐÁP ÁN: A -> doesn't
 *
 * ── Essay ───────────────────────────────────────────────────────
 * [TỰ LUẬN] Write about your hobby. (tối thiểu: 40 tối đa: 100)
 * (or min:40 max:100 in English)
 */

import type { HomeworkQuestion } from '../types/homework';

let _qIdx = 0;
function newId(): string {
  return `qp-${Date.now()}-${++_qIdx}`;
}

type ParsedQuestion = HomeworkQuestion;

/** Main entry point */
export function parseQuickPaste(raw: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];

  // Split by one or more blank lines
  const blocks = raw
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;

    const firstUpper = lines[0].toUpperCase();

    if (firstUpper.startsWith('[ĐIỀN]') || firstUpper.startsWith('[DIEN]') || firstUpper.startsWith('[FILL]')) {
      questions.push(parseFillBlank(lines));
    } else if (firstUpper.startsWith('[NỐI]') || firstUpper.startsWith('[NOI]') || firstUpper.startsWith('[MATCH]')) {
      questions.push(parseMatching(lines));
    } else if (firstUpper.startsWith('[SẮP XẾP]') || firstUpper.startsWith('[SAP XEP]') || firstUpper.startsWith('[REORDER]')) {
      questions.push(parseWordReorder(lines));
    } else if (firstUpper.startsWith('[SỬA LỖI]') || firstUpper.startsWith('[SUA LOI]') || firstUpper.startsWith('[ERROR]')) {
      questions.push(parseErrorCorrection(lines));
    } else if (firstUpper.startsWith('[TỰ LUẬN]') || firstUpper.startsWith('[TU LUAN]') || firstUpper.startsWith('[ESSAY]')) {
      questions.push(parseEssay(lines));
    } else {
      // Default: MCQ / Multi-select
      const mcq = parseMcq(lines);
      if (mcq) questions.push(mcq);
    }
  }

  return questions;
}

// ─── MCQ ──────────────────────────────────────────────────────────────────

function parseMcq(lines: string[]): ParsedQuestion | null {
  // First line = prompt (may start with "Câu N:" or "Đề bài câu N:")
  let promptLine = lines[0];
  promptLine = promptLine.replace(/^(đề bài\s+)?câu\s+\d+\s*[:.]\s*/i, '').trim();

  const options: string[] = [];
  const correctIndices: number[] = [];

  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    const isCorrect = raw.startsWith('*');
    // Strip leading * then option label like "A.", "A)", "A "
    const cleaned = raw.replace(/^\*/, '').replace(/^[A-Za-z][.)]\s*/, '').trim();
    if (!cleaned) continue;
    if (isCorrect) correctIndices.push(options.length);
    options.push(cleaned);
  }

  if (!options.length) return null;

  const isMulti = correctIndices.length > 1;

  if (isMulti) {
    return {
      id: newId(),
      type: 'MULTI_SELECT',
      prompt: promptLine,
      options,
      correctOptionIndices: correctIndices,
      points: 1,
      explanation: '',
    } as any;
  }

  return {
    id: newId(),
    type: 'MULTIPLE_CHOICE',
    prompt: promptLine,
    options,
    correctOptionIndex: correctIndices[0] ?? 0,
    points: 1,
    explanation: '',
  };
}

// ─── Fill-blank ───────────────────────────────────────────────────────────

function parseFillBlank(lines: string[]): ParsedQuestion {
  // First line contains the sentence with [answer] markers
  const raw = lines[0].replace(/^\[(?:ĐIỀN|DIEN|FILL)\]\s*/i, '');
  const acceptedAnswers: string[] = [];
  const sentenceWithBlanks = raw.replace(/\[([^\]]+)\]/g, (_: string, ans: string) => {
    acceptedAnswers.push(ans.trim());
    return `[${ans.trim()}]`; // keep the marker
  });
  return {
    id: newId(),
    type: 'FILL_BLANK',
    prompt: 'Điền từ thích hợp vào chỗ trống.',
    sentenceWithBlanks,
    acceptedAnswers,
    points: 1,
    explanation: '',
  };
}

// ─── Matching ─────────────────────────────────────────────────────────────

function parseMatching(lines: string[]): ParsedQuestion {
  const pairs: { left: string; right: string }[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split('::');
    if (parts.length >= 2) {
      pairs.push({ left: parts[0].trim(), right: parts.slice(1).join('::').trim() });
    }
  }
  return {
    id: newId(),
    type: 'MATCHING',
    prompt: 'Nối cột A với cột B.',
    pairs,
    points: 1,
    explanation: '',
  };
}

// ─── Word Reorder ─────────────────────────────────────────────────────────

function parseWordReorder(lines: string[]): ParsedQuestion {
  const sentence = lines[0].replace(/^\[(?:SẮP XẾP|SAP XEP|REORDER)\]\s*/i, '');
  const words = sentence.split(/\s+/).filter(Boolean);
  // Shuffle words for display (Fisher-Yates)
  const shuffled = [...words];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return {
    id: newId(),
    type: 'WORD_REORDER',
    prompt: 'Sắp xếp các từ thành câu hoàn chỉnh.',
    words: shuffled,
    correctSentence: sentence,
    points: 1,
    explanation: '',
  };
}

// ─── Error Correction ─────────────────────────────────────────────────────

function parseErrorCorrection(lines: string[]): ParsedQuestion {
  const sentenceLine = lines[0].replace(/^\[(?:SỬA LỖI|SUA LOI|ERROR)\]\s*/i, '');
  // Parse "(A)word (B)word ..." → errorOptions
  const errorOptions: { label: 'A' | 'B' | 'C' | 'D'; text: string }[] = [];
  const optionRegex = /\(([A-D])\)(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = optionRegex.exec(sentenceLine)) !== null) {
    errorOptions.push({ label: m[1] as 'A' | 'B' | 'C' | 'D', text: m[2] });
  }

  let correctOption: 'A' | 'B' | 'C' | 'D' | undefined;
  let correction = '';
  // Look for "ĐÁP ÁN: A -> word" or "ANSWER: A -> word"
  for (let i = 1; i < lines.length; i++) {
    const answerMatch = lines[i].match(/(?:ĐÁP ÁN|ANSWER)\s*:\s*([A-D])\s*->\s*(.+)/i);
    if (answerMatch) {
      correctOption = answerMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
      correction = answerMatch[2].trim();
    }
  }

  return {
    id: newId(),
    type: 'ERROR_CORRECTION',
    prompt: 'Tìm và sửa lỗi sai trong câu.',
    sentence: sentenceLine,
    errorOptions,
    correctOption,
    correction,
    points: 1,
    explanation: '',
  };
}

// ─── Essay ────────────────────────────────────────────────────────────────

function parseEssay(lines: string[]): ParsedQuestion {
  let promptText = lines[0].replace(/^\[(?:TỰ LUẬN|TU LUAN|ESSAY)\]\s*/i, '');
  let minWords = 40;
  let maxWords = 200;
  // Extract "(tối thiểu: 40 tối đa: 100)" or "(min:40 max:100)"
  const minMaxMatch = promptText.match(/\((?:tối thiểu|min)\s*:\s*(\d+)\s*(?:tối đa|max)\s*:\s*(\d+)\)/i);
  if (minMaxMatch) {
    minWords = parseInt(minMaxMatch[1], 10);
    maxWords = parseInt(minMaxMatch[2], 10);
    promptText = promptText.replace(minMaxMatch[0], '').trim();
  }
  return {
    id: newId(),
    type: 'ESSAY',
    prompt: promptText,
    minWords,
    maxWords,
    points: 2,
    explanation: '',
  };
}
