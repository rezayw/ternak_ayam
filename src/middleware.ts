import { randomUUID } from "node:crypto";
import { defineMiddleware } from "astro/middleware";

const csrfCookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: true,
  path: "/"
};

export const onRequest = defineMiddleware(async (context: any, next: any) => {
  const { request, cookies } = context;

  // Ensure every visitor has a CSRF token cookie
  let csrf = cookies.get("csrf")?.value;
  if (!csrf) {
    csrf = randomUUID();
    cookies.set("csrf", csrf, csrfCookieOptions);
  }

  if (request.method !== "GET") {
    const headerToken = request.headers.get("x-csrf-token");
    if (headerToken === csrf) return next();

    // Fallback to form field for regular form posts
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const form = await request.clone().formData();
      const bodyToken = form.get("csrf");
      if (typeof bodyToken === "string" && bodyToken === csrf) return next();
    }

    return new Response("Invalid CSRF", { status: 403 });
  }

  return next();
});