import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      description,
      type,
      severity,
      url,
    }: {
      title: string;
      description: string;
      type: string;
      severity: string;
      url?: string;
    } = body;

    if (!title || !description || !type || !severity) {
      return NextResponse.json(
        { error: "Missing required error details" },
        { status: 400 }
      );
    }

    const prompt = `
      Analyze the following web development error and provide actionable recommendations and potential fixes.
      Be concise and focus on practical steps a developer can take.

      Error Details:
      - Title: ${title}
      - Description: ${description}
      - Type: ${type}
      - Severity: ${severity}
      ${url ? `- URL: ${url}` : ""}

      Recommendations and Potential Fixes:
    `;

    const chatCompletion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-3.5-turbo",
      temperature: 0.3,
      max_tokens: 250,
    });

    const recommendations =
      chatCompletion.choices[0]?.message?.content?.trim() ||
      "No recommendations generated.";

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error("OpenAI API Error:", error);
    let errorMessage = "Failed to get AI analysis.";
    if (error instanceof OpenAI.APIError) {
      errorMessage = error.message || errorMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
