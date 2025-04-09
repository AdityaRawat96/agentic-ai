import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const project = await prisma.project.update({
      where: {
        id: params.id,
      },
      data: {
        name: body.name,
        url: body.url,
        errorTypes: body.errorTypes,
        frequency: body.frequency,
      },
    });
    return NextResponse.json(project);
  } catch (error) {
    console.error(`Failed to update project ${params.id}:`, error);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.project.delete({
      where: {
        id: params.id,
      },
    });
    return NextResponse.json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error(`Failed to delete project ${params.id}:`, error);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
