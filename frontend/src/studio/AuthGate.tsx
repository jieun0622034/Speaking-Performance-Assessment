import { useEffect, useState } from "react";
import {
  Mic,
  LoaderCircle,
  LockKeyhole,
  BookOpen,
  ShieldCheck,
} from "lucide-react";
import { Brand, Modal } from "./UI";
import {
  session,
  connectSession,
  request,
  authenticate,
  bindOwner,
  type Session,
  type Workspace,
} from "./server";
import Studio from "./Studio";

function AccountForm({
  onSuccess,
  email: fixedEmail,
}: {
  onSuccess: (s: Session) => void;
  email?: string;
}) {
  const [mode, setMode] = useState<"login" | "signup">("login"),
    [email, setEmail] = useState(fixedEmail || ""),
    [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [name, setName] = useState(""),
    [school, setSchool] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    if (mode === "signup" && password !== confirmation) {
      setError("비밀번호가 서로 다릅니다.");
      return;
    }
    setBusy(true);
    try {
      const result = await authenticate(mode, {
        email,
        password,
        name,
        school,
      });
      setPassword("");
      setConfirmation("");
      onSuccess(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="account-form">
      <div className="account-heading">
        <span className="eyebrow">TEACHER WORKSPACE</span>
        <h1>
          {fixedEmail
            ? "다시 로그인해주세요"
            : mode === "login"
              ? "선생님, 다시 만나 반가워요."
              : "선생님의 수업을 시작해보세요."}
        </h1>
        <p>
          {fixedEmail
            ? "입력 중인 내용은 그대로 유지하고 있어요."
            : "학생의 목소리와 평가 기록을 선생님 계정에 보관해요."}
        </p>
      </div>
      {!fixedEmail && (
        <div className="segmented">
          <button
            disabled={busy}
            className={mode === "login" ? "active" : ""}
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            로그인
          </button>
          <button
            disabled={busy}
            className={mode === "signup" ? "active" : ""}
            onClick={() => {
              setMode("signup");
              setError("");
            }}
          >
            회원가입
          </button>
        </div>
      )}
      <form className="studio-form" onSubmit={(e) => void submit(e)}>
        {mode === "signup" && (
          <div className="form-two">
            <label>
              선생님 이름
              <input
                required
                autoComplete="name"
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              학교
              <input
                maxLength={100}
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="선택 입력"
              />
            </label>
          </div>
        )}
        <label>
          이메일
          <input
            type="email"
            autoComplete="username"
            required
            maxLength={254}
            value={email}
            readOnly={!!fixedEmail}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teacher@school.kr"
          />
        </label>
        <label>
          비밀번호
          <input
            type="password"
            autoComplete={
              mode === "signup" ? "new-password" : "current-password"
            }
            minLength={10}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="10자 이상 입력해주세요"
          />
        </label>
        {mode === "signup" && (
          <label>
            비밀번호 확인
            <input
              type="password"
              required
              autoComplete="new-password"
              minLength={10}
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </label>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="primary-button full" disabled={busy}>
          {busy ? (
            <LoaderCircle size={18} className="spin" />
          ) : (
            <LockKeyhole size={16} />
          )}{" "}
          {busy
            ? "확인 중…"
            : mode === "signup"
              ? "가입하고 수업 시작하기"
              : "로그인"}
        </button>
      </form>
      <p className="account-note">
        {mode === "signup"
          ? "비밀번호는 암호학적 해시로 보관하며, 서버에서 계정별 접근 권한을 확인합니다."
          : "등록한 계정으로 로그인하면 다른 브라우저에서도 같은 서버의 자료를 확인할 수 있어요."}
      </p>
    </div>
  );
}
export default function AuthGate() {
  const [auth, setAuth] = useState<Session | null>(null),
    [workspace, setWorkspace] = useState<Workspace | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [renew, setRenew] = useState(false);
  useEffect(() => {
    let alive = true;
    void connectSession()
      .then(async (s) => {
        if (s.authenticated) bindOwner(s.user.id);
        const w = s.authenticated
          ? await request<Workspace>("/workspace")
          : null;
        if (alive) {
          setAuth(s);
          setWorkspace(w);
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    const expired = () => {
      void session()
        .then(() => setRenew(true))
        .catch(() => setRenew(true));
    };
    window.addEventListener("studio:session-expired", expired);
    return () => window.removeEventListener("studio:session-expired", expired);
  }, []);
  async function loggedIn(s: Session) {
    setLoading(true);
    setError("");
    try {
      bindOwner(s.user.id);
      const w = await request<Workspace>("/workspace");
      setAuth(s);
      setWorkspace(w);
      setRenew(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  async function logout() {
    await request("/auth/logout", { body: {} });
    bindOwner("");
    setWorkspace(null);
    setAuth(await session());
  }
  if (loading)
    return (
      <div className="account-loading">
        <Brand />
        <LoaderCircle className="spin" />
        <p>선생님의 수업을 불러오고 있어요.</p>
      </div>
    );
  if (auth?.authenticated && workspace)
    return (
      <>
        <Studio
          key={auth.user.id}
          initialData={workspace.data}
          initialRevision={workspace.revision}
          account={auth.user}
          onLogout={logout}
        />
        {renew && (
          <Modal title="로그인 시간이 만료됐어요" onClose={() => {}}>
            <AccountForm
              email={auth.user.email}
              onSuccess={(s) => {
                if (s.user.id !== auth.user.id) {
                  setError("원래 계정으로 로그인해주세요.");
                  return;
                }
                setAuth(s);
                setRenew(false);
              }}
            />
          </Modal>
        )}
      </>
    );
  return (
    <div className="account-shell">
      <div className="account-brand">
        <Brand />
      </div>
      <div className="account-layout">
        <section className="account-story">
          <span className="hero-kicker">말하기 평가, 조금 더 가볍게</span>
          <h2>
            한 학생의 목소리가
            <br />
            <em>배움의 기록이 될 때.</em>
          </h2>
          <p>
            수업 준비부터 학생 등록, 녹음과 최종 평가까지.
            <br />
            선생님의 수업을 위한 하나의 작업 공간.
          </p>
          <div className="account-illustration">
            <div className="hero-wave">
              {[20, 35, 55, 30, 70, 95, 63, 38, 75, 51, 24, 43, 19].map(
                (height, i) => (
                  <i key={i} style={{ height }} />
                ),
              )}
            </div>
            <span>Every voice matters.</span>
          </div>
          <div className="account-benefits">
            <span>
              <BookOpen size={17} />
              계정별 수업·학생 관리
            </span>
            <span>
              <Mic size={17} />
              음성·영상 원본 보관
            </span>
            <span>
              <ShieldCheck size={17} />
              교사 확인 후 점수 확정
            </span>
          </div>
        </section>
        <section className="panel account-panel">
          {error && (
            <div className="form-error" role="alert">
              {error}
              <button className="text-button" onClick={() => location.reload()}>
                다시 연결
              </button>
            </div>
          )}
          <AccountForm onSuccess={(s) => void loggedIn(s)} />
        </section>
      </div>
      <footer>스피크노트 · 학생의 모든 목소리에, 배움의 기록을.</footer>
    </div>
  );
}
