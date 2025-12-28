const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function showAllAccounts() {
  const users = await db.user.findMany({
    orderBy: { role: 'asc' }
  });

  console.log('\n🔑 DEFAULT ACCOUNTS:\n');
  console.log('=' .repeat(60));
  
  for (const user of users) {
    const farmDataCount = await db.farmData.count({
      where: { userId: user.id }
    });

    console.log(`\n📧 Email: ${user.email}`);
    console.log(`🔐 Password: password123`);
    console.log(`👤 Role: ${user.role}`);
    console.log(`📊 Farm Data: ${farmDataCount} records`);
    console.log(`✅ Status: ${user.status || 'ACTIVE'}`);
    
    if (farmDataCount > 0) {
      const latest = await db.farmData.findFirst({
        where: { userId: user.id },
        orderBy: { date: 'desc' }
      });
      console.log(`   Latest: ${latest.totalChickens} ayam, ${latest.eggsToday} telur`);
    }
    console.log('-'.repeat(60));
  }

  console.log('\n💡 TIPS:');
  console.log('   - ADMIN: Full access, manage users, assign roles');
  console.log('   - SUPERVISOR: Moderate comments, approve content');
  console.log('   - STAFF: Input data, comment (need approval)');
  console.log('   - USER: Read-only access');
}

showAllAccounts()
  .catch(console.error)
  .finally(() => db.$disconnect());
