import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewSOP } from "@/lib/permissions";
import { notFound } from "next/navigation";
import type { SOPBlock } from "@/lib/sop-blocks";
import SOPDetailClient from "@/components/lms/SOPDetailClient";

export default async function SOPDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  const email = session!.user.email;
  const me = session!.user as any;

  const sop = await prisma.sOP.findUnique({ where: { id } });
  if (!sop || sop.isArchived || !canViewSOP(me, sop)) notFound();

  const ackList = await prisma.sOPAcknowledgement.findMany({ where: { email, sopId: sop.id } });
  const currentAck = ackList.find(a => a.version === sop.version);
  const needsReack = !currentAck && ackList.length > 0;

  return (
    <SOPDetailClient
      sop={{ ...sop, blocks: sop.blocks as unknown as SOPBlock[] | null }}
      acked={!!currentAck}
      needsReack={needsReack}
    />
  );
}
