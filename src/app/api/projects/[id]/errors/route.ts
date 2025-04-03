import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const projectId = resolvedParams.id;

    const errors = await prisma.error.findMany({
      where: {
        projectId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(errors);
  } catch (error) {
    console.error("Error fetching errors:", error);
    return NextResponse.json(
      { message: "Failed to fetch errors" },
      { status: 500 }
    );
  }
}
