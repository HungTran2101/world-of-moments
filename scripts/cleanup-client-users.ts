import dotenv from "dotenv";
dotenv.config({ path: `.env.${process.env.NODE_ENV || "development"}`, quiet: true });
async function main() {
  const { cleanupExpiredClients } = await import("../lib/clientAccounts");
  const { prisma } = await import("../lib/prisma");
  try {
    console.log(`Removed ${await cleanupExpiredClients()} expired client accounts.`);
  } finally {
    await prisma.$disconnect();
  }
}
main().catch(() => {
  console.error("Client account cleanup failed");
  process.exitCode = 1;
});
