import type { APIRoute } from "astro";
import { db } from "@/lib/db";

type ThreadResource = "FARM_DATA" | "FILE";

function mapResourceType(value: string | null): ThreadResource | null {
  if (!value) return null;
  if (value === "FARM_DATA" || value === "farm" || value === "farm_data") return "FARM_DATA";
  if (value === "FILE" || value === "file") return "FILE";
  return null;
}

function canSeeAll(role: string) {
  return role === "ADMIN" || role === "SUPERVISOR";
}

export const GET: APIRoute = async ({ request, cookies }) => {
  const userId = cookies.get("session")?.value;
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return new Response("Unauthorized", { status: 401 });

  const url = new URL(request.url);
  const resourceType = mapResourceType(url.searchParams.get("resourceType"));
  const resourceId = url.searchParams.get("resourceId");

  if (!resourceType || !resourceId) {
    return new Response("Invalid resource", { status: 400 });
  }

  if (resourceType === "FARM_DATA") {
    const farmData = await db.farmData.findUnique({ where: { id: resourceId } });
    if (!farmData) return new Response("Not found", { status: 404 });
    if (user.role === "USER") return new Response("Forbidden", { status: 403 });
    if (user.role === "STAFF" && farmData.userId !== user.id) return new Response("Forbidden", { status: 403 });
  } else {
    const file = await db.file.findUnique({ where: { id: resourceId } });
    if (!file) return new Response("Not found", { status: 404 });
    if (user.role === "USER") return new Response("Forbidden", { status: 403 });
    if (user.role === "STAFF" && file.ownerId !== user.id) return new Response("Forbidden", { status: 403 });
  }

  const includeAll = canSeeAll(user.role);

  const thread = await db.commentThread.findUnique({
    where: { resourceType_resourceId: { resourceType, resourceId } },
    include: {
      comments: {
        where: includeAll
          ? {}
          : {
              OR: [
                { status: "APPROVED" },
                { authorId: user.id }
              ]
            },
        include: {
          author: { select: { id: true, email: true, role: true } },
          replies: {
            include: { author: { select: { id: true, email: true, role: true } } },
            orderBy: { createdAt: "asc" }
          }
        },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  return new Response(JSON.stringify({
    thread: thread ? { id: thread.id, isLocked: thread.isLocked, pinnedCommentId: thread.pinnedCommentId } : null,
    comments: thread?.comments ?? []
  }), {
    status: 200,
    headers: {
      "content-type": "application/json"
    }
  });
};
