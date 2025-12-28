const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function checkData() {
  const staff = await db.user.findFirst({
    where: { email: 'staff@example.com' }
  });

  if (!staff) {
    console.log('❌ Staff not found');
    return;
  }

  // Get latest data
  const latest = await db.farmData.findFirst({
    where: { userId: staff.id },
    orderBy: { date: 'desc' }
  });

  console.log('\n📊 LATEST DATA:');
  console.log(`Date: ${latest.date.toLocaleDateString('id-ID')}`);
  console.log(`Total Chickens: ${latest.totalChickens}`);
  console.log(`Healthy Chickens: ${latest.healthyChickens} (${Math.floor((latest.healthyChickens / latest.totalChickens) * 100)}%)`);
  console.log(`Eggs Today: ${latest.eggsToday}`);
  console.log(`Feed Cost: Rp ${Number(latest.feedCost).toLocaleString('id-ID')}`);
  console.log(`Medicine Cost: Rp ${Number(latest.medicineCost).toLocaleString('id-ID')}`);
  console.log(`Maintenance Cost: Rp ${Number(latest.maintenanceCost).toLocaleString('id-ID')}`);
  console.log(`Total Cost: Rp ${(Number(latest.feedCost) + Number(latest.medicineCost) + Number(latest.maintenanceCost)).toLocaleString('id-ID')}`);

  // Get monthly data
  const now = new Date();
  const monthlyStats = [];
  
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    
    const monthData = await db.farmData.findMany({
      where: {
        userId: staff.id,
        date: {
          gte: monthStart,
          lte: monthEnd
        }
      }
    });

    const totalProduction = monthData.reduce((sum, d) => sum + d.eggsToday, 0);
    const avgHealth = monthData.length > 0
      ? Math.floor(monthData.reduce((sum, d) => {
          return sum + ((d.healthyChickens / d.totalChickens) * 100);
        }, 0) / monthData.length)
      : 0;

    monthlyStats.push({
      month: monthStart.toLocaleDateString('id-ID', { month: 'short' }),
      entries: monthData.length,
      production: totalProduction,
      avgHealth: avgHealth
    });
  }

  console.log('\n📈 MONTHLY STATS (Last 6 Months):');
  monthlyStats.forEach(stat => {
    console.log(`${stat.month}: ${stat.production} eggs, ${stat.avgHealth}% health, ${stat.entries} entries`);
  });
}

checkData()
  .catch(console.error)
  .finally(() => db.$disconnect());
