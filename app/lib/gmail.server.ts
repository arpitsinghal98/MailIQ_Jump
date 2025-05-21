// app/lib/gmail.ts
import { google } from "googleapis";
import { gmail_v1 } from "googleapis";
import { eq } from "drizzle-orm";
import { db } from "~/db/client";
import { linkedAccounts, users } from "~/db/schema";

type GmailPart = gmail_v1.Schema$MessagePart;

export function getGmailClient(accessToken: string, refreshToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  // Add token refresh handler
  oauth2Client.on('tokens', async (tokens) => {
    try {
      // Update both access and refresh tokens in the database
      if (tokens.access_token || tokens.refresh_token) {
        await updateTokens(
          refreshToken,
          tokens.access_token || accessToken,
          tokens.refresh_token || refreshToken
        );
      }
    } catch (error) {
      console.error('Failed to update tokens:', error);
    }
  });

  return google.gmail({ version: "v1", auth: oauth2Client });
}

// Update this function to handle both access and refresh tokens
async function updateTokens(
  oldRefreshToken: string,
  newAccessToken: string,
  newRefreshToken: string
) {
  // Update in linkedAccounts table
  await db.update(linkedAccounts)
    .set({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    })
    .where(eq(linkedAccounts.refreshToken, oldRefreshToken));
  
  // Update in users table if needed
  await db.update(users)
    .set({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    })
    .where(eq(users.refreshToken, oldRefreshToken));
}

function findAttachmentInParts(parts: GmailPart[], attachmentId: string): GmailPart | null {
  if (!parts) return null;
  
  for (const part of parts) {
    // If this part is an attachment with the ID we're looking for
    if (part.body?.attachmentId === attachmentId) {
      return part;
    }
    
    // If this part has nested parts, search them too
    if (part.parts) {
      const found = findAttachmentInParts(part.parts, attachmentId);
      if (found) return found;
    }
  }
  return null;
}

export async function getGmailAttachment(
  messageId: string, 
  attachmentId: string,
  accessToken: string,
  refreshToken: string
) {
  const gmail = getGmailClient(accessToken, refreshToken);

  try {
    // First try to get the attachment directly
    console.log("📎 Getting attachment directly:", {
      messageId,
      attachmentId,
    });

    const response = await gmail.users.messages.attachments.get({
      userId: "me",
      messageId,
      id: attachmentId,
    });

    const attachment = response.data;
    if (!attachment || !attachment.data) {
      throw new Error("Attachment data not found");
    }

    // Get the message to get attachment metadata
    const message = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
    });

    console.log("📧 Message data:", {
      messageId,
      hasPayload: !!message.data.payload,
      partsCount: message.data.payload?.parts?.length || 0,
    });

    if (!message.data.payload?.parts) {
      throw new Error("Message has no parts");
    }

    // Try to find attachment metadata
    let attachmentMetadata = findAttachmentInParts(message.data.payload.parts, attachmentId);

    // If not found in parts, try message body
    if (!attachmentMetadata && message.data.payload.body?.attachmentId === attachmentId) {
      attachmentMetadata = message.data.payload;
    }

    // Decode the base64 data
    const data = Buffer.from(attachment.data, "base64");

    return {
      data,
      mimeType: attachmentMetadata?.mimeType || "application/octet-stream",
      filename: attachmentMetadata?.filename || "attachment",
    };
  } catch (error) {
    console.error("❌ Error getting attachment:", error);
    throw error;
  }
}