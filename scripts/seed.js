import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const db = new PrismaClient();

async function main() {
  // Clear existing data (order matters because of FKs)
  await db.mention.deleteMany();
  await db.comment.deleteMany();
  await db.commentThread.deleteMany();
  await db.file.deleteMany();
  await db.farmData.deleteMany();
  await db.user.deleteMany();

  const password = "password123";
  const hash = await argon2.hash(password, { type: argon2.argon2id });

  const admin = await db.user.create({
    data: { email: "admin@example.com", password: hash, role: "ADMIN", status: "ACTIVE" }
  });

  const supervisor = await db.user.create({
    data: { email: "supervisor@example.com", password: hash, role: "SUPERVISOR", status: "ACTIVE" }
  });

  const staff = await db.user.create({
    data: { email: "staff@example.com", password: hash, role: "STAFF", status: "ACTIVE" }
  });

  const viewer = await db.user.create({
    data: { email: "user@example.com", password: hash, role: "USER", status: "ACTIVE" }
  });

  const farmRecord = await db.farmData.create({
    data: {
      userId: staff.id,
      totalChickens: 320,
      eggsToday: 210,
      feedCost: 780000n,
      medicineCost: 95000n,
      notes: "Panen bagus, cek vaksin ulang"
    }
  });

  // Attach a file metadata for staff (path is placeholder)
  const file = await db.file.create({
    data: {
      id: "demo-file-1",
      filename: "laporan-harian.pdf",
      path: "uploads/demo/laporan-harian.pdf",
      mime: "application/pdf",
      ownerId: staff.id
    }
  });

  // Create a discussion thread on farm data
  const thread = await db.commentThread.create({
    data: {
      resourceType: "FARM_DATA",
      resourceId: farmRecord.id,
      isLocked: false,
      createdById: supervisor.id
    }
  });

  const supervisorComment = await db.comment.create({
    data: {
      content: "Cek kadar protein pakan minggu ini.",
      authorId: supervisor.id,
      threadId: thread.id,
      status: "APPROVED"
    }
  });

  await db.comment.create({
    data: {
      content: "Siap, akan update stok pakan besok pagi.",
      authorId: staff.id,
      threadId: thread.id,
      parentId: supervisorComment.id,
      status: "PENDING"
    }
  });

  // Comment thread for file
  const fileThread = await db.commentThread.create({
    data: {
      resourceType: "FILE",
      resourceId: file.id,
      isLocked: false,
      createdById: admin.id
    }
  });

  const adminComment = await db.comment.create({
    data: {
      content: "Lampiran diterima, good job.",
      authorId: admin.id,
      threadId: fileThread.id,
      status: "APPROVED",
      isPinned: true
    }
  });

  await db.commentThread.update({
    where: { id: fileThread.id },
    data: { pinnedCommentId: adminComment.id }
  });

  console.log("Seed completed. Users:");
  console.log("admin@example.com / password123 (ADMIN)");
  console.log("supervisor@example.com / password123 (SUPERVISOR)");
  console.log("staff@example.com / password123 (STAFF)");
  console.log("user@example.com / password123 (USER)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
