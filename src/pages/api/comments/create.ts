import type { APIRoute } from "astro";
import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { db } from "@/lib/db";
import { ALLOWED } from "@/lib/upload";

const cookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: true,
  path: "/"
};

type ThreadResource = "FARM_DATA" | "FILE";

function mapResourceType(value: FormDataEntryValue | null): ThreadResource | null {
  if (value === "FARM_DATA" || value === "farm" || value === "farm_data") return "FARM_DATA";
  if (value === "FILE" || value === "file") return "FILE";
  return null;
}

async function ensureThread(resourceType: ThreadResource, resourceId: string, userId: string) {
  return db.commentThread.upsert({
    where: {
      resourceType_resourceId: { resourceType, resourceId }
    },
    create: {
      resourceType,
      resourceId,
      createdById: userId
    },
    update: {}
  });
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const userId = cookies.get("session")?.value;
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return new Response("Unauthorized", { status: 401 });

  const data = await request.formData();
  const csrfToken = data.get("csrf");
  const csrfCookie = cookies.get("csrf")?.value;
  if (!csrfCookie || typeof csrfToken !== "string" || csrfToken !== csrfCookie) {
    return new Response("Invalid CSRF", { status: 403 });
  }

  const content = data.get("content");
  const issueTag = data.get("issueTag");
  const parentId = data.get("parentId");
  const resourceId = data.get("resourceId");
  const resourceType = mapResourceType(data.get("resourceType"));
  const redirectTo = typeof data.get("redirectTo") === "string" ? (data.get("redirectTo") as string) : "/laporan";
  const attachment = data.get("attachment");

  if (typeof content !== "string" || !content.trim()) {
    return new Response("Content required", { status: 400 });
  }

  if (!resourceType || typeof resourceId !== "string") {
    return new Response("Invalid resource", { status: 400 });
  }

  if (user.role === "USER") {
    return new Response("Forbidden", { status: 403 });
  }

  // Validate target resource access
  if (resourceType === "FARM_DATA") {
    const farmData = await db.farmData.findUnique({ where: { id: resourceId } });
    if (!farmData) return new Response("Not found", { status: 404 });
    if (user.role === "STAFF" && farmData.userId !== user.id) {
      return new Response("Forbidden", { status: 403 });
    }
  } else {
    const file = await db.file.findUnique({ where: { id: resourceId } });
    if (!file) return new Response("Not found", { status: 404 });
    if (user.role === "STAFF" && file.ownerId !== user.id) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  const thread = await ensureThread(resourceType, resourceId, user.id);
  if (thread.isLocked && user.role !== "ADMIN") {
    return new Response("Thread locked", { status: 423 });
  }

  let parentComment = null;
  if (typeof parentId === "string" && parentId) {
    parentComment = await db.comment.findUnique({
      where: { id: parentId },
      include: { thread: true }
    });
    if (!parentComment || parentComment.threadId !== thread.id) {
      return new Response("Invalid parent", { status: 400 });
    }
  }

  let attachmentPath: string | undefined;
  let attachmentMime: string | undefined;

  if (attachment instanceof File && attachment.size > 0) {
    if (!ALLOWED.includes(attachment.type)) {
      return new Response("Invalid attachment", { status: 400 });
    }
    const { default: fs } = await import("fs");
    const dir = `uploads/${userId}/comments`;
    fs.mkdirSync(dir, { recursive: true });
    const filename = randomUUID();
    const buffer = Buffer.from(await attachment.arrayBuffer());
    attachmentPath = `${dir}/${filename}`;
    attachmentMime = attachment.type;
    fs.writeFileSync(attachmentPath, buffer);
  }

  // Smart status: STAFF reply ke comment APPROVED langsung approved, comment baru tetap pending
  const parentStatus = parentComment?.status;
  const status = user.role === "STAFF"
    ? (parentComment && parentStatus === "APPROVED" ? "APPROVED" : "PENDING")
    : "APPROVED";

  const tagList = typeof issueTag === "string"
    ? Array.from(new Set(issueTag.split(",").map((t) => t.trim()).filter(Boolean)))
    : [];
  const normalizedIssueTag = tagList.length ? tagList.join(",") : null;

  await db.comment.create({
    data: {
      content: content.trim(),
      issueTag: normalizedIssueTag,
      authorId: user.id,
      threadId: thread.id,
      parentId: parentComment?.id,
      status,
      attachmentPath,
      attachmentMime
    }
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectTo
    }
  });
};
