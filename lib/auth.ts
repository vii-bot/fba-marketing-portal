import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
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
