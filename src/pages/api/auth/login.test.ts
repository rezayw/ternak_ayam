import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./login";
import { createCaptcha } from "@/lib/captcha";

const findUnique = vi.fn();
vi.mock("@/lib/db", () => ({
  db: { user: { findUnique } }
}));

const verifyPassword = vi.fn();
vi.mock("@/lib/auth", () => ({ verifyPassword }));

function createMockCookies(initial: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initial));
  const setCalls: Array<{ name: string; value: string; options: unknown }> = [];

  return {
    get(name: string) {
      const value = store.get(name);
      return value ? { value } : undefined;
    },
    set(name: string, value: string, options: unknown) {
      store.set(name, value);
      setCalls.push({ name, value, options });
    },
    __store: store,
    __setCalls: setCalls
  };
}

beforeEach(() => {
  findUnique.mockReset();
  verifyPassword.mockReset();
});

describe("POST /api/auth/login", () => {
  it("logs in with valid csrf, captcha, and credentials", async () => {
    const { token, answer } = createCaptcha();
    const cookies = createMockCookies({ csrf: "csrf-token", captcha: token });

    findUnique.mockResolvedValue({ id: "user-1", email: "a@example.com", password: "hash" });
    verifyPassword.mockResolvedValue(true);

    const form = new FormData();
    form.set("email", "a@example.com");
    form.set("password", "secret");
    form.set("csrf", "csrf-token");
    form.set("captcha", answer);

    const response = await POST({ request: new Request("http://localhost/api/auth/login", { method: "POST", body: form }), cookies } as any);

    expect(response.status).toBe(200);
    const sessionCookie = cookies.__setCalls.find((c) => c.name === "session");
    expect(sessionCookie).toBeDefined();
  });

  it("rejects when captcha is wrong", async () => {
    const { token } = createCaptcha();
    const cookies = createMockCookies({ csrf: "csrf-token", captcha: token });

    findUnique.mockResolvedValue({ id: "user-1", email: "a@example.com", password: "hash" });
    verifyPassword.mockResolvedValue(true);

    const form = new FormData();
    form.set("email", "a@example.com");
    form.set("password", "secret");
    form.set("csrf", "csrf-token");
    form.set("captcha", "wrong");

    const response = await POST({ request: new Request("http://localhost/api/auth/login", { method: "POST", body: form }), cookies } as any);
    expect(response.status).toBe(400);
  });

  it("rejects when csrf token is missing", async () => {
    const { token, answer } = createCaptcha();
    const cookies = createMockCookies({ captcha: token });

    const form = new FormData();
    form.set("email", "a@example.com");
    form.set("password", "secret");
    form.set("captcha", answer);

    const response = await POST({ request: new Request("http://localhost/api/auth/login", { method: "POST", body: form }), cookies } as any);
    expect(response.status).toBe(403);
  });
});
