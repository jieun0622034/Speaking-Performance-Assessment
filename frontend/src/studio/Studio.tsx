import { useEffect, useState, useRef } from "react";
import {
  Home,
  BookOpen,
  Mic,
  ClipboardCheck,
  UserRound,
  Plus,
  Search,
  Bell,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  CheckCheck,
  Headphones,
  SlidersHorizontal,
  Download,
  Menu,
  X,
  LogOut,
  ArrowUpRight,
  Info,
  Check,
  School,
  Mail,
  ShieldCheck,
  Layers,
  LoaderCircle,
} from "lucide-react";
import Dashboard from "./Dashboard";
import CourseView from "./CourseView";
import RecordView from "./RecordView";
import Review from "./Review";
import { CourseForm, RosterForm, CriteriaForm } from "./Forms";
import { Brand, CourseCard, Empty, Modal, PageTitle, TakeRow } from "./UI";
import {
  StudioData,
  Page,
  Course,
  Student,
  Take,
  loadData,
  persist,
  exportResults,
  total,
  id,
} from "./model";
import "./studio.css";
const navItems = [
  { id: "home", name: "홈", icon: Home },
  { id: "courses", name: "내 수업", icon: BookOpen },
  { id: "record", name: "녹음 스튜디오", icon: Mic },
  { id: "results", name: "평가 관리", icon: ClipboardCheck },
] as const;
export default function Studio() {
  const [data, setData] = useState(loadData),
    [page, setPage] = useState<Page | "review">("home"),
    [courseId, setCourseId] = useState(""),
    [studentId, setStudentId] = useState(""),
    [takeId, setTakeId] = useState(""),
    [modal, setModal] = useState<
      null | "course" | "roster" | "criteria" | "guide"
    >(null),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [notice, setNotice] = useState(false),
    [mobile, setMobile] = useState(false),
    [locked, setLocked] = useState(false),
    [message, setMessage] = useState(""),
    [profile, setProfile] = useState(data.profile),
    [backend, setBackend] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setBackend(d.status === "UP"))
      .catch(() => {});
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);
  function toast(text: string) {
    setMessage(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setMessage(""), 5000);
  }
  function commit(next: StudioData) {
    try {
      persist(next);
      setData(next);
    } catch {
      toast(
        "브라우저 저장 공간이 부족해요. 원본 파일을 내려받아 보관해주세요.",
      );
      throw new Error("브라우저 저장에 실패했습니다.");
    }
  }
  function navigate(next: Page | "review") {
    if (locked) {
      toast("녹음을 끝내고 저장한 뒤 이동해주세요.");
      return;
    }
    setPage(next);
    setSearch("");
    setMobile(false);
    setNotice(false);
    window.scrollTo(0, 0);
  }
  function openCourse(c: Course) {
    if (locked) return;
    setCourseId(c.id);
    navigate("course");
  }
  function openTake(t: Take) {
    if (locked) return;
    setTakeId(t.id);
    setCourseId(t.courseId);
    navigate("review");
  }
  function start(c?: Course, s?: Student) {
    if (locked) return;
    setCourseId(c?.id || data.courses.find((c) => c.students.length)?.id || "");
    setStudentId(s?.id || "");
    navigate("record");
  }
  const course = data.courses.find((c) => c.id === courseId),
    take = data.takes.find((t) => t.id === takeId),
    pending = data.takes.filter((t) => t.scores && !t.confirmed);
  const shownCourses = data.courses.filter((c) =>
    [c.name, c.classroom, c.grade, c.task]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const results = data.takes.filter(
    (t) =>
      (filter === "all" ||
        (filter === "review" && t.scores && !t.confirmed) ||
        (filter === "confirmed" && t.confirmed) ||
        (filter === "saved" && !t.scores)) &&
      [
        t.studentName,
        t.task,
        data.courses.find((c) => c.id === t.courseId)?.classroom,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const activeNav =
    page === "course" ? "courses" : page === "review" ? "results" : page;
  return (
    <div className="speaking-app">
      <aside className={"studio-sidebar " + (mobile ? "mobile-open" : "")}>
        <button className="brand-button" onClick={() => navigate("home")}>
          <Brand />
        </button>
        <div className="workspace-select">
          <span className="workspace-avatar">S</span>
          <div>
            <strong>선생님의 워크스페이스</strong>
            <span>2026학년도 · 2학기</span>
          </div>
        </div>
        <div className="nav-section-label">TEACHING</div>
        <nav className="studio-nav">
          {navItems.map(({ id, name, icon: Icon }) => (
            <button
              key={id}
              className={activeNav === id ? "active" : ""}
              onClick={() => (id === "record" ? start() : navigate(id))}
            >
              <Icon size={20} />
              <span>{name}</span>
              {id === "results" && pending.length > 0 && (
                <b>{pending.length}</b>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-class-heading">
          <span>바로 가는 수업</span>
          <button aria-label="수업 추가" onClick={() => setModal("course")}>
            <Plus size={16} />
          </button>
        </div>
        <div className="sidebar-courses">
          {data.courses.slice(0, 4).map((c) => (
            <button key={c.id} onClick={() => openCourse(c)}>
              <i className={c.color} />
              <span>
                {c.grade} {c.classroom}
              </span>
              <small>영어</small>
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span className="tip-symbol">✳</span>
            <strong>
              모든 목소리에는
              <br />
              성장의 순간이 있어요.
            </strong>
            <p>오늘의 작은 변화도 놓치지 마세요.</p>
          </div>
          <button
            className={page === "mypage" ? "profile-nav active" : "profile-nav"}
            onClick={() => {
              setProfile(data.profile);
              navigate("mypage");
            }}
          >
            <span className="teacher-avatar">
              {data.profile.name.slice(-2)}
            </span>
            <span>
              <strong>{data.profile.name} 선생님</strong>
              <small>마이페이지</small>
            </span>
            <ChevronRight size={16} />
          </button>
        </div>
      </aside>
      {mobile && (
        <button
          className="mobile-scrim"
          aria-label="메뉴 닫기"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="studio-body">
        <header className="studio-topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              aria-label="메뉴 열기"
              onClick={() => setMobile(true)}
            >
              <Menu size={21} />
            </button>
            <span className="breadcrumb">
              내 워크스페이스
              <ChevronRight size={14} />
              <strong>
                {page === "course"
                  ? course?.name
                  : page === "review"
                    ? "평가 검토"
                    : page === "mypage"
                      ? "마이페이지"
                      : navItems.find((n) => n.id === page)?.name}
              </strong>
            </span>
            <span className="mobile-wordmark">스피크노트</span>
          </div>
          <div className="topbar-actions">
            <span className="preview-badge">
              <span />
              체험 공간
            </span>
            <button
              className="icon-button help-button"
              aria-label="사용 가이드"
              onClick={() => setModal("guide")}
            >
              <HelpCircle size={20} />
            </button>
            <div className="notification-anchor">
              <button
                className="icon-button notification-button"
                aria-label="검토 알림"
                onClick={() => setNotice(!notice)}
              >
                <Bell size={20} />
                {pending.length > 0 && <i />}
              </button>
              {notice && (
                <div className="notification-popover">
                  <strong>선생님의 확인을 기다려요</strong>
                  {pending.length ? (
                    pending.slice(0, 4).map((t) => (
                      <button key={t.id} onClick={() => openTake(t)}>
                        <span className="student-avatar avatar-1">
                          {t.studentName.replace(/\s/g, "").slice(-2)}
                        </span>
                        <span>
                          <b>{t.studentName} 학생</b>
                          <small>평가 근거 확인이 필요해요.</small>
                        </span>
                        <ChevronRight size={15} />
                      </button>
                    ))
                  ) : (
                    <p>새로운 검토 알림이 없어요.</p>
                  )}
                </div>
              )}
            </div>
            <button
              className="top-avatar"
              aria-label="마이페이지"
              onClick={() => {
                setProfile(data.profile);
                navigate("mypage");
              }}
            >
              {data.profile.name.slice(-2)}
            </button>
          </div>
        </header>
        <main
          className={"studio-main " + (page === "record" ? "record-page" : "")}
        >
          {page === "home" && (
            <Dashboard
              data={data}
              openCourse={openCourse}
              openTake={openTake}
              newCourse={() => setModal("course")}
              record={() => start()}
              allCourses={() => navigate("courses")}
              allResults={() => {
                setFilter("review");
                navigate("results");
              }}
            />
          )}
          {page === "courses" && (
            <>
              <PageTitle
                eyebrow="MY CLASSES"
                title="배움이 쌓이는 나의 수업"
                description="수업을 선택해 학생의 목소리와 평가를 관리하세요."
                action={
                  <button
                    className="primary-button"
                    onClick={() => setModal("course")}
                  >
                    <Plus size={18} />
                    수업 만들기
                  </button>
                }
              />
              <div className="list-toolbar">
                <span className="count-heading">
                  전체 수업 <strong>{data.courses.length}</strong>
                </span>
                <label className="search-box">
                  <Search size={17} />
                  <input
                    aria-label="수업 검색"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="수업 이름이나 학급을 검색해보세요"
                  />
                </label>
              </div>
              {shownCourses.length ? (
                <div className="course-grid all-courses">
                  {shownCourses.map((c) => (
                    <CourseCard
                      key={c.id}
                      course={c}
                      takes={data.takes}
                      onClick={() => openCourse(c)}
                    />
                  ))}
                  <button
                    className="new-course-card"
                    onClick={() => setModal("course")}
                  >
                    <span>
                      <Plus size={26} />
                    </span>
                    <strong>새 수업 만들기</strong>
                    <p>새로운 배움의 공간을 열어보세요.</p>
                  </button>
                </div>
              ) : (
                <Empty
                  title="찾는 수업이 없어요"
                  description="검색어를 바꾸거나 새 수업을 만들어주세요."
                  action={
                    <button
                      className="primary-button"
                      onClick={() => setModal("course")}
                    >
                      수업 만들기
                    </button>
                  }
                />
              )}
            </>
          )}
          {page === "course" && course && (
            <CourseView
              key={course.id}
              course={course}
              takes={data.takes}
              back={() => navigate("courses")}
              roster={() => setModal("roster")}
              criteria={() => setModal("criteria")}
              record={(s) => start(course, s)}
              review={openTake}
            />
          )}
          {page === "record" && (
            <RecordView
              key={courseId + "-" + studentId}
              courses={data.courses}
              initialCourse={courseId}
              initialStudent={studentId}
              back={() => navigate("courses")}
              onLock={setLocked}
              onSave={(t) => {
                commit({ ...data, takes: [t, ...data.takes] });
                setTakeId(t.id);
                setCourseId(t.courseId);
                setPage("review");
                toast("녹음 원본과 적용한 평가 기준을 저장했어요.");
              }}
            />
          )}
          {page === "results" && (
            <>
              <PageTitle
                eyebrow="ASSESSMENT REVIEW"
                title="목소리에서 근거를, 근거에서 평가를"
                description="학생의 답변을 확인하고 선생님의 평가를 완성하세요."
                action={
                  <button
                    className="secondary-button"
                    disabled={!results.length}
                    onClick={() => exportResults(results, data.courses)}
                  >
                    <Download size={17} />
                    결과 내보내기
                  </button>
                }
              />
              <div className="results-summary">
                <div>
                  <span className="summary-icon orange">
                    <Headphones size={21} />
                  </span>
                  <div>
                    <span>검토를 기다리는 평가</span>
                    <strong>
                      {pending.length}
                      <small>건</small>
                    </strong>
                  </div>
                </div>
                <div>
                  <span className="summary-icon green">
                    <CheckCheck size={21} />
                  </span>
                  <div>
                    <span>선생님이 확정한 평가</span>
                    <strong>
                      {data.takes.filter((t) => t.confirmed).length}
                      <small>건</small>
                    </strong>
                  </div>
                </div>
              </div>
              <section className="panel">
                <div className="results-toolbar">
                  <div className="filter-tabs">
                    {[
                      ["all", "전체"],
                      ["review", "검토 필요"],
                      ["confirmed", "확정 완료"],
                      ["saved", "원본 저장"],
                    ].map(([f, name]) => (
                      <button
                        key={f}
                        className={filter === f ? "active" : ""}
                        onClick={() => setFilter(f)}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                  <label className="search-box">
                    <Search size={16} />
                    <input
                      aria-label="평가 검색"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="학생 이름 또는 평가 검색"
                    />
                  </label>
                </div>
                {results.length ? (
                  results.map((t) => (
                    <TakeRow
                      key={t.id}
                      take={t}
                      course={data.courses.find((c) => c.id === t.courseId)}
                      onClick={() => openTake(t)}
                    />
                  ))
                ) : (
                  <Empty
                    title="아직 해당하는 평가가 없어요"
                    description="녹음을 저장하면 이곳에서 확인할 수 있어요."
                    action={
                      <button
                        className="primary-button"
                        onClick={() => start()}
                      >
                        <Mic size={16} />
                        녹음 시작하기
                      </button>
                    }
                  />
                )}
              </section>
            </>
          )}
          {page === "review" && take && (
            <Review
              key={take.id}
              take={take}
              course={data.courses.find((c) => c.id === take.courseId)}
              back={() => navigate("results")}
              toast={toast}
              onSave={(t) =>
                commit({
                  ...data,
                  takes: data.takes.map((x) => (x.id === t.id ? t : x)),
                })
              }
            />
          )}
          {page === "mypage" && (
            <>
              <PageTitle
                eyebrow="MY PROFILE"
                title="선생님만의 공간"
                description="내 정보와 현재 워크스페이스를 관리하세요."
              />
              <div className="profile-layout">
                <section className="panel profile-card">
                  <div className="large-avatar">
                    {data.profile.name.slice(-2)}
                  </div>
                  <h2>{data.profile.name} 선생님</h2>
                  <p>{data.profile.school}</p>
                  <span className="subject-pill">
                    {data.profile.subject} 교사
                  </span>
                  <div className="profile-stat">
                    <div>
                      <strong>{data.courses.length}</strong>
                      <span>내 수업</span>
                    </div>
                    <div>
                      <strong>
                        {data.courses.reduce(
                          (a, c) => a + c.students.length,
                          0,
                        )}
                      </strong>
                      <span>등록 학생</span>
                    </div>
                  </div>
                </section>
                <div>
                  <section className="panel profile-form">
                    <h2>기본 정보</h2>
                    <form
                      className="studio-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        commit({ ...data, profile });
                        toast("선생님 정보를 저장했어요.");
                      }}
                    >
                      <label>
                        이름
                        <input
                          required
                          maxLength={60}
                          value={profile.name}
                          onChange={(e) =>
                            setProfile({ ...profile, name: e.target.value })
                          }
                        />
                      </label>
                      <div className="form-two">
                        <label>
                          학교
                          <input
                            maxLength={100}
                            value={profile.school}
                            onChange={(e) =>
                              setProfile({ ...profile, school: e.target.value })
                            }
                          />
                        </label>
                        <label>
                          담당 교과
                          <input
                            required
                            maxLength={30}
                            value={profile.subject}
                            onChange={(e) =>
                              setProfile({
                                ...profile,
                                subject: e.target.value,
                              })
                            }
                          />
                        </label>
                      </div>
                      <div className="form-footer">
                        <button className="primary-button">내 정보 저장</button>
                      </div>
                    </form>
                  </section>
                  <section className="panel workspace-settings">
                    <h2>워크스페이스 안내</h2>
                    <div>
                      <span>
                        <ShieldCheck size={19} />
                      </span>
                      <div>
                        <strong>현재 브라우저에 자료 보관</strong>
                        <p>
                          수업·명단·평가 내용과 녹음 원본은 이 브라우저에
                          저장돼요. 브라우저 저장소를 지우면 자료도 삭제됩니다.
                        </p>
                      </div>
                    </div>
                    <div>
                      <span>
                        <Layers size={19} />
                      </span>
                      <div>
                        <strong>
                          {backend
                            ? "개발 서버 연결됨"
                            : "개발 서버 연결 확인 중"}
                        </strong>
                        <p>
                          현재는 체험 공간입니다. 실제 서버 계정 인증·계정별 DB
                          보관·AI 자동 평가는 별도 연동 단계입니다.
                        </p>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </>
          )}
          <footer className="studio-footer">
            <span>스피크노트 · 학생의 모든 목소리에, 배움의 기록을.</span>
            <button onClick={() => setModal("guide")}>
              사용 가이드
              <ArrowUpRight size={13} />
            </button>
          </footer>
        </main>
      </div>
      <nav className="mobile-bottom-nav" aria-label="주요 메뉴">
        {[
          { id: "home", label: "홈", Icon: Home },
          { id: "courses", label: "내 수업", Icon: BookOpen },
          { id: "record", label: "녹음", Icon: Mic },
          { id: "results", label: "평가", Icon: ClipboardCheck },
          { id: "mypage", label: "마이", Icon: UserRound },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            className={activeNav === id ? "active" : ""}
            onClick={() =>
              id === "record"
                ? start()
                : id === "mypage"
                  ? (setProfile(data.profile), navigate("mypage"))
                  : navigate(id as Page)
            }
          >
            <Icon size={21} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {modal === "course" && (
        <CourseForm
          onClose={() => setModal(null)}
          onSave={(c) => {
            commit({ ...data, courses: [c, ...data.courses] });
            setModal(null);
            openCourse(c);
            toast("새 수업을 만들었어요. 학생을 등록해보세요.");
          }}
        />
      )}
      {modal === "roster" && course && (
        <RosterForm
          course={course}
          onClose={() => setModal(null)}
          onSave={(students) => {
            commit({
              ...data,
              courses: data.courses.map((c) =>
                c.id === course.id
                  ? {
                      ...c,
                      students: [...c.students, ...students].sort(
                        (a, b) => a.number - b.number,
                      ),
                    }
                  : c,
              ),
            });
            setModal(null);
            toast(students.length + "명의 학생을 등록했어요.");
          }}
        />
      )}
      {modal === "criteria" && course && (
        <CriteriaForm
          course={course}
          onClose={() => setModal(null)}
          onSave={(c) => {
            commit({
              ...data,
              courses: data.courses.map((x) => (x.id === c.id ? c : x)),
            });
            setModal(null);
            toast("말하기 평가 기준을 저장했어요.");
          }}
        />
      )}
      {modal === "guide" && (
        <Modal
          title="스피크노트, 이렇게 사용하세요"
          subtitle="말하기 평가를 위한 선생님의 작은 작업실"
          onClose={() => setModal(null)}
        >
          <div className="help-steps">
            {[
              [
                "수업 만들기",
                "내 수업에서 학급을 만들고 학생 명단을 직접 입력하거나 엑셀·CSV·PDF로 가져오세요.",
              ],
              [
                "평가 설계하기",
                "수업의 평가 설정에서 과제, 기준, 항목과 배점을 저장하세요. PDF 기준도 읽을 수 있어요.",
              ],
              [
                "학생의 목소리 기록하기",
                "학생을 선택하고 음성 또는 영상+음성으로 녹음하세요. 직접 녹음한 원본은 현재 브라우저에 보관돼요.",
              ],
              [
                "근거를 확인하고 확정하기",
                "예시 평가에서 오류 표시와 근거 연결을 살펴볼 수 있어요. 직접 녹음한 답변은 원본을 들으며 수동 채점할 수 있으며 실제 AI 분석은 아직 연결되지 않았어요.",
              ],
            ].map(([title, desc], i) => (
              <div key={title}>
                <span>{i + 1}</span>
                <section>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </section>
              </div>
            ))}
          </div>
          <button
            className="primary-button full"
            onClick={() => setModal(null)}
          >
            좋아요, 시작해볼게요
          </button>
        </Modal>
      )}
      {message && (
        <div className="studio-toast" role="status">
          <Check size={18} />
          {message}
        </div>
      )}
    </div>
  );
}
