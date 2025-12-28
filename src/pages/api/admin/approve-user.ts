import type { APIRoute } from "astro";
import { db } from "@/lib/db";

const cookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: true,
  path: "/"
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const userId = cookies.get("session")?.value;
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const admin = await db.user.findUnique({ where: { id: userId } });
  if (!admin || admin.role !== "ADMIN") {
    return new Response("Forbidden", { status: 403 });
  }

  const data = await request.formData();
  const csrfToken = data.get("csrf");
  const csrfCookie = cookies.get("csrf")?.value;
  if (!csrfCookie || typeof csrfToken !== "string" || csrfToken !== csrfCookie) {
    return new Response("Invalid CSRF", { status: 403 });
  }

  const targetUserId = data.get("userId");
  const action = data.get("action"); // "approve" or "reject"

  if (typeof targetUserId !== "string" || (action !== "approve" && action !== "reject")) {
    return new Response("Invalid payload", { status: 400 });
  }

  const targetUser = await db.user.findUnique({ where: { id: targetUserId } });
  if (!targetUser) return new Response("User not found", { status: 404 });

  if (targetUser.status !== "PENDING") {
    return new Response("User is not pending", { status: 400 });
  }

  const newStatus = action === "approve" ? "ACTIVE" : "REJECTED";

  await db.user.update({
    where: { id: targetUserId },
    data: { status: newStatus }
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: "/admin/users"
    }
  });
};
