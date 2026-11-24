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
import { request } from "./server";
import {
  assessmentFields,
  currentTerm,
  sameTerm,
  termLabel,
} from "./lifecycle";
export function CourseForm({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (c: Course) => Promise<void>;
}) {
  const [term, setTerm] = useState(currentTerm),
    [name, setName] = useState(""),
    [grade, setGrade] = useState("2학년"),
    [classroom, setClassroom] = useState("1반"),
    [color, setColor] = useState("mint"),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  return (
    <Modal
      title="새로운 수업을 시작해요"
      subtitle="수업을 만든 뒤 학생과 평가 기준을 등록할 수 있어요."
      onClose={onClose}
    >
      <form
        className="studio-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (saving) return;
          setSaving(true);
          setError("");
          try {
            await onSave({
              id: id(),
              ...term,
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
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="form-two">
          <label>
            학년도
            <input
              aria-label="학년도"
              type="number"
              required
              min={2000}
              max={2100}
              value={term.year}
              onChange={(e) =>
                setTerm({ ...term, year: Number(e.target.value) })
              }
            />
          </label>
          <label>
            학기
            <select
              value={term.semester}
              onChange={(e) =>
                setTerm({ ...term, semester: Number(e.target.value) as 1 | 2 })
              }
            >
              <option value="1">1학기</option>
              <option value="2">2학기</option>
            </select>
          </label>
        </div>
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
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-footer">
          <button type="button" className="secondary-button" onClick={onClose}>
            취소
          </button>
          <button disabled={saving} className="primary-button">
            <Plus size={17} />
            수업 만들기
          </button>
        </div>
      </form>
    </Modal>
  );
}
export { parseCSV, rosterRows } from "./roster";
export { RosterForm } from "./RosterGrid";

export function CriteriaForm({
  course,
  courses,
  onClose,
  onSave,
}: {
  course: Course;
  courses: Course[];
  onClose: () => void;
  onSave: (c: Course, targets: string[]) => Promise<void>;
}) {
  const [targets, setTargets] = useState<string[]>([course.id]);
  const available = courses.filter((c) => !c.archivedAt);
  const [draft, setDraft] = useState(structuredClone(course)),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saving, setSaving] = useState(false);
  async function pdf(file: File) {
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const data = await request<{ text: string }>("/files/extract-text", {
        body: form,
      });
      setDraft((previous) => ({ ...previous, rubric: data.text }));
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
        onSubmit={async (e) => {
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
          if (saving) return;
          setSaving(true);
          setError("");
          try {
            await onSave(draft, targets);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setSaving(false);
          }
        }}
      >
        <section className="assessment-shortcut">
          <h3>이미 만든 기준으로 시작하기</h3>
          <label>
            다른 수업의 평가 기준 가져오기
            <select
              defaultValue=""
              disabled={saving}
              onChange={(e) => {
                const source = courses.find((c) => c.id === e.target.value);
                if (source) setDraft({ ...draft, ...assessmentFields(source) });
              }}
            >
              <option value="" disabled>
                수업 선택 · 지난 학기 기준도 가져올 수 있어요
              </option>
              {courses
                .filter((c) => c.id !== course.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {termLabel(c)} / {c.grade} {c.classroom} / {c.task}
                    {c.archivedAt ? " (보관됨)" : ""}
                  </option>
                ))}
            </select>
          </label>
          <p className="field-hint">
            과제·상세 기준·항목·배점을 함께 가져와 수정할 수 있어요. 학생 명단은
            바뀌지 않아요.
          </p>
        </section>
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
        <section className="assessment-targets">
          <div className="label-row">
            <h3>같은 기준을 적용할 수업</h3>
            <button
              type="button"
              className="text-button"
              disabled={saving}
              onClick={() =>
                setTargets(
                  available
                    .filter(
                      (c) => c.grade === course.grade && sameTerm(c, course),
                    )
                    .map((c) => c.id),
                )
              }
            >
              같은 학기·학년 모두 선택
            </button>
          </div>
          <p className="field-hint">
            선택한 수업의 다음 녹음부터 적용돼요. 기존 녹음의 기준·점수는
            유지돼요.
          </p>
          {available.map((c) => (
            <label className="consent-check" key={c.id}>
              <input
                type="checkbox"
                disabled={saving || c.id === course.id}
                checked={targets.includes(c.id)}
                onChange={(e) =>
                  setTargets((old) =>
                    e.target.checked
                      ? [...old, c.id]
                      : old.filter((id) => id !== c.id),
                  )
                }
              />
              <span>
                {c.grade} {c.classroom} · {c.name}
                <small> {termLabel(c)}</small>
              </span>
            </label>
          ))}
        </section>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="form-footer">
          <button type="button" className="secondary-button" onClick={onClose}>
            취소
          </button>
          <button disabled={busy || saving} className="primary-button">
            선택한 {targets.length}개 수업에 기준 저장
          </button>
        </div>
      </form>
    </Modal>
  );
}
