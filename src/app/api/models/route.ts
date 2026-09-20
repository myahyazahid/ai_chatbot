import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.API_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "https://router.redscale.my.id/v1";

  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch models" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to connect to API", details: String(error) },
      { status: 500 }
    );
  }
}
