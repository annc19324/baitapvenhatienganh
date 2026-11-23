import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Trash2,
  ArrowLeft,
  Save,
  BookOpen,
} from 'lucide-react';
import { HomeworkQuestion, HomeworkQuestionType, HomeworkAssignment } from '../types/homework';
import { HomeworkStorageService, generatePinCode } from '../services/homeworkStorage';
import { useToast } from '../context/ToastContext';
import { QUESTION_TYPE_META, QuestionTypeBadge } from '../components/QuestionTypeBadge';

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
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(15);
  const [code] = useState(() => generatePinCode());
  const [questions, setQuestions] = useState<HomeworkQuestion[]>([]);

  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);

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

  const handleDeleteQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!title.trim()) {
      showToast({ message: 'Vui lòng nhập tiêu đề bài tập', type: 'error' });
      return;
    }
    if (questions.length === 0) {
      showToast({ message: 'Hãy thêm ít nhất 1 câu hỏi', type: 'error' });
      return;
    }

    const assignment: HomeworkAssignment = {
      id: `hw-${Date.now()}`,
      code,
      title: title.trim(),
      description: '',
      subject: 'Tiếng Anh',
      topic: title.trim(),
      gradeLevel: 'Tiếng Anh',
      difficulty: 'MEDIUM',
      timeLimitMinutes: Math.max(0, Number(timeLimitMinutes) || 0),
      shuffleQuestions: false,
      showResultsImmediately: true,
      allowRetake: true,
      createdByName: 'Giáo viên',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'ACTIVE',
      questions,
      totalPoints,
    };

    HomeworkStorageService.saveAssignment(assignment);
    showToast({
      message: 'Đã lưu bài tập thành công!',
      subMessage: `Mã PIN để học sinh làm bài: ${assignment.code}`,
      type: 'success',
    });
    navigate('/homework');
  };

  return (
    <div className="space-y-6 pb-20 sm:pb-8 animate-fade-in">
      {/* ================= HEADER ================= */}
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/homework')}
            aria-label="Quay lại"
            className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white truncate">
              Tạo Bài Tập Mới
            </h1>
            <p className="text-xs text-slate-500">
              Mã PIN: <strong className="font-mono text-blue-600 dark:text-blue-400">{code}</strong> • {questions.length} câu ({totalPoints}đ)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="hidden sm:inline-flex px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-glow-blue items-center gap-2 transition shrink-0"
        >
          <Save className="w-4 h-4" />
          <span>Lưu Bài Tập</span>
        </button>
      </div>

      {/* ================= BASIC INFO ================= */}
      <section className="surface-card rounded-2xl p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-12 gap-3.5">
        <div className="sm:col-span-8">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Tên bài tập <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            placeholder="VD: Bài tập Thì Hiện Tại Đơn - Lớp 8"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="sm:col-span-4">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Thời gian (phút, 0 = tự do)
          </label>
          <input
            type="number"
            min="0"
            max="180"
            value={timeLimitMinutes}
            onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </section>

      {/* ================= ADD QUESTION BY TYPE ================= */}
      <section className="surface-card rounded-2xl p-4 sm:p-5 space-y-3">
        <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
          Chọn dạng bài để thêm câu hỏi
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
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 text-center transition active:scale-95 hover:shadow-sm ${meta.badgeClass}`}
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
            <h3 className="text-sm font-extrabold text-slate-700 dark:text-slate-200">
              Chưa có câu hỏi nào
            </h3>
            <p className="text-xs text-slate-500">
              Chọn một dạng bài ở khung phía trên để bắt đầu thêm câu hỏi.
            </p>
          </div>
        ) : (
          questions.map((q, idx) => (
            <div key={q.id} className="surface-card rounded-2xl p-4 sm:p-5 space-y-4">
              {/* Card Header */}
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <QuestionTypeBadge type={q.type} compact />
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-xs text-slate-500">
                    <span>Điểm:</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="10"
                      value={q.points || 1}
                      onChange={(e) =>
                        updateQuestion(idx, (cur) => ({ ...cur, points: Number(e.target.value) }))
                      }
                      className="w-14 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-center text-slate-900 dark:text-white"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => handleDeleteQuestion(idx)}
                    aria-label="Xóa câu hỏi"
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Question Prompt */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Nội dung câu hỏi</label>
                <textarea
                  rows={2}
                  placeholder="Nhập đề câu hỏi..."
                  value={q.prompt}
                  onChange={(e) => updateQuestion(idx, (cur) => ({ ...cur, prompt: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* MULTIPLE_CHOICE & PRONUNCIATION */}
              {(q.type === 'MULTIPLE_CHOICE' || q.type === 'PRONUNCIATION') && q.options && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-500">
                    Các lựa chọn (bấm A/B/C/D để chọn đáp án đúng)
                  </label>
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
                </div>
              )}

              {/* FILL_BLANK */}
              {q.type === 'FILL_BLANK' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500">
                    Câu có từ cần điền đặt trong ngoặc vuông <code className="font-mono">[từ_đúng]</code>
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
                  <p className="text-xs text-slate-500">
                    Đáp án đúng:{' '}
                    <strong className="text-emerald-600 dark:text-emerald-400">
                      {(q.acceptedAnswers || []).join(', ') || 'Chưa đặt trong [ ]'}
                    </strong>
                  </p>
                </div>
              )}

              {/* WORD_REORDER */}
              {q.type === 'WORD_REORDER' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500">
                    Câu hoàn chỉnh đúng ngữ pháp (hệ thống tự tách và xáo trộn từ)
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

              {/* MATCHING */}
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
                      className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
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
                        placeholder="Vế phải tương ứng..."
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

              {/* ERROR_CORRECTION */}
              {q.type === 'ERROR_CORRECTION' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Câu chứa 4 vị trí (A), (B), (C), (D)
                    </label>
                    <input
                      type="text"
                      value={q.sentence || ''}
                      onChange={(e) => updateQuestion(idx, (cur) => ({ ...cur, sentence: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-xs font-semibold"
                    />
                  </div>

                  {q.errorOptions && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {q.errorOptions.map((eo, eIdx) => (
                        <div key={eo.label} className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5">
                          <span className="font-extrabold text-xs text-slate-500">({eo.label})</span>
                          <input
                            type="text"
                            value={eo.text}
                            onChange={(e) =>
                              updateQuestion(idx, (cur) => {
                                const list = [...(cur.errorOptions || [])];
                                list[eIdx] = { ...list[eIdx], text: e.target.value };
                                return { ...cur, errorOptions: list };
                              })
                            }
                            className="w-full bg-transparent text-xs font-semibold focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Vị trí sai</label>
                      <select
                        value={q.correctOption || 'A'}
                        onChange={(e) =>
                          updateQuestion(idx, (cur) => ({
                            ...cur,
                            correctOption: e.target.value as 'A' | 'B' | 'C' | 'D',
                          }))
                        }
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                      >
                        <option value="A">Đáp án A</option>
                        <option value="B">Đáp án B</option>
                        <option value="C">Đáp án C</option>
                        <option value="D">Đáp án D</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Từ sửa đúng</label>
                      <input
                        type="text"
                        value={q.correction || ''}
                        onChange={(e) => updateQuestion(idx, (cur) => ({ ...cur, correction: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ESSAY */}
              {q.type === 'ESSAY' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Bài viết mẫu tham khảo (tùy chọn)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Nhập đoạn văn mẫu để học sinh tham khảo sau khi nộp..."
                    value={q.sampleAnswer || ''}
                    onChange={(e) => updateQuestion(idx, (cur) => ({ ...cur, sampleAnswer: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-xs"
                  />
                </div>
              )}

              {/* Short Explanation */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Giải thích đáp án (tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="Giải thích ngắn gọn hiển thị sau khi nộp bài..."
                  value={q.explanation || ''}
                  onChange={(e) => updateQuestion(idx, (cur) => ({ ...cur, explanation: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-xs"
                />
              </div>
            </div>
          ))
        )}
      </section>

      {/* ================= MOBILE FIXED SAVE BAR (< sm) ================= */}
      <div className="sm:hidden fixed bottom-16 inset-x-0 z-30 glass-bar border-t px-4 py-2.5">
        <button
          type="button"
          onClick={handleSave}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl shadow-glow-blue flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          <span>Lưu Bài Tập ({questions.length} câu)</span>
        </button>
      </div>
    </div>
  );
};
