import dotenv from "dotenv";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "node:crypto";

dotenv.config({
  path: `.env.${process.env.NODE_ENV || "development"}`,
  quiet: true,
});

async function main() {
  const { prisma } = await import("../lib/prisma");
  try {
    const passwordInput = process.env.CMS_INITIAL_ADMIN_PASSWORD;
    if (
      !passwordInput ||
      passwordInput.length < 8 ||
      passwordInput.length > 128
    )
      throw new Error(
        "Set CMS_INITIAL_ADMIN_PASSWORD (8–128 characters) before seeding.",
      );
    const password = await hashPassword(passwordInput);
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({
        where: { username: "admin" },
      });
      if (existing) {
        if (!existing.isSystem)
          throw new Error(
            "Username admin is already occupied by a non-system account.",
          );
        return "CMS admin already exists; credentials were preserved.";
      }
      const role = await tx.cmsRole.create({
        data: {
          name: "System administrator",
          isSystem: true,
          permissions: ["*"],
        },
      });
      const id = randomUUID();
      await tx.user.create({
        data: {
          id,
          username: "admin",
          displayUsername: "admin",
          name: "Administrator",
          email: `${id}@cms.invalid`,
          emailVerified: true,
          isSystem: true,
          accounts: {
            create: { accountId: id, providerId: "credential", password },
          },
          roles: { create: { roleId: role.id } },
        },
      });
      return "CMS admin created.";
    });
    console.log(result);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "CMS seed failed");
  process.exitCode = 1;
});
