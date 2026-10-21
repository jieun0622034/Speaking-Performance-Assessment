import { Assessment, Submission, Grading, RubricCriterion, TeacherUser } from '../types';

const DB_NAME = 'AssessmentAIAudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'audioBlobs';

const STORAGE_KEYS = {
  ASSESSMENTS: 'assessment_ai_assessments',
  SUBMISSIONS: 'assessment_ai_submissions',
  GRADINGS: 'assessment_ai_gradings',
  CURRENT_TEACHER: 'assessment_ai_current_teacher',
  TEACHERS_LIST: 'assessment_ai_teachers_list',
};

export const DEMO_TEACHER: TeacherUser = {
  id: 'teacher-demo-1',
  name: '김서연',
  email: 'teacher@school.kr',
  school: '서울동도중학교',
  subject: '영어',
  createdAt: new Date().toISOString(),
};

export function getCurrentTeacher(): TeacherUser | null {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_TEACHER);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function saveCurrentTeacher(teacher: TeacherUser): void {
  localStorage.setItem(STORAGE_KEYS.CURRENT_TEACHER, JSON.stringify(teacher));
}

export function clearCurrentTeacher(): void {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_TEACHER);
}

export function getRegisteredTeachers(): { user: TeacherUser; password: string }[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.TEACHERS_LIST);
    return data ? JSON.parse(data) : [{ user: DEMO_TEACHER, password: 'password123' }];
  } catch {
    return [{ user: DEMO_TEACHER, password: 'password123' }];
  }
}

