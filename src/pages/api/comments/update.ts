import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { canEditComment, canModerate } from "@/lib/session";

type Action = "edit" | "status" | "pin" | "lock";

type CommentStatus = "PENDING" | "APPROVED" | "REJECTED";

const cookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: true,
  path: "/"
};

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

  const action = data.get("action");
  const commentId = data.get("commentId");
  const redirectTo = typeof data.get("redirectTo") === "string" ? (data.get("redirectTo") as string) : "/laporan";

  if (action !== "edit" && action !== "status" && action !== "pin" && action !== "lock") {
    return new Response("Invalid action", { status: 400 });
  }

  if (typeof commentId !== "string") {
    return new Response("Invalid comment", { status: 400 });
  }

  const comment = await db.comment.findUnique({
    where: { id: commentId },
    include: {
      author: true,
      thread: true
    }
  });

  if (!comment) return new Response("Not found", { status: 404 });

  // Editing content
  if (action === "edit") {
    const content = data.get("content");
    if (typeof content !== "string" || !content.trim()) {
      return new Response("Content required", { status: 400 });
    }

    if (!canEditComment(actor.role, comment.author.role)) {
      return new Response("Forbidden", { status: 403 });
    }

    await db.comment.update({
      where: { id: comment.id },
      data: {
        content: content.trim(),
        isEdited: true
      }
    });

    return new Response(null, {
      status: 302,
      headers: { Location: redirectTo }
    });
  }

  // Update status (approve/reject)
  if (action === "status") {
    if (!canModerate(actor.role)) return new Response("Forbidden", { status: 403 });
    const status = data.get("status");
    if (status !== "PENDING" && status !== "APPROVED" && status !== "REJECTED") {
      return new Response("Invalid status", { status: 400 });
    }

    await db.comment.update({
      where: { id: comment.id },
      data: { status: status as CommentStatus }
    });

    return new Response(null, {
      status: 302,
      headers: { Location: redirectTo }
    });
  }

  // Pin comment (admin only)
  if (action === "pin") {
    if (actor.role !== "ADMIN") return new Response("Forbidden", { status: 403 });

    const unpin = comment.thread.pinnedCommentId === comment.id;

    // Unpin previous
    await db.comment.updateMany({
      where: { threadId: comment.threadId, isPinned: true },
      data: { isPinned: false }
    });

    await db.commentThread.update({
      where: { id: comment.threadId },
      data: { pinnedCommentId: unpin ? null : comment.id }
    });

    await db.comment.update({
      where: { id: comment.id },
      data: { isPinned: !unpin }
    });

    return new Response(null, {
      status: 302,
      headers: { Location: redirectTo }
    });
  }

  // Lock/unlock thread (admin only)
  if (action === "lock") {
    if (actor.role !== "ADMIN") return new Response("Forbidden", { status: 403 });
    const locked = data.get("locked") === "true";

    await db.commentThread.update({
      where: { id: comment.threadId },
      data: { isLocked: locked }
    });

    return new Response(null, {
      status: 302,
      headers: { Location: redirectTo }
    });
  }

  // Fallback
  return new Response(null, {
    status: 302,
    headers: { Location: redirectTo }
  });
};
