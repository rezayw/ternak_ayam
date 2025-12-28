const { PrismaClient } = require('./node_modules/@prisma/client');

(async () => {
  const db = new PrismaClient();
  
  // Simulasi login sebagai staff
  const userId = (await db.user.findUnique({ where: { email: 'staff@example.com' } }))?.id;
  const user = await db.user.findUnique({ where: { id: userId } });
  
  console.log('=== STAFF LOGIN ===');
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
  console.log('Date:', latestFarmData?.date);
  
  let commentThread = null;
  let comments = [];
  
  // Step 2: Find thread for latest farm
  if (latestFarmData) {
    commentThread = await db.commentThread.findUnique({
      where: {
        resourceType_resourceId: {
          resourceType: "FARM_DATA",
          resourceId: latestFarmData.id
        }
      }
    });
    
    console.log('\n=== THREAD FOR LATEST FARM ===');
    console.log('Thread ID:', commentThread?.id);
    console.log('ResourceId:', commentThread?.resourceId);
    
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
        console.log(`  - ${c.author.email}: ${c.status} (parent: ${c.parentId})`);
      });
    }
  }
  
  // Step 3: Auto-create thread if not exists
  if (!commentThread && latestFarmData) {
    console.log('\n=== AUTO-CREATE THREAD ===');
    commentThread = await db.commentThread.create({
      data: {
        resourceType: "FARM_DATA",
        resourceId: latestFarmData.id,
        createdById: userId
      }
    });
    comments = [];
    console.log('Created new thread:', commentThread.id);
    console.log('Comments:', comments.length);
  }
  
  // Step 4: Fallback to user's other threads
  if (!commentThread) {
    console.log('\n=== FALLBACK: USER THREADS ===');
    const farmDataIds = await db.farmData.findMany({
      where: { userId },
      select: { id: true },
      orderBy: { date: "desc" }
    });
    
    if (farmDataIds.length > 0) {
      commentThread = await db.commentThread.findFirst({
        where: {
          resourceType: "FARM_DATA",
          resourceId: { in: farmDataIds.map((f) => f.id) }
        },
        orderBy: { createdAt: "desc" }
      });
      
      console.log('Found thread:', commentThread?.id);
      
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
      }
    }
  }
  
  // Step 5: If thread exists but empty, find thread with comments
  if (commentThread && comments.length === 0) {
    console.log('\n=== FALLBACK: THREAD WITH COMMENTS ===');
    const farmDataIds = await db.farmData.findMany({
      where: { userId },
      select: { id: true }
    });
    
    const threadWithComments = await db.commentThread.findFirst({
      where: {
        resourceType: "FARM_DATA",
        resourceId: { in: farmDataIds.map((f) => f.id) },
        comments: { some: {} }
      },
      orderBy: { createdAt: "desc" }
    });
    
    console.log('Found thread with comments:', threadWithComments?.id);
    
    if (threadWithComments) {
      commentThread = threadWithComments;
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
  }
  
  // Step 6: Ownership check for STAFF
  let canPostToThread = true;
  if (role === "STAFF" && commentThread?.resourceType === "FARM_DATA") {
    const owner = await db.farmData.findUnique({
      where: { id: commentThread.resourceId },
      select: { userId: true }
    });
    
    console.log('\n=== OWNERSHIP CHECK ===');
    console.log('Thread resourceId:', commentThread.resourceId);
    console.log('Farm owner:', owner?.userId);
    console.log('Current user:', userId);
    console.log('Is owner:', owner?.userId === userId);
    
    if (!owner || owner.userId !== userId) {
      canPostToThread = false;
    }
  }
  
  console.log('\n=== FINAL RESULT ===');
  console.log('Thread ID:', commentThread?.id);
  console.log('Comments count:', comments.length);
  console.log('canPostToThread:', canPostToThread);
  console.log('Display:', comments.length > 0 ? 'Show comments' : 'Belum ada komentar');
  
  await db.$disconnect();
})();
