import { describe, it, expect } from "vitest";
import { applyGridPaste, blankRows, rowIssues } from "./RosterGrid";
import { rosterRows } from "./roster";
describe("bulk roster entry", () => {
  it("pastes Excel TSV including headers and adds rows without discarding existing cells", () => {
    const rows = blankRows(1, 2);
    rows[0].name = "기존 입력";
    const pasted = applyGridPaste(
      rows,
      1,
      "number",
      "번호\t이름\r\n2\t김민서\r\n3\t이도윤\r\n4\t박서준\r\n",
      1,
    );
    expect(pasted.map((r) => r.name)).toEqual([
      "기존 입력",
      "김민서",
      "이도윤",
      "박서준",
    ]);
    expect(pasted[3].number).toBe("4");
  });
  it("pastes a single name column while preserving assigned numbers", () => {
    expect(
      applyGridPaste(blankRows(10, 2), 0, "name", "김민서\n이도윤", 10).map(
        (r) => [r.number, r.name],
      ),
    ).toEqual([
      ["10", "김민서"],
      ["11", "이도윤"],
    ]);
  });
  it("reports both duplicate rows, invalid numbers and existing registrations", () => {
    const rows = [
      { number: "1", name: "김", selected: true },
      { number: "1", name: "이", selected: true },
      { number: "0", name: "박", selected: true },
      { number: "3", name: "최", selected: true },
      { number: "5", name: "", selected: true },
    ];
    expect(
      [
        ...rowIssues(rows, [{ id: "s", number: 3, name: "등록학생" }]).keys(),
      ].sort(),
    ).toEqual([0, 1, 2, 3]);
    rows[1].selected = false;
    expect(rowIssues(rows, []).has(0)).toBe(false);
  });
  it("bounds a paste at 1000 rows", () => {
    expect(() =>
      applyGridPaste(blankRows(1), 999, "number", "1\t김\n2\t이", 1),
    ).toThrow("1,000");
  });
  it("maps Excel headers by their meaning and preserves Korean names", () => {
    expect(
      rosterRows([
        ["성명", "출석번호"],
        ["김민서", 1],
        ["이도윤", 2],
      ]).map((r) => [r.number, r.name]),
    ).toEqual([
      ["1", "김민서"],
      ["2", "이도윤"],
    ]);
  });
});
