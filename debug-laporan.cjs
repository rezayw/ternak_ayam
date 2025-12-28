const { PrismaClient } = require('./node_modules/@prisma/client');

(async () => {
  const db = new PrismaClient();
  
  // Cek user staff
  const staff = await db.user.findUnique({ where: { email: 'staff@example.com' } });
  console.log('\n=== STAFF USER ===');
  console.log('Role:', staff?.role);
  console.log('UserId:', staff?.id);
  
  if (!staff) {
    await db.$disconnect();
    return;
  }

  // Cek farm data staff
  const farms = await db.farmData.findMany({ 
    where: { userId: staff.id }, 
    orderBy: { date: 'desc' } 
  });
  console.log('\n=== FARM DATA STAFF ===');
  console.log('Total farms:', farms.length);
  if (farms.length > 0) {
    console.log('Latest farm ID:', farms[0].id);
  }

  // Cek threads
  const threads = await db.commentThread.findMany({ 
    where: { resourceType: 'FARM_DATA' },
    orderBy: { createdAt: 'desc' } 
  });
  console.log('\n=== FARM_DATA THREADS ===');
  threads.forEach(t => {
    console.log(`Thread ${t.id}: resourceId=${t.resourceId}, createdBy=${t.createdById}`);
  });

  // Cek comments per thread
  for (const thread of threads) {
    const comments = await db.comment.findMany({
      where: { threadId: thread.id },
      include: { author: { select: { email: true, role: true } } }
    });
    console.log(`\n=== COMMENTS IN THREAD ${thread.id} ===`);
    comments.forEach(c => {
      console.log(`- ${c.author.email} (${c.author.role}): status=${c.status}, parentId=${c.parentId}`);
    });
  }

  // Simulasi filter untuk STAFF
  if (staff.role === 'STAFF') {
    console.log('\n=== SIMULATING STAFF VIEW ===');
    const isModerator = false;
    
    for (const thread of threads) {
      const filteredComments = await db.comment.findMany({
        where: {
          threadId: thread.id,
          ...(isModerator
            ? {}
            : {
                OR: [
                  { status: "APPROVED" },
                  { authorId: staff.id }
                ]
              })
        },
        include: { author: { select: { email: true } } }
      });
      console.log(`Thread ${thread.id}: ${filteredComments.length} comments visible to STAFF`);
      filteredComments.forEach(c => {
        console.log(`  - ${c.author.email}: ${c.status}`);
      });
    }
  } else {
    console.log('\n=== NOTE: staff@example.com role is', staff.role, 'not STAFF ===');
  }

  await db.$disconnect();
})();
