import { db } from "@/lib/db";

type Role = "ADMIN" | "SUPERVISOR" | "STAFF" | "USER";

export async function requireUser(userId: string) {
	const user = await db.user.findUnique({ where: { id: userId } });
	if (!user) throw new Error("Unauthorized");
	return user;
}

export async function requireRole(userId: string, allowed: Role[]) {
	const user = await requireUser(userId);
	if (!allowed.includes(user.role as Role)) {
		throw new Error("Forbidden");
	}
	return user;
}

export async function requireAdmin(userId: string) {
	return requireRole(userId, ["ADMIN"]);
}

export function canEditComment(actorRole: Role, authorRole: Role) {
	if (actorRole === "ADMIN") return true;
	if (actorRole === "SUPERVISOR") return authorRole === "STAFF" || authorRole === "SUPERVISOR";
	return actorRole === authorRole; // allow self-edit for staff
}

export function canModerate(actorRole: Role) {
	return actorRole === "ADMIN" || actorRole === "SUPERVISOR";
}