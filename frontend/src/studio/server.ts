import type { StudioData } from "./model";
export interface TeacherAccount {
  id: string;
  email: string;
  name: string;
}
export interface Session {
  authenticated: boolean;
  csrfToken: string;
  user: TeacherAccount;
}
export interface Workspace {
  revision: number;
  data: StudioData;
}
let csrf = "";
let expectedOwner = "";
export function bindOwner(id: string) {
  expectedOwner = id;
}
export class ServerError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function session(): Promise<Session> {
  const res = await fetch("/api/auth/status", {
    cache: "no-store",
    credentials: "same-origin",
  });
  if (!res.ok) throw new Error("서버에 연결하지 못했습니다.");
  const data = await res.json();
  csrf = data.csrfToken;
  return data;
}
export async function request<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    signal?: AbortSignal;
    raw?: boolean;
  } = {},
): Promise<T> {
  const form = options.body instanceof FormData;
  const method =
    options.method || (options.body === undefined ? "GET" : "POST");
  const headers: Record<string, string> = {};
  if (expectedOwner && !path.startsWith("/auth/"))
    headers["X-Workspace-Owner"] = expectedOwner;
  if (!["GET", "HEAD"].includes(method)) headers["X-CSRF-TOKEN"] = csrf;
  if (options.body !== undefined && !form)
    headers["Content-Type"] = "application/json";
  let res: Response;
  try {
    res = await fetch("/api" + path, {
      method,
      headers,
      credentials: "same-origin",
      cache: "no-store",
      signal: options.signal,
      body:
        options.body === undefined
          ? undefined
          : form
            ? (options.body as FormData)
            : JSON.stringify(options.body),
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ServerError(
      "서버와 연결이 끊겼습니다. 입력 내용과 원본을 유지한 채 다시 시도해주세요.",
      "NETWORK_ERROR",
      0,
    );
  }
  if (!res.ok) {
    const data = await res
      .json()
      .catch(() => ({ error: "서버 요청에 실패했습니다." }));
    if (data.code === "AUTH_REQUIRED" || data.code === "ACCOUNT_CHANGED")
      window.dispatchEvent(new Event("studio:session-expired"));
    throw new ServerError(
      data.error || "요청에 실패했습니다.",
      data.code || "REQUEST_FAILED",
      res.status,
    );
  }
  return (options.raw ? await res.blob() : await res.json()) as T;
}
export async function authenticate(
  mode: "login" | "signup",
  body: { email: string; password: string; name?: string; school?: string },
) {
  await request("/auth/" + mode, { body });
  return session();
}
export async function saveServerMedia(key: string, blob: Blob) {
  const form = new FormData();
  form.append(
    "file",
    blob,
    "recording." +
      (blob.type.includes("mp4")
        ? "mp4"
        : blob.type.includes("wav")
          ? "wav"
          : "webm"),
  );
  await request("/media/" + encodeURIComponent(key), { body: form });
}
export function readServerMedia(key: string) {
  return request<Blob>("/media/" + encodeURIComponent(key), { raw: true });
}
