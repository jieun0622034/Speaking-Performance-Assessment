export type SubmissionType = 'speaking' | 'writing' | 'both';
export type GradingMode = 'content' | 'fluency';
export type GradingStatus = 'pending' | 'submitted' | 'ai_graded' | 'teacher_approved';
export type ConfidenceLevel = '높음' | '보통' | '낮음';

export interface TeacherUser {
  id: string;
  name: string;
  email: string;
  school: string;
  subject: string;
  createdAt: string;
}

export interface RubricLevel {
  label: string; // '상' | '중' | '하'
  desc: string;
  score: number;
}

export interface RubricCriterion {
  id: string;
  name: string;
  target: 'speaking' | 'writing' | 'both';
  maxScore: number;
  levels: {
    high: RubricLevel;
    mid: RubricLevel;
    low: RubricLevel;
  };
}

export interface Assessment {
  id: string;
  code: string; // 6자리 고유 제출 코드 (예: 582914)
  title: string;
  subject: string; // 기본값 '영어'
  grade: string; // 예: '중학교 2학년'
  achievementStandard: string; // 성취기준
  prompt: string; // 과제 안내문
  submissionType: SubmissionType;
  timeLimitSec?: number; // 말하기 제한 시간(초)
  charLimitRange?: {
    min: number;
    max: number;
  };
  gradingMode: GradingMode; // 'content' (내용 중심) | 'fluency' (내용 + 표현·유창성)
  criteria: RubricCriterion[];
  createdAt: string;
}

export interface TranscriptSentence {
  start_sec: number;
  end_sec: number;
  text: string;
}

export interface Submission {
  id: string;
  assessmentId: string;
  studentNumber: string; // 번호 (예: '12')
  studentName: string; // 이름 (예: '김민서')
  submissionType: SubmissionType;
  audioBlobId?: string; // IndexedDB key
  audioDurationSec?: number;
  audioMimeType?: string;
  audioBase64?: string; // Cache for easy preview/AI
  writtenText?: string;
  consentAgreed: boolean;
  submittedAt: string;
}

export interface CriterionGrading {
  criterionId: string;
  criterionName: string;
  score: number;
  level: '상' | '중' | '하';
  reason: string;
  evidenceSpeaking?: { start_sec: number; end_sec: number }[];
  evidenceWriting?: { sentence_index: number }[];
}

export interface ChangeLogEntry {
  timestamp: string;
  type: 'ai_generated' | 'teacher_edited' | 'approved' | 'approval_cancelled';
  summary: string;
  actor: string;
}

export interface Grading {
  id: string;
  submissionId: string;
  assessmentId: string;
  status: GradingStatus;
  transcriptSentences?: TranscriptSentence[];
  writingSentences?: string[];
  aiScore: {
    totalScore: number;
    criteriaScores: CriterionGrading[];
    fillersCount?: number;
    confidence: ConfidenceLevel;
    confidenceReason: string;
    needsReview: boolean;
    needsReviewReason?: string;
  };
  teacherScore?: {
    totalScore: number;
    criteriaScores: {
      criterionId: string;
      score: number;
      comment: string;
    }[];
    generalComment?: string;
  };
  finalScore?: number; // 교사가 승인한 최종 점수
  approvedAt?: string;
  schoolRecordDraft?: string; // 학생부 세특 초안
  metrics?: {
    speaking?: {
      durationSec: number;
      wpm: number;
      fillersCount: number;
    };
    writing?: {
      charCount: number;
      sentenceCount: number;
      avgSentenceLen: number;
    };
  };
  changeLogs: ChangeLogEntry[];
}
