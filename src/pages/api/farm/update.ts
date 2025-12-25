import type { APIRoute } from "astro";
import { db } from "@/lib/db";

export const POST: APIRoute = async ({ request, cookies }) => {
  const userId = cookies.get("session")?.value;
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const data = await request.formData();
  
  const totalChickens = parseInt(data.get("totalChickens") as string);
  const eggsToday = parseInt(data.get("eggsToday") as string);
  const feedCost = parseInt(data.get("feedCost") as string);
  const medicineCost = parseInt(data.get("medicineCost") as string);
  const notes = data.get("notes") as string || null;

  // Validate inputs
  if (
    isNaN(totalChickens) || 
    isNaN(eggsToday) || 
    isNaN(feedCost) || 
    isNaN(medicineCost)
  ) {
    return new Response("Invalid input", { status: 400 });
  }

  // Save to database
  await db.farmData.create({
    data: {
      userId,
      totalChickens,
      eggsToday,
      feedCost,
      medicineCost,
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
