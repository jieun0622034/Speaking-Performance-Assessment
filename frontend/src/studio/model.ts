export interface Student {
  id: string;
  number: number;
  name: string;
}
export interface Criterion {
  id: string;
  name: string;
  max: number;
  description: string;
}
export interface Course {
  id: string;
  name: string;
  grade: string;
  classroom: string;
  color: string;
  students: Student[];
  task: string;
  prompt: string;
  rubric: string;
  criteria: Criterion[];
  sample?: boolean;
}
export interface Evidence {
  quote: string;
  correction: string;
  reason: string;
  criterion: string;
  start: number;
}
export interface Take {
  id: string;
  courseId: string;
  studentId: string;
  studentName: string;
  studentNumber: number;
  task: string;
  criteria: Criterion[];
  rubric: string;
  kind: "audio" | "video";
  duration: number;
  createdAt: string;
  sample?: boolean;
  transcript?: string;
  evidence?: Evidence[];
  scores?: Record<string, number>;
  feedback?: string;
  confirmed?: boolean;
  blobId?: string;
}
export interface StudioData {
  version: 1;
  profile: { name: string; school: string; subject: string };
  courses: Course[];
  takes: Take[];
}
export type Page =
  | "home"
  | "courses"
  | "record"
  | "results"
  | "mypage"
  | "course";
export const DATA_KEY = "speaking-studio-v1";
export const id = () => crypto.randomUUID();
export const defaultCriteria = (): Criterion[] => [
  {
    id: "content",
    name: "내용의 충실성",
    max: 40,
    description: "질문에 맞는 답변과 구체적인 이유를 제시했는가",
  },
  {
    id: "expression",
    name: "영어 표현",
    max: 30,
    description: "시제·수일치·어휘를 문맥에 맞게 사용했는가",
  },
  {
    id: "structure",
    name: "답변 구성",
    max: 30,
    description: "주장과 이유, 예시가 자연스럽게 연결되는가",
  },
];
export function initialData(): StudioData {
  const names = [
    "김민서",
    "이도윤",
    "박서연",
    "최지우",
    "정하준",
    "강예린",
    "윤서준",
    "한수아",
  ];
  const courses: Course[] = [
    ["c1", "함께 말하는 영어", "2학년", "1반", "mint"],
    ["c2", "자신 있게, English!", "2학년", "2반", "peach"],
    ["c3", "우리의 첫 영어 발표", "1학년", "3반", "lavender"],
  ].map(([id, name, grade, classroom, color]) => ({
    id,
    name,
    grade,
    classroom,
    color,
    students: names.map((n, i) => ({
      id: id + "-s" + i,
      number: i + 1,
      name: n,
    })),
    task: id === "c3" ? "나의 소중한 물건 소개하기" : "나의 일상을 소개해요",
    prompt:
      "여러분의 하루 중 가장 좋아하는 시간을 영어로 소개해보세요. 언제, 무엇을 하는지 말하고 좋아하는 이유를 구체적으로 설명해주세요. 발표 시간은 1분입니다.",
    rubric:
      "주제에 맞는 내용과 구체적인 이유, 적절한 영어 표현, 자연스러운 답변 구성을 평가합니다. 발화 인식 오류는 실제 음성과 비교해 확인합니다.",
    criteria: defaultCriteria(),
    sample: true,
  }));
  const demo = (
    student: number,
    course: number,
    confirmed: boolean,
    score: number,
  ): Take => ({
    id: "example-" + course + "-" + student,
    courseId: courses[course].id,
    studentId: courses[course].students[student].id,
    studentName: names[student],
    studentNumber: student + 1,
    task: courses[course].task,
    criteria: defaultCriteria(),
    rubric: courses[course].rubric,
    kind: "audio",
    duration: 64 + student * 8,
    createdAt: new Date(
      Date.now() - 1000 * 60 * (student + 1) * 35,
    ).toISOString(),
    sample: true,
    transcript:
      "My favorite time of the day is after school. Yesterday, I go to the park with my friend. We played basketball for an hour. I like this time because I can relax and have fun with my friends.",
    evidence: [
      {
        quote: "go",
        correction: "went",
        reason:
          "Yesterday로 과거의 일을 이야기하고 있어 동사의 과거형 went가 필요합니다. 영어 표현 기준에 연결한 검토 예시입니다.",
        criterion: "영어 표현",
        start: 12,
      },
    ],
    scores: { content: score - 52, expression: 24, structure: 28 },
    feedback:
      "좋아하는 시간과 이유를 구체적으로 설명했어요. 과거에 있었던 일을 이야기할 때는 동사의 과거형을 한 번 더 확인해보세요.",
    confirmed,
  });
  return {
    version: 1,
    profile: { name: "김서연", school: "스피크노트 중학교", subject: "영어" },
    courses,
    takes: [
      demo(0, 0, false, 88),
      demo(1, 0, false, 84),
      demo(2, 0, true, 92),
      demo(3, 1, false, 86),
      demo(0, 2, true, 90),
    ],
  };
}
export function loadData(): StudioData {
  try {
    const parsed = JSON.parse(localStorage.getItem(DATA_KEY) || "null");
    if (
      parsed?.version === 1 &&
      Array.isArray(parsed.courses) &&
      Array.isArray(parsed.takes)
    )
      return parsed;
  } catch {}
  return initialData();
}
export function persist(data: StudioData) {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
}
export const latestTake = (
  takes: Take[],
  courseId: string,
  studentId: string,
) => takes.find((t) => t.courseId === courseId && t.studentId === studentId);
export const total = (take: Take) =>
  take.scores ? Object.values(take.scores).reduce((a, b) => a + b, 0) : null;
export const clock = (sec: number) =>
  `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
export const timeAgo = (time: string) => {
  const minutes = Math.max(
    1,
    Math.floor((Date.now() - new Date(time).getTime()) / 60000),
  );
  return minutes < 60
    ? minutes + "분 전"
    : minutes < 1440
      ? Math.floor(minutes / 60) + "시간 전"
      : Math.floor(minutes / 1440) + "일 전";
};
export async function audioDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("speaking-studio-media", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("media");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new Error("브라우저 저장소를 열지 못했습니다."));
  });
}
export async function saveMedia(key: string, blob: Blob) {
  const db = await audioDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("media", "readwrite");
    tx.objectStore("media").put(blob, key);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(
        new Error("원본 저장에 실패했습니다. 파일을 내려받아 보관해주세요."),
      );
    };
  });
}
export async function readMedia(key: string) {
  const db = await audioDB();
  return new Promise<Blob | undefined>((resolve, reject) => {
    const tx = db.transaction("media");
    const request = tx.objectStore("media").get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}
export function download(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}
export function exportResults(takes: Take[], courses: Course[]) {
  const safe = (v: unknown) =>
    '"' +
    String(v ?? "")
      .replace(/^[=+@\-]/, "'$&")
      .replace(/"/g, '""') +
    '"';
  const rows = [
    ["수업", "학급", "번호", "이름", "평가", "상태", "점수", "피드백"],
    ...takes.map((t) => {
      const c = courses.find((c) => c.id === t.courseId);
      return [
        c?.name,
        c?.grade + " " + c?.classroom,
        t.studentNumber,
        t.studentName,
        t.task,
        t.confirmed ? "확정" : t.scores ? "검토 필요" : "원본 저장",
        total(t),
        t.feedback,
      ];
    }),
  ];
  download(
    new Blob(["\uFEFF" + rows.map((r) => r.map(safe).join(",")).join("\r\n")], {
      type: "text/csv;charset=utf-8",
    }),
    "말하기_평가결과.csv",
  );
}
