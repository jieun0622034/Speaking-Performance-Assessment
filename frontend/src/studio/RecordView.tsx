import { useEffect, useRef, useState } from "react";
import {
  Mic,
  Video,
  Square,
  Pause,
  Play,
  Upload,
  Check,
  Volume2,
  ShieldCheck,
  Download,
  LoaderCircle,
  ArrowLeft,
} from "lucide-react";
import { Course, Student, Take, id, clock, saveMedia, download } from "./model";
import { PageTitle, Empty } from "./UI";
export default function RecordView({
  courses,
  initialCourse,
  initialStudent,
  onSave,
  onLock,
  back,
}: {
  courses: Course[];
  initialCourse?: string;
  initialStudent?: string;
  onSave: (t: Take) => Promise<void>;
  onLock: (locked: boolean) => void;
  back: () => void;
}) {
  const [cid, setCid] = useState(initialCourse || courses[0]?.id || ""),
    [sid, setSid] = useState(initialStudent || ""),
    [kind, setKind] = useState<"audio" | "video">("audio"),
    [recording, setRecording] = useState(false),
    [paused, setPaused] = useState(false),
    [elapsed, setElapsed] = useState(0),
    [level, setLevel] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [blob, setBlob] = useState<Blob | null>(null),
    [preview, setPreview] = useState(""),
    [agreed, setAgreed] = useState(false);
  const course = courses.find((c) => c.id === cid),
    student = course?.students.find((s) => s.id === sid);
  const rec = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    chunks = useRef<Blob[]>([]),
    video = useRef<HTMLVideoElement>(null),
    timer = useRef<ReturnType<typeof setInterval> | null>(null),
    context = useRef<AudioContext | null>(null),
    snapshot = useRef<{
      course: Course;
      student: Student;
      kind: "audio" | "video";
    } | null>(null),
    time = useRef({ start: 0, paused: 0, pauseStart: 0, duration: 0 }),
    guard = useRef(false);
  const file = useRef<HTMLInputElement>(null);
  const uploadKey = useRef("");
  useEffect(() => {
    uploadKey.current = blob ? id() : "";
  }, [blob]);
  function release() {
    if (timer.current) clearInterval(timer.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (context.current) void context.current.close().catch(() => {});
    context.current = null;
  }
  useEffect(
    () => () => {
      if (rec.current && rec.current.state !== "inactive") rec.current.stop();
      release();
    },
    [],
  );
  useEffect(() => {
    onLock(recording || busy || !!blob);
    return () => onLock(false);
  }, [recording, busy, blob]);
  useEffect(() => {
    if (video.current && stream.current) {
      video.current.srcObject = stream.current;
      void video.current.play().catch(() => {});
    }
  }, [recording, kind]);
  useEffect(() => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (recording || blob) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [recording, blob]);
  async function start() {
    if (guard.current || !student || !course) return;
    guard.current = true;
    setBusy(true);
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
        throw new Error(
          "최신 브라우저에서 localhost 또는 HTTPS 주소로 열어주세요.",
        );
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video:
          kind === "video"
            ? { width: { ideal: 1280 }, height: { ideal: 720 } }
            : false,
      });
      const types =
        kind === "video"
          ? ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"]
          : ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
      const mimeType = types.find((t) => MediaRecorder.isTypeSupported(t));
      const mr = new MediaRecorder(
        stream.current,
        mimeType ? { mimeType } : undefined,
      );
      rec.current = mr;
      chunks.current = [];
      snapshot.current = {
        student: structuredClone(student),
        course: structuredClone(course),
        kind,
      };
      mr.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
      };
      mr.onerror = () =>
        setError(
          "녹음 장치 오류가 발생했습니다. 종료 후 저장 가능한 구간을 확인해주세요.",
        );
      mr.start(500);
      time.current = {
        start: performance.now(),
        paused: 0,
        pauseStart: 0,
        duration: 0,
      };
      setElapsed(0);
      setRecording(true);
      setPaused(false);
      let analyser: AnalyserNode | null = null;
      try {
        context.current = new AudioContext();
        analyser = context.current.createAnalyser();
        analyser.fftSize = 256;
        context.current
          .createMediaStreamSource(stream.current)
          .connect(analyser);
        await context.current.resume();
      } catch {}
      const samples = new Uint8Array(256);
      timer.current = setInterval(() => {
        if (mr.state === "paused") return;
        const secs =
          (performance.now() - time.current.start - time.current.paused) / 1000;
        time.current.duration = secs;
        setElapsed(secs);
        if (analyser) {
          analyser.getByteTimeDomainData(samples);
          setLevel(
            Math.min(
              100,
              Math.sqrt(
                samples.reduce((s, x) => s + ((x - 128) / 128) ** 2, 0) /
                  samples.length,
              ) * 450,
            ),
          );
        }
        if (secs >= 300) void finish();
      }, 200);
    } catch (e) {
      release();
      const err = e as Error;
      setError(
        err.name === "NotAllowedError"
          ? "카메라·마이크 권한이 필요해요. 브라우저 권한을 허용한 뒤 다시 눌러주세요."
          : err.name === "NotFoundError"
            ? "연결된 카메라 또는 마이크를 찾지 못했어요."
            : err.message,
      );
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  async function finish() {
    const mr = rec.current;
    if (!mr || mr.state === "inactive" || guard.current) return;
    guard.current = true;
    setBusy(true);
    try {
      await new Promise<void>((resolve) => {
        mr.addEventListener("stop", () => resolve(), { once: true });
        mr.stop();
      });
      const result = new Blob(chunks.current, { type: mr.mimeType });
      if (!result.size)
        throw new Error(
          "녹음 데이터가 없어요. 장치를 확인하고 다시 녹음해주세요.",
        );
      setBlob(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      release();
      setRecording(false);
      setPaused(false);
      setBusy(false);
      guard.current = false;
    }
  }
  function pause() {
    const mr = rec.current;
    if (!mr) return;
    if (mr.state === "recording") {
      mr.pause();
      time.current.pauseStart = performance.now();
      setPaused(true);
    } else if (mr.state === "paused") {
      time.current.paused += performance.now() - time.current.pauseStart;
      mr.resume();
      setPaused(false);
    }
  }
  async function save() {
    if (!blob || !snapshot.current || guard.current) return;
    guard.current = true;
    setBusy(true);
    setError("");
    try {
      const key = uploadKey.current || id();
      uploadKey.current = key;
      await saveMedia(key, blob);
      const s = snapshot.current;
      const take: Take = {
        id: key,
        courseId: s.course.id,
        studentId: s.student.id,
        studentName: s.student.name,
        studentNumber: s.student.number,
        task: s.course.task,
        criteria: structuredClone(s.course.criteria),
        rubric: s.course.rubric,
        kind: s.kind,
        duration: time.current.duration,
        createdAt: new Date().toISOString(),
        blobId: key,
      };
      await onSave(take);
      setBlob(null);
      onLock(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  if (!course || !courses.some((c) => c.students.length))
    return (
      <>
        <PageTitle title="새로운 목소리를 기록해요" />
        <Empty
          title="먼저 수업에 학생을 등록해주세요"
          description="내 수업에서 학생 명단을 등록한 뒤 녹음을 시작할 수 있어요."
          action={
            <button className="primary-button" onClick={back}>
              내 수업으로
            </button>
          }
        />
      </>
    );
  const locked = recording || busy || !!blob;
  return (
    <>
      <button className="back-link" disabled={locked} onClick={back}>
        <ArrowLeft size={16} />내 수업으로
      </button>
      <PageTitle
        eyebrow="RECORDING STUDIO"
        title="한 학생의 목소리에 집중하는 시간"
        description="학생을 선택하고 편안하게 녹음을 시작하세요."
      />
      <div className="record-layout">
        <section className="record-main panel">
          <div className="record-top">
            <div className="record-student">
              <span className="student-avatar avatar-0">
                {student?.name.replace(/\s/g, "").slice(-2) || "?"}
              </span>
              <div>
                <strong>{student?.name || "학생을 선택해주세요"}</strong>
                <span>
                  {course.grade} {course.classroom}
                  {student ? " · " + student.number + "번" : ""}
                </span>
              </div>
            </div>
            <span className={"record-status " + (recording ? "is-live" : "")}>
              {recording
                ? paused
                  ? "일시 정지"
                  : "녹음 중"
                : blob
                  ? "녹음 완료"
                  : "녹음 준비"}
            </span>
          </div>
          <div className="record-mode">
            <button
              disabled={locked}
              className={kind === "audio" ? "active" : ""}
              onClick={() => setKind("audio")}
            >
              <Mic size={16} />
              음성 녹음
            </button>
            <button
              disabled={locked}
              className={kind === "video" ? "active" : ""}
              onClick={() => setKind("video")}
            >
              <Video size={17} />
              영상 + 음성
            </button>
          </div>
          {blob ? (
            <div className="record-preview">
              {kind === "video" ? (
                <video controls playsInline src={preview} />
              ) : (
                <>
                  <div className="record-mic done-mic">
                    <Check size={34} />
                  </div>
                  <h3>녹음이 잘 담겼어요.</h3>
                  <audio controls src={preview} />
                </>
              )}
            </div>
          ) : (
            <div
              className={
                "record-stage " +
                (kind === "video" && recording ? "video-stage" : "")
              }
            >
              {kind === "video" && recording ? (
                <video ref={video} autoPlay playsInline muted />
              ) : (
                <>
                  <div
                    className={
                      "record-mic " + (recording && !paused ? "pulsing" : "")
                    }
                  >
                    {kind === "video" ? <Video size={35} /> : <Mic size={35} />}
                  </div>
                  <h3>
                    {recording
                      ? paused
                        ? "잠시 쉬어가는 중이에요"
                        : "편안하게 이야기해주세요"
                      : "준비되면 녹음 버튼을 눌러주세요"}
                  </h3>
                  <p>
                    {kind === "video"
                      ? "발표 장면과 목소리를 함께 기록해요."
                      : "주변이 조용한 곳에서 녹음하면 더 선명해요."}
                  </p>
                  <div className={"studio-wave " + (recording ? "live" : "")}>
                    {Array.from({ length: 37 }, (_, i) => (
                      <i
                        key={i}
                        style={{
                          height:
                            recording && !paused
                              ? Math.max(
                                  4,
                                  (Math.sin(i * 1.6) * 0.35 + 0.65) *
                                    level *
                                    0.7,
                                ) + "px"
                              : 4 + Math.sin(i * 0.8) ** 2 * 15 + "px",
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          <div className="record-timer">
            {clock(elapsed)}
            <span>/ 05:00</span>
          </div>
          <div className="record-level">
            <Volume2 size={15} />
            <div>
              <i style={{ width: (recording ? level : 0) + "%" }} />
            </div>
            <span>
              {recording && level > 5 ? "목소리 감지" : "마이크 입력"}
            </span>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {!recording && !blob && (
            <label className="consent-check">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span>
                학생의 녹음·촬영 안내 및 필요한 동의 절차를 확인했어요.
              </span>
            </label>
          )}
          <div className="record-controls">
            {blob ? (
              <>
                <button
                  className="secondary-button"
                  disabled={busy}
                  onClick={() =>
                    download(
                      blob,
                      "녹음원본." +
                        (blob.type.includes("mp4") ? "mp4" : "webm"),
                    )
                  }
                >
                  <Download size={17} />
                  원본 내려받기
                </button>
                <button
                  className="primary-button"
                  disabled={busy}
                  onClick={() => void save()}
                >
                  {busy ? (
                    <LoaderCircle size={18} className="spin" />
                  ) : (
                    <Check size={18} />
                  )}
                  녹음 저장하고 확인하기
                </button>
              </>
            ) : recording ? (
              <>
                <button
                  className="secondary-button"
                  disabled={busy}
                  onClick={pause}
                >
                  {paused ? <Play size={18} /> : <Pause size={18} />}{" "}
                  {paused ? "계속 녹음" : "일시 정지"}
                </button>
                <button
                  className="stop-button"
                  disabled={busy}
                  onClick={() => void finish()}
                >
                  <Square size={15} fill="currentColor" />
                  녹음 끝내기
                </button>
              </>
            ) : (
              <button
                className="primary-button record-start"
                disabled={!student || !agreed || busy}
                onClick={() => void start()}
              >
                {busy ? (
                  <LoaderCircle className="spin" size={19} />
                ) : (
                  <Mic size={19} />
                )}{" "}
                {busy ? "장치 연결 중" : "녹음 시작하기"}
              </button>
            )}
          </div>
          <p className="record-storage">
            <ShieldCheck size={14} />
            저장 버튼을 누르면 원본이 선생님 계정의 서버 저장소에 업로드돼요.
          </p>
        </section>
        <aside className="record-aside">
          <section className="panel selection-panel">
            <h3>녹음할 학생</h3>
            <label>
              수업
              <select
                disabled={locked}
                value={cid}
                onChange={(e) => {
                  setCid(e.target.value);
                  setSid("");
                }}
              >
                {courses.map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.grade} {c.classroom} · {c.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="record-student-list">
              {course.students.map((s) => (
                <button
                  disabled={locked}
                  className={sid === s.id ? "selected" : ""}
                  onClick={() => setSid(s.id)}
                  key={s.id}
                >
                  <span>{String(s.number).padStart(2, "0")}</span>
                  <strong>{s.name}</strong>
                  {sid === s.id && <Check size={17} />}
                </button>
              ))}
            </div>
          </section>
          <section className="record-task">
            <span className="small-label">오늘의 말하기 과제</span>
            <h3>{course.task}</h3>
            <p>{course.prompt}</p>
            <div>
              {course.criteria.map((c) => (
                <span key={c.id}>
                  {c.name} <strong>{c.max}점</strong>
                </span>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
