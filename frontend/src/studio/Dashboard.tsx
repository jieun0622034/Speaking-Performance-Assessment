import {
  ArrowUpRight,
  BookOpen,
  CheckCheck,
  Clock3,
  Headphones,
  Mic,
  Plus,
  Sparkles,
  Play,
  MoveUpRight,
} from "lucide-react";
import { StudioData, Course, Take } from "./model";
import { CourseCard, TakeRow, PageTitle, Empty } from "./UI";
export default function Dashboard({
  data,
  openCourse,
  openTake,
  newCourse,
  record,
  allCourses,
  allResults,
}: {
  data: StudioData;
  openCourse: (c: Course) => void;
  openTake: (t: Take) => void;
  newCourse: () => void;
  record: () => void;
  allCourses: () => void;
  allResults: () => void;
}) {
  const pending = data.takes.filter((t) => !t.confirmed);
  const confirmed = data.takes.filter((t) => t.confirmed).length;
  return (
    <>
      <PageTitle
        eyebrow="MY TEACHING SPACE"
        title={`${data.profile.name} 선생님, 반가워요 👋`}
        description="학생의 목소리가 배움의 기록이 되는 곳, 스피크노트입니다."
        action={
          <button className="primary-button" onClick={newCourse}>
            <Plus size={18} />
            수업 만들기
          </button>
        }
      />
      <div className="dashboard-top">
        <section className="welcome-card">
          <div className="hero-copy">
            <span className="hero-kicker">
              <span />
              말하기 평가, 조금 더 가볍게
            </span>
            <h2>
              학생의 이야기에 집중하세요.
              <br />
              <em>평가의 근거는 한눈에.</em>
            </h2>
            <p>
              녹음부터 발화 확인, 교사 최종 평가까지.
              <br />
              선생님의 기준으로 차근차근 기록해요.
            </p>
            <button className="light-button" onClick={record}>
              <Mic size={17} />
              지금 녹음 시작하기
            </button>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="hero-orbit orbit-one" />
            <div className="hero-orbit orbit-two" />
            <div className="hero-grid" />
            <div className="speech-note">
              <span>Every voice matters.</span>
              <div className="hero-wave">
                {[
                  16, 30, 23, 48, 66, 39, 55, 82, 53, 36, 61, 43, 24, 37, 17,
                ].map((h, i) => (
                  <i key={i} style={{ height: h + "px" }} />
                ))}
              </div>
              <div className="hero-note-bottom">
                <span>
                  <i /> Speaking in progress
                </span>
                <strong>01:24</strong>
              </div>
            </div>
            <span className="hero-check">
              <CheckCheck size={19} />한 걸음 더 성장한 목소리
            </span>
            <div className="hero-star">✳</div>
          </div>
        </section>
        <section className="review-summary">
          <div className="review-summary-icon">
            <Headphones size={22} />
          </div>
          <span className="small-label">선생님의 확인을 기다려요</span>
          <h3>
            검토할 평가 <strong>{pending.length}</strong>건
          </h3>
          <p>
            발화와 연결된 근거를 확인하고
            <br />
            최종 점수를 결정해주세요.
          </p>
          <div className="avatar-stack">
            {pending.slice(0, 3).map((t, i) => (
              <span key={t.id} className={"avatar-" + i}>
                {t.studentName.replace(/\s/g, "").slice(-2)}
              </span>
            ))}
            {pending.length > 3 && <span>+{pending.length - 3}</span>}
          </div>
          <button className="text-button" onClick={allResults}>
            평가 검토하기
            <ArrowUpRight size={17} />
          </button>
        </section>
      </div>
      <div className="metric-grid">
        {[
          {
            icon: BookOpen,
            label: "운영 중인 수업",
            value: data.courses.length,
            unit: "개",
            text: "이번 학기의 배움 공간",
            color: "green",
          },
          {
            icon: Mic,
            label: "저장한 녹음",
            value: data.takes.length,
            unit: "개",
            text: "학생의 이야기를 기록했어요",
            color: "blue",
          },
          {
            icon: Clock3,
            label: "검토가 필요한 평가",
            value: pending.length,
            unit: "건",
            text: "근거를 확인하고 확정해주세요",
            color: "orange",
          },
          {
            icon: CheckCheck,
            label: "최종 확정한 평가",
            value: confirmed,
            unit: "건",
            text: "선생님의 검토가 완료됐어요",
            color: "purple",
          },
        ].map(({ icon: Icon, label, value, unit, text, color }) => (
          <div className="metric-card" key={label}>
            <span className={"metric-icon " + color}>
              <Icon size={19} />
            </span>
            <div>
              <span>{label}</span>
              <strong>
                {value}
                <small>{unit}</small>
              </strong>
              <p>{text}</p>
            </div>
          </div>
        ))}
      </div>
      <section className="section-block">
        <div className="section-heading">
          <div>
            <h2>
              내 수업<span>{data.courses.length}</span>
            </h2>
            <p>수업별로 학생과 말하기 평가를 관리하세요.</p>
          </div>
          <button className="text-button muted" onClick={allCourses}>
            전체 수업 보기
            <ArrowUpRight size={17} />
          </button>
        </div>
        {!data.courses.length && (
          <Empty
            title="첫 수업을 만들어보세요"
            description="수업을 만든 뒤 학생 명단을 표로 한 번에 등록할 수 있어요."
            action={
              <button className="primary-button" onClick={newCourse}>
                <Plus size={16} />새 수업 만들기
              </button>
            }
          />
        )}
        <div className="course-grid">
          {data.courses.slice(0, 3).map((c) => (
            <CourseCard
              key={c.id}
              course={c}
              takes={data.takes}
              onClick={() => openCourse(c)}
            />
          ))}
        </div>
      </section>
      <div className="dashboard-bottom">
        <section className="panel">
          <div className="panel-heading">
            <h2>최근 평가 활동</h2>
            <button className="text-button muted" onClick={allResults}>
              전체 보기
              <ArrowUpRight size={16} />
            </button>
          </div>
          {!data.takes.length && (
            <Empty
              title="아직 저장한 녹음이 없어요"
              description="학생을 선택해 녹음하면 이곳에 평가 기록이 쌓여요."
            />
          )}
          {data.takes.slice(0, 4).map((t) => (
            <TakeRow
              key={t.id}
              take={t}
              course={data.courses.find((c) => c.id === t.courseId)}
              onClick={() => openTake(t)}
            />
          ))}
        </section>
        <section className="guide-card">
          <span className="guide-eyebrow">
            <Sparkles size={15} /> 처음이라면
          </span>
          <h3>
            첫 말하기 평가,
            <br />
            이렇게 시작해보세요.
          </h3>
          <ol>
            <li>
              <span>1</span>
              <div>
                <strong>수업에 학생 등록하기</strong>
                <p>직접 입력하거나 명단을 올려요.</p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>평가 기준 정하기</strong>
                <p>항목과 배점을 선생님 기준으로.</p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>학생을 선택하고 녹음하기</strong>
                <p>목소리와 발표 장면을 기록해요.</p>
              </div>
            </li>
          </ol>
          <button
            className="guide-demo"
            onClick={data.courses.length ? allCourses : newCourse}
          >
            <Play size={15} />
            평가 준비하기
            <MoveUpRight size={16} />
          </button>
        </section>
      </div>
      <p className="workspace-note">
        수업과 학생 명단, 평가 기록은 계정별로 저장됩니다. 녹음 원본은 저장
        버튼을 누르면 서버에 업로드됩니다.
      </p>
    </>
  );
}
