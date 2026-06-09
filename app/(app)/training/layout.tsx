import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function TrainingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
