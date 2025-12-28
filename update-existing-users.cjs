const { PrismaClient } = require('./node_modules/@prisma/client');

(async () => {
  const db = new PrismaClient();
  
  // Update existing users ke ACTIVE
  await db.user.updateMany({
    where: { status: "PENDING" },
    data: { status: "ACTIVE" }
  });
  
  console.log('✅ All existing users set to ACTIVE');
  
  await db.$disconnect();
})();
