const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function checkCurrentUser() {
  // Get ALL users
  const allUsers = await db.user.findMany({
    select: {
      id: true,
      email: true,
      role: true
    }
  });

  console.log('\n👥 ALL USERS:');
  allUsers.forEach(u => {
    console.log(`  - ${u.email} (${u.role}) [ID: ${u.id}]`);
  });

  // Check farm data untuk SETIAP user
  console.log('\n📊 FARM DATA PER USER:');
  for (const user of allUsers) {
    const count = await db.farmData.count({
      where: { userId: user.id }
    });
    console.log(`  - ${user.email}: ${count} records`);
    
    if (count > 0) {
      const latest = await db.farmData.findFirst({
        where: { userId: user.id },
        orderBy: { date: 'desc' }
      });
      console.log(`    Latest: ${latest.totalChickens} ayam, ${latest.eggsToday} telur (${latest.date.toLocaleDateString('id-ID')})`);
    }
  }

  // Check total farm data
  const totalFarmData = await db.farmData.count();
  console.log(`\n📈 TOTAL FARM DATA RECORDS: ${totalFarmData}`);
}

checkCurrentUser()
  .catch(console.error)
  .finally(() => db.$disconnect());
