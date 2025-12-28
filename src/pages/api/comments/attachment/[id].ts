import type { APIRoute } from "astro";
import { readFile } from "fs/promises";
import { db } from "@/lib/db";

const mimeFallback = "application/octet-stream";

type ThreadResource = "FARM_DATA" | "FILE";

async function assertAccess(userId: string, resourceType: ThreadResource, resourceId: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Response("Unauthorized", { status: 401 });

  if (resourceType === "FARM_DATA") {
    const farmData = await db.farmData.findUnique({ where: { id: resourceId } });
    if (!farmData) throw new Response("Not found", { status: 404 });
    if (user.role === "USER") throw new Response("Forbidden", { status: 403 });
    if (user.role === "STAFF" && farmData.userId !== user.id) throw new Response("Forbidden", { status: 403 });
  } else {
    const file = await db.file.findUnique({ where: { id: resourceId } });
    if (!file) throw new Response("Not found", { status: 404 });
    if (user.role === "USER") throw new Response("Forbidden", { status: 403 });
    if (user.role === "STAFF" && file.ownerId !== user.id) throw new Response("Forbidden", { status: 403 });
  }
}

export const GET: APIRoute = async ({ params, cookies }) => {
  const userId = cookies.get("session")?.value;
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const comment = await db.comment.findUnique({
    where: { id: params.id },
    include: {
      thread: true
    }
  });

  if (!comment || !comment.attachmentPath) {
    return new Response("Not found", { status: 404 });
  }

  try {
    await assertAccess(userId, comment.thread.resourceType as ThreadResource, comment.thread.resourceId);
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }

  const fileData = await readFile(comment.attachmentPath);
  return new Response(fileData, {
    status: 200,
    headers: {
      "content-type": comment.attachmentMime || mimeFallback
    }
  });
};
