import type { APIRoute } from "astro";
import { readFile } from "fs/promises";
import { db } from "@/lib/db";


export const GET: APIRoute = async ({ params, cookies }) => {
const userId = cookies.get("session")?.value;
if (!userId) return new Response("Unauthorized", { status: 401 });

const user = await db.user.findUnique({ where: { id: userId } });
if (!user) return new Response("Unauthorized", { status: 401 });

const file = await db.file.findUnique({ where: { id: params.id } });
if (!file) return new Response("Not found", { status: 404 });

// USER role is read-only: no downloads
if (user.role === "USER") return new Response("Forbidden", { status: 403 });

// Admin can download all; others must own the file
if (user.role !== "ADMIN" && file.ownerId !== userId) {
	return new Response("Forbidden", { status: 403 });
}

const fileData = await readFile(file.path);
return new Response(fileData, {
	headers: {
		"content-type": file.mime || "application/octet-stream"
	}
});
};