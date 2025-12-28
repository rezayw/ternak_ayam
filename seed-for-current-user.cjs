const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function seedForUser() {
  // Get user ar@ar.com
  const user = await db.user.findFirst({
    where: { email: 'ar@ar.com' }
  });

  if (!user) {
    console.log('❌ User ar@ar.com not found');
    return;
  }

  console.log(`✅ Found user: ${user.email} (${user.role})`);

  // Check existing data
  const existingCount = await db.farmData.count({
    where: { userId: user.id }
  });

  if (existingCount > 0) {
    console.log(`ℹ️ User already has ${existingCount} records`);
    return;
  }

  console.log('🌱 Seeding farm data for ar@ar.com...');

  // Generate 6 bulan data real
  const now = new Date();
  const farmDataRecords = [];

  for (let monthOffset = 5; monthOffset >= 0; monthOffset--) {
    for (let day = 1; day <= 5; day++) {
      const date = new Date(now.getFullYear(), now.getMonth() - monthOffset, day);
      
      // Data progressif
      const progressFactor = (6 - monthOffset) / 6;
      const totalChickens = 180 + Math.floor(progressFactor * 70); // 180-250
      const healthyChickens = Math.floor(totalChickens * (0.88 + progressFactor * 0.08)); // 88-96%
      const eggsToday = Math.floor(totalChickens * (0.65 + progressFactor * 0.10)); // 65-75%
      
      const feedCostPerChicken = 9500 + Math.floor(Math.random() * 1500);
      const medicineCostPerChicken = 1400 + Math.floor(Math.random() * 600);
      const maintenanceCostPerChicken = 950 + Math.floor(Math.random() * 500);
      
      farmDataRecords.push({
        userId: user.id,
        totalChickens,
        healthyChickens,
        eggsToday,
        feedCost: BigInt(totalChickens * feedCostPerChicken),
        medicineCost: BigInt(totalChickens * medicineCostPerChicken),
        maintenanceCost: BigInt(totalChickens * maintenanceCostPerChicken),
        notes: `Data entry bulan ${date.toLocaleDateString('id-ID', { month: 'long' })}`,
        date
      });
    }
  }

  // Bulk insert
  await db.farmData.createMany({
    data: farmDataRecords
  });

  console.log(`✅ Seeded ${farmDataRecords.length} records for ar@ar.com`);
  
  // Show latest
  const latest = await db.farmData.findFirst({
    where: { userId: user.id },
    orderBy: { date: 'desc' }
  });

  console.log('\n📊 LATEST DATA:');
  console.log(`   Total Ayam: ${latest.totalChickens}`);
  console.log(`   Ayam Sehat: ${latest.healthyChickens} (${Math.floor((latest.healthyChickens / latest.totalChickens) * 100)}%)`);
  console.log(`   Produksi Telur: ${latest.eggsToday}`);
  console.log(`   Total Biaya: Rp ${(Number(latest.feedCost) + Number(latest.medicineCost) + Number(latest.maintenanceCost)).toLocaleString('id-ID')}`);
}

seedForUser()
  .catch(console.error)
  .finally(() => db.$disconnect());
