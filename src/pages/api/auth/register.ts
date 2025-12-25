import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";


export const POST: APIRoute = async ({ request }) => {
const data = await request.formData();
const email = data.get("email");
const password = data.get("password");

if (typeof email !== "string" || typeof password !== "string") {
	return new Response("Invalid payload", { status: 400 });
}

const body = registerSchema.parse({ email, password });

await db.user.create({
	data: {
		email: body.email,
		password: await hashPassword(body.password)
	}
});

return new Response(null, {
	status: 302,
	headers: {
		Location: "/login"
	}
});
};