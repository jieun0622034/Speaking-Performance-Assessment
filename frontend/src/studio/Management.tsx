import { useState } from "react";
import { Archive, Check, LoaderCircle } from "lucide-react";
import { Course, Student } from "./model";
import { currentTerm, sameTerm, termLabel } from "./lifecycle";
import { Modal, PageTitle, CourseCard, Empty } from "./UI";
export function StudentEditor({
  student,
  course,
  onClose,
  onSave,
}: {
  student: Student;
  course: Course;
  onClose: () => void;
  onSave: (s: Student) => Promise<void>;
}) {
  const [name, setName] = useState(student.name),
    [number, setNumber] = useState(String(student.number)),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Modal
      title="학생 정보 수정"
      subtitle={`${course.grade} ${course.classroom} · 녹음과 평가 기록은 그대로 유지돼요.`}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        className="studio-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          setError("");
          try {
            await onSave({ ...student, name, number: Number(number) });
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          학생 번호
          <input
            autoFocus
            type="number"
            required
            min={1}
            max={999}
            step={1}
            value={number}
            disabled={busy}
            onChange={(e) => setNumber(e.target.value)}
          />
        </label>
        <label>
          학생 이름
          <input
            required
            maxLength={60}
            value={name}
            disabled={busy}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <p className="field-hint">
          이 학생의 기존 녹음·결과·내보내기 이름과 번호도 함께 수정됩니다. 원본
          파일과 평가 점수는 바뀌지 않아요.
        </p>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="form-footer">
          <button
            type="button"
            className="secondary-button"
            disabled={busy}
            onClick={onClose}
          >
            취소
          </button>
          <button className="primary-button" disabled={busy}>
            {busy ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <Check size={16} />
            )}
            학생 정보 저장
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function ArchiveForm({
  courses,
  initialCourse,
  onClose,
  onSave,
}: {
  courses: Course[];
  initialCourse?: Course;
  onClose: () => void;
  onSave: (
    ids: string[],
    term: { year: number; semester: 1 | 2 },
  ) => Promise<void>;
}) {
  const active = courses.filter((c) => !c.archivedAt),
    [term, setTerm] = useState(
      initialCourse?.year
        ? { year: initialCourse.year, semester: initialCourse.semester! }
        : currentTerm(),
    ),
    [selected, setSelected] = useState(initialCourse ? [initialCourse.id] : []),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const eligible = active.filter((c) => !c.year || sameTerm(c, term));
  function changeTerm(next: typeof term) {
    setTerm(next);
    setSelected((old) =>
      old.filter((id) =>
        active.some((c) => c.id === id && (!c.year || sameTerm(c, next))),
      ),
    );
  }
  return (
    <Modal
      title="학기 마감 · 수업 보관"
      subtitle="지난 수업은 보관함에서 조회하고 필요할 때 복원할 수 있어요."
      onClose={() => {
        if (!busy) onClose();
      }}
      wide
    >
      <form
        className="studio-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          if (!selected.length) {
            setError("보관할 수업을 선택해주세요.");
            return;
          }
          setBusy(true);
          setError("");
          try {
            await onSave(selected, term);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="archive-explanation">
          <Archive size={22} />
          <p>
            <strong>명단·녹음·평가를 묶어서 보관합니다.</strong>
            <br />
            홈과 진행 중인 평가에서 제외되며 보관 중에는 수정할 수 없어요. 자동
            폐기되지 않으므로 개인정보 보관 기간은 별도로 관리해주세요.
          </p>
        </div>
        <div className="form-two">
          <label>
            보관 학년도
            <input
              required
              min={2000}
              max={2100}
              type="number"
              disabled={busy}
              value={term.year}
              onChange={(e) =>
                changeTerm({ ...term, year: Number(e.target.value) })
              }
            />
          </label>
          <div className="term-semester-field">
            <span className="field-label">보관 학기</span>
            <div className="term-toggle" role="group" aria-label="보관 학기">
              {([1, 2] as const).map((semester) => (
                <button
                  key={semester}
                  type="button"
                  disabled={busy}
                  aria-pressed={term.semester === semester}
                  className={term.semester === semester ? "selected" : ""}
                  onClick={() => changeTerm({ ...term, semester })}
                >
                  {semester}학기
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="label-row">
          <h3>보관할 수업</h3>
          <button
            type="button"
            className="text-button"
            disabled={busy}
            onClick={() => setSelected(eligible.map((c) => c.id))}
          >
            표시된 수업 모두 선택
          </button>
        </div>
        <p className="field-hint">
          {term.year}학년도 {term.semester}학기 수업과 학기 미지정 수업만
          표시해요. 다른 학기 자료는 해당 학기를 선택해 보관하세요.
        </p>
        <div className="archive-course-list">
          {!eligible.length && (
            <p className="no-search">이 학기에 보관할 수업이 없어요.</p>
          )}
          {eligible.map((c) => (
            <label className="consent-check" key={c.id}>
              <input
                type="checkbox"
                disabled={busy}
                checked={selected.includes(c.id)}
                onChange={(e) =>
                  setSelected((old) =>
                    e.target.checked
                      ? [...old, c.id]
                      : old.filter((id) => id !== c.id),
                  )
                }
              />
              <span>
                {c.grade} {c.classroom} · {c.name}
                <small>
                  {termLabel(c)} · 학생 {c.students.length}명
                </small>
              </span>
            </label>
          ))}
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
            disabled={busy}
            onClick={onClose}
          >
            취소
          </button>
          <button
            className="primary-button"
            disabled={busy || !selected.length}
          >
            {busy ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <Archive size={16} />
            )}
            수업 {selected.length}개 보관하기
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function TermHistory({
  courses,
  takes,
  openCourse,
  onArchive,
}: {
  courses: Course[];
  takes: import("./model").Take[];
  openCourse: (c: Course) => void;
  onArchive: () => void;
}) {
  const [filter, setFilter] = useState("all");
  const archived = courses.filter((c) => c.archivedAt);
  return (
    <>
      <PageTitle
        eyebrow="TERM ARCHIVE"
        title="학기별 배움의 기록"
        description="마감한 수업의 학생·원본·평가를 조회하세요. 수업을 복원하면 다시 수정할 수 있어요."
        action={
          <button
            className="secondary-button"
            disabled={!courses.some((c) => !c.archivedAt)}
            onClick={onArchive}
          >
            <Archive size={17} />
            학기 마감
          </button>
        }
      />
      <div className="list-toolbar">
        <span className="count-heading">
          보관한 수업 <strong>{archived.length}</strong>
        </span>
        <select
          aria-label="보관 학기 필터"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">모든 학기</option>
          {[...new Set(archived.map(termLabel))]
            .sort()
            .reverse()
            .map((label) => (
              <option key={label}>{label}</option>
            ))}
        </select>
      </div>
      {archived.length ? (
        <div className="course-grid">
          {archived
            .filter((c) => filter === "all" || termLabel(c) === filter)
            .map((c) => (
              <div key={c.id}>
                <p className="archive-term-label">{termLabel(c)} · 보관됨</p>
                <CourseCard
                  course={c}
                  takes={takes}
                  onClick={() => openCourse(c)}
                />
              </div>
            ))}
        </div>
      ) : (
        <Empty
          title="아직 보관한 수업이 없어요"
          description="학기가 끝나면 학기 마감으로 수업과 평가 기록을 보관하세요. 새 학기는 새 수업과 새 명단으로 시작합니다."
        />
      )}
      <p className="workspace-note">
        보관은 삭제가 아닙니다. 이 버전에서는 기간이 지나도 원본과 평가가 자동
        삭제되지 않습니다.
      </p>
    </>
  );
}
