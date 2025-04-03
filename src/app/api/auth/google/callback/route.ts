import { NextResponse } from "next/server";
import { oauth2Client } from "@/lib/google-auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      console.error("No code provided in callback");
      return NextResponse.json({ error: "No code provided" }, { status: 400 });
    }

    console.log("Received code:", code);
    console.log("Client ID:", process.env.GOOGLE_CLIENT_ID);
    console.log(
      "Client Secret:",
      process.env.GOOGLE_CLIENT_SECRET?.slice(0, 5) + "..."
    );
    console.log(
      "Redirect URI:",
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
    );

    const { tokens } = await oauth2Client.getToken(code);
    console.log("Received tokens:", tokens);

    oauth2Client.setCredentials(tokens);

    // Store the access token in a secure HTTP-only cookie
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.set("google_access_token", tokens.access_token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 3600, // 1 hour
    });

    return response;
  } catch (error) {
    console.error("Error in OAuth callback:", error);
    return NextResponse.json(
      { error: "Failed to complete authentication" },
      { status: 500 }
    );
  }
}
