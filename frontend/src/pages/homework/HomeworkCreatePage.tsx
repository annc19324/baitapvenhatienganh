import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  Layers,
  FileText,
  Plus,
  Trash2,
  Copy,
  ArrowLeft,
  Save,
  CheckCircle2,
  Eye,
  Sliders,
  AlertCircle,
  HelpCircle,
  Clock,
  Shuffle,
  Shield,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { HomeworkQuestion, HomeworkQuestionType, HomeworkAssignment } from '../../types/homework';
import { HomeworkAiService } from '../../services/homework/homeworkAi';
import { HomeworkStorageService, generatePinCode } from '../../services/homework/homeworkStorage';
import { PRESET_TEMPLATES } from '../../services/homework/homeworkPresets';
import { useToast } from '../../context/ToastContext';

export const HomeworkCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const templateParam = searchParams.get('template');

  // Creation Mode: 'ai' | 'paste' | 'manual'
  const [mode, setMode] = useState<'ai' | 'paste' | 'manual'>('ai');
  const [isPreview, setIsPreview] = useState(false);

  // AI Generator Form States
  const [aiTopic, setAiTopic] = useState('12 Thì trong tiếng Anh (English Tenses)');
  const [aiGrade, setAiGrade] = useState('Lớp 10-12 / B1-B2');
  const [aiDifficulty, setAiDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [aiCount, setAiCount] = useState(5);
  const [aiSelectedTypes, setAiSelectedTypes] = useState<HomeworkQuestionType[]>([
    'MULTIPLE_CHOICE',
    'FILL_BLANK',
    'WORD_REORDER',
    'ESSAY',
  ]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Paste Form State
  const [pasteText, setPasteText] = useState('');

  // Assignment Core Metadata
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState(generatePinCode());
  const [subject] = useState('Tiếng Anh');
  const [topic, setTopic] = useState('');
  const [gradeLevel, setGradeLevel] = useState('Lớp 10-12 / B1-B2');
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(20);
  const [deadline, setDeadline] = useState('');
  const [password, setPassword] = useState('');
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [showResultsImmediately, setShowResultsImmediately] = useState(true);
  const [allowRetake, setAllowRetake] = useState(true);
  const [questions, setQuestions] = useState<HomeworkQuestion[]>([]);

  // Load from template if parameter provided
  useEffect(() => {
    if (templateParam) {
      const found = PRESET_TEMPLATES.find((t) => t.id === templateParam);
      if (found) {
        setTitle(found.title);
        setDescription(found.description);
        setTopic(found.topic);
        setGradeLevel(found.gradeLevel);
        setDifficulty(found.difficulty);
        setTimeLimitMinutes(found.timeLimitMinutes);
        setQuestions(JSON.parse(JSON.stringify(found.questions)));
        setMode('manual');
        showToast({ message: 'Đã tải mẫu bài tập thành công', type: 'info' });
      }
    }
  }, [templateParam]);

  const quickTopicSuggestions = [
    '12 Thì trong tiếng Anh (Tenses Master)',
    'Câu Bị Động & Chuyển Đổi Câu (Passive Voice)',
    'Câu Điều Kiện Loại 1, 2, 3 (Conditionals)',
    'Cụm Động Từ & Giới Từ Thông Dụng (Phrasal Verbs)',
    'Mệnh Đề Quan Hệ (Relative Clauses)',
    'Phát Âm & Trọng Âm Chuẩn THPTQG (Pronunciation & Stress)',
    'Từ Vựng IELTS Band 6.5 Chủ Đề Environment & Tech',
    'Luyện Viết Tự Luận: My Dream Job (AI Graded Essay)',
  ];

  const handleToggleType = (t: HomeworkQuestionType) => {
    if (aiSelectedTypes.includes(t)) {
      if (aiSelectedTypes.length === 1) return; // Keep at least one
      setAiSelectedTypes(aiSelectedTypes.filter((x) => x !== t));
    } else {
      setAiSelectedTypes([...aiSelectedTypes, t]);
    }
  };

  const handleGenerateAI = async () => {
    if (!aiTopic.trim()) {
      showToast({ message: 'Vui lòng nhập chủ đề bài tập', type: 'error' });
      return;
    }

    setIsGenerating(true);
    try {
      const generated = await HomeworkAiService.generateAssignment({
        topic: aiTopic,
        gradeLevel: aiGrade,
        difficulty: aiDifficulty,
        questionCount: aiCount,
        types: aiSelectedTypes,
      });

      if (generated && generated.length > 0) {
        setQuestions(generated);
        if (!title) setTitle(`Bài tập: ${aiTopic}`);
        if (!description) setDescription(`Bộ bài tập tiếng Anh chủ đề ${aiTopic} gồm ${generated.length} câu hỏi thuộc nhiều dạng bài.`);
        setTopic(aiTopic);
        setGradeLevel(aiGrade);
        setDifficulty(aiDifficulty);
        setMode('manual'); // Switch to editor mode so user can review/edit
        showToast({
          message: '✨ Tạo bài tập bằng AI thành công!',
          subMessage: `Đã sinh ${generated.length} câu hỏi phong phú kèm đáp án và giải thích.`,
          type: 'success',
        });
      } else {
        showToast({ message: 'Không thể tạo câu hỏi, vui lòng thử lại', type: 'error' });
      }
    } catch (err: any) {
      showToast({ message: 'Lỗi khi tạo bài tập', subMessage: err.message, type: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleParseText = () => {
    if (!pasteText.trim()) {
      showToast({ message: 'Vui lòng nhập văn bản đề thi', type: 'error' });
      return;
    }

    const parsed = HomeworkAiService.parseRawText(pasteText);
    if (parsed.length > 0) {
      setQuestions([...questions, ...parsed]);
      if (!title) setTitle('Bài tập Tiếng Anh từ văn bản nhập nhanh');
      setMode('manual');
      showToast({
        message: 'Phân tích văn bản thành công',
        subMessage: `Đã thêm ${parsed.length} câu hỏi vào đề bài.`,
        type: 'success',
      });
    } else {
      showToast({
        message: 'Chưa nhận diện được câu hỏi',
        subMessage: 'Hãy kiểm tra lại cú pháp (Ví dụ: 1. Câu hỏi? A. ... B. ...)',
        type: 'error',
      });
    }
  };

  const handleAddQuestion = (type: HomeworkQuestionType) => {
    const newId = `manual-q-${Date.now()}`;
    let newQ: HomeworkQuestion = {
      id: newId,
      type,
      prompt: 'Nhập nội dung câu hỏi mới tại đây...',
      points: 1,
      explanation: 'Giải thích chi tiết ngữ pháp tại sao đáp án này đúng.',
    };

    if (type === 'MULTIPLE_CHOICE' || type === 'PRONUNCIATION') {
      newQ.options = ['Lựa chọn A', 'Lựa chọn B', 'Lựa chọn C', 'Lựa chọn D'];
      newQ.correctOptionIndex = 0;
    } else if (type === 'FILL_BLANK') {
      newQ.sentenceWithBlanks = 'She is interested [in] learning foreign languages.';
      newQ.acceptedAnswers = ['in'];
    } else if (type === 'ESSAY') {
      newQ.prompt = 'Write a short paragraph (50 - 90 words) expressing your opinion on this topic.';
      newQ.minWords = 40;
      newQ.maxWords = 100;
      newQ.sampleAnswer = 'Sample model answer for students to learn from.';
      newQ.points = 2;
    } else if (type === 'MATCHING') {
      newQ.pairs = [
        { left: 'Call off', right: 'Cancel' },
        { left: 'Look forward to', right: 'Anticipate eagerly' },
      ];
      newQ.points = 2;
    } else if (type === 'WORD_REORDER') {
      newQ.words = ['English', 'is', 'very', 'useful.'];
      newQ.correctSentence = 'English is very useful.';
      newQ.points = 1.5;
    } else if (type === 'ERROR_CORRECTION') {
      newQ.sentence = 'She (A) go (B) to (C) school (D) yesterday.';
      newQ.errorOptions = [
        { label: 'A', text: 'go' },
        { label: 'B', text: 'to' },
        { label: 'C', text: 'school' },
        { label: 'D', text: 'yesterday' },
      ];
      newQ.correctOption = 'A';
      newQ.correction = 'went';
      newQ.points = 1.5;
    }

    setQuestions([...questions, newQ]);
    showToast({ message: 'Đã thêm câu hỏi mới', type: 'info' });
  };

  const handleDeleteQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleDuplicateQuestion = (index: number) => {
    const target = questions[index];
    const dup: HomeworkQuestion = {
      ...JSON.parse(JSON.stringify(target)),
      id: `dup-q-${Date.now()}`,
    };
    const next = [...questions];
    next.splice(index + 1, 0, dup);
    setQuestions(next);
  };

  const handleSaveAssignment = () => {
    if (!title.trim()) {
      showToast({ message: 'Vui lòng nhập tiêu đề bài tập', type: 'error' });
      return;
    }
    if (questions.length === 0) {
      showToast({ message: 'Đề bài cần có ít nhất 1 câu hỏi', type: 'error' });
      return;
    }

    const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);

    const assignment: HomeworkAssignment = {
      id: `hw-${Date.now()}`,
      code: code.trim().toUpperCase() || generatePinCode(),
      title,
      description,
      subject,
      topic: topic || 'Tổng hợp kiến thức',
      gradeLevel,
      difficulty,
      timeLimitMinutes: Number(timeLimitMinutes) || 0,
      deadline: deadline || undefined,
      password: password.trim() || undefined,
      shuffleQuestions,
      showResultsImmediately,
      allowRetake,
      createdByName: 'Giáo Viên Tiếng Anh',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'ACTIVE',
      questions,
      totalPoints,
    };

    HomeworkStorageService.saveAssignment(assignment);
    showToast({
      message: '🎉 Xuất bản bài tập thành công!',
      subMessage: `Mã PIN: ${assignment.code} - Bạn có thể chia sẻ link ngay cho học sinh.`,
      type: 'success',
    });
    navigate(`/homework/manage/${assignment.id}`);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/homework')}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <span>Tạo Bài Tập Về Nhà Mới</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Hỗ trợ tạo nhanh bằng AI, nhập văn bản có sẵn hoặc tự soạn thảo đa dạng dạng bài
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPreview(!isPreview)}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
              isPreview
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>{isPreview ? 'Thoát Xem Trước' : 'Xem Trước (Preview)'}</span>
          </button>

          <button
            onClick={handleSaveAssignment}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition active:scale-98"
          >
            <Save className="w-4 h-4" />
            <span>Lưu & Xuất Bản ({questions.length} câu)</span>
          </button>
        </div>
      </div>

      {/* Main Creation Mode Tabs */}
      {!isPreview && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-2xl">
          <button
            onClick={() => setMode('ai')}
            className={`py-3 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition ${
              mode === 'ai'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-cyan-500" />
            <span>1. Tạo Nhanh Bằng AI (Khuyên dùng)</span>
          </button>

          <button
            onClick={() => setMode('paste')}
            className={`py-3 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition ${
              mode === 'paste'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-500" />
            <span>2. Nhập Văn Bản / Copy-Paste</span>
          </button>

          <button
            onClick={() => setMode('manual')}
            className={`py-3 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition ${
              mode === 'manual'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-4 h-4 text-indigo-500" />
            <span>3. Soạn Thảo & Chỉnh Sửa ({questions.length} câu)</span>
          </button>
        </div>
      )}

      {/* MODE 1: AI GENERATOR */}
      {!isPreview && mode === 'ai' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <span>Cấu hình Trí Tuệ Nhân Tạo (AI) Sinh Đề</span>
            </h2>
            <p className="text-xs text-slate-500">
              Nhập chủ đề và chọn các dạng bài tập mong muốn, AI sẽ tự động sinh trọn bộ bài tập chuẩn sư phạm kèm đáp án và giải thích chi tiết.
            </p>
          </div>

          <div className="space-y-4">
            {/* Topic Input & Quick Suggestions */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Chủ đề bài tập tiếng Anh: <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ví dụ: 12 Thì trong tiếng Anh, Câu bị động, Phrasal Verbs, Luyện viết đoạn văn..."
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-400">Gợi ý nhanh:</span>
                {quickTopicSuggestions.slice(0, 5).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setAiTopic(s)}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Select Question Types */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                Các dạng bài tập muốn có trong đề:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { type: 'MULTIPLE_CHOICE', label: 'Trắc nghiệm (1 đáp án)' },
                  { type: 'FILL_BLANK', label: 'Điền từ vào chỗ trống' },
                  { type: 'WORD_REORDER', label: 'Sắp xếp từ thành câu' },
                  { type: 'ESSAY', label: 'Tự luận (AI chấm điểm)' },
                  { type: 'MATCHING', label: 'Nối từ / Nối cặp' },
                  { type: 'ERROR_CORRECTION', label: 'Tìm và sửa lỗi sai' },
                  { type: 'PRONUNCIATION', label: 'Phát âm & Trọng âm' },
                ].map((item) => {
                  const isChecked = aiSelectedTypes.includes(item.type as HomeworkQuestionType);
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => handleToggleType(item.type as HomeworkQuestionType)}
                      className={`p-3 rounded-xl border text-left text-xs font-bold flex items-center justify-between transition ${
                        isChecked
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span>{item.label}</span>
                      {isChecked && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Level, Difficulty & Count */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Trình độ học sinh:
                </label>
                <select
                  value={aiGrade}
                  onChange={(e) => setAiGrade(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Lớp 6-9 / A1-A2">Lớp 6 - 9 (A1 - A2 Starter)</option>
                  <option value="Lớp 10-12 / B1-B2">Lớp 10 - 12 (B1 - B2 Trung Cấp)</option>
                  <option value="IELTS 5.5 - 7.0 / THPTQG">Luyện Thi THPT Quốc Gia / IELTS 6.0+</option>
                  <option value="Tiếng Anh Giao Tiếp">Tiếng Anh Giao Tiếp & Công Sở</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Độ khó:
                </label>
                <select
                  value={aiDifficulty}
                  onChange={(e) => setAiDifficulty(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="EASY">Dễ (Cơ bản / Nhận biết)</option>
                  <option value="MEDIUM">Trung bình (Thông hiểu & Vận dụng)</option>
                  <option value="HARD">Khó (Vận dụng cao / Nâng cao)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Số lượng câu hỏi:
                </label>
                <select
                  value={aiCount}
                  onChange={(e) => setAiCount(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={4}>4 câu (Kiểm tra 10 phút)</option>
                  <option value={5}>5 câu (Chuẩn bài về nhà)</option>
                  <option value={8}>8 câu (Bài tập tuần)</option>
                  <option value={10}>10 câu (Đề kiểm tra 15-20 phút)</option>
                  <option value={15}>15 câu (Đề kiểm tra 45 phút)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Đã chọn: <strong>{aiSelectedTypes.length}</strong> dạng bài • <strong>{aiCount}</strong> câu
            </span>

            <button
              onClick={handleGenerateAI}
              disabled={isGenerating}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 via-indigo-700 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-500/25 flex items-center gap-2 transition disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>AI Đang Soạn Đề & Lời Giải...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-cyan-300" />
                  <span>✨ Tạo Đề Thi Bằng AI Ngay</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* MODE 2: PASTE TEXT */}
      {!isPreview && mode === 'paste' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-5 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              <span>Nhập Văn Bản Đề Thi Hoặc Dán Từ File Word</span>
            </h2>
            <p className="text-xs text-slate-500">
              Dán nội dung đề bài có sẵn vào đây. Hệ thống tự động nhận diện câu hỏi trắc nghiệm, điền từ [từ_cần_điền], tự luận [Essay], sắp xếp [Order].
            </p>
          </div>

          <textarea
            rows={10}
            placeholder={`Ví dụ cú pháp hỗ trợ:
1. She _____ to London next week.
A. go
*B. will go (đáp án đúng có dấu *)
C. went
D. goes
Giải thích: Dấu hiệu "next week" dùng thì tương lai đơn.

2. [Fill] Water [boils] at 100 degrees Celsius.

3. [Order] English / is / spoken / all / over / the world.

4. [Essay] Write a paragraph (50-80 words) describing your favorite hobby.`}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-mono text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => {
                setPasteText(`1. By the time he arrived, the film _____ .
A. started
*B. had started
C. has started
D. was starting
Giải thích: Hành động phim bắt đầu xảy ra trước khi anh ấy đến trong quá khứ.

2. [Fill] She is really looking forward [to] meeting you again.

3. [Order] We / have / lived / in / this city / since / 2020.

4. [Essay] What are the benefits of learning English for your future career? (60-100 words).`);
              }}
              className="text-xs font-bold text-indigo-600 hover:underline"
            >
              Chèn đoạn văn bản mẫu
            </button>

            <button
              onClick={handleParseText}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow transition flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>⚡ Phân Tích & Chuyển Thành Đề Bài</span>
            </button>
          </div>
        </div>
      )}

      {/* ASSIGNMENT SETTINGS (Always visible before manual list) */}
      {!isPreview && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <span>Cài Đặt Bài Tập</span>
            </h3>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Mã PIN:</span>
              <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono font-black text-xs rounded-lg border border-indigo-200 dark:border-indigo-800">
                {code}
              </span>
              <button
                type="button"
                onClick={() => setCode(generatePinCode())}
                className="text-[11px] text-slate-400 hover:text-indigo-600 font-bold underline"
              >
                Đổi mã
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tiêu đề bài tập: <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Bài tập về nhà: 12 Thì trong tiếng Anh"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Thời gian làm bài:
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="180"
                  placeholder="0 = Không giới hạn"
                  value={timeLimitMinutes}
                  onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">phút</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Hạn chót nộp bài:
              </label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-2 text-xs text-slate-600 dark:text-slate-400">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={shuffleQuestions}
                onChange={(e) => setShuffleQuestions(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Trộn ngẫu nhiên câu hỏi</span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showResultsImmediately}
                onChange={(e) => setShowResultsImmediately(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Cho xem đáp án & giải thích ngay sau khi nộp</span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowRetake}
                onChange={(e) => setAllowRetake(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Cho phép làm lại nhiều lần</span>
            </label>
          </div>
        </div>
      )}

      {/* QUESTIONS LIST (In Manual/Editor mode) */}
      {!isPreview && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>Danh Sách Câu Hỏi ({questions.length} câu)</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold">
                  Tổng {questions.reduce((sum, q) => sum + (q.points || 1), 0)} điểm
                </span>
              </h3>
            </div>

            {/* Quick Add Question Dropdown */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400 font-bold">Thêm câu:</span>
              <button
                type="button"
                onClick={() => handleAddQuestion('MULTIPLE_CHOICE')}
                className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Trắc nghiệm
              </button>
              <button
                type="button"
                onClick={() => handleAddQuestion('FILL_BLANK')}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Điền từ
              </button>
              <button
                type="button"
                onClick={() => handleAddQuestion('WORD_REORDER')}
                className="px-2.5 py-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 text-xs font-bold transition flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Sắp xếp câu
              </button>
              <button
                type="button"
                onClick={() => handleAddQuestion('MATCHING')}
                className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-bold transition flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Nối từ
              </button>
              <button
                type="button"
                onClick={() => handleAddQuestion('ESSAY')}
                className="px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-xs font-bold transition flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Tự luận AI
              </button>
              <button
                type="button"
                onClick={() => handleAddQuestion('ERROR_CORRECTION')}
                className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-xs font-bold transition flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Sửa lỗi sai
              </button>
            </div>
          </div>

          {questions.length === 0 ? (
            <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-8 space-y-2">
              <Sparkles className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">Chưa có câu hỏi nào trong đề</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Bấm vào các nút &quot;Thêm câu&quot; ở trên hoặc dùng tính năng Tạo Nhanh Bằng AI để sinh câu hỏi tự động.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div
                  key={q.id || idx}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3"
                >
                  {/* Question Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-black uppercase text-slate-600 dark:text-slate-300">
                        {q.type === 'MULTIPLE_CHOICE' && 'Trắc Nghiệm 1 Đáp Án'}
                        {q.type === 'FILL_BLANK' && 'Điền Từ Vào Chỗ Trống'}
                        {q.type === 'WORD_REORDER' && 'Sắp Xếp Từ Thành Câu'}
                        {q.type === 'ESSAY' && 'Tự Luận (AI Chấm Điểm)'}
                        {q.type === 'MATCHING' && 'Nối Cặp Từ Vựng'}
                        {q.type === 'ERROR_CORRECTION' && 'Tìm & Sửa Lỗi Sai'}
                        {q.type === 'PRONUNCIATION' && 'Phát Âm & Trọng Âm'}
                        {q.type === 'READING_COMPREHENSION' && 'Đọc Hiểu Đoạn Văn'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-slate-400">Điểm:</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          max="10"
                          value={q.points || 1}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            const next = [...questions];
                            next[idx].points = val;
                            setQuestions(next);
                          }}
                          className="w-14 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-bold text-center"
                        />
                      </div>

                      <button
                        onClick={() => handleDuplicateQuestion(idx)}
                        title="Nhân bản câu này"
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteQuestion(idx)}
                        title="Xóa câu này"
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Question Prompt */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Nội dung câu hỏi / đề bài:</label>
                    <textarea
                      rows={2}
                      value={q.prompt}
                      onChange={(e) => {
                        const next = [...questions];
                        next[idx].prompt = e.target.value;
                        setQuestions(next);
                      }}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Specific Question Type Controls */}
                  {q.type === 'MULTIPLE_CHOICE' && q.options && (
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold text-slate-500">
                        Các lựa chọn (Click vào nút tròn để chọn đáp án đúng):
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, optIdx) => {
                          const isCorrect = q.correctOptionIndex === optIdx;
                          return (
                            <div
                              key={optIdx}
                              className={`flex items-center gap-2 p-2 rounded-xl border transition ${
                                isCorrect
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 text-emerald-800 dark:text-emerald-200'
                                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  const next = [...questions];
                                  next[idx].correctOptionIndex = optIdx;
                                  setQuestions(next);
                                }}
                                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                  isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                {String.fromCharCode(65 + optIdx)}
                              </button>
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const next = [...questions];
                                  if (next[idx].options) next[idx].options![optIdx] = e.target.value;
                                  setQuestions(next);
                                }}
                                className="w-full bg-transparent text-xs font-semibold focus:outline-none"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {q.type === 'FILL_BLANK' && (
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold text-slate-500">
                        Câu có từ trong ngoặc vuông [từ_cần_điền]:
                      </label>
                      <input
                        type="text"
                        value={q.sentenceWithBlanks || ''}
                        onChange={(e) => {
                          const next = [...questions];
                          next[idx].sentenceWithBlanks = e.target.value;
                          const matches = e.target.value.match(/\[([^\]]+)\]/g);
                          if (matches) {
                            next[idx].acceptedAnswers = matches.map((m) => m.slice(1, -1).trim());
                          }
                          setQuestions(next);
                        }}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-semibold"
                      />
                      <p className="text-[11px] text-slate-400">
                        Đáp án được chấp nhận:{' '}
                        <strong>{(q.acceptedAnswers || []).join(', ') || 'Chưa có'}</strong>
                      </p>
                    </div>
                  )}

                  {q.type === 'WORD_REORDER' && (
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold text-slate-500">
                        Câu chuẩn đúng ngữ pháp (Hệ thống sẽ tự động xáo trộn từ khi học sinh làm):
                      </label>
                      <input
                        type="text"
                        value={q.correctSentence || ''}
                        onChange={(e) => {
                          const next = [...questions];
                          next[idx].correctSentence = e.target.value;
                          next[idx].words = e.target.value.split(/\s+/).filter(Boolean);
                          setQuestions(next);
                        }}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                      />
                    </div>
                  )}

                  {q.type === 'ESSAY' && (
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold text-slate-500">
                        Đoạn văn mẫu tham khảo / Tiêu chí AI chấm điểm:
                      </label>
                      <textarea
                        rows={2}
                        value={q.sampleAnswer || ''}
                        onChange={(e) => {
                          const next = [...questions];
                          next[idx].sampleAnswer = e.target.value;
                          setQuestions(next);
                        }}
                        placeholder="Nhập đoạn văn mẫu để AI so khớp và đối chiếu ngữ pháp..."
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                      />
                    </div>
                  )}

                  {/* Explanation Field */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      Giải thích ngữ pháp & đáp án chi tiết (Hiển thị cho học sinh khi xem lại):
                    </label>
                    <textarea
                      rows={2}
                      value={q.explanation || ''}
                      onChange={(e) => {
                        const next = [...questions];
                        next[idx].explanation = e.target.value;
                        setQuestions(next);
                      }}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-300 focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LIVE PREVIEW MODE */}
      {isPreview && (
        <div className="bg-slate-50 dark:bg-slate-950 p-6 sm:p-10 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 text-center max-w-xl mx-auto">
            <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-mono font-bold text-xs rounded-full">
              Mã PIN: {code}
            </span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">{title || 'Tiêu Đề Bài Tập'}</h2>
            <p className="text-xs text-slate-500">{description || 'Mô tả bài tập'}</p>
            <div className="flex items-center justify-center gap-4 text-xs font-bold text-slate-600 dark:text-slate-400 pt-2">
              <span>{questions.length} câu hỏi</span>
              <span>•</span>
              <span>{timeLimitMinutes > 0 ? `${timeLimitMinutes} phút` : 'Tự do'}</span>
              <span>•</span>
              <span>Tổng {questions.reduce((sum, q) => sum + (q.points || 1), 0)} điểm</span>
            </div>
          </div>

          <div className="space-y-4 max-w-3xl mx-auto">
            {questions.map((q, idx) => (
              <div
                key={q.id || idx}
                className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-indigo-600 dark:text-indigo-400">
                    Câu {idx + 1} ({q.points || 1} điểm)
                  </span>
                  <span className="text-[11px] font-bold text-slate-400 uppercase">{q.type}</span>
                </div>

                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{q.prompt}</p>

                {q.type === 'MULTIPLE_CHOICE' && q.options && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center gap-2 text-xs font-semibold"
                      >
                        <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center text-[10px]">
                          {String.fromCharCode(65 + oIdx)}
                        </span>
                        <span>{opt}</span>
                      </div>
                    ))}
                  </div>
                )}

                {q.type === 'FILL_BLANK' && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300">
                    {q.sentenceWithBlanks}
                  </div>
                )}

                {q.type === 'WORD_REORDER' && (
                  <div className="flex flex-wrap gap-2">
                    {(q.words || []).map((w, wIdx) => (
                      <span
                        key={wIdx}
                        className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold border border-indigo-200 dark:border-indigo-800"
                      >
                        {w}
                      </span>
                    ))}
                  </div>
                )}

                {q.type === 'ESSAY' && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs italic text-slate-400">
                    [Khu vực học sinh gõ đoạn văn tự luận. AI sẽ tự động chấm điểm và chỉ ra lỗi ngữ pháp khi nộp]
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
