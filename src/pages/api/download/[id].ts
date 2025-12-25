import type { APIRoute } from "astro";
import { readFile } from "fs/promises";
import { db } from "@/lib/db";


export const GET: APIRoute = async ({ params, cookies }) => {
const userId = cookies.get("session")?.value;
if (!userId) return new Response("Unauthorized", { status: 401 });


const file = await db.file.findUnique({ where: { id: params.id } });
if (!file || file.ownerId !== userId) {
return new Response("Forbidden", { status: 403 });
}

const fileData = await readFile(file.path);
return new Response(fileData);
};