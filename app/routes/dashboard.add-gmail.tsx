import { redirect } from "@remix-run/node";
import { getSession } from "~/utils/session.server";
import { db } from "~/db/client";
import { linkedAccounts } from "~/db/schema";
import { getGmailClient } from "~/lib/gmail.server";
import { oauth2Client } from "~/lib/google";

export async function loader({ request }: { request: Request }) {
  const session = await getSession(request.headers.get("Cookie"));
  const user = session.get("user");
  if (!user) return redirect("/");

  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return redirect("/dashboard?error=no_code");
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    const gmail = getGmailClient(tokens.access_token!, tokens.refresh_token!);

    // Get user's email
    const profile = await gmail.users.getProfile({ userId: "me" });
    const email = profile.data.emailAddress;

    if (!email) {
      throw new Error("No email found in Gmail profile");
    }

    // Save the account
    await db.insert(linkedAccounts).values({
      userId: user.id,
      email,
      gmailId: email,
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token!,
    });

    return redirect("/dashboard");
  } catch (error) {
    console.error("Gmail connection error:", error);
    return redirect("/dashboard?error=gmail_connection_failed");
  }
} 