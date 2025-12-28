import type { APIRoute } from "astro";
import { db } from "@/lib/db";

export const POST: APIRoute = async ({ request, cookies }) => {
  const userId = cookies.get("session")?.value;
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.role === "USER") return new Response("Forbidden", { status: 403 });

  const data = await request.formData();
  const csrfToken = data.get("csrf");
  const csrfCookie = cookies.get("csrf")?.value;
  if (!csrfCookie || typeof csrfToken !== "string" || csrfToken !== csrfCookie) {
    return new Response("Invalid CSRF", { status: 403 });
  }
  
  const totalChickens = parseInt(data.get("totalChickens") as string);
  const healthyChickens = parseInt(data.get("healthyChickens") as string);
  const eggsToday = parseInt(data.get("eggsToday") as string);
  const feedCost = parseInt(data.get("feedCost") as string);
  const medicineCost = parseInt(data.get("medicineCost") as string);
  const maintenanceCost = parseInt(data.get("maintenanceCost") as string);
  const notes = data.get("notes") as string || null;

  // Validate inputs
  if (
    isNaN(totalChickens) || 
    isNaN(healthyChickens) ||
    isNaN(eggsToday) || 
    isNaN(feedCost) || 
    isNaN(medicineCost) ||
    isNaN(maintenanceCost)
  ) {
    return new Response("Invalid input", { status: 400 });
  }

  // Save to database
  await db.farmData.create({
    data: {
      userId,
      totalChickens,
      healthyChickens,
      eggsToday,
      feedCost,
      medicineCost,
      maintenanceCost,
      notes
    }
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: "/input-data?success=1"
    }
  });
};
