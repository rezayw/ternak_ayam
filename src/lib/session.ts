import { db } from "@/lib/db";


export async function requireAdmin(userId: string) {
const user = await db.user.findUnique({ where: { id: userId } });
if (!user || user.role !== "ADMIN") {
throw new Error("Forbidden");
}
}