import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { verifyCaptcha } from "@/lib/captcha";

const cookieOptions = {
	httpOnly: true,
	sameSite: "strict" as const,
	secure: true,
	path: "/"
};

export const POST: APIRoute = async ({ request, cookies }) => {
	const data = await request.formData();
	const email = data.get("email");
	const password = data.get("password");
	const csrfToken = data.get("csrf");
	const captchaAnswer = data.get("captcha");

	if (typeof email !== "string" || typeof password !== "string") {
		return new Response("Invalid payload", { status: 400 });
	}

	if (!email.trim() || !password.trim()) {
		return new Response("Invalid credentials", { status: 400 });
	}

	const csrfCookie = cookies.get("csrf")?.value;
	if (!csrfCookie || typeof csrfToken !== "string" || csrfToken !== csrfCookie) {
		return new Response("Invalid CSRF", { status: 403 });
	}

	const captchaToken = cookies.get("captcha")?.value;
	cookies.set("captcha", "", { ...cookieOptions, maxAge: 0 });
	if (!verifyCaptcha(typeof captchaAnswer === "string" ? captchaAnswer : null, captchaToken)) {
		return new Response("Invalid captcha", { status: 400 });
	}

	const user = await db.user.findUnique({ where: { email } });
	if (!user || !(await verifyPassword(user.password, password))) {
		return new Response("Invalid credentials", { status: 401 });
	}

	// Check user status
	if (user.status === "PENDING") {
		return new Response("PENDING_APPROVAL", { status: 403 });
	}

	if (user.status === "REJECTED") {
		return new Response("ACCOUNT_REJECTED", { status: 403 });
	}

	cookies.set("session", user.id, cookieOptions);

	return new Response(null, {
		status: 302,
		headers: {
			Location: "/dashboard"
		}
	});
};