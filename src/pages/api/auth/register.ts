import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";


export const POST: APIRoute = async ({ request }) => {
const body = registerSchema.parse(await request.json());


await db.user.create({
data: {
email: body.email,
password: await hashPassword(body.password)
}
});


return new Response("OK");
};