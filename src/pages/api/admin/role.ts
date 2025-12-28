import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

const validRoles = ["ADMIN", "SUPERVISOR", "STAFF", "USER"] as const;
type Role = (typeof validRoles)[number];

export const POST: APIRoute = async ({ request, cookies }) => {
  const userId = cookies.get("session")?.value;
  if (!userId) return new Response("Unauthorized", { status: 401 });

  await requireAdmin(userId);

  const data = await request.formData();
  const csrfToken = data.get("csrf");
  const csrfCookie = cookies.get("csrf")?.value;
  if (!csrfCookie || typeof csrfToken !== "string" || csrfToken !== csrfCookie) {
    return new Response("Invalid CSRF", { status: 403 });
  }

  const targetEmail = data.get("email");
  const targetId = data.get("userId");
  const role = data.get("role");
  const redirectTo = typeof data.get("redirectTo") === "string" ? (data.get("redirectTo") as string) : "/dashboard";

  if (typeof role !== "string" || !validRoles.includes(role as Role)) {
    return new Response("Invalid role", { status: 400 });
  }

  if (typeof targetEmail !== "string" && typeof targetId !== "string") {
    return new Response("Target required", { status: 400 });
  }

  const user = await db.user.findFirst({
    where: targetId
      ? { id: targetId as string }
      : { email: targetEmail as string }
  });

  if (!user) return new Response("User not found", { status: 404 });

  await db.user.update({ where: { id: user.id }, data: { role } });

  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectTo
    }
  });
};
