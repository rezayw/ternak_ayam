import type { APIRoute } from "astro";
import { randomUUID } from "node:crypto";
import { ALLOWED } from "@/lib/upload";


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


fs.writeFileSync(`${dir}/${filename}`, buffer);


return new Response("Uploaded");
};