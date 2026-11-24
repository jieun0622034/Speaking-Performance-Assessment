import { useEffect, useRef, type ReactNode } from "react";
import { X, Mic, Check, Clock3, Headphones, ChevronRight } from "lucide-react";
import { termLabel } from "./lifecycle";
import { Take, Course, total, clock, timeAgo } from "./model";
export function Brand() {
  return (
    <span className="brand-lockup">
      <span className="brand-icon">
        <i />
        <i />
        <i />
        <i />
      </span>
      <strong>
        스피크노트<span>speaking, made simple.</span>
      </strong>
    </span>
  );
}
export function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className={"studio-dialog " + (wide ? "wide-dialog " : "") + className}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="dialog-title">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button className="icon-button" aria-label="닫기" onClick={onClose}>
          <X size={21} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Status({ take }: { take?: Take }) {
  return (
    <span
      className={
        "status-tag " +
        (!take
          ? "empty"
          : take.confirmed
            ? "done"
            : take.scores
              ? "review"
              : "saved")
      }
    >
      {take?.confirmed ? (
        <Check size={12} />
      ) : take?.scores ? (
        <Clock3 size={12} />
      ) : take ? (
        <Headphones size={12} />
      ) : null}
      {!take
        ? "녹음 전"
        : take.confirmed
          ? "확정 완료"
          : take.scores
            ? "검토 필요"
            : "원본 저장"}
    </span>
  );
}
export function CourseCard({
  course,
  takes,
  onClick,
}: {
  course: Course;
  takes: Take[];
  onClick: () => void;
}) {
  const completed = course.students.filter((s) =>
    takes.some((t) => t.courseId === course.id && t.studentId === s.id),
  ).length;
  const confirmed = course.students.filter((s) =>
    takes.some(
      (t) => t.courseId === course.id && t.studentId === s.id && t.confirmed,
    ),
  ).length;
  return (
    <button className="course-card" onClick={onClick}>
      <div className={"course-card-top " + course.color}>
        <span className="subject-label">{termLabel(course)}</span>
        <span className="course-grade">
          {course.grade} {course.classroom}
        </span>
        <div className="course-line-art" aria-hidden="true">
          <Mic />
          <span className="sound-line" />
          <span className="sound-line" />
          <span className="sound-line" />
        </div>
      </div>
      <div className="course-card-body">
        <div className="course-card-heading">
          <h3>{course.name}</h3>
          <ChevronRight size={19} />
        </div>
        <p className="course-task">{course.task}</p>
        <div className="course-meta">
          <span>학생 {course.students.length}명</span>
          {course.sample && <span>예시 수업</span>}
        </div>
        <div className="progress-track">
          <i
            style={{
              width:
                (course.students.length
                  ? (completed / course.students.length) * 100
                  : 0) + "%",
            }}
          />
        </div>
        <div className="progress-label">
          <span>
            녹음 {completed}/{course.students.length}
          </span>
          <span>확정 {confirmed}명</span>
        </div>
      </div>
    </button>
  );
}
export function TakeRow({
  take,
  course,
  onClick,
}: {
  take: Take;
  course?: Course;
  onClick: () => void;
}) {
  return (
    <button className="take-row" onClick={onClick}>
      <span className={"student-avatar avatar-" + (take.studentNumber % 4)}>
        {take.studentName.replace(/\s/g, "").slice(-2)}
      </span>
      <span className="take-who">
        <strong>
          {take.studentName}
          {take.sample && <small>예시</small>}
        </strong>
        <span>
          {course?.grade} {course?.classroom} · {take.studentNumber}번
        </span>
      </span>
      <span className="take-task">
        {take.task}
        <small>
          {clock(take.duration)} · {timeAgo(take.createdAt)}
        </small>
      </span>
      <Status take={take} />
      <span className="take-score">
        {take.confirmed ? total(take) + "점" : <ChevronRight size={17} />}
      </span>
    </button>
  );
}
export function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span>
        <Mic size={26} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
