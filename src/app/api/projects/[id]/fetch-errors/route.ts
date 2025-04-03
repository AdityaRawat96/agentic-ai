import { NextResponse } from "next/server";
import { oauth2Client } from "@/lib/google-auth";
import { cookies } from "next/headers";
import { searchconsole_v1 } from "@googleapis/searchconsole";
import { prisma } from "@/lib/prisma";

interface InspectionResult {
  pageFetch?: {
    javascriptMessages?: Array<{
      message: string;
      level: string;
      source: string;
    }>;
  };
  richResultsResult?: {
    detectedItems?: Array<{
      name: string;
      type: string;
      items: Array<{
        name: string;
        type: string;
        value: string;
      }>;
    }>;
  };
  indexStatusResult?: {
    verdict: string;
    coverageState: string;
  };
  mobileUsabilityResult?: {
    verdict: string;
    issues?: string[];
  };
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const projectId = resolvedParams.id;
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("google_access_token");

    if (!accessToken?.value) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    // Get project details from database
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { message: "Project not found" },
        { status: 404 }
      );
    }

    oauth2Client.setCredentials({
      access_token: accessToken.value,
    });

    const searchConsole = new searchconsole_v1.Searchconsole({
      auth: oauth2Client,
    });

    // Get the domain from the project URL
    const siteUrl = project.url;

    console.log("Fetching errors for site:", siteUrl);

    // First, get the site
    const sitesResponse = await searchConsole.sites.list();
    console.log("Sites response:", JSON.stringify(sitesResponse.data, null, 2));

    const site = sitesResponse.data.siteEntry?.find(
      (site) => site.siteUrl === siteUrl
    );

    if (!site) {
      return NextResponse.json(
        { message: "Site not found in Search Console" },
        { status: 404 }
      );
    }

    // Get crawl errors
    const crawlErrorsResponse = await searchConsole.urlInspection.index.inspect(
      {
        requestBody: {
          inspectionUrl: project.url,
          siteUrl,
        },
      }
    );
    console.log(
      "Crawl errors response:",
      JSON.stringify(crawlErrorsResponse.data, null, 2)
    );

    // Log JavaScript console messages
    const inspectionResult = crawlErrorsResponse.data
      .inspectionResult as InspectionResult;
    if (inspectionResult?.pageFetch?.javascriptMessages) {
      console.log(
        "JavaScript Console Messages:",
        JSON.stringify(inspectionResult.pageFetch.javascriptMessages, null, 2)
      );
    }

    // Log any console errors from the URL inspection
    if (
      crawlErrorsResponse.data.inspectionResult?.richResultsResult
        ?.detectedItems
    ) {
      console.log(
        "Rich Results/Console Errors:",
        JSON.stringify(
          crawlErrorsResponse.data.inspectionResult.richResultsResult
            .detectedItems,
          null,
          2
        )
      );
    }

    const errors = [];

    // Process crawl errors and JavaScript warnings
    if (
      crawlErrorsResponse.data.inspectionResult?.indexStatusResult?.verdict ===
      "FAIL"
    ) {
      errors.push({
        title: "Crawl Error",
        description: `URL: ${project.url}\nError: ${crawlErrorsResponse.data.inspectionResult?.indexStatusResult?.coverageState}`,
        severity: "error",
        projectId,
      });
    }

    // Add JavaScript warnings to errors
    if (inspectionResult?.pageFetch?.javascriptMessages) {
      for (const message of inspectionResult.pageFetch.javascriptMessages) {
        errors.push({
          title: "JavaScript Warning",
          description: `Message: ${message.message}\nLevel: ${message.level}\nSource: ${message.source}`,
          severity: message.level === "ERROR" ? "error" : "warning",
          projectId,
        });
      }
    }

    // Get mobile usability errors
    const mobileErrorsResponse =
      await searchConsole.urlInspection.index.inspect({
        requestBody: {
          inspectionUrl: project.url,
          siteUrl,
        },
      });
    console.log(
      "Mobile errors response:",
      JSON.stringify(mobileErrorsResponse.data, null, 2)
    );

    // Process mobile usability errors
    if (
      mobileErrorsResponse.data.inspectionResult?.mobileUsabilityResult
        ?.verdict === "FAIL"
    ) {
      errors.push({
        title: "Mobile Usability Error",
        description: `URL: ${
          project.url
        }\nError: ${mobileErrorsResponse.data.inspectionResult?.mobileUsabilityResult?.issues?.join(
          ", "
        )}`,
        severity: "warning",
        projectId,
      });
    }

    // Store errors in the database
    await prisma.error.createMany({
      data: errors,
    });

    return NextResponse.json({
      errors,
      crawlErrors: crawlErrorsResponse.data,
      mobileErrors: mobileErrorsResponse.data,
      javascriptMessages: inspectionResult?.pageFetch?.javascriptMessages || [],
      richResults: inspectionResult?.richResultsResult?.detectedItems || [],
    });
  } catch (error) {
    console.error("Error fetching errors:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch errors",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
