import type { APIRoute } from "astro";
import { readFile } from "fs/promises";
import { db } from "@/lib/db";


export const GET: APIRoute = async ({ params, cookies }) => {
const userId = cookies.get("session")?.value;
if (!userId) return new Response("Unauthorized", { status: 401 });

const user = await db.user.findUnique({ where: { id: userId } });
if (!user) return new Response("Unauthorized", { status: 401 });

const file = await db.file.findUnique({
	where: { id: params.id },
	include: { owner: { select: { role: true, id: true } } }
});
if (!file) return new Response("Not found", { status: 404 });

// USER role is read-only: no downloads
if (user.role === "USER") return new Response("Forbidden", { status: 403 });

// Admin can download semua
if (user.role === "ADMIN") {
	const fileData = await readFile(file.path);
	return new Response(fileData, {
		headers: { "content-type": file.mime || "application/octet-stream" }
	});
}

// Supervisor bisa download file sendiri + file milik STAFF
if (user.role === "SUPERVISOR") {
	const isOwn = file.ownerId === userId;
	const isStaffFile = file.owner?.role === "STAFF";
	if (!isOwn && !isStaffFile) return new Response("Forbidden", { status: 403 });

	const fileData = await readFile(file.path);
	return new Response(fileData, {
		headers: { "content-type": file.mime || "application/octet-stream" }
	});
}

// STAFF hanya boleh download file sendiri
if (file.ownerId !== userId) return new Response("Forbidden", { status: 403 });

const fileData = await readFile(file.path);
return new Response(fileData, {
	headers: { "content-type": file.mime || "application/octet-stream" }
});
};