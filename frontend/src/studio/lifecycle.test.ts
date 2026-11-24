import { describe, it, expect } from "vitest";
import { initialData } from "./model";
import {
  archiveCourses,
  applyAssessment,
  updateStudent,
  termLabel,
} from "./lifecycle";
describe("term lifecycle and shared assessment", () => {
  it("corrects student identity in linked recordings without changing IDs, scores or originals", () => {
    const data = initialData(),
      c = data.courses[0],
      s = c.students[0],
      t = data.takes[0];
    const next = updateStudent(data, c.id, {
      ...s,
      name: "김민수",
      number: 21,
    });
    expect(next.courses[0].students.find((x) => x.id === s.id)?.name).toBe(
      "김민수",
    );
    expect(next.takes[0]).toEqual({
      ...t,
      studentName: "김민수",
      studentNumber: 21,
    });
    expect(data.courses[0].students[0].name).not.toBe("김민수");
  });
  it("rejects duplicate number, invalid name and changes to archived rosters", () => {
    const data = initialData(),
      c = data.courses[0];
    expect(() =>
      updateStudent(data, c.id, { ...c.students[0], number: 2 }),
    ).toThrow("이미 등록");
    expect(() =>
      updateStudent(data, c.id, { ...c.students[0], name: " " }),
    ).toThrow();
    const archived = archiveCourses(data, [c.id], { year: 2026, semester: 2 });
    expect(() => updateStudent(archived, c.id, c.students[0])).toThrow(
      "운영 중",
    );
  });
  it("applies one rubric to selected courses without altering rosters or previously recorded criteria", () => {
    const data = initialData(),
      draft = structuredClone(data.courses[0]);
    draft.task = "공통 발표 평가";
    draft.criteria[0].max = 50;
    const next = applyAssessment(data, draft, [
      data.courses[0].id,
      data.courses[1].id,
    ]);
    expect(next.courses[1].task).toBe(draft.task);
    expect(next.courses[1].students).toEqual(data.courses[1].students);
    expect(next.courses[2]).toEqual(data.courses[2]);
    expect(next.takes).toEqual(data.takes);
    next.courses[0].criteria[0].name = "changed";
    expect(next.courses[1].criteria[0].name).not.toBe("changed");
  });
  it("archives only selected classes and preserves all original evaluation records", () => {
    const data = initialData();
    const next = archiveCourses(data, [data.courses[0].id], {
      year: 2025,
      semester: 1,
    });
    expect(next.courses[0].archivedAt).toBeTruthy();
    expect(termLabel(next.courses[0])).toBe("2025학년도 · 1학기");
    expect(next.courses[1].archivedAt).toBeUndefined();
    expect(next.takes).toEqual(data.takes);
    expect(() =>
      applyAssessment(next, next.courses[1], [next.courses[0].id]),
    ).toThrow();
  });
  it('does not archive a known class under another semester',()=>{const data=initialData();data.courses[0].year=2026;data.courses[0].semester=1;expect(()=>archiveCourses(data,[data.courses[0].id],{year:2026,semester:2})).toThrow('선택한 학기');});
});
