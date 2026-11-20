import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bad, isResponse, schoolGuard, str } from "@/lib/schoolApi";
export async function PATCH(req:NextRequest){const ctx=await schoolGuard(req,true);if(isResponse(ctx))return ctx;const b=await req.json().catch(()=>({}));const teacherId=str(b.teacherId),userId=str(b.userId)||null;if(!teacherId)return bad("Teacher is required");if(userId&&!(await prisma.userCompany.findFirst({where:{userId,companyId:ctx.companyId}})))return bad("User is not in this company",404);const r=await prisma.schoolTeacher.updateMany({where:{id:teacherId,companyId:ctx.companyId},data:{userId}});if(!r.count)return bad("Teacher not found",404);return NextResponse.json({ok:true});}