export function registerTeacher(userData: Omit<TeacherUser, 'id' | 'createdAt'>, password: string): TeacherUser {
  const list = getRegisteredTeachers();
  const existing = list.find((t) => t.user.email.toLowerCase() === userData.email.toLowerCase());
  if (existing) {
    throw new Error('이미 등록된 이메일 주소입니다.');
  }

  const newUser: TeacherUser = {
    ...userData,
    id: `teacher-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  list.push({ user: newUser, password });
  localStorage.setItem(STORAGE_KEYS.TEACHERS_LIST, JSON.stringify(list));
  saveCurrentTeacher(newUser);
  return newUser;
}

export function authenticateTeacher(email: string, password: string): TeacherUser {
  const list = getRegisteredTeachers();
  const matched = list.find(
    (t) => t.user.email.toLowerCase() === email.toLowerCase() && t.password === password
  );
  if (!matched) {
    // If demo email or default password
    if (email.toLowerCase() === 'teacher@school.kr') {
      saveCurrentTeacher(DEMO_TEACHER);
      return DEMO_TEACHER;
    }
    throw new Error('이메일 또는 비밀번호가 일치하지 않습니다.');
  }
  saveCurrentTeacher(matched.user);
  return matched.user;
}


// --- IndexedDB for Audio Blobs ---
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveAudioBlob(key: string, blob: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(blob, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getAudioBlob(key: string): Promise<Blob | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('Failed to get audio blob', e);
    return null;
  }
}

export async function deleteAudioBlob(key: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('Failed to delete audio blob', e);
  }
}

// Helper to convert Blob to Base64
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Generate a synthetic WAV sound with pleasant spoken-like tones so sample audio plays realistically
export function createSyntheticAudioBlob(durationSec: number = 18): Blob {
  const sampleRate = 22050;
  const numSamples = Math.floor(sampleRate * durationSec);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, numSamples * 2, true);

  // Create human-vocal-like formant harmonic cadence
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Add speech cadence with syllabic rhythm (3~4 Hz)
    const rhythm = 0.5 + 0.5 * Math.sin(2 * Math.PI * 3.5 * t);
    // Pause every 3.5 seconds
    const isPause = (t % 4.5) > 3.8;
    const voicePitch = 160 + 20 * Math.sin(2 * Math.PI * 0.8 * t);
    const sample = isPause
      ? 0
      : (Math.sin(2 * Math.PI * voicePitch * t) * 0.5 +
          Math.sin(2 * Math.PI * (voicePitch * 2) * t) * 0.25 +
          Math.sin(2 * Math.PI * 750 * t) * 0.15) *
        rhythm *
        0.3;

    const int16 = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    view.setInt16(44 + i * 2, int16, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// --- LocalStorage CRUD ---

export function getAssessments(): Assessment[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ASSESSMENTS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveAssessment(assessment: Assessment): void {
  const list = getAssessments();
  const idx = list.findIndex((a) => a.id === assessment.id);
  if (idx >= 0) {
    list[idx] = assessment;
  } else {
    list.unshift(assessment);
  }
  localStorage.setItem(STORAGE_KEYS.ASSESSMENTS, JSON.stringify(list));
}

export function deleteAssessment(id: string): void {
  const list = getAssessments().filter((a) => a.id !== id);
  localStorage.setItem(STORAGE_KEYS.ASSESSMENTS, JSON.stringify(list));

  // delete associated submissions and gradings
  const submissions = getSubmissions().filter((s) => s.assessmentId === id);
  submissions.forEach((s) => {
    if (s.audioBlobId) deleteAudioBlob(s.audioBlobId);
  });
  const filteredSubmissions = getSubmissions().filter((s) => s.assessmentId !== id);
  localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(filteredSubmissions));

  const filteredGradings = getGradings().filter((g) => g.assessmentId !== id);
  localStorage.setItem(STORAGE_KEYS.GRADINGS, JSON.stringify(filteredGradings));
}

export function getSubmissions(): Submission[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveSubmission(submission: Submission): void {
  const list = getSubmissions();
  const idx = list.findIndex((s) => s.id === submission.id);
  if (idx >= 0) {
    list[idx] = submission;
  } else {
    list.push(submission);
  }
  localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(list));
}

export function getGradings(): Grading[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.GRADINGS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveGrading(grading: Grading): void {
  const list = getGradings();
  const idx = list.findIndex((g) => g.id === grading.id);
  if (idx >= 0) {
    list[idx] = grading;
  } else {
    list.push(grading);
  }
  localStorage.setItem(STORAGE_KEYS.GRADINGS, JSON.stringify(list));
}

// Delete speech & text data for an assessment
export async function clearAssessmentSubmissionData(assessmentId: string): Promise<void> {
  const submissions = getSubmissions();
  const targetSubmissions = submissions.filter((s) => s.assessmentId === assessmentId);
  for (const s of targetSubmissions) {
    if (s.audioBlobId) {
      await deleteAudioBlob(s.audioBlobId);
    }
  }
  const remainingSubmissions = submissions.filter((s) => s.assessmentId !== assessmentId);
  localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(remainingSubmissions));

  const gradings = getGradings();
  const remainingGradings = gradings.filter((g) => g.assessmentId !== assessmentId);
  localStorage.setItem(STORAGE_KEYS.GRADINGS, JSON.stringify(remainingGradings));
}

// Clear all data
export async function clearAllData(): Promise<void> {
  localStorage.removeItem(STORAGE_KEYS.ASSESSMENTS);
  localStorage.removeItem(STORAGE_KEYS.SUBMISSIONS);
  localStorage.removeItem(STORAGE_KEYS.GRADINGS);
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
  } catch (e) {
    console.error('Clear DB failed', e);
  }
}

// Seed realistic sample data
export async function seedSampleData(): Promise<void> {
  const assessmentId = 'sample-asm-1';
  const sampleCriteria: RubricCriterion[] = [
    {
      id: 'crit-task',
      name: '과제 수행 및 내용 충실성',
      target: 'both',
      maxScore: 5,
      levels: {
        high: { label: '상', desc: '주제(기후 변화 해결을 위한 노력)에 대해 구체적인 실천 방안과 명확한 이유를 제시함.', score: 5 },
        mid: { label: '중', desc: '주제에 관련된 내용을 언급하였으나 실천 방안이 다소 일반적이거나 세부 설명이 부족함.', score: 3.5 },
        low: { label: '하', desc: '과제 요구사항을 충분히 충족하지 못하고 주제와 무관하거나 극히 단편적임.', score: 2 },
      },
    },
    {
      id: 'crit-logic',
      name: '구성 및 논리적 흐름',
      target: 'both',
      maxScore: 5,
      levels: {
        high: { label: '상', desc: '도입, 본론, 결론의 연결이 자연스럽고 연결사를 효과적으로 활용하여 논리적으로 전개함.', score: 5 },
        mid: { label: '중', desc: '기본적인 전개 구조를 갖추었으나 문장 간 연결이 다소 불연속적이거나 전환이 어색함.', score: 3.5 },
        low: { label: '하', desc: '문장 간 연결성이 부족하고 논리적 비약이 심하여 이해하기 어려움.', score: 2 },
      },
    },
    {
      id: 'crit-vocab',
      name: '어휘 및 표현 적절성',
      target: 'both',
      maxScore: 5,
      levels: {
        high: { label: '상', desc: '환경 및 기후와 관련된 적절하고 다양한 어휘와 정확한 표현을 구사함.', score: 5 },
        mid: { label: '중', desc: '기본적인 일상 어휘 위주로 표현하며, 일부 어휘 선택에 부자연스러움이 있으나 의미 전달 가능.', score: 3.5 },
        low: { label: '하', desc: '부적절한 어휘 사용으로 인해 화자의 의도를 파악하기 어려움.', score: 2 },
      },
    },
    {
      id: 'crit-fluency',
      name: '전달력 및 문장 완성도',
      target: 'both',
      maxScore: 5,
      levels: {
        high: { label: '상', desc: '내용 전달이 막힘없이 원활하고 문장이 온전한 형태로 완성도 높게 표현됨.', score: 5 },
        mid: { label: '중', desc: '약간의 주저함이나 단순 표현 반복이 있으나 전체적인 의사소통 흐름이 지속됨.', score: 3.5 },
        low: { label: '하', desc: '잦은 멈춤이나 불완전한 문장 구성으로 인해 전달력이 떨어짐.', score: 2 },
      },
    },
  ];

  const sampleAssessment: Assessment = {
    id: assessmentId,
    code: '748291',
    title: '기후 위기 대응과 청소년의 실천 방안',
    subject: '영어',
    grade: '중학교 2학년',
    achievementStandard: '[09영03-04] 친숙한 일반적 주제에 관하여 자신의 의견이나 생각을 간단한 문장으로 말하거나 쓸 수 있다.',
    prompt: '기후 변화의 심각성과 이를 해결하기 위해 청소년인 우리가 일상에서 실천할 수 있는 구체적인 행동 한 가지를 이유와 함께 발표하거나 작성하세요.',
    submissionType: 'both', // Both speaking and writing enabled
    timeLimitSec: 60,
    charLimitRange: { min: 100, max: 400 },
    gradingMode: 'content',
    criteria: sampleCriteria,
    createdAt: new Date().toISOString(),
  };

  saveAssessment(sampleAssessment);

  // Generate synthetic audio for sample speaking students
  const blob1 = createSyntheticAudioBlob(24);
  const audioBlobId1 = 'audio-sub-1';
  await saveAudioBlob(audioBlobId1, blob1);

  const blob2 = createSyntheticAudioBlob(19);
  const audioBlobId2 = 'audio-sub-2';
  await saveAudioBlob(audioBlobId2, blob2);

  // Student 1: 김민서 (Speaking) - High achievement, Teacher Approved
  const sub1: Submission = {
    id: 'sub-1',
    assessmentId,
    studentNumber: '03',
    studentName: '김민서',
    submissionType: 'speaking',
    audioBlobId: audioBlobId1,
    audioDurationSec: 24,
    audioMimeType: 'audio/wav',
    consentAgreed: true,
    submittedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
  };
  saveSubmission(sub1);

  const grading1: Grading = {
    id: 'grading-1',
    submissionId: 'sub-1',
    assessmentId,
    status: 'teacher_approved',
    transcriptSentences: [
      { start_sec: 0, end_sec: 5, text: 'Hello everyone. Today, I want to talk about climate change and our small actions.' },
      { start_sec: 6, end_sec: 12, text: 'Um, global warming is causing severe heat waves and melting glaciers around the world.' },
      { start_sec: 13, end_sec: 19, text: 'As students, we can start by reducing single-use plastics and carrying our own tumblers every day.' },
      { start_sec: 20, end_sec: 24, text: 'Small habits can make a huge difference for our green planet. Thank you for listening.' },
    ],
    aiScore: {
      totalScore: 19,
      criteriaScores: [
        {
          criterionId: 'crit-task',
          criterionName: '과제 수행 및 내용 충실성',
          score: 5,
          level: '상',
          reason: '기후 변화 문제와 텀블러 사용이라는 일상 속 실천 방안을 명확한 이유와 함께 제시함.',
          evidenceSpeaking: [{ start_sec: 13, end_sec: 19 }],
        },
        {
          criterionId: 'crit-logic',
          criterionName: '구성 및 논리적 흐름',
          score: 5,
          level: '상',
          reason: '도입에서 문제 제기, 구체적 해결책, 결론으로 이어지는 논리적 구성이 매우 체계적임.',
          evidenceSpeaking: [{ start_sec: 0, end_sec: 5 }, { start_sec: 20, end_sec: 24 }],
        },
        {
          criterionId: 'crit-vocab',
          criterionName: '어휘 및 표현 적절성',
          score: 4.5,
          level: '상',
          reason: 'global warming, glaciers, single-use plastics 등 주제에 적합한 환경 관련 핵심 어휘를 능숙하게 사용함.',
          evidenceSpeaking: [{ start_sec: 6, end_sec: 19 }],
        },
        {
          criterionId: 'crit-fluency',
          criterionName: '전달력 및 문장 완성도',
          score: 4.5,
          level: '상',
          reason: '군더더기어(Um)가 1회 있었으나 문장 종결이 분명하고 전체적인 의사소통 흐름이 매우 원활함.',
          evidenceSpeaking: [{ start_sec: 0, end_sec: 24 }],
        },
      ],
      fillersCount: 1,
      confidence: '높음',
      confidenceReason: '발화가 명료하고 배경 소음 없이 모든 루브릭 항목의 근거 구간이 뚜렷하게 식별됨.',
      needsReview: false,
    },
    teacherScore: {
      totalScore: 19.5,
      criteriaScores: [
        { criterionId: 'crit-task', score: 5, comment: '우수한 주제 적합성과 설득력 있는 실천 방안 제시.' },
        { criterionId: 'crit-logic', score: 5, comment: '도입과 결론의 마무리가 매우 깔끔함.' },
        { criterionId: 'crit-vocab', score: 4.5, comment: '적절한 환경 어휘 활용.' },
        { criterionId: 'crit-fluency', score: 5, comment: '발표 태도가 매우 자신감 있고 내용 중심 평가에 부합하여 만점 부여.' },
      ],
      generalComment: '준비가 매우 잘 된 훌륭한 발표였습니다.',
    },
    finalScore: 19.5,
    approvedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    schoolRecordDraft: `'기후 위기 대응과 청소년의 실천 방안' 말하기 수행평가에서 지구 온난화의 심각성을 인지하고 텀블러 사용을 통한 일회용 플라스틱 줄이기 실천을 설득력 있게 발표함. 핵심 환경 어휘를 맥락에 알맞게 활용하고 서론-본론-결론의 구성을 탄탄하게 전개하여 청중에게 긍정적인 실천 메시지를 전달함.`,
    metrics: {
      speaking: {
        durationSec: 24,
        wpm: 125,
        fillersCount: 1,
      },
    },
    changeLogs: [
      {
        timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
        type: 'ai_generated',
        summary: 'AI 채점 초안 생성 (총점 19.0점, 신뢰도 높음)',
        actor: 'AI 채점 시스템',
      },
      {
        timestamp: new Date(Date.now() - 3600000 * 2.1).toISOString(),
        type: 'teacher_edited',
        summary: '교사가 전달력 항목 점수를 4.5점에서 5.0점으로 조정',
        actor: '교사',
      },
      {
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        type: 'approved',
        summary: '최종 점수 19.5점 교사 승인 확정',
        actor: '교사',
      },
    ],
  };
  saveGrading(grading1);

  // Student 2: 박준우 (Speaking) - Needs Review (Score at boundary & STT uncertainty)
  const sub2: Submission = {
    id: 'sub-2',
    assessmentId,
    studentNumber: '08',
    studentName: '박준우',
    submissionType: 'speaking',
    audioBlobId: audioBlobId2,
    audioDurationSec: 19,
    audioMimeType: 'audio/wav',
    consentAgreed: true,
    submittedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  };
  saveSubmission(sub2);

  const grading2: Grading = {
    id: 'grading-2',
    submissionId: 'sub-2',
    assessmentId,
    status: 'ai_graded', // Waiting for teacher approval
    transcriptSentences: [
      { start_sec: 0, end_sec: 4, text: 'Uh, we have to save our energy because electricity costs much coal.' },
      { start_sec: 5, end_sec: 9, text: 'Um, I try to turn off the lights when I leave my room.' },
      { start_sec: 10, end_sec: 14, text: 'Also [불명확] unplugging chargers can save lots of power.' },
      { start_sec: 15, end_sec: 19, text: 'So, everyone should try this together.' },
    ],
    aiScore: {
      totalScore: 14,
      criteriaScores: [
        {
          criterionId: 'crit-task',
          criterionName: '과제 수행 및 내용 충실성',
          score: 4,
          level: '중',
          reason: '방 불 끄기 및 플러그 뽑기를 제시하여 과제를 수행했으나 실천 방안의 설명이 다소 짧음.',
          evidenceSpeaking: [{ start_sec: 5, end_sec: 14 }],
        },
        {
          criterionId: 'crit-logic',
          criterionName: '구성 및 논리적 흐름',
          score: 3.5,
          level: '중',
          reason: '간단한 이유와 실천 방안이 포함되어 있으나 도입과 결론의 연결이 다소 급격함.',
          evidenceSpeaking: [{ start_sec: 0, end_sec: 19 }],
        },
        {
          criterionId: 'crit-vocab',
          criterionName: '어휘 및 표현 적절성',
          score: 3.5,
          level: '중',
          reason: '기본적인 표현(turn off the lights, unplug)을 적절히 사용하였으나 [불명확] 구간으로 인해 세부 어휘 확인 필요.',
          evidenceSpeaking: [{ start_sec: 10, end_sec: 14 }],
        },
        {
          criterionId: 'crit-fluency',
          criterionName: '전달력 및 문장 완성도',
          score: 3,
          level: '중',
          reason: '발화 속도가 불규칙하고 3회의 망설임과 불명확 발음이 관찰됨 (내용 중심 평가 원칙에 따라 의미 전달 중심으로 산출).',
          evidenceSpeaking: [{ start_sec: 0, end_sec: 9 }],
        },
      ],
      fillersCount: 3,
      confidence: '보통',
      confidenceReason: '10~14초 구간 음성 인식이 [불명확] 처리되었고 점수가 상/중 등급 경계에 위치함.',
      needsReview: true,
      needsReviewReason: '10~14초 구간 발음 불명확 및 등급 경계 점수(중위권 상단)로 교사 직접 청취 확인 요망',
    },
    metrics: {
      speaking: {
        durationSec: 19,
        wpm: 108,
        fillersCount: 3,
      },
    },
    changeLogs: [
      {
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        type: 'ai_generated',
        summary: 'AI 채점 초안 생성 (총점 14.0점, 신뢰도 보통, 확인 필요 플래그)',
        actor: 'AI 채점 시스템',
      },
    ],
  };
  saveGrading(grading2);

  // Student 3: 이지안 (Writing) - Approved
  const text3 = `Climate change is one of the most pressing challenges of our time. Rising global temperatures cause extreme weather events and threaten various ecosystems. As teenagers, we can take meaningful steps by practicing proper waste separation and walking or cycling instead of using cars for short distances. In addition, encouraging friends and family to join these eco-friendly habits multiplies our positive impact. Through consistent daily efforts, our generation can build a sustainable future.`;
  const sub3: Submission = {
    id: 'sub-3',
    assessmentId,
    studentNumber: '14',
    studentName: '이지안',
    submissionType: 'writing',
    writtenText: text3,
    consentAgreed: true,
    submittedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  };
  saveSubmission(sub3);

  const sentences3 = [
    'Climate change is one of the most pressing challenges of our time.',
    'Rising global temperatures cause extreme weather events and threaten various ecosystems.',
    'As teenagers, we can take meaningful steps by practicing proper waste separation and walking or cycling instead of using cars for short distances.',
    'In addition, encouraging friends and family to join these eco-friendly habits multiplies our positive impact.',
    'Through consistent daily efforts, our generation can build a sustainable future.',
  ];

  const grading3: Grading = {
    id: 'grading-3',
    submissionId: 'sub-3',
    assessmentId,
    status: 'teacher_approved',
    writingSentences: sentences3,
    aiScore: {
      totalScore: 19.5,
      criteriaScores: [
        {
          criterionId: 'crit-task',
          criterionName: '과제 수행 및 내용 충실성',
          score: 5,
          level: '상',
          reason: '기후 문제의 심각성을 짚고 분리수거 및 자전거 이용이라는 일상적 실천 방안과 주변 전파 효과까지 탁월하게 제시함.',
          evidenceWriting: [{ sentence_index: 2 }, { sentence_index: 3 }],
        },
        {
          criterionId: 'crit-logic',
          criterionName: '구성 및 논리적 흐름',
          score: 5,
          level: '상',
          reason: '문제 진단에서 학생 차원의 실천, 파급 효과, 지속 가능한 미래라는 결론으로 이어지는 구성이 논리정연함.',
          evidenceWriting: [{ sentence_index: 0 }, { sentence_index: 4 }],
        },
        {
          criterionId: 'crit-vocab',
          criterionName: '어휘 및 표현 적절성',
          score: 5,
          level: '상',
          reason: 'pressing challenges, extreme weather events, ecosystems, sustainable future 등 고급 어휘와 유려한 연결사 구사.',
          evidenceWriting: [{ sentence_index: 1 }, { sentence_index: 4 }],
        },
        {
          criterionId: 'crit-fluency',
          criterionName: '전달력 및 문장 완성도',
          score: 4.5,
          level: '상',
          reason: '복합문과 분사구문 등을 안정적으로 사용하여 글의 완성도와 가독성이 매우 뛰어남.',
          evidenceWriting: [{ sentence_index: 2 }],
        },
      ],
      confidence: '높음',
      confidenceReason: '글자 수가 요구 기준을 충분히 충족하고 논리적 비약 없이 모든 평가 기준에 부합함.',
      needsReview: false,
    },
    teacherScore: {
      totalScore: 20,
      criteriaScores: [
        { criterionId: 'crit-task', score: 5, comment: '매우 구체적이고 현실적인 실천 방안 제시.' },
        { criterionId: 'crit-logic', score: 5, comment: '문단 간 유기적 연결 우수.' },
        { criterionId: 'crit-vocab', score: 5, comment: '탁월한 어휘 선택.' },
        { criterionId: 'crit-fluency', score: 5, comment: '문장 구조의 다양성과 완성도 우수.' },
      ],
      generalComment: '교과 성취기준을 완벽하게 달성한 뛰어난 에세이.',
    },
    finalScore: 20,
    approvedAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    schoolRecordDraft: `'기후 위기 대응과 청소년의 실천 방안' 글쓰기 수행평가에서 기후 변화가 생태계에 미치는 영향을 고찰하고 올바른 분리배출과 근거리 자전거 이용 등 구체적인 실천 방안을 설득력 있게 서술함. 'sustainable future', 'pressing challenges' 등 수준 높은 어휘와 유기적인 문장 연결을 구사하여 논리적 완성도가 높은 영작문을 작성함.`,
    metrics: {
      writing: {
        charCount: text3.replace(/\s/g, '').length,
        sentenceCount: sentences3.length,
        avgSentenceLen: Math.round(text3.replace(/\s/g, '').length / sentences3.length),
      },
    },
    changeLogs: [
      {
        timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
        type: 'ai_generated',
        summary: 'AI 채점 초안 생성 (총점 19.5점, 신뢰도 높음)',
        actor: 'AI 채점 시스템',
      },
      {
        timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
        type: 'approved',
        summary: '교사가 완성도 항목 0.5점 상향하여 총 20점 만점으로 최종 승인',
        actor: '교사',
      },
    ],
  };
  saveGrading(grading3);

  // Student 4: 최현우 (Writing) - AI graded, pending teacher approval
  const text4 = `I think climate change is dangerous for animals like polar bears. Ice is melting too fast. So we should save electricity. If we turn off air conditioners when not needed, we can reduce coal power. Let's protect nature together.`;
  const sub4: Submission = {
    id: 'sub-4',
    assessmentId,
    studentNumber: '19',
    studentName: '최현우',
    submissionType: 'writing',
    writtenText: text4,
    consentAgreed: true,
    submittedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
  };
  saveSubmission(sub4);

  const sentences4 = [
    'I think climate change is dangerous for animals like polar bears.',
    'Ice is melting too fast.',
    'So we should save electricity.',
    'If we turn off air conditioners when not needed, we can reduce coal power.',
    "Let's protect nature together.",
  ];

  const grading4: Grading = {
    id: 'grading-4',
    submissionId: 'sub-4',
    assessmentId,
    status: 'ai_graded',
    writingSentences: sentences4,
    aiScore: {
      totalScore: 14.5,
      criteriaScores: [
        {
          criterionId: 'crit-task',
          criterionName: '과제 수행 및 내용 충실성',
          score: 4,
          level: '상',
          reason: '북극곰과 에어컨 절약을 예시로 들어 일상적 실천 방안을 제시함.',
          evidenceWriting: [{ sentence_index: 3 }],
        },
        {
          criterionId: 'crit-logic',
          criterionName: '구성 및 논리적 흐름',
          score: 3.5,
          level: '중',
          reason: '문장들이 단문 위주로 나열되어 있어 인과 관계의 부연 설명이 조금 더 보강되면 좋음.',
          evidenceWriting: [{ sentence_index: 1 }, { sentence_index: 2 }],
        },
        {
          criterionId: 'crit-vocab',
          criterionName: '어휘 및 표현 적절성',
          score: 3.5,
          level: '중',
          reason: '기본적인 어휘로 의도를 명확하게 표현함 (내용 중심 평가 모드에 부합).',
          evidenceWriting: [{ sentence_index: 0 }, { sentence_index: 3 }],
        },
        {
          criterionId: 'crit-fluency',
          criterionName: '전달력 및 문장 완성도',
          score: 3.5,
          level: '중',
          reason: '문법적 오류 없이 이해하기 쉬운 문장으로 의미를 명확히 전달함.',
          evidenceWriting: [{ sentence_index: 3 }, { sentence_index: 4 }],
        },
      ],
      confidence: '높음',
      confidenceReason: '글의 분량이 다소 간결하나 주제 요구조건을 모두 충족하고 명확함.',
      needsReview: false,
    },
    metrics: {
      writing: {
        charCount: text4.replace(/\s/g, '').length,
        sentenceCount: sentences4.length,
        avgSentenceLen: Math.round(text4.replace(/\s/g, '').length / sentences4.length),
      },
    },
    changeLogs: [
      {
        timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
        type: 'ai_generated',
        summary: 'AI 채점 초안 생성 (총점 14.5점, 승인 대기 중)',
        actor: 'AI 채점 시스템',
      },
    ],
  };
  saveGrading(grading4);
}
