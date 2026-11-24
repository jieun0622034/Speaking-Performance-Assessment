import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Headphones,
  FileText,
  Sparkles,
  Play,
  Info,
  Download,
  AlertCircle,
} from "lucide-react";
import { Take, Course, readMedia, total, clock, download } from "./model";
import { Modal, Status, PageTitle } from "./UI";
export default function Review({
  take,
  course,
  back,
  onSave,
  toast,
  readOnly = false,
}: {
  readOnly?: boolean;
  take: Take;
  course?: Course;
  back: () => void;
  onSave: (t: Take) => Promise<void>;
  toast: (s: string) => void;
}) {
  const [tab, setTab] = useState("transcript"),
    [evidence, setEvidence] = useState<number | null>(null),
    [scores, setScores] = useState<Record<string, string>>(
      Object.fromEntries(
        take.criteria.map((c) => [c.id, String(take.scores?.[c.id] ?? "")]),
      ),
    ),
    [feedback, setFeedback] = useState(take.feedback || ""),
    [checked, setChecked] = useState(false),
    [source, setSource] = useState(""),
    [error, setError] = useState(""),
    [confirm, setConfirm] = useState(false),
    [saving, setSaving] = useState(false);
  const player = useRef<HTMLMediaElement | null>(null);
  const blob = useRef<Blob | null>(null);
  useEffect(() => {
    let url = "",
      alive = true;
    if (take.blobId)
      void readMedia(take.blobId)
        .then((b) => {
          if (b && alive) {
            blob.current = b;
            url = URL.createObjectURL(b);
            setSource(url);
          }
        })
        .catch(() => setError("저장된 원본을 읽지 못했습니다."));
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [take.id]);
  async function save(confirmed: boolean) {
    if (saving || readOnly) return;
    setError("");
    const result: Record<string, number> = {};
    for (const c of take.criteria) {
      const value = scores[c.id];
      if (
        value === "" ||
        !Number.isFinite(Number(value)) ||
        Number(value) < 0 ||
        Number(value) > c.max
      ) {
        setError(`${c.name} 점수를 0~${c.max}점 범위로 입력해주세요.`);
        return;
      }
      result[c.id] = Number(value);
    }
    if (confirmed && (!checked || !feedback.trim())) {
      setError("원본·근거 확인란과 학생 피드백을 확인해주세요.");
      return;
    }
    if (confirmed && !confirm) {
      setConfirm(true);
      return;
    }
    setSaving(true);
    try {
      await onSave({ ...take, scores: result, feedback, confirmed });
      setConfirm(false);
      toast(
        confirmed ? "교사 최종 점수를 확정했어요." : "검토 내용을 저장했어요.",
      );
    } catch (e) {
      setError((e as Error).message);
      setConfirm(false);
    } finally {
      setSaving(false);
    }
  }
  function seek(time: number) {
    if (player.current) {
      player.current.currentTime = time;
      void player.current.play().catch(() => {});
    } else
      toast(
        "예시 평가에는 실제 녹음 파일이 없어요. 직접 녹음하면 해당 구간을 재생할 수 있어요.",
      );
  }
  const annotation = take.evidence?.[evidence ?? -1];
  const text = take.transcript || "";
  const mark = take.evidence?.[0];
  const pos = mark ? text.indexOf(mark.quote, text.indexOf("Yesterday")) : -1;
  const sum = take.criteria.every(
    (c) => scores[c.id] !== "" && Number.isFinite(Number(scores[c.id])),
  )
    ? Object.values(scores).reduce((a, b) => a + Number(b), 0)
    : null;
  return (
    <>
      <button className="back-link" onClick={back}>
        <ArrowLeft size={16} />
        {readOnly ? "보관한 수업" : "평가 목록"}
      </button>
      <PageTitle
        eyebrow={`${course?.grade || ""} ${course?.classroom || ""} · ${take.studentNumber}번`}
        title={`${take.studentName} 학생의 말하기`}
        description={take.task}
        action={<Status take={take} />}
      />
      {readOnly && (
        <p className="archive-explanation">
          보관한 수업의 평가입니다. 점수와 피드백을 수정하려면 수업을 먼저
          복원해주세요.
        </p>
      )}
      {take.kind === "video" && (
        <p className="video-assessment-note">
          <strong>영상의 평가 반영 방식</strong>
          <br />
          영상과 음성을 재생하며 교사가 등록한 항목에 따라 직접 채점해요. 영상
          AI 분석은 연결되지 않았으며 촬영만으로 점수가 추가되거나 감점되지
          않아요.
        </p>
      )}
      {take.sample && (
        <div className="sample-notice">
          <Info size={17} />
          <span>
            예시 평가 화면입니다. 발화·오류 표시·점수는 사용 흐름을 보여주는
            가상 자료예요.
          </span>
        </div>
      )}
      <div className="review-layout">
        <section className="review-content">
          <div className="panel recording-player">
            <div className="label-row">
              <h3>
                <Headphones size={17} />
                녹음 원본
              </h3>
              <span>
                {clock(take.duration)} ·{" "}
                {take.kind === "video" ? "영상 + 음성" : "음성"}
              </span>
            </div>
            {source ? (
              take.kind === "video" ? (
                <video
                  controls
                  playsInline
                  src={source}
                  ref={(e) => {
                    player.current = e;
                  }}
                />
              ) : (
                <audio
                  controls
                  src={source}
                  ref={(e) => {
                    player.current = e;
                  }}
                />
              )
            ) : (
              <div className="example-player">
                <button
                  className="round-play"
                  aria-label="원본 재생 안내"
                  onClick={() => seek(0)}
                >
                  <Play size={17} fill="currentColor" />
                </button>
                <div className="static-wave">
                  {Array.from({ length: 47 }, (_, i) => (
                    <i
                      key={i}
                      style={{ height: 5 + Math.sin(i * 0.9) ** 2 * 25 + "px" }}
                    />
                  ))}
                </div>
                <span>{clock(take.duration)}</span>
              </div>
            )}
            {source && (
              <button
                className="text-button"
                onClick={() => {
                  if (blob.current)
                    download(
                      blob.current,
                      take.studentName +
                        "_녹음." +
                        (take.kind === "video" ? "webm" : "webm"),
                    );
                }}
              >
                <Download size={15} />
                원본 내려받기
              </button>
            )}
          </div>
          <div className="panel transcript-panel">
            <div className="review-tabs">
              <button
                className={tab === "transcript" ? "active" : ""}
                onClick={() => setTab("transcript")}
              >
                <FileText size={16} />
                발화·평가 근거
              </button>
              <button
                className={tab === "rubric" ? "active" : ""}
                onClick={() => setTab("rubric")}
              >
                적용한 평가 기준
              </button>
            </div>
            {tab === "rubric" ? (
              <div className="rubric-in-review">
                {take.criteria.map((c) => (
                  <div key={c.id}>
                    <strong>
                      {c.name}
                      <span>{c.max}점</span>
                    </strong>
                    <p>{c.description}</p>
                  </div>
                ))}
                <p className="original-rubric">
                  {take.rubric || "상세 기준을 추가하지 않은 평가입니다."}
                </p>
                <p className="field-hint">
                  녹음 당시 저장한 기준입니다. 수업 기준을 바꿔도 이 평가에는
                  그대로 유지돼요.
                </p>
              </div>
            ) : text ? (
              <>
                <div className="transcript-legend">
                  <span>
                    <i />
                    확인할 표현
                  </span>
                  <span>표시된 부분을 눌러 이유를 확인해보세요.</span>
                </div>
                <div className="transcript-timeline">
                  <button className="timestamp" onClick={() => seek(0)}>
                    00:00
                  </button>
                  <p>
                    {pos >= 0 && mark ? (
                      <>
                        {text.slice(0, pos)}
                        <button
                          className="highlight-word"
                          onClick={() => setEvidence(0)}
                        >
                          {mark.quote}
                        </button>
                        {text.slice(pos + mark.quote.length)}
                      </>
                    ) : (
                      text
                    )}
                  </p>
                </div>
                {mark && (
                  <button
                    className="evidence-preview"
                    onClick={() => setEvidence(0)}
                  >
                    <span className="evidence-preview-icon">
                      <Sparkles size={18} />
                    </span>
                    <div>
                      <span>영어 표현 · 시제 확인</span>
                      <strong>
                        {mark.quote} <span>→</span> {mark.correction}
                      </strong>
                      <p>{mark.reason}</p>
                    </div>
                    <span className="tiny-pill">00:12</span>
                  </button>
                )}
                <div className="teacher-hint">
                  <Info size={16} />
                  <p>
                    음성 인식 결과가 학생의 실제 발화와 다를 수 있어요. 표시된
                    부분은 원본을 듣고 확인해주세요.
                  </p>
                </div>
              </>
            ) : (
              <div className="analysis-pending">
                <span>
                  <Check size={27} />
                </span>
                <h3>원본 녹음이 안전하게 저장됐어요.</h3>
                <p>
                  실제 AI 전사·자동 평가는 아직 연결하지 않았어요.
                  <br />
                  원본을 재생하며 오른쪽에서 직접 채점할 수 있습니다.
                </p>
                <span className="status-tag saved">
                  교사 계정의 서버에 원본 보관
                </span>
              </div>
            )}
          </div>
        </section>
        <aside className="panel grading-panel">
          <div className="grade-heading">
            <span className="small-label">TEACHER REVIEW</span>
            <h2>선생님의 최종 평가</h2>
            <p>근거를 확인하고 점수를 결정해주세요.</p>
          </div>
          <div className="grade-items">
            {take.criteria.map((c) => (
              <label key={c.id}>
                <span>
                  <strong>{c.name}</strong>
                  <small>{c.description}</small>
                </span>
                <div>
                  <input
                    aria-label={c.name + " 점수"}
                    disabled={readOnly}
                    type="number"
                    min="0"
                    max={c.max}
                    value={scores[c.id]}
                    onChange={(e) => {
                      setScores({ ...scores, [c.id]: e.target.value });
                      setChecked(false);
                    }}
                    placeholder="—"
                  />
                  <span>/ {c.max}</span>
                </div>
              </label>
            ))}
          </div>
          <div className="grade-total">
            <span>총점</span>
            <strong>
              {sum ?? "—"}
              <small>/ {take.criteria.reduce((a, c) => a + c.max, 0)}</small>
            </strong>
          </div>
          <label className="feedback-label">
            학생에게 전할 피드백
            <textarea
              disabled={readOnly}
              rows={5}
              value={feedback}
              maxLength={6000}
              onChange={(e) => {
                setFeedback(e.target.value);
                setChecked(false);
              }}
              placeholder="잘한 점과 다음에 연습할 점을 적어주세요."
            />
          </label>
          <label className="consent-check">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            <span>원본과 평가 기준을 직접 확인했어요.</span>
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="primary-button full"
            disabled={saving || readOnly}
            onClick={() => void save(true)}
          >
            <CheckCheck size={18} />
            최종 점수 확정하기
          </button>
          <button
            className="secondary-button full"
            disabled={saving || readOnly}
            onClick={() => void save(false)}
          >
            검토 내용 저장
          </button>
          <p className="grading-footnote">
            AI는 판단을 돕고, 최종 결정은 선생님이 해요.
          </p>
        </aside>
      </div>
      {annotation && (
        <Modal
          title="이 표현을 함께 확인해요"
          subtitle={`${annotation.criterion} · ${clock(annotation.start)}`}
          onClose={() => setEvidence(null)}
        >
          <div className="evidence-detail">
            <span className="small-label">원문 표현</span>
            <h3>
              {annotation.quote}
              <span>→</span>
              {annotation.correction}
            </h3>
            <p>{annotation.reason}</p>
            <button
              className="secondary-button"
              onClick={() => seek(annotation.start)}
            >
              <Headphones size={17} />이 구간 다시 듣기
            </button>
          </div>
        </Modal>
      )}
      {confirm && (
        <Modal
          title="최종 점수를 확정할까요?"
          subtitle="선생님이 확인한 점수와 피드백을 저장합니다."
          onClose={() => setConfirm(false)}
        >
          <div className="confirm-score">
            <span>{take.studentName}</span>
            <strong>
              {sum}
              <small>점</small>
            </strong>
          </div>
          <div className="form-footer">
            <button
              className="secondary-button"
              onClick={() => setConfirm(false)}
            >
              돌아가기
            </button>
            <button
              className="primary-button"
              disabled={saving || readOnly}
              onClick={() => void save(true)}
            >
              <Check size={17} />
              최종 확정
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
