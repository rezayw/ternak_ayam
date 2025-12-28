import type { APIRoute } from "astro";
import { db } from "@/lib/db";

export const POST: APIRoute = async ({ request, cookies }) => {
  const userId = cookies.get("session")?.value;
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const actor = await db.user.findUnique({ where: { id: userId } });
  if (!actor) return new Response("Unauthorized", { status: 401 });

  const data = await request.formData();
  const csrfToken = data.get("csrf");
  const csrfCookie = cookies.get("csrf")?.value;
  if (!csrfCookie || typeof csrfToken !== "string" || csrfToken !== csrfCookie) {
    return new Response("Invalid CSRF", { status: 403 });
  }

  const commentId = data.get("commentId");
  const redirectTo = typeof data.get("redirectTo") === "string" ? (data.get("redirectTo") as string) : "/laporan";

  if (typeof commentId !== "string") return new Response("Invalid comment", { status: 400 });

  const comment = await db.comment.findUnique({
    where: { id: commentId },
    include: { author: true, thread: true }
  });

  if (!comment) return new Response("Not found", { status: 404 });

  // Permissions
  if (actor.role === "USER") return new Response("Forbidden", { status: 403 });

  const isOwner = comment.authorId === actor.id;
  if (actor.role === "STAFF" && !isOwner) return new Response("Forbidden", { status: 403 });

  if (actor.role === "SUPERVISOR" && !isOwner && comment.author.role !== "STAFF" && comment.author.role !== "SUPERVISOR") {
    return new Response("Forbidden", { status: 403 });
  }

  await db.comment.delete({ where: { id: comment.id } });

  return new Response(null, {
    status: 302,
    headers: { Location: redirectTo }
  });
};
