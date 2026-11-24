import { Course, Student, StudioData } from "./model";
export const currentTerm = () => ({
  year: new Date().getFullYear(),
  semester: (new Date().getMonth() < 7 ? 1 : 2) as 1 | 2,
});
export const termLabel = (c: Course) =>
  c.year ? `${c.year}학년도 · ${c.semester}학기` : "학기 미지정";
export const sameTerm = (
  a: Pick<Course, "year" | "semester">,
  b: Pick<Course, "year" | "semester">,
) => a.year === b.year && a.semester === b.semester;
export const assessmentFields = (c: Course) =>
  structuredClone({
    task: c.task,
    prompt: c.prompt,
    rubric: c.rubric,
    criteria: c.criteria,
  });
export function updateStudent(
  data: StudioData,
  cid: string,
  student: Student,
): StudioData {
  const course = data.courses.find((c) => c.id === cid);
  if (!course || course.archivedAt)
    throw new Error("운영 중인 수업에서만 학생 정보를 수정할 수 있어요.");
  if (!course.students.some((s) => s.id === student.id))
    throw new Error("수정할 학생을 찾지 못했어요.");
  if (
    !student.name.trim() ||
    student.name.trim().length > 60 ||
    /[\x00-\x1f]/.test(student.name) ||
    !Number.isInteger(student.number) ||
    student.number < 1 ||
    student.number > 999
  )
    throw new Error("이름과 1~999 사이의 번호를 확인해주세요.");
  if (
    course.students.some(
      (s) => s.id !== student.id && s.number === student.number,
    )
  )
    throw new Error("이미 등록된 번호예요. 다른 번호를 입력해주세요.");
  const next = { ...student, name: student.name.trim() };
  return {
    ...data,
    courses: data.courses.map((c) =>
      c.id === cid
        ? {
            ...c,
            students: c.students
              .map((s) => (s.id === next.id ? next : s))
              .sort((a, b) => a.number - b.number),
          }
        : c,
    ),
    takes: data.takes.map((t) =>
      t.courseId === cid && t.studentId === next.id
        ? { ...t, studentName: next.name, studentNumber: next.number }
        : t,
    ),
  };
}
export function applyAssessment(
  data: StudioData,
  source: Course,
  ids: string[],
): StudioData {
  const chosen = new Set(ids);
  chosen.add(source.id);
  if (
    [...chosen].some(
      (id) => !data.courses.some((c) => c.id === id && !c.archivedAt),
    )
  )
    throw new Error("운영 중인 수업만 선택해주세요.");
  return {
    ...data,
    courses: data.courses.map((c) =>
      chosen.has(c.id) ? { ...c, ...assessmentFields(source) } : c,
    ),
  };
}
export function archiveCourses(
  data: StudioData,
  ids: string[],
  term: { year: number; semester: 1 | 2 },
): StudioData {
  if (
    !ids.length ||
    !Number.isInteger(term.year) ||
    term.year < 2000 ||
    term.year > 2100
  )
    throw new Error("학년도와 보관할 수업을 확인해주세요.");
  if (
    ids.some(
      (id) =>
        !data.courses.some(
          (c) => c.id === id && !c.archivedAt && (!c.year || sameTerm(c, term)),
        ),
    )
  )
    throw new Error("선택한 학기의 운영 중인 수업만 보관할 수 있어요.");
  const archivedAt = new Date().toISOString();
  return {
    ...data,
    courses: data.courses.map((c) =>
      ids.includes(c.id) && !c.archivedAt ? { ...c, ...term, archivedAt } : c,
    ),
  };
}
