import { json, redirect } from "@remix-run/node";
import { getGmailAttachment } from "~/lib/gmail.server";
import { getSession } from "~/utils/session.server";
import { eq } from "drizzle-orm";
import { db } from "~/db/client";
import { linkedAccounts } from "~/db/schema";

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const messageId = url.searchParams.get("messageId");
  const attachmentId = url.searchParams.get("attachmentId");

  if (!messageId || !attachmentId) {
    throw new Error("Missing required parameters");
  }

  // Get the session to access tokens
  const session = await getSession(request.headers.get("Cookie"));
  const user = session.get("user");
  if (!user) {
    return redirect("/login");
  }

  // Get the linked account for this user
  const linkedAccount = await db.query.linkedAccounts.findFirst({
    where: eq(linkedAccounts.userId, user.id),
  });

  if (!linkedAccount) {
    throw new Error("No Gmail account linked");
  }

  try {
    console.log("📎 Downloading attachment:", {
      messageId,
      attachmentId,
      hasAccessToken: !!linkedAccount.accessToken,
      hasRefreshToken: !!linkedAccount.refreshToken,
    });

    const attachment = await getGmailAttachment(
      messageId,
      attachmentId,
      linkedAccount.accessToken,
      linkedAccount.refreshToken
    );

    return new Response(attachment.data, {
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Disposition": `attachment; filename="${attachment.filename}"`,
      },
    });
  } catch (error) {
    console.error("❌ Error downloading attachment:", error);
    throw error;
  }
} 