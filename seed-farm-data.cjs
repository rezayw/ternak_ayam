const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function seedFarmData() {
  console.log('🌱 Seeding farm data...');

  // Get staff user (yang akan input data)
  const staff = await db.user.findFirst({
    where: { email: 'staff@example.com' }
  });

  if (!staff) {
    console.log('❌ Staff user not found. Run seed first.');
    return;
  }

  console.log(`✅ Found staff: ${staff.email}`);

  // Generate 6 bulan data real
  const now = new Date();
  const farmDataRecords = [];

  for (let monthOffset = 5; monthOffset >= 0; monthOffset--) {
    for (let day = 1; day <= 5; day++) { // 5 entries per bulan
      const date = new Date(now.getFullYear(), now.getMonth() - monthOffset, day);
      
      // Data progressif: makin baru makin bagus
      const progressFactor = (6 - monthOffset) / 6;
      const totalChickens = 200 + Math.floor(progressFactor * 50); // 200-250
      const healthyChickens = Math.floor(totalChickens * (0.85 + progressFactor * 0.10)); // 85-95%
      const eggsToday = Math.floor(totalChickens * (0.60 + progressFactor * 0.15)); // 60-75%
      
      const feedCostPerChicken = 10000 + Math.floor(Math.random() * 2000);
      const medicineCostPerChicken = 1500 + Math.floor(Math.random() * 500);
      const maintenanceCostPerChicken = 1000 + Math.floor(Math.random() * 500);
      
      farmDataRecords.push({
        userId: staff.id,
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

  console.log(`✅ Seeded ${farmDataRecords.length} farm data records`);
  console.log('📊 Data range:');
  console.log(`   - Total Chickens: 200-250`);
  console.log(`   - Healthy: 85-95%`);
  console.log(`   - Eggs: 60-75% of total`);
  console.log(`   - Months: Last 6 months with 5 entries each`);
}

seedFarmData()
  .catch(console.error)
  .finally(() => db.$disconnect());
