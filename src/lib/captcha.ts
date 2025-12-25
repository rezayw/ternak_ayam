import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

interface Captcha {
  question: string;
  answer: string;
  token: string;
}

export function createCaptcha(): Captcha {
  const a = randomInt(1, 10);
  const b = randomInt(1, 10);
  const answer = String(a + b);
  const salt = randomBytes(16).toString("hex");
  const digest = createHash("sha256").update(answer + salt).digest("hex");
  return {
    question: `Berapa ${a} + ${b}?`,
    answer,
    token: `${salt}:${digest}`
  };
}

export function verifyCaptcha(answer: string | null, token: string | undefined): boolean {
  if (!answer || !token) return false;
  const [salt, expected] = token.split(":");
  if (!salt || !expected) return false;
  const digest = createHash("sha256").update(answer.trim() + salt).digest("hex");
  const aBuf = Buffer.from(digest);
  const bBuf = Buffer.from(expected);
  return aBuf.length === bBuf.length && timingSafeEqual(aBuf, bBuf);
}
