const { PrismaClient } = require('./node_modules/@prisma/client');

(async () => {
  const db = new PrismaClient();
  
  // Reset staff role
  await db.user.update({
    where: { email: 'staff@example.com' },
    data: { role: 'STAFF' }
  });
  
  // Reset supervisor role  
  await db.user.update({
    where: { email: 'supervisor@example.com' },
    data: { role: 'SUPERVISOR' }
  });
  
  console.log('✅ Roles reset:');
  console.log('staff@example.com -> STAFF');
  console.log('supervisor@example.com -> SUPERVISOR');
  
  await db.$disconnect();
})();
