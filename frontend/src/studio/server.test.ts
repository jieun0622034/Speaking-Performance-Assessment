import { afterEach, describe, it, expect, vi } from "vitest";
import { authenticate, connectSession, session } from "./server";
const response = (token: string) =>
  new Response(
    JSON.stringify({ authenticated: false, csrfToken: token, user: {} }),
  );
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe("login connection recovery", () => {
  it("refreshes a stale session token before sending login credentials", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(response("old-token"))
      .mockResolvedValueOnce(response("new-token"))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ user: { id: "teacher" } })),
      )
      .mockResolvedValueOnce(response("rotated-token"));
    vi.stubGlobal("fetch", fetch);
    await session();
    await authenticate("login", {
      email: "teacher@example.test",
      password: "test-only-password",
    });
    expect(fetch.mock.calls.map((c) => c[0])).toEqual([
      "/api/auth/status",
      "/api/auth/status",
      "/api/auth/login",
      "/api/auth/status",
    ]);
    expect(fetch.mock.calls[2][1].headers["X-CSRF-TOKEN"]).toBe("new-token");
  });
  it("does not post credentials while the server is unavailable", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 503 }));
    vi.stubGlobal("fetch", fetch);
    await expect(
      authenticate("login", {
        email: "teacher@example.test",
        password: "test-only-password",
      }),
    ).rejects.toThrow("서버에 연결");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("recovers when Spring Boot starts after the frontend", async () => {
    vi.useFakeTimers();
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(new Response("{}", { status: 502 }))
      .mockResolvedValueOnce(response("ready-token"));
    vi.stubGlobal("fetch", fetch);
    const pending = connectSession();
    await vi.runAllTimersAsync();
    expect((await pending).csrfToken).toBe("ready-token");
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
