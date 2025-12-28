const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function fixLatestData() {
  const staff = await db.user.findFirst({
    where: { email: 'staff@example.com' }
  });

  // Get latest yang healthyChickens = 0
  const badData = await db.farmData.findMany({
    where: {
      userId: staff.id,
      healthyChickens: 0
    }
  });

  console.log(`Found ${badData.length} records with healthyChickens = 0`);

  // Update them
  for (const data of badData) {
    const healthyChickens = Math.floor(data.totalChickens * 0.92); // 92% healthy
    const maintenanceCost = data.maintenanceCost === BigInt(0) 
      ? BigInt(data.totalChickens * 1200) 
      : data.maintenanceCost;

    await db.farmData.update({
      where: { id: data.id },
      data: {
        healthyChickens,
        maintenanceCost
      }
    });

    console.log(`✅ Fixed ${data.id}: ${data.totalChickens} chickens → ${healthyChickens} healthy`);
  }

  console.log('✅ All data fixed!');
}

fixLatestData()
  .catch(console.error)
  .finally(() => db.$disconnect());
