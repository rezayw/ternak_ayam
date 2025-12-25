import type { APIRoute } from "astro";
import { randomUUID } from "node:crypto";
import { ALLOWED } from "@/lib/upload";
import { db } from "@/lib/db";


export const POST: APIRoute = async ({ request, cookies }) => {
const userId = cookies.get("session")?.value;
if (!userId) return new Response("Unauthorized", { status: 401 });


const data = await request.formData();
const file = data.get("file") as File;


if (!file || !ALLOWED.includes(file.type)) {
return new Response("Invalid file", { status: 400 });
}


const { default: fs } = await import("fs");
const { Buffer } = await import("node:buffer");

const dir = `uploads/${userId}`;
fs.mkdirSync(dir, { recursive: true });


const filename = randomUUID();
const buffer = Buffer.from(await file.arrayBuffer());
const filePath = `${dir}/${filename}`;

fs.writeFileSync(filePath, buffer);

// Save file metadata to database
await db.file.create({
	data: {
		id: filename,
		filename: file.name,
		path: filePath,
		mime: file.type,
		ownerId: userId
	}
});

return new Response(null, {
	status: 302,
	headers: {
		Location: "/upload?success=1"
	}
});
};