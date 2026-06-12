import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:3030",
    ...(process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : []),
  ],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  databaseHooks: {
    user: {
      create: {
        // Link a freshly-signed-up account back to its Employee HR record
        // (set via accept-invite) and sync role/department onto the User
        // so lib/permissions.ts checks work immediately on first login.
        after: async (user) => {
          const employee = await prisma.employee.findUnique({ where: { email: user.email } });
          if (!employee || employee.userId) return;

          const role = (employee.access as any)?.superAdmin ? "admin" : employee.role;
          await Promise.all([
            prisma.employee.update({ where: { id: employee.id }, data: { userId: user.id } }),
            prisma.user.update({ where: { id: user.id }, data: { role, department: employee.department } }),
          ]);
        },
      },
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "employee",
        input: false,
      },
      department: {
        type: "string",
        required: false,
        defaultValue: null,
        input: false,
      },
      jobTitle: {
        type: "string",
        required: false,
        defaultValue: null,
        input: false,
      },
      profilePicture: {
        type: "string",
        required: false,
        defaultValue: null,
        input: false,
      },
      bannerImage: {
        type: "string",
        required: false,
        defaultValue: null,
        input: false,
      },
      discordUsername: {
        type: "string",
        required: false,
        defaultValue: null,
        input: false,
      },
      profileComplete: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
