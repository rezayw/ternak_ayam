import type { APIRoute } from "astro";

const cookieOptions = {
	httpOnly: true,
	sameSite: "strict" as const,
	secure: true,
	path: "/"
};

export const POST: APIRoute = async ({ request, cookies }) => {
	const data = await request.formData();
	const csrfToken = data.get("csrf");

	// Verify CSRF token
	const csrfCookie = cookies.get("csrf")?.value;
	if (!csrfCookie || typeof csrfToken !== "string" || csrfToken !== csrfCookie) {
		return new Response("Invalid CSRF", { status: 403 });
	}

	// Clear session cookie
	cookies.set("session", "", { ...cookieOptions, maxAge: 0 });

	return new Response(null, {
		status: 302,
		headers: {
			Location: "/"
		}
	});
};
