import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getEffectiveUserLimitForCompany } from "@/lib/companySeatLimit";

export async function POST(req: NextRequest) {
  try {
    const { token, name, password } = await req.json();
    if (!token || !name || !password) {
      return NextResponse.json({ error: "token, name, password required" }, { status: 400 });
    }

    const log = await prisma.activityLog.findFirst({
      where: { action: "INVITE_SENT", details: { contains: token } } as any,
      orderBy: { createdAt: "desc" },
      select: { id: true, details: true },
    } as any);
    if (!log) return NextResponse.json({ error: "Invalid or expired invite" }, { status: 400 });

    let email = "";
    let role = "USER";
    let companyId = "";
    let employeeStub: null | {
      department: string;
      designation: string;
      dateOfJoining: string;
      salary: number;
    } = null;
    try {
      const d = JSON.parse(log.details || "{}");
      email = d.email || "";
      role = (d.role || "USER").toUpperCase();
      companyId = d.companyId || "";
      if (d.employee && typeof d.employee === "object") {
        employeeStub = {
          department:    String(d.employee.department || "").trim(),
          designation:   String(d.employee.designation || "").trim(),
          dateOfJoining: String(d.employee.dateOfJoining || "").trim(),
          salary:        Number(d.employee.salary) || 0,
        };
      }
    } catch {}
    if (!email || !companyId) return NextResponse.json({ error: "Malformed invite" }, { status: 400 });

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { plan: true },
    });
    const maxUsers = await getEffectiveUserLimitForCompany(companyId, company?.plan);
    if (maxUsers !== null) {
      const count = await prisma.userCompany.count({ where: { companyId } });
      if (count >= maxUsers) {
        return NextResponse.json({ error: `User limit reached for this company (${maxUsers}).` }, { status: 400 });
      }
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    const hash = await bcrypt.hash(password, 10);
    let userId: string;
    if (existing) {
      userId = existing.id;
      await prisma.user.update({ where: { id: userId }, data: { name, role } });
    } else {
      const user = await prisma.user.create({
        data: { name, email: email.toLowerCase(), password: hash, role, active: true },
      } as any);
      userId = user.id;
    }

    try {
      await prisma.userCompany.upsert({
        where: { userId_companyId: { userId, companyId } } as any,
        update: { isDefault: true },
        create: { userId, companyId, isDefault: true },
      } as any);
    } catch {}

    // Set defaultCompanyId so login doesn't fail with "Company context required"
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { defaultCompanyId: companyId } as any,
      });
    } catch {}

    // Optional: create Employee record if admin opted in at invite time
    let employeeCreated = false;
    if (employeeStub && employeeStub.department && employeeStub.dateOfJoining) {
      try {
        const nameParts = String(name || "").trim().split(/\s+/);
        const firstName = nameParts[0] || email.split("@")[0];
        const lastName  = nameParts.slice(1).join(" ");

        const existingEmp = await prisma.employee.findFirst({
          where: { companyId, email: email.toLowerCase() },
          select: { id: true },
        });

        if (!existingEmp) {
          const empCount = await prisma.employee.count({ where: { companyId } });
          const generatedEmpId = `EMP-${String(empCount + 1).padStart(4, "0")}`;

          const dojDate = new Date(employeeStub.dateOfJoining);
          const doj = isNaN(dojDate.getTime()) ? new Date() : dojDate;

          await prisma.employee.create({
            data: {
              companyId,
              employeeId:    generatedEmpId,
              firstName,
              lastName:      lastName || "",
              email:         email.toLowerCase(),
              designations:  employeeStub.designation || "",
              department:    employeeStub.department,
              dateOfJoining: doj,
              salary:        employeeStub.salary,
              salaryFrequency: "MONTHLY",
            } as any,
          });
          employeeCreated = true;
        }
      } catch (empErr: any) {
        console.error("Employee stub creation failed (non-fatal):", empErr?.message || empErr);
      }
    }

    try {
      await prisma.activityLog.create({
        data: {
          companyId,
          userId,
          action: "INVITE_ACCEPTED",
          details: JSON.stringify({ token, employeeCreated }),
        },
      });
    } catch {}

    return NextResponse.json({ ok: true, employeeCreated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
