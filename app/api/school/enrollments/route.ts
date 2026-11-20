import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bad, isResponse, schoolGuard, str } from "@/lib/schoolApi";
const STATUSES = ["ACTIVE", "WITHDRAWN", "COMPLETED", "SUSPENDED"];
export async function GET(req: NextRequest) {
  const ctx = await schoolGuard(req, false); if (isResponse(ctx)) return ctx;
  const rows = await prisma.educationEnrollment.findMany({ where: { companyId: ctx.companyId }, include: { student:{select:{name:true,admissionNo:true}}, session:{select:{name:true,active:true}}, program:{select:{name:true}} }, orderBy:{createdAt:"desc"} });
  return NextResponse.json(rows);
}
export async function POST(req: NextRequest) {
  const ctx = await schoolGuard(req, true); if (isResponse(ctx)) return ctx;
  const b = await req.json().catch(()=>({})); const studentId=str(b.studentId), sessionId=str(b.sessionId), programId=str(b.programId)||null;
  if(!studentId||!sessionId) return bad("Student and academic session are required");
  const [student,session,program]=await Promise.all([prisma.schoolStudent.findFirst({where:{id:studentId,companyId:ctx.companyId}}),prisma.academicSession.findFirst({where:{id:sessionId,companyId:ctx.companyId}}),programId?prisma.educationProgram.findFirst({where:{id:programId,companyId:ctx.companyId}}):Promise.resolve(true)]);
  if(!student||!session||!program) return bad("Student, session or program was not found",404);
  try { const row=await prisma.educationEnrollment.create({data:{companyId:ctx.companyId,studentId,sessionId,programId,semester:str(b.semester)||null,rollNo:str(b.rollNo)||null}}); return NextResponse.json(row,{status:201}); }
  catch(e){if((e as {code?:string}).code==="P2002") return bad("This student is already enrolled in this session",409);throw e;}
}
export async function PATCH(req:NextRequest){const ctx=await schoolGuard(req,true);if(isResponse(ctx))return ctx;const b=await req.json().catch(()=>({}));const id=str(b.id),status=str(b.status).toUpperCase();if(!id)return bad("Enrollment id is required");const data:Record<string,unknown>={};if(status){if(!STATUSES.includes(status))return bad("Invalid enrollment status");data.status=status;}if(b.programId!==undefined){const programId=str(b.programId)||null;if(programId&&!(await prisma.educationProgram.findFirst({where:{id:programId,companyId:ctx.companyId}})))return bad("Program not found",404);data.programId=programId;}if(b.semester!==undefined)data.semester=str(b.semester)||null;if(b.rollNo!==undefined)data.rollNo=str(b.rollNo)||null;if(!Object.keys(data).length)return bad("No enrollment changes supplied");const r=await prisma.educationEnrollment.updateMany({where:{id,companyId:ctx.companyId},data});if(!r.count)return bad("Enrollment not found",404);return NextResponse.json({ok:true});}

export async function DELETE(req:NextRequest){const ctx=await schoolGuard(req,true);if(isResponse(ctx))return ctx;const id=str(new URL(req.url).searchParams.get("id"));if(!id)return bad("Enrollment id is required");const r=await prisma.educationEnrollment.deleteMany({where:{id,companyId:ctx.companyId}});if(!r.count)return bad("Enrollment not found",404);return NextResponse.json({ok:true});}
