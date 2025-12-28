const { PrismaClient } = require('./node_modules/@prisma/client');

(async () => {
  const db = new PrismaClient();
  
  // Simulasi login sebagai supervisor
  const userId = (await db.user.findUnique({ where: { email: 'supervisor@example.com' } }))?.id;
  const user = await db.user.findUnique({ where: { id: userId } });
  
  console.log('=== SUPERVISOR LOGIN ===');
  console.log('UserId:', userId);
  console.log('Role:', user?.role);
  
  const role = user?.role ?? "USER";
  const isModerator = role === "ADMIN" || role === "SUPERVISOR";
  console.log('isModerator:', isModerator);
  
  // Step 1: Get latestFarmData
  const latestFarmData = await db.farmData.findFirst({
    where: { userId },
    orderBy: { date: "desc" }
  });
  
  console.log('\n=== LATEST FARM DATA ===');
  console.log('Farm ID:', latestFarmData?.id);
  console.log('Has farm:', !!latestFarmData);
  
  let commentThread = null;
  let comments = [];
  
  // Step 2: Find thread for latest farm (AKAN NULL)
  if (latestFarmData) {
    console.log('\n[SKIP] Supervisor tidak punya farm');
  } else {
    console.log('\n[SKIP] No latestFarmData for supervisor');
  }
  
  // Step 3: Auto-create thread - SKIP karena no farm
  if (!commentThread && latestFarmData) {
    console.log('\n[SKIP] Would auto-create thread');
  } else {
    console.log('\n[SKIP] No auto-create because no latestFarmData');
  }
  
  // Step 4: Fallback to user's other threads
  if (!commentThread) {
    console.log('\n=== FALLBACK: USER THREADS ===');
    const farmDataIds = await db.farmData.findMany({
      where: { userId },
      select: { id: true },
      orderBy: { date: "desc" }
    });
    
    console.log('User farms count:', farmDataIds.length);
    
    if (farmDataIds.length > 0) {
      console.log('[UNREACHABLE] Supervisor has farms');
    } else {
      console.log('Supervisor has NO farms, skipping user thread lookup');
    }
  }
  
  // Step 5: If thread exists but empty
  console.log('\n[SKIP] Thread with comments fallback - no thread yet');
  
  // Step 6: MODERATOR GLOBAL FALLBACK
  if (!commentThread && isModerator) {
    console.log('\n=== MODERATOR GLOBAL FALLBACK ===');
    commentThread = await db.commentThread.findFirst({
      where: { resourceType: "FARM_DATA" },
      orderBy: { createdAt: "desc" }
    });
    
    console.log('Found global thread:', commentThread?.id);
    console.log('Thread resourceId:', commentThread?.resourceId);
    
    if (commentThread) {
      comments = await db.comment.findMany({
        where: {
          threadId: commentThread.id,
          ...(isModerator
            ? {}
            : {
                OR: [
                  { status: "APPROVED" },
                  { authorId: userId }
                ]
              })
        },
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { id: true, email: true, role: true } }
        }
      });
      console.log('Comments found:', comments.length);
      comments.forEach(c => {
        console.log(`  - ${c.author.email}: ${c.status}`);
      });
    }
  } else {
    console.log('\n[SKIP] Not moderator or already has thread');
  }
  
  console.log('\n=== FINAL RESULT ===');
  console.log('Thread ID:', commentThread?.id);
  console.log('Comments count:', comments.length);
  console.log('Display:', comments.length > 0 ? 'Show comments' : 'Belum ada komentar');
  
  await db.$disconnect();
})();
