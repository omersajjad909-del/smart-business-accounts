import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password = "us786", name = "Umer Sajjad", email = "umer@traders.com" } = body;

    console.log("🔨 Creating default user...");

    // Check if user already exists
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email },
          { name: { equals: name, mode: "insensitive" } },
        ],
      },
    });

    if (existing) {
      console.log("⚠️ User already exists, updating password...");
      
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: {
          password: hashedPassword,
          active: true,
          email: email, // Ensure email is set
        },
      });

      return NextResponse.json({
        success: true,
        message: "User updated successfully! Password reset to 'us786'",
        user: {
          id: updated.id,
          name: updated.name,
          email: updated.email,
          role: updated.role,
        },
        email: updated.email,
        password: password,
      });
    }

    // Create new user
    console.log("✅ Creating new user...");
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: name,
        email: email,
        password: hashedPassword,
        role: "ADMIN",
        active: true,
      },
    });

    console.log("✅ User created:", user.email);

    return NextResponse.json({
      success: true,
      message: "Default admin user created successfully!",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      email: user.email,
      password: password,
    });

  } catch (error: any) {
    console.error("❌ Error creating default user:", error);
    
    if (error.code === "P2002") {
      return NextResponse.json(
        { 
          success: false,
          error: "User with this email already exists. Try a different email.",
          code: error.code 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false,
        error: error.message || "Failed to create user",
        details: process.env.NODE_ENV === "development" ? error : undefined,
      },
      { status: 500 }
    );
  }
}

// GET endpoint to show instructions
export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: "Create Default User API",
    instructions: "Send POST request with optional body",
    defaultValues: {
      name: "Umer Sajjad",
      email: "umer@traders.com", 
      password: "us786",
    },
    example: {
      method: "POST",
      body: {
        name: "Your Name",
        email: "your@email.com",
        password: "yourpassword",
      },
    },
  });
}
