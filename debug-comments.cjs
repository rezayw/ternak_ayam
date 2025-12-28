const { PrismaClient } = require('./node_modules/@prisma/client');

(async () => {
  const db = new PrismaClient();
  const staff = await db.user.findUnique({ where: { email: 'staff@example.com' } });
  console.log('staff', staff);
  if (!staff) {
    await db.$disconnect();
    return;
  }

  const farms = await db.farmData.findMany({ where: { userId: staff.id }, orderBy: { date: 'desc' } });
  console.log('farms', farms);

  const threads = await db.commentThread.findMany({ orderBy: { createdAt: 'desc' } });
  console.log('threads', threads);

  const comments = await db.comment.findMany({ orderBy: { createdAt: 'asc' } });
  console.log('comments', comments);

  await db.$disconnect();
})();
