const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function checkLoginAsStaff() {
  const staff = await db.user.findFirst({
    where: { email: 'staff@example.com' }
  });

  if (!staff) {
    console.log('❌ Staff not found');
    return;
  }

  console.log('✅ Staff account found:');
  console.log(`   Email: ${staff.email}`);
  console.log(`   ID: ${staff.id}`);
  console.log(`   Role: ${staff.role}`);
  console.log('');
  console.log('🔑 LOGIN CREDENTIALS:');
  console.log('   Email: staff@example.com');
  console.log('   Password: password123');
  console.log('');

  // Get staff's farm data
  const farmData = await db.farmData.findMany({
    where: { userId: staff.id },
    orderBy: { date: 'desc' },
    take: 1
  });

  if (farmData.length > 0) {
    const latest = farmData[0];
    console.log('📊 LATEST DATA:');
    console.log(`   Total Ayam: ${latest.totalChickens}`);
    console.log(`   Ayam Sehat: ${latest.healthyChickens} (${Math.floor((latest.healthyChickens / latest.totalChickens) * 100)}%)`);
    console.log(`   Produksi Telur: ${latest.eggsToday}`);
    console.log(`   Tanggal: ${latest.date.toLocaleDateString('id-ID')}`);
  }
}

checkLoginAsStaff()
  .catch(console.error)
  .finally(() => db.$disconnect());
