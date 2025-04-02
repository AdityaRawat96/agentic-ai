import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function fetchGoogleSearchData(url: string) {
  // This is a placeholder for the actual Google Search API implementation
  // You would need to implement the actual API call here
  // For now, we'll return mock data
  return [
    {
      title: "Mobile Usability Issues",
      description:
        "The page has mobile usability issues that need to be addressed.",
      severity: "warning",
    },
    {
      title: "Core Web Vitals",
      description: "The page has poor Core Web Vitals scores.",
      severity: "critical",
    },
    {
      title: "Meta Description",
      description: "The page is missing a meta description.",
      severity: "warning",
    },
  ];
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: params.id },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const errors = await fetchGoogleSearchData(project.url);

    // Store errors in the database
    const createdErrors = await Promise.all(
      errors.map((error) =>
        prisma.error.create({
          data: {
            title: error.title,
            description: error.description,
            severity: error.severity,
            projectId: params.id,
          },
        })
      )
    );

    return NextResponse.json(createdErrors);
  } catch (error) {
    console.error("Error fetching and storing errors:", error);
    return NextResponse.json(
      { error: "Failed to fetch and store errors" },
      { status: 500 }
    );
  }
}
