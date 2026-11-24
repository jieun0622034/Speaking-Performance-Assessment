import {
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import {
  Plus,
  Trash2,
  FileSpreadsheet,
  Download,
  ClipboardPaste,
  Check,
  LoaderCircle,
} from "lucide-react";
import { Course, Student, id, download } from "./model";
import { parseCSV, rosterRows, type Row } from "./roster";
import { Modal } from "./UI";
import { request } from "./server";

export function blankRows(start: number, count = 8): Row[] {
  return Array.from({ length: count }, (_, i) => ({
    number: String(start + i),
    name: "",
    selected: true,
  }));
}
export function applyGridPaste(
  rows: Row[],
  start: number,
  column: "number" | "name",
  text: string,
  nextNumber: number,
): Row[] {
  const cells = parseCSV(text);
  if (!cells.length) return rows;
  if (
    cells[0].some((c) =>
      ["번호", "number", "학번"].includes(c.trim().replace(/^\uFEFF/, "")),
    ) &&
    cells[0].some((c) => ["이름", "name", "성명"].includes(c.trim()))
  )
    cells.shift();
  if (cells.length + start > 1000)
    throw new Error("한 번에 1,000명까지 입력할 수 있어요.");
  const result = rows.map((r) => ({ ...r }));
  while (result.length < start + cells.length)
    result.push(...blankRows(nextNumber + result.length, 1));
  cells.forEach((cell, offset) => {
    const row = result[start + offset];
    if (column === "number") {
      row.number = String(cell[0] ?? "").trim();
      if (cell.length > 1) row.name = String(cell[1] ?? "").trim();
    } else row.name = String(cell[0] ?? "").trim();
    row.selected = true;
  });
  return result;
}
export function rowIssues(
  rows: Row[],
  existing: Student[],
): Map<number, string> {
  const issues = new Map<number, string>(),
    seen = new Map<number, number>(),
    registered = new Set(existing.map((s) => s.number));
  rows.forEach((r, i) => {
    if (!r.selected || !r.name.trim()) return;
    const number = Number(r.number);
    if (!/^[0-9]{1,3}$/.test(r.number) || number < 1) {
      issues.set(i, "번호는 1~999로 입력해주세요.");
      return;
    }
    if (r.name.trim().length > 60 || /[\r\n\t]/.test(r.name)) {
      issues.set(i, "이름은 줄바꿈 없이 60자 이내로 입력해주세요.");
      return;
    }
    if (registered.has(number)) {
      issues.set(i, "수업에 이미 등록된 번호예요.");
      return;
    }
    if (seen.has(number)) {
      issues.set(i, "입력한 명단에서 번호가 겹쳐요.");
      issues.set(seen.get(number)!, "입력한 명단에서 번호가 겹쳐요.");
    } else seen.set(number, i);
  });
  return issues;
}

export function RosterForm({
  course,
  onClose,
  onSave,
}: {
  course: Course;
  onClose: () => void;
  onSave: (s: Student[]) => void | Promise<void>;
}) {
  const next = Math.max(0, ...course.students.map((s) => s.number)) + 1;
  const [rows, setRows] = useState<Row[]>(() => blankRows(next)),
    [mode, setMode] = useState<"grid" | "file">("grid"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saving, setSaving] = useState(false),
    [filename, setFilename] = useState("");
  const input = useRef<HTMLInputElement>(null),
    table = useRef<HTMLDivElement>(null);
  const issues = rowIssues(rows, course.students),
    selected = rows.filter((r) => r.selected && r.name.trim()),
    valid = selected.length - issues.size;
  function update(i: number, field: "number" | "name", value: string) {
    setRows((old) =>
      old.map((r, j) => (j === i ? { ...r, [field]: value } : r)),
    );
    setError("");
  }
  function focus(i: number, column: "number" | "name") {
    requestAnimationFrame(() => {
      const el = table.current?.querySelector<HTMLInputElement>(
        `[data-row="${i}"][data-column="${column}"]`,
      );
      el?.focus();
      el?.select();
    });
  }
  function paste(
    e: ClipboardEvent<HTMLInputElement>,
    i: number,
    column: "number" | "name",
  ) {
    const text = e.clipboardData.getData("text/plain");
    if (!text.includes("\t") && !/[\r\n]/.test(text)) return;
    e.preventDefault();
    try {
      setRows(applyGridPaste(rows, i, column, text, next));
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  }
  function key(
    e: KeyboardEvent<HTMLInputElement>,
    i: number,
    column: "number" | "name",
  ) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const target = e.shiftKey ? Math.max(0, i - 1) : i + 1;
    if (target >= 1000) return;
    if (target >= rows.length)
      setRows((old) => [...old, ...blankRows(next + old.length, 1)]);
    focus(target, column);
  }
  function append() {
    const count = Math.min(5, 1000 - rows.length);
    setRows((old) => [...old, ...blankRows(next + old.length, count)]);
    focus(rows.length, "name");
  }
  async function upload(file: File) {
    setBusy(true);
    setError("");
    try {
      if (file.size > 10 * 1024 * 1024)
        throw new Error("파일은 10MB 이하로 올려주세요.");
      let cells: unknown[][];
      if (file.name.toLowerCase().endsWith(".xlsx")) {
        const { readSheet } = await import("read-excel-file/browser");
        cells = await readSheet(file);
      } else if (file.name.toLowerCase().endsWith(".pdf")) {
        const form = new FormData();
        form.append("file", file);
        const response = await request<{ text: string }>(
          "/files/extract-text",
          { body: form },
        );
        cells = response.text
          .split(/\r?\n/)
          .filter((s) => s.trim())
          .map((s) => s.trim().split(/\s+|,/));
      } else {
        let text = await file.text();
        if (text.includes("\uFFFD"))
          text = new TextDecoder("euc-kr").decode(await file.arrayBuffer());
        cells = parseCSV(text);
      }
      const parsed = rosterRows(cells);
      if (!parsed.length || parsed.length > 1000)
        throw new Error("명단은 1~1,000명까지 가져올 수 있어요.");
      const registered = new Set(course.students.map((s) => s.number));
      setRows(
        parsed.map((r) => ({
          ...r,
          selected: !registered.has(Number(r.number)),
        })),
      );
      setFilename(file.name);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    if (saving) return;
    if (!selected.length) {
      setError("이름을 입력한 학생을 한 명 이상 선택해주세요.");
      return;
    }
    if (issues.size) {
      setError("빨간색으로 표시된 번호·이름을 확인해주세요.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(
        selected.map((r) => ({
          id: id(),
          number: Number(r.number),
          name: r.name.trim(),
        })),
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal
      title="학생 명단 한 번에 등록"
      subtitle={`${course.grade} ${course.classroom} · 여러 행을 입력하고 한 번에 등록하세요.`}
      onClose={() => {
        if (!saving) onClose();
      }}
      wide
      className="roster-dialog"
    >
      <div className="segmented">
        <button
          disabled={saving}
          className={mode === "grid" ? "active" : ""}
          onClick={() => setMode("grid")}
        >
          표에 직접 입력
        </button>
        <button
          disabled={saving}
          className={mode === "file" ? "active" : ""}
          onClick={() => setMode("file")}
        >
          파일 가져오기
        </button>
      </div>
      {mode === "file" && (
        <>
          <input
            ref={input}
            hidden
            type="file"
            accept=".csv,.xlsx,.pdf"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
              e.target.value = "";
            }}
          />
          <button
            className="upload-drop"
            disabled={busy || saving}
            onClick={() => input.current?.click()}
          >
            {busy ? (
              <LoaderCircle className="spin" />
            ) : (
              <FileSpreadsheet size={27} />
            )}
            <strong>
              {busy
                ? "명단을 읽는 중이에요"
                : filename || "엑셀·CSV·PDF 명단 선택"}
            </strong>
            <span>최대 10MB · 번호, 이름 열이 필요해요</span>
          </button>
        </>
      )}
      <div className="grid-paste-tip">
        <ClipboardPaste size={18} />
        <p>
          엑셀에서 <strong>번호·이름 두 열을 복사</strong>한 뒤 첫 번째 셀에
          붙여넣으세요. Enter로 다음 행을 입력할 수 있어요.
        </p>
      </div>
      <div className="roster-sheet" ref={table}>
        <table aria-label="학생 명단 일괄 입력">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  aria-label="전체 학생 선택"
                  checked={rows.every((r) => r.selected)}
                  disabled={saving}
                  onChange={(e) =>
                    setRows((old) =>
                      old.map((r) => ({ ...r, selected: e.target.checked })),
                    )
                  }
                />
              </th>
              <th>행</th>
              <th>번호</th>
              <th>학생 이름</th>
              <th aria-label="행 삭제" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={issues.has(i) ? "invalid-row" : ""}>
                <td>
                  <input
                    aria-label={`${i + 1}행 선택`}
                    type="checkbox"
                    checked={row.selected}
                    disabled={saving}
                    onChange={(e) =>
                      setRows((old) =>
                        old.map((r, j) =>
                          j === i ? { ...r, selected: e.target.checked } : r,
                        ),
                      )
                    }
                  />
                </td>
                <th scope="row">{i + 1}</th>
                <td>
                  <input
                    aria-label={`${i + 1}행 번호`}
                    aria-invalid={issues.has(i)}
                    data-row={i}
                    data-column="number"
                    inputMode="numeric"
                    value={row.number}
                    maxLength={3}
                    disabled={saving}
                    onChange={(e) => update(i, "number", e.target.value)}
                    onPaste={(e) => paste(e, i, "number")}
                    onKeyDown={(e) => key(e, i, "number")}
                  />
                </td>
                <td>
                  <input
                    aria-label={`${i + 1}행 이름`}
                    aria-invalid={issues.has(i)}
                    data-row={i}
                    data-column="name"
                    placeholder="학생 이름"
                    value={row.name}
                    maxLength={60}
                    disabled={saving}
                    onChange={(e) => update(i, "name", e.target.value)}
                    onPaste={(e) => paste(e, i, "name")}
                    onKeyDown={(e) => key(e, i, "name")}
                  />
                  {issues.has(i) && (
                    <span className="row-error">{issues.get(i)}</span>
                  )}
                </td>
                <td>
                  <button
                    className="icon-button"
                    aria-label={`${i + 1}행 삭제`}
                    disabled={saving || rows.length === 1}
                    onClick={() =>
                      setRows((old) => old.filter((_, j) => j !== i))
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="roster-sheet-tools">
        <button
          className="secondary-button"
          disabled={saving || rows.length >= 1000}
          onClick={append}
        >
          <Plus size={15} />
          5행 추가
        </button>
        <button
          className="text-button"
          onClick={() =>
            download(
              new Blob(["\uFEFF번호,이름\r\n1,김민서\r\n2,이도윤"], {
                type: "text/csv;charset=utf-8",
              }),
              "학생명단_양식.csv",
            )
          }
        >
          <Download size={14} />
          양식 받기
        </button>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="roster-summary">
        <span>
          등록 가능 <strong>{Math.max(0, valid)}명</strong>
          {issues.size > 0 && <b> · 확인 필요 {issues.size}행</b>}
        </span>
        <span>이름이 비어 있는 행은 제외돼요.</span>
      </div>
      <div className="form-footer">
        <button
          className="secondary-button"
          disabled={saving}
          onClick={onClose}
        >
          취소
        </button>
        <button
          className="primary-button"
          disabled={saving || busy || !selected.length || issues.size > 0}
          onClick={() => void submit()}
        >
          {saving ? (
            <LoaderCircle size={16} className="spin" />
          ) : (
            <Check size={16} />
          )}
          학생 {selected.length}명 한 번에 등록
        </button>
      </div>
    </Modal>
  );
}
