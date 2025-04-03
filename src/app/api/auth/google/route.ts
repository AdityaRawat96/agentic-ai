import { NextResponse } from "next/server";
import { oauth2Client, SCOPES } from "@/lib/google-auth";

export async function GET() {
  try {
    // Log the full configuration (without exposing secrets)
    console.log("OAuth Configuration:");
    console.log("Client ID:", process.env.GOOGLE_CLIENT_ID);
    console.log(
      "Client Secret length:",
      process.env.GOOGLE_CLIENT_SECRET?.length
    );
    console.log(
      "Redirect URI:",
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
    );
    console.log("Scopes:", SCOPES);

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
      prompt: "consent",
    });

    console.log("Generated auth URL:", authUrl);
    return NextResponse.json({ url: authUrl });
  } catch (error) {
    console.error("Error generating auth URL:", error);
    return NextResponse.json(
      { error: "Failed to generate auth URL" },
      { status: 500 }
    );
  }
}
