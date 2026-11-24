import { useState } from "react";
import {
  Mic,
  Pencil,
  Archive,
  RotateCcw,
  Plus,
  Search,
  SlidersHorizontal,
  Users,
  ClipboardList,
  Check,
  FileUp,
  ArrowLeft,
  Headphones,
} from "lucide-react";
import { Course, Take, Student, latestTake } from "./model";
import { termLabel } from "./lifecycle";
import { PageTitle, Status, Empty } from "./UI";
export default function CourseView({
  course,
  takes,
  back,
  roster,
  criteria,
  record,
  review,
  editStudent,
  archive,
  restore,
}: {
  editStudent: (s: Student) => void;
  archive: () => void;
  restore: () => Promise<void>;
  course: Course;
  takes: Take[];
  back: () => void;
  roster: () => void;
  criteria: () => void;
  record: (s: Student) => void;
  review: (t: Take) => void;
}) {
  const [tab, setTab] = useState("students"),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all");
  const records = takes.filter((t) => t.courseId === course.id);
  const rows = course.students.filter(
    (s) =>
      (s.name.includes(search) || String(s.number).includes(search)) &&
      (filter === "all" ||
        (filter === "waiting" && !latestTake(takes, course.id, s.id)) ||
        (filter === "review" &&
          latestTake(takes, course.id, s.id)?.scores &&
          !latestTake(takes, course.id, s.id)?.confirmed)),
  );
  return (
    <>
      <button className="back-link" onClick={back}>
        <ArrowLeft size={16} />
        {course.archivedAt ? "학기 보관함" : "내 수업"}
      </button>
      <PageTitle
        eyebrow={`${termLabel(course)} · ${course.grade} ${course.classroom}`}
        title={course.name}
        description={`${course.students.length}명의 학생과 함께하는 말하기 수업`}
        action={
          course.archivedAt ? (
            <button className="secondary-button" onClick={() => void restore()}>
              <RotateCcw size={17} />내 수업으로 복원
            </button>
          ) : (
            <div className="management-actions">
              <button className="secondary-button" onClick={archive}>
                <Archive size={16} />
                수업 보관
              </button>
              <button
                className="primary-button"
                disabled={!!course.archivedAt}
                onClick={roster}
              >
                <Plus size={17} />
                학생 등록
              </button>
            </div>
          )
        }
      />
      {course.archivedAt && (
        <div className="archive-explanation">
          <Archive size={20} />
          <p>
            <strong>보관한 수업 · 조회 전용</strong>
            <br />
            학생 수정·새 녹음·평가 변경은 수업 복원 후 진행할 수 있어요.
          </p>
        </div>
      )}
      <section className={"course-banner " + course.color}>
        <div>
          <span className="small-label">현재 진행 중인 말하기 평가</span>
          <h2>{course.task}</h2>
          <p>{course.prompt}</p>
        </div>
        <button
          className="secondary-button"
          disabled={!!course.archivedAt}
          onClick={criteria}
        >
          <SlidersHorizontal size={16} />
          평가 설정
        </button>
      </section>
      <div className="course-tabs">
        <button
          className={tab === "students" ? "active" : ""}
          onClick={() => setTab("students")}
        >
          <Users size={17} />
          학생·녹음 현황 <span>{course.students.length}</span>
        </button>
        <button
          className={tab === "criteria" ? "active" : ""}
          onClick={() => setTab("criteria")}
        >
          <ClipboardList size={17} />
          평가 기준
        </button>
      </div>
      {tab === "criteria" ? (
        <section className="panel criteria-read">
          <div className="panel-heading">
            <h2>선생님의 평가 기준</h2>
            <button
              className="text-button"
              disabled={!!course.archivedAt}
              onClick={criteria}
            >
              기준 수정
            </button>
          </div>
          {course.criteria.map((c, i) => (
            <div className="rubric-read-row" key={c.id}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3>{c.name}</h3>
                <p>{c.description}</p>
              </div>
              <strong>
                {c.max}
                <small>점</small>
              </strong>
            </div>
          ))}
          {course.rubric && (
            <div className="rubric-source">
              <h3>상세 기준·답안</h3>
              <p>{course.rubric}</p>
            </div>
          )}
        </section>
      ) : (
        <section className="panel student-panel">
          <div className="table-tools">
            <label className="search-box">
              <Search size={17} />
              <input
                aria-label="학생 검색"
                placeholder="학생 이름 또는 번호 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <div className="table-actions">
              <select
                aria-label="학생 상태 필터"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">전체 학생</option>
                <option value="waiting">녹음 전</option>
                <option value="review">검토 필요</option>
              </select>
              <button
                className="secondary-button"
                disabled={!!course.archivedAt}
                onClick={roster}
              >
                <FileUp size={16} />
                명단 일괄 등록
              </button>
            </div>
          </div>
          {course.students.length === 0 ? (
            <Empty
              title="첫 학생을 등록해볼까요?"
              description="표에 여러 명을 입력하거나 엑셀 명단을 붙여넣어 한 번에 등록하세요."
              action={
                <button
                  className="primary-button"
                  disabled={!!course.archivedAt}
                  onClick={roster}
                >
                  <Plus size={16} />
                  학생 등록하기
                </button>
              }
            />
          ) : (
            <div className="student-table-wrap">
              <table className="student-table">
                <thead>
                  <tr>
                    <th>번호</th>
                    <th>학생</th>
                    <th>녹음 상태</th>
                    <th>평가 점수</th>
                    <th>평가 진행</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => {
                    const take = latestTake(takes, course.id, s.id);
                    return (
                      <tr key={s.id}>
                        <td>
                          <span className="number-cell">
                            {String(s.number).padStart(2, "0")}
                          </span>
                        </td>
                        <td>
                          <div className="student-name">
                            <span
                              className={
                                "student-avatar avatar-" + (s.number % 4)
                              }
                            >
                              {s.name.replace(/\s/g, "").slice(-2)}
                            </span>
                            <strong>{s.name}</strong>
                            {!course.archivedAt && (
                              <button
                                className="icon-button student-edit-button"
                                aria-label={`${s.name} 학생 정보 수정`}
                                onClick={() => editStudent(s)}
                              >
                                <Pencil size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                        <td>
                          <Status take={take} />
                        </td>
                        <td>
                          {take?.confirmed ? (
                            <strong>
                              {Object.values(take.scores || {}).reduce(
                                (a, b) => a + b,
                                0,
                              )}
                              <small>
                                {" "}
                                / {take.criteria.reduce((a, c) => a + c.max, 0)}
                              </small>
                            </strong>
                          ) : (
                            <span className="muted-dash">—</span>
                          )}
                        </td>
                        <td>
                          <div className="row-buttons">
                            {take && (
                              <button
                                className="small-button"
                                onClick={() => review(take)}
                              >
                                <Headphones size={15} />
                                결과 보기
                              </button>
                            )}
                            <button
                              className={
                                "small-button " + (!take ? "green-button" : "")
                              }
                              disabled={!!course.archivedAt}
                              onClick={() => record(s)}
                            >
                              <Mic size={15} />
                              {take ? "다시 녹음" : "녹음하기"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!rows.length && (
                <p className="no-search">검색 조건에 맞는 학생이 없어요.</p>
              )}
            </div>
          )}
          <div className="table-footer">
            <span>
              전체 {course.students.length}명 · 녹음{" "}
              {
                course.students.filter((s) =>
                  latestTake(takes, course.id, s.id),
                ).length
              }
              명
            </span>
            <span>
              <Check size={14} />
              선생님이 최종 점수를 확정합니다
            </span>
          </div>
        </section>
      )}
    </>
  );
}
