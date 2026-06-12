import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin, canManageContractors } from "@/lib/permissions";
import {
  generateId, adjustToPayPeriod,
  CONTRACTOR_REQUEST_TYPES, CONTRACTOR_REQUEST_STATUSES, COMPENSATION_TYPES,
} from "@/lib/utils";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !canManageContractors(session.user as any)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "";

  const requests = await prisma.contractorChangeRequest.findMany({
    where: { ...(status && { status }) },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !canManageContractors(session.user as any)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const user = session.user as any;
  const body = await req.json();

  if (!CONTRACTOR_REQUEST_TYPES.includes(body.requestType)) {
    return NextResponse.json({ error: "Invalid request type." }, { status: 400 });
  }

  const department = body.department === "Other" ? body.customDepartment : body.department;
  if (!department) {
    return NextResponse.json({ error: "Department is required." }, { status: 400 });
  }

  let contractorName: string | null = null;
  let effectiveDate: Date | null = null;
  let effectiveDateSelected: Date | null = null;
  let compensationType: string | null = null;
  let compensationAmount: number | null = null;
  let details: Record<string, unknown> = {};

  switch (body.requestType) {
    case "Termination": {
      if (!body.contractorName || !body.role || !body.lastWorkingDay || !body.reason || !body.equipmentReturn) {
        return NextResponse.json({ error: "Missing required Termination fields." }, { status: 400 });
      }
      if (body.equipmentReturn === "Other" && !body.equipmentReturnOther) {
        return NextResponse.json({ error: "Please specify the equipment return details." }, { status: 400 });
      }
      contractorName = body.contractorName;
      effectiveDate = new Date(body.lastWorkingDay);
      details = {
        role: body.role,
        reason: body.reason,
        equipmentReturn: body.equipmentReturn,
        equipmentReturnOther: body.equipmentReturn === "Other" ? body.equipmentReturnOther : null,
        additionalNotes: body.additionalNotes ?? null,
      };
      break;
    }
    case "Department Transfer": {
      if (!body.contractorName || !body.currentDepartment || !body.changingRoles || !body.previousRole
        || !body.newDepartment || !body.newRole || !body.newCompensation || !body.effectiveDate) {
        return NextResponse.json({ error: "Missing required Department Transfer fields." }, { status: 400 });
      }
      contractorName = body.contractorName;
      effectiveDate = new Date(body.effectiveDate);
      details = {
        currentDepartment: body.currentDepartment,
        changingRoles: body.changingRoles,
        previousRole: body.previousRole,
        newDepartment: body.newDepartment,
        newRole: body.newRole,
        newCompensation: body.newCompensation,
        additionalNotes: body.additionalNotes ?? null,
      };
      break;
    }
    case "Compensation Adjustment": {
      if (!body.contractorName || !body.currentRole || !body.switchingRoles || !body.compensationType || !body.effectiveDate) {
        return NextResponse.json({ error: "Missing required Compensation Adjustment fields." }, { status: 400 });
      }
      if (!COMPENSATION_TYPES.includes(body.compensationType)) {
        return NextResponse.json({ error: "Invalid compensation type." }, { status: 400 });
      }
      const amount = body.compensationType === "Hourly" ? body.hourlyRate : body.salaryAmount;
      if (amount === undefined || amount === null || amount === "") {
        return NextResponse.json({ error: "Compensation amount is required." }, { status: 400 });
      }
      contractorName = body.contractorName;
      compensationType = body.compensationType;
      compensationAmount = Number(amount);
      effectiveDateSelected = new Date(body.effectiveDate);
      effectiveDate = new Date(adjustToPayPeriod(body.effectiveDate));
      details = {
        currentRole: body.currentRole,
        switchingRoles: body.switchingRoles,
        reasonNotes: body.reasonNotes ?? null,
      };
      break;
    }
    case "Hire": {
      if (!body.location || !body.fullLegalName || !body.personalEmail || !body.personalPhone
        || !body.jobTitle || !body.taskDescription || !body.startDate || !body.compensationType) {
        return NextResponse.json({ error: "Missing required Hire fields." }, { status: 400 });
      }
      if (!COMPENSATION_TYPES.includes(body.compensationType)) {
        return NextResponse.json({ error: "Invalid compensation type." }, { status: 400 });
      }
      const amount = body.compensationType === "Hourly" ? body.hourlyRate : body.salaryAmount;
      if (amount === undefined || amount === null || amount === "") {
        return NextResponse.json({ error: "Compensation amount is required." }, { status: 400 });
      }
      contractorName = body.fullLegalName;
      effectiveDate = new Date(body.startDate);
      compensationType = body.compensationType;
      compensationAmount = Number(amount);
      details = {
        location: body.location,
        preferredName: body.preferredName ?? null,
        personalEmail: body.personalEmail,
        personalPhone: body.personalPhone,
        jobTitle: body.jobTitle,
        taskDescription: body.taskDescription,
      };
      break;
    }
  }

  const request = await prisma.contractorChangeRequest.create({
    data: {
      requestCode: generateId("CCR"),
      requesterEmail: user.email.toLowerCase(),
      requesterName: user.name ?? user.email,
      department,
      requestType: body.requestType,
      contractorName,
      effectiveDate,
      effectiveDateSelected,
      compensationType,
      compensationAmount,
      details: details as Prisma.InputJsonValue,
      status: "Pending",
      statusHistory: [{ status: "Pending", changedBy: user.email, changedAt: new Date().toISOString() }],
    },
  });

  await logAudit(user.email, "contractor-request.create", "ContractorChangeRequest", request.id, {
    requestType: request.requestType, contractorName: request.contractorName, department: request.department,
  });

  return NextResponse.json(request, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !isAdmin(session.user as any)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const user = session.user as any;
  const { id, status, reviewNotes } = await req.json();

  if (!CONTRACTOR_REQUEST_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const existing = await prisma.contractorChangeRequest.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const history = Array.isArray(existing.statusHistory) ? existing.statusHistory : [];
  const updatedHistory = [
    ...history,
    { status, changedBy: user.email, changedAt: new Date().toISOString(), reviewNotes: reviewNotes ?? null },
  ];

  const request = await prisma.contractorChangeRequest.update({
    where: { id },
    data: { status, reviewer: user.email, reviewNotes: reviewNotes ?? null, statusHistory: updatedHistory },
  });

  await logAudit(user.email, "contractor-request.review", "ContractorChangeRequest", request.id, {
    requestType: request.requestType, contractorName: request.contractorName, status,
  });

  return NextResponse.json(request);
}
