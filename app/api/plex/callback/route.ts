import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect("http://localhost:3000?error=auth_failed");
  }

  try {
    // Exchange code for token
    const response = await axios.post(
      "https://plex.tv/api/v2/user/signin",
      {
        code: code,
      },
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { user } = response.data;

    // Store user token securely (in production, use secure sessions)
    const userToken = user.authToken;
    const userId = user.id;
    const username = user.username;

    // Redirect back to app with success
    return NextResponse.redirect(
      `http://localhost:3000?auth=success&user=${username}&token=${userToken}&userId=${userId}`
    );
  } catch (error) {
    console.error("Plex auth error:", error);
    return NextResponse.redirect("http://localhost:3000?error=auth_failed");
  }
}
