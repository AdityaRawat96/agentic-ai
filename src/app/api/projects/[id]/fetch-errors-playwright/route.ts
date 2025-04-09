import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import playwright from "playwright";

// Define a type for the errors we collect
interface CollectedError {
  title: string;
  description: string;
  severity: "error" | "warning" | "info";
  type: "SSL" | "Console" | "Resource" | "Redirect" | "Status Code";
  url?: string; // URL of the resource or page causing the error
  projectId: string;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Resolve params asynchronously first, like in the other route
  const resolvedParams = await Promise.resolve(params);
  const projectId = resolvedParams.id;

  // Add a check after awaiting
  if (!projectId) {
    console.error("Error: Project ID not found after resolving params.");
    return NextResponse.json(
      { message: "Bad Request: Missing Project ID in URL" },
      { status: 400 }
    );
  }

  const collectedErrors: CollectedError[] = [];
  let browser = null;

  console.log(`Starting Playwright error fetch for project: ${projectId}`);

  try {
    // 1. Get project details from database
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || !project.url) {
      return NextResponse.json(
        { message: "Project not found or URL missing" },
        { status: 404 }
      );
    }

    const targetUrl = project.url;
    console.log(`Target URL: ${targetUrl}`);

    // 2. Launch Playwright
    // Using chromium, but could be webkit or firefox
    browser = await playwright.chromium.launch();
    const context = await browser.newContext({
      // IMPORTANT: Don't ignore HTTPS errors by default if we want to detect SSL issues
      // ignoreHTTPSErrors: true,
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Agentic-Error-Checker/1.0", // Identify our bot
    });
    const page = await context.newPage();

    // 3. Setup Listeners *before* navigation

    // Listener for Console errors/warnings
    page.on("console", (msg) => {
      const type = msg.type();
      if (type === "error" || type === "warning") {
        console.log(`Console [${type}]: ${msg.text()}`);
        collectedErrors.push({
          title: `Console ${type === "error" ? "Error" : "Warning"}`,
          description: `Message: ${msg.text()}
Location: ${msg.location().url || "N/A"}`,
          severity: type === "error" ? "error" : "warning",
          type: "Console",
          url: targetUrl, // Relates to the main page load
          projectId,
        });
      }
    });

    // Listener for uncaught JS exceptions
    page.on("pageerror", (exception) => {
      console.error(`Page Error: ${exception.message}`);
      collectedErrors.push({
        title: "JavaScript Exception",
        description: `Error: ${exception.message}
Stack: ${exception.stack || "N/A"}`,
        severity: "error",
        type: "Console", // Grouping under Console type for simplicity
        url: targetUrl, // Relates to the main page load
        projectId,
      });
    });

    // Listener for network responses (resource loading)
    page.on("response", (response) => {
      const status = response.status();
      const url = response.url();
      // Ignore data URLs and statuses below 400
      if (url.startsWith("data:") || status < 400) {
        return;
      }

      console.log(`Network Response Error - Status: ${status}, URL: ${url}`);
      collectedErrors.push({
        title: `Resource Load Error (${status})`,
        description: `Failed to load resource: ${url}`,
        severity: status >= 500 ? "error" : "warning", // Treat 5xx as error, 4xx as warning
        type: "Resource",
        url: url, // URL of the failing resource
        projectId,
      });
    });

    // 4. Navigate and Check Response
    let navigationResponse = null;
    try {
      console.log(`Navigating to ${targetUrl}...`);
      navigationResponse = await page.goto(targetUrl, {
        waitUntil: "domcontentloaded", // Can adjust: 'load', 'networkidle'
        timeout: 30000, // 30 seconds timeout
      });
      console.log(`Navigation complete.`);
    } catch (error: unknown) {
      // Check if error is an instance of Error to safely access message
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`Navigation failed: ${errorMessage}`);

      // Basic SSL Error Check: If navigation fails *without* ignoreHTTPSErrors, it's a potential SSL/Network issue
      // Playwright errors for SSL often include codes like 'ERR_CERT_AUTHORITY_INVALID', 'ERR_SSL_PROTOCOL_ERROR'
      const errorMsg = errorMessage.toUpperCase();
      const isPotentialSslError =
        errorMsg.includes("CERT") || errorMsg.includes("SSL");

      collectedErrors.push({
        title: isPotentialSslError ? "Potential SSL Error" : "Navigation Error",
        description: `Failed to navigate to ${targetUrl}. Error: ${errorMessage}`,
        severity: "error",
        type: isPotentialSslError ? "SSL" : "Status Code", // Categorize appropriately
        url: targetUrl,
        projectId,
      });
    }

    // Process navigation response if successful
    if (navigationResponse) {
      const status = navigationResponse.status();
      console.log(`Main page status: ${status}`);

      // Check main page status code
      if (status >= 400) {
        collectedErrors.push({
          title: `Page Status Code Error (${status})`,
          description: `Page ${targetUrl} returned status ${status}.`,
          severity: status >= 500 ? "error" : "warning",
          type: "Status Code",
          url: targetUrl,
          projectId,
        });
      }

      // Check for redirects
      const request = navigationResponse.request();
      const redirectChain = request.redirectedFrom()
        ? getRedirectChain(request)
        : [];
      if (redirectChain.length > 0) {
        console.log(`Redirect chain detected: ${redirectChain.join(" -> ")}`);
        // You could add more sophisticated checks here (e.g., chain length, loops)
        collectedErrors.push({
          title: "Redirection Detected",
          description: `Page loaded via redirect: ${redirectChain.join(
            " -> "
          )} -> ${targetUrl} (Status: ${status})`,
          severity: "info", // Redirects aren't inherently errors unless they break or loop
          type: "Redirect",
          url: redirectChain[0], // Start of the chain
          projectId,
        });
      }
    }

    // 5. Close Browser
    await browser.close();
    browser = null;
    console.log("Playwright browser closed.");

    // 6. Store Errors in Database
    if (collectedErrors.length > 0) {
      console.log(`Storing ${collectedErrors.length} errors...`);
      try {
        const result = await prisma.error.createMany({
          data: collectedErrors,
          skipDuplicates: true, // Avoid inserting the exact same error multiple times if run repeatedly
        });
        console.log(`Stored ${result.count} new errors in the database.`);
      } catch (dbError) {
        console.error("Database error storing Playwright findings:", dbError);
        // Decide if you want to return a 500 error here or just log it
      }
    } else {
      console.log("No errors detected by Playwright.");
    }

    return NextResponse.json({
      message: "Playwright check completed.",
      detectedErrors: collectedErrors,
    });
  } catch (error: unknown) {
    console.error("Error during Playwright check:", error);
    if (browser) {
      try {
        await browser.close(); // Ensure browser is closed on error
      } catch (closeError) {
        console.error("Failed to close browser after error:", closeError);
      }
    }
    // Check if error is an instance of Error to safely access message
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        message: "Failed to fetch errors with Playwright",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

// Helper function to get redirect chain
function getRedirectChain(request: playwright.Request): string[] {
  const chain: string[] = [];
  let currentRequest = request.redirectedFrom();
  while (currentRequest) {
    chain.push(currentRequest.url());
    currentRequest = currentRequest.redirectedFrom();
  }
  return chain.reverse(); // Reverse to show from start to end
}
