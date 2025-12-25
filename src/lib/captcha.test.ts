import { describe, expect, it } from "vitest";
import { createCaptcha, verifyCaptcha } from "./captcha";

describe("captcha", () => {
  it("accepts the correct answer", () => {
    const { token, answer } = createCaptcha();
    expect(verifyCaptcha(answer, token)).toBe(true);
  });

  it("rejects a wrong answer", () => {
    const { token } = createCaptcha();
    expect(verifyCaptcha("999", token)).toBe(false);
  });

  it("rejects a tampered token", () => {
    const { answer } = createCaptcha();
    expect(verifyCaptcha(answer, "bogus:token")).toBe(false);
    expect(verifyCaptcha(answer, "")).toBe(false);
  });
});
