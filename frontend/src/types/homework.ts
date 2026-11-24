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

export type EducationLevelId =
  | 'MAM_NON'
  | 'TIEU_HOC'
  | 'THCS'
  | 'THPT'
  | 'DAI_HOC';

export interface TheorySection {
  heading: string;
  formula?: string;
  points: string[];
  examples?: Array<{ en: string; vi: string }>;
  tip?: string;
}

export interface TheoryLesson {
  summary: string;
  sections: TheorySection[];
}

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
  sentenceWithBlanks?: string;
  acceptedAnswers?: string[];
  blanks?: Array<{ index: number; acceptedAnswers: string[] }>;

  // ESSAY
  minWords?: number;
  maxWords?: number;
  sampleAnswer?: string;
  rubricNotes?: string;

  // MATCHING
  pairs?: MatchingPair[];

  // WORD_REORDER
  words?: string[];
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
  code: string;
  title: string;
  description: string;
  subject: string;
  topic: string;
  levelId?: EducationLevelId;
  orderIndex?: number;
  gradeLevel: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  timeLimitMinutes: number;
  deadline?: string;
  password?: string;
  shuffleQuestions: boolean;
  showResultsImmediately: boolean;
  allowRetake: boolean;
  createdByName: string;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
  status: 'ACTIVE' | 'CLOSED' | 'DRAFT';
  theory?: TheoryLesson;
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
  answers: Record<string, any>;
  scores: Record<string, number>;
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
  code: string;
  levelId: EducationLevelId;
  orderIndex: number;
  title: string;
  description: string;
  topic: string;
  gradeLevel: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  timeLimitMinutes: number;
  questionCount: number;
  tags: string[];
  theory: TheoryLesson;
  questions: HomeworkQuestion[];
}
