export type HomeworkQuestionType =
  | 'MULTIPLE_CHOICE'
  | 'MULTI_SELECT'
  | 'FILL_BLANK'
  | 'ESSAY'
  | 'MATCHING'
  | 'WORD_REORDER'
  | 'ERROR_CORRECTION'
  | 'READING_COMPREHENSION'
  | 'PRONUNCIATION';

export interface MatchingPair {
  left: string;
  right: string;
}

export interface ErrorOption {
  label: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface ReadingSubQuestion {
  id: string;
  type: 'MULTIPLE_CHOICE' | 'FILL_BLANK' | 'ESSAY';
  prompt: string;
  options?: string[];
  correctOptionIndex?: number;
  acceptedAnswers?: string[];
  explanation?: string;
  points: number;
}

export interface HomeworkQuestion {
  id: string;
  type: HomeworkQuestionType;
  prompt: string;
  points: number;
  explanation: string;
  hint?: string;

  // MULTIPLE_CHOICE & PRONUNCIATION
  options?: string[];
  correctOptionIndex?: number;
  pronunciationType?: 'SOUND' | 'STRESS';

  // MULTI_SELECT
  correctOptionIndices?: number[];

  // FILL_BLANK
  sentenceWithBlanks?: string; // e.g. "She [has lived] here for [ten] years."
  acceptedAnswers?: string[]; // list of answers for single or comma separated
  blanks?: Array<{ index: number; acceptedAnswers: string[] }>;

  // ESSAY
  minWords?: number;
  maxWords?: number;
  sampleAnswer?: string;
  rubricNotes?: string;

  // MATCHING
  pairs?: MatchingPair[];

  // WORD_REORDER
  words?: string[]; // shuffled words
  correctSentence?: string;

  // ERROR_CORRECTION
  sentence?: string;
  errorOptions?: ErrorOption[];
  correctOption?: 'A' | 'B' | 'C' | 'D';
  correction?: string;

  // READING_COMPREHENSION
  passage?: string;
  subQuestions?: ReadingSubQuestion[];
}

export interface HomeworkAssignment {
  id: string;
  code: string; // PIN code, e.g. ENG-4819
  title: string;
  description: string;
  subject: string; // "Tiếng Anh"
  topic: string; // "12 Thì trong tiếng Anh", "Câu bị động", etc.
  gradeLevel: string; // "Lớp 6-9 (A2)", "Lớp 10-12 (B1)", "IELTS / THPTQG", etc.
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  timeLimitMinutes: number; // 0 = unlimited
  deadline?: string; // ISO date string
  password?: string;
  shuffleQuestions: boolean;
  showResultsImmediately: boolean;
  allowRetake: boolean;
  createdByName: string;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
  status: 'ACTIVE' | 'CLOSED' | 'DRAFT';
  questions: HomeworkQuestion[];
  totalPoints: number;
}

export interface EssayAiEvaluation {
  score: number;
  maxScore: number;
  grammarScore: number;
  vocabScore: number;
  coherenceScore: number;
  feedback: string;
  suggestedImprovement: string;
  highlightedErrors?: string[];
}

export interface HomeworkSubmission {
  id: string;
  assignmentId: string;
  assignmentCode: string;
  assignmentTitle: string;
  studentName: string;
  studentEmail?: string;
  studentClass?: string;
  answers: Record<string, any>; // questionId -> answer
  scores: Record<string, number>; // questionId -> earned score
  aiEvaluations?: Record<string, EssayAiEvaluation>;
  teacherAdjustments?: Record<string, { score: number; comment?: string }>;
  totalScore: number;
  maxTotalScore: number;
  percentage: number;
  timeSpentSeconds: number;
  submittedAt: string;
  isReviewedByTeacher?: boolean;
}

export interface HomeworkTemplate {
  id: string;
  title: string;
  description: string;
  topic: string;
  gradeLevel: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  timeLimitMinutes: number;
  questionCount: number;
  tags: string[];
  questions: HomeworkQuestion[];
}
