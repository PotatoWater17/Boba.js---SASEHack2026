/**
 * Add meme study groups + chaotic group chats (idempotent).
 */
import { PrismaClient } from "@prisma/client";
import { seedMemeMeetups } from "./meme-meetups";

const prisma = new PrismaClient();

async function main() {
  const { created, skipped, missingUsers, total } = await seedMemeMeetups(prisma);
  console.log(
    `Meme meetups: ${created} created, ${skipped} already existed, ${missingUsers} skipped (missing users). (${total} specs)`,
  );
  if (missingUsers > 0) console.log("Run npm run db:seed or db:reset first if meme accounts are missing.");
  console.log("Browse /find or log in as jsmith@auburn.edu to see group chats.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
