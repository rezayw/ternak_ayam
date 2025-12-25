import type { APIRoute } from "astro";
import { requireAdmin } from "@/lib/session";


export const GET: APIRoute = async ({ cookies }) => {
const userId = cookies.get("session")?.value;
if (!userId) return new Response("Unauthorized", { status: 401 });


await requireAdmin(userId);
return new Response("ADMIN OK");
};