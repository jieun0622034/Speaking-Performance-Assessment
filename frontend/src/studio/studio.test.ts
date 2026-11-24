import { beforeEach, describe, expect, it, vi } from "vitest";
import { indexedDB } from "fake-indexeddb";
import {
  initialData,
  saveLegacyMedia as saveMedia,
  readLegacyMedia as readMedia,
  latestTake,
  total,
  DATA_KEY,
  loadData,
  persist,
} from "./model";
import { parseCSV, rosterRows } from "./Forms";

describe("teacher speaking workspace", () => {
  beforeEach(() => {
    vi.stubGlobal("indexedDB", indexedDB);
  });
  it("keeps example scores explicitly separate from actual recordings", () => {
    const data = initialData();
    expect(data.courses).toHaveLength(3);
    expect(data.takes.every((t) => t.sample && !t.blobId)).toBe(true);
    for (const t of data.takes) {
      expect(
        data.courses
          .find((c) => c.id === t.courseId)
          ?.students.some((s) => s.id === t.studentId),
      ).toBe(true);
      expect(total(t)).toBeLessThanOrEqual(100);
    }
  });
  it("reads quoted names, BOM headers and multiline CSV cells", () => {
    const rows = rosterRows(
      parseCSV('\uFEFF번호,이름\r\n1,"Kim, Mina"\r\n2,"Lee\nJin"'),
    );
    expect(rows[0].name).toBe("Kim, Mina");
    expect(rows[1].name).toBe("Lee\nJin");
    expect(() => parseCSV('번호,이름\n1,"잘못된 따옴표')).toThrow();
  });
  it("requires actual roster column headings", () => {
    expect(() =>
      rosterRows([
        ["아무 제목", "설명"],
        [1, "김민서"],
      ]),
    ).toThrow("번호와 이름");
  });
  it("saves and reopens the original audio blob", async () => {
    const key = "test-audio-" + crypto.randomUUID();
    const raw = new Blob(["RIFF-original-fixture"], { type: "audio/wav" });
    await saveMedia(key, raw);
    const saved = await readMedia(key);
    expect(saved?.type).toBe("audio/wav");
    expect(await saved?.text()).toBe(await raw.text());
  });
  it("keeps a saved rubric snapshot when a course rubric changes", () => {
    const data = initialData();
    const t = data.takes[0];
    data.courses[0].criteria[0].name = "새 이름";
    expect(t.criteria[0].name).toBe("내용의 충실성");
    expect(latestTake(data.takes, "c1", "c1-s0")?.id).toBe(t.id);
  });
  it("restores the teacher workspace without touching legacy data", () => {
    const storage = new Map<string, string>([
      ["assessment_ai_assessments", "legacy untouched"],
    ]);
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => storage.get(k) || null,
      setItem: (k: string, v: string) => storage.set(k, v),
    });
    const data = initialData();
    data.profile.name = "테스트 교사";
    persist(data);
    expect(loadData().profile.name).toBe("테스트 교사");
    expect(storage.get("assessment_ai_assessments")).toBe("legacy untouched");
    expect(storage.has(DATA_KEY)).toBe(true);
  });
});
