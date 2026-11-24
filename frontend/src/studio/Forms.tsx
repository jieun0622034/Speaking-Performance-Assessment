import { useRef, useState } from "react";
import {
  Plus,
  Upload,
  FileSpreadsheet,
  Check,
  Trash2,
  FileText,
  LoaderCircle,
} from "lucide-react";
import { Course, Student, defaultCriteria, id, download } from "./model";
import { Modal } from "./UI";
export function CourseForm({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (c: Course) => void;
}) {
  const [name, setName] = useState(""),
    [grade, setGrade] = useState("2학년"),
    [classroom, setClassroom] = useState("1반"),
    [color, setColor] = useState("mint");
  return (
    <Modal
      title="새로운 수업을 시작해요"
      subtitle="수업을 만든 뒤 학생과 평가 기준을 등록할 수 있어요."
      onClose={onClose}
    >
      <form
        className="studio-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            id: id(),
            name: name.trim(),
            grade,
            classroom: classroom.trim(),
            color,
            students: [],
            task: "첫 번째 말하기 평가",
            prompt: "학생이 발표할 주제와 과제 안내를 작성해주세요.",
            rubric: "",
            criteria: defaultCriteria(),
          });
        }}
      >
        <label>
          수업 이름
          <input
            autoFocus
            required
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 함께 말하는 영어"
          />
        </label>
        <div className="form-two">
          <label>
            학년
            <select value={grade} onChange={(e) => setGrade(e.target.value)}>
              {["1학년", "2학년", "3학년", "기타"].map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </label>
          <label>
            학급
            <input
              required
              maxLength={30}
              value={classroom}
              onChange={(e) => setClassroom(e.target.value)}
              placeholder="1반"
            />
          </label>
        </div>
        <label>수업 카드 색상</label>
        <div className="color-options">
          {[
            ["mint", "민트"],
            ["peach", "살구"],
            ["lavender", "라벤더"],
            ["blue", "하늘"],
          ].map(([c, label]) => (
            <button
              type="button"
              key={c}
              className={c + (color === c ? " selected" : "")}
              aria-label={label}
              onClick={() => setColor(c)}
            >
              {color === c && <Check size={20} />}
            </button>
          ))}
        </div>
        <div className="form-footer">
          <button type="button" className="secondary-button" onClick={onClose}>
            취소
          </button>
          <button className="primary-button">
            <Plus size={17} />
            수업 만들기
          </button>
        </div>
      </form>
    </Modal>
  );
}
interface Row {
  number: string;
  name: string;
  selected: boolean;
}
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && (ch === "," || ch === "\t")) {
      row.push(cell);
      cell = "";
    } else if (!quoted && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (quoted)
    throw new Error("CSV 따옴표가 닫히지 않았습니다. 파일을 확인해주세요.");
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}
export function rosterRows(table: unknown[][]): Row[] {
  const headers = (table[0] || []).map((c) =>
    String(c ?? "")
      .replace(/^\uFEFF/, "")
      .replace(/\s/g, "")
      .toLowerCase(),
  );
  const ni = headers.findIndex((x) =>
    ["번호", "학번", "number", "no", "출석번호"].includes(x),
  );
  const nn = headers.findIndex((x) =>
    ["이름", "성명", "학생명", "name"].includes(x),
  );
  if (ni < 0 || nn < 0)
    throw new Error(
      "첫 행에 번호와 이름 열이 필요합니다. 명단 양식을 참고해주세요.",
    );
  return table
    .slice(1)
    .filter((r) => r.some((c) => String(c ?? "").trim()))
    .map((r) => ({
      number: String(r[ni] ?? "").trim(),
      name: String(r[nn] ?? "").trim(),
      selected: true,
    }));
}
export function RosterForm({
  course,
  onClose,
  onSave,
}: {
  course: Course;
  onClose: () => void;
  onSave: (students: Student[]) => void;
}) {
  const [mode, setMode] = useState("manual"),
    [number, setNumber] = useState(
      String(Math.max(0, ...course.students.map((s) => s.number)) + 1),
    ),
    [name, setName] = useState(""),
    [rows, setRows] = useState<Row[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  function save(list: Row[]) {
    setError("");
    const selected = list.filter((r) => r.selected);
    if (!selected.length) {
      setError("등록할 학생을 선택해주세요.");
      return;
    }
    const seen = new Set(course.students.map((s) => s.number));
    const students: Student[] = [];
    for (const row of selected) {
      if (
        !/^[0-9]{1,3}$/.test(row.number) ||
        Number(row.number) < 1 ||
        !row.name.trim() ||
        row.name.length > 60
      ) {
        setError("번호는 1~999, 이름은 1~60자로 입력해주세요.");
        return;
      }
      if (seen.has(Number(row.number))) {
        setError(
          `${row.number}번이 중복됩니다. 번호를 수정하거나 선택을 해제해주세요.`,
        );
        return;
      }
      seen.add(Number(row.number));
      students.push({
        id: id(),
        number: Number(row.number),
        name: row.name.trim(),
      });
    }
    onSave(students);
  }
  async function upload(file: File) {
    setBusy(true);
    setError("");
    try {
      if (file.size > 10 * 1024 * 1024)
        throw new Error("파일은 10MB 이하로 올려주세요.");
      let table: unknown[][] = [];
      if (file.name.toLowerCase().endsWith(".xlsx")) {
        const { readSheet } = await import("read-excel-file/browser");
        table = await readSheet(file);
      } else if (file.name.toLowerCase().endsWith(".pdf")) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/files/extract-text", {
          method: "POST",
          body: form,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "PDF를 읽지 못했습니다.");
        table = data.text
          .split(/\r?\n/)
          .filter((s: string) => s.trim())
          .map((s: string) => s.trim().split(/\s+|,/));
      } else {
        let text = await file.text();
        if (text.includes("\uFFFD"))
          text = new TextDecoder("euc-kr").decode(await file.arrayBuffer());
        table = parseCSV(text);
      }
      const result = rosterRows(table);
      if (result.length > 1000)
        throw new Error("한 번에 1,000명까지 등록할 수 있습니다.");
      if (!result.length) throw new Error("등록할 학생 행이 없습니다.");
      const existing = new Set(course.students.map((s) => s.number));
      setRows(
        result.map((r) => ({
          ...r,
          selected: !existing.has(Number(r.number)),
        })),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="학생 명단 등록"
      subtitle={`${course.grade} ${course.classroom} · ${course.name}`}
      onClose={onClose}
      wide={!!rows.length}
    >
      <div className="segmented">
        <button
          className={mode === "manual" ? "active" : ""}
          onClick={() => {
            setMode("manual");
            setError("");
          }}
        >
          한 명씩 입력
        </button>
        <button
          className={mode === "file" ? "active" : ""}
          onClick={() => {
            setMode("file");
            setError("");
          }}
        >
          파일로 한 번에
        </button>
      </div>
      {mode === "manual" ? (
        <form
          className="studio-form"
          onSubmit={(e) => {
            e.preventDefault();
            save([{ number, name, selected: true }]);
          }}
        >
          <div className="form-two">
            <label>
              번호
              <input
                autoFocus
                required
                type="number"
                min="1"
                max="999"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
              />
            </label>
            <label>
              학생 이름
              <input
                required
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="학생 이름"
              />
            </label>
          </div>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <div className="form-footer">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
            >
              취소
            </button>
            <button className="primary-button">학생 등록</button>
          </div>
        </form>
      ) : (
        <>
          <input
            type="file"
            ref={input}
            hidden
            accept=".xlsx,.csv,.pdf"
            onChange={(e) => {
              if (e.target.files?.[0]) void upload(e.target.files[0]);
              e.target.value = "";
            }}
          />
          <button
            className="upload-drop"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            {busy ? (
              <LoaderCircle className="spin" />
            ) : (
              <FileSpreadsheet size={31} />
            )}
            <strong>
              {busy ? "명단을 읽고 있어요" : "학생 명단 파일을 선택해주세요"}
            </strong>
            <span>Excel · CSV · 텍스트 PDF / 최대 10MB</span>
            <small>
              첫 행에 ‘번호’, ‘이름’이 필요해요. PDF는 단순 표만 지원해요.
            </small>
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
            명단 양식 내려받기
          </button>
          {rows.length > 0 && (
            <div className="import-preview">
              <h3>
                등록 전 명단 확인 <span>{rows.length}명</span>
              </h3>
              <div className="import-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>선택</th>
                      <th>번호</th>
                      <th>이름</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i}>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`${i + 1}행 등록 선택`}
                            checked={r.selected}
                            onChange={(e) =>
                              setRows(
                                rows.map((s, j) =>
                                  i === j
                                    ? { ...s, selected: e.target.checked }
                                    : s,
                                ),
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            aria-label={`${i + 1}행 번호`}
                            value={r.number}
                            onChange={(e) =>
                              setRows(
                                rows.map((s, j) =>
                                  i === j
                                    ? { ...s, number: e.target.value }
                                    : s,
                                ),
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            aria-label={`${i + 1}행 이름`}
                            value={r.name}
                            onChange={(e) =>
                              setRows(
                                rows.map((s, j) =>
                                  i === j ? { ...s, name: e.target.value } : s,
                                ),
                              )
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <div className="form-footer">
            <button className="secondary-button" onClick={onClose}>
              취소
            </button>
            <button
              disabled={!rows.some((r) => r.selected) || busy}
              className="primary-button"
              onClick={() => save(rows)}
            >
              선택한 {rows.filter((r) => r.selected).length}명 등록
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
export function CriteriaForm({
  course,
  onClose,
  onSave,
}: {
  course: Course;
  onClose: () => void;
  onSave: (c: Course) => void;
}) {
  const [draft, setDraft] = useState(structuredClone(course)),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function pdf(file: File) {
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/files/extract-text", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "PDF를 읽지 못했습니다.");
      setDraft({ ...draft, rubric: data.text });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="말하기 평가 설계"
      subtitle="학생에게 안내할 과제와 선생님의 채점 기준을 정해주세요."
      onClose={onClose}
      wide
    >
      <form
        className="studio-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (
            draft.criteria.some(
              (c) =>
                !c.name.trim() ||
                !Number.isFinite(c.max) ||
                c.max <= 0 ||
                c.max > 100,
            )
          ) {
            setError("항목명과 1~100점 사이의 배점을 확인해주세요.");
            return;
          }
          onSave(draft);
        }}
      >
        <label>
          평가 이름
          <input
            required
            maxLength={100}
            value={draft.task}
            onChange={(e) => setDraft({ ...draft, task: e.target.value })}
          />
        </label>
        <label>
          학생에게 안내할 과제
          <textarea
            required
            rows={3}
            value={draft.prompt}
            onChange={(e) => setDraft({ ...draft, prompt: e.target.value })}
          />
        </label>
        <div className="label-row">
          <label>상세 평가 기준·허용 답안</label>
          <label className="file-pick">
            <FileText size={15} />
            {busy ? "PDF 읽는 중" : "PDF에서 가져오기"}
            <input
              type="file"
              accept=".pdf"
              hidden
              disabled={busy}
              onChange={(e) => {
                if (e.target.files?.[0]) void pdf(e.target.files[0]);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        <textarea
          rows={4}
          maxLength={60000}
          value={draft.rubric}
          onChange={(e) => setDraft({ ...draft, rubric: e.target.value })}
          placeholder="제시문·정답·허용 답안이 있다면 함께 작성해주세요."
        />
        <div className="label-row">
          <h3>평가 항목</h3>
          <strong>총 {draft.criteria.reduce((s, c) => s + c.max, 0)}점</strong>
        </div>
        {draft.criteria.map((c, i) => (
          <div className="criterion-editor" key={c.id}>
            <div>
              <label>
                항목명
                <input
                  aria-label={`${i + 1}번 항목명`}
                  required
                  value={c.name}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      criteria: draft.criteria.map((x, j) =>
                        j === i ? { ...x, name: e.target.value } : x,
                      ),
                    })
                  }
                />
              </label>
              <label>
                배점
                <input
                  aria-label={`${i + 1}번 배점`}
                  type="number"
                  required
                  min="1"
                  max="100"
                  value={c.max || ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      criteria: draft.criteria.map((x, j) =>
                        j === i ? { ...x, max: Number(e.target.value) } : x,
                      ),
                    })
                  }
                />
              </label>
              <button
                type="button"
                aria-label="항목 삭제"
                className="icon-button"
                disabled={draft.criteria.length === 1}
                onClick={() =>
                  setDraft({
                    ...draft,
                    criteria: draft.criteria.filter((_, j) => i !== j),
                  })
                }
              >
                <Trash2 size={17} />
              </button>
            </div>
            <input
              aria-label={`${i + 1}번 평가 기준`}
              placeholder="무엇을 평가하는지 구체적으로 작성해주세요"
              value={c.description}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  criteria: draft.criteria.map((x, j) =>
                    j === i ? { ...x, description: e.target.value } : x,
                  ),
                })
              }
            />
          </div>
        ))}
        <button
          type="button"
          disabled={draft.criteria.length >= 8}
          className="secondary-button full"
          onClick={() =>
            setDraft({
              ...draft,
              criteria: [
                ...draft.criteria,
                { id: id(), name: "", max: 10, description: "" },
              ],
            })
          }
        >
          <Plus size={16} />
          항목 추가
        </button>
        <p className="field-hint">
          저장한 기준은 다음 녹음부터 적용돼요. 이미 저장한 녹음의 평가 기준은
          유지됩니다.
        </p>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="form-footer">
          <button type="button" className="secondary-button" onClick={onClose}>
            취소
          </button>
          <button disabled={busy} className="primary-button">
            평가 기준 저장
          </button>
        </div>
      </form>
    </Modal>
  );
}
