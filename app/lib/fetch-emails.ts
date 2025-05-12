import { getGmailClient } from "~/lib/gmail.server";
import { GaxiosError } from "gaxios";
import { gmail_v1 } from "googleapis";

type GmailPart = gmail_v1.Schema$MessagePart;

function extractHtmlFromPayload(payload: GmailPart): string {
  
  if (!payload) {
    return "";
  }

  // Direct HTML
  if (payload.mimeType === "text/html" && payload.body?.data) {
    return payload.body.data;
  }

  // Handle multipart messages
  if (payload.parts && Array.isArray(payload.parts)) {


    // First try to find HTML in the parts
    for (const part of payload.parts) {
      // If this part is multipart, recursively check its parts
      if (part.mimeType?.startsWith('multipart/') && part.parts) {
        const nestedHtml = extractHtmlFromPayload(part);
        if (nestedHtml) {
          return nestedHtml;
        }
      }
      
      // Check for HTML content
      if (part.mimeType === "text/html" && part.body?.data) {
        return part.body.data;
      }
    }

    // If no HTML found, try plain text
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return part.body.data;
      }
    }
  }

  // Final fallback
  return payload.body?.data || "";
}

function findAttachmentsInParts(parts: GmailPart[]): {
  filename: string;
  mimeType: string;
  attachmentId: string;
}[] {
  const attachments: {
    filename: string;
    mimeType: string;
    attachmentId: string;
  }[] = [];

  if (!parts) return attachments;

  for (const part of parts) {
    // If this part is an attachment
    if (part.filename && part.body?.attachmentId) {
      attachments.push({
        filename: part.filename,
        mimeType: part.mimeType || "application/octet-stream",
        attachmentId: part.body.attachmentId,
      });
    }
    
    // If this part has nested parts, search them too
    if (part.parts) {
      attachments.push(...findAttachmentsInParts(part.parts));
    }
  }

  return attachments;
}

export async function fetchRecentEmails(accessToken: string, refreshToken: string, maxResults: number = 10) {
  
  const gmail = getGmailClient(accessToken, refreshToken);

  const res = await gmail.users.messages.list({
    userId: "me",
    labelIds: ["INBOX"],
    maxResults,
  });


  const emails = await Promise.all(
    (res.data.messages ?? []).map(async (msg) => {
      
      const full = await gmail.users.messages.get({
        userId: "me",
        id: msg.id!,
        format: "full",
      });

      const payload = full.data.payload;
      const headers = payload?.headers || [];

      const subject = headers.find((h) => h.name === "Subject")?.value || "";
      const from = headers.find((h) => h.name === "From")?.value || "";

      // Try to get HTML content
      let htmlContent = "";
      try {
        const htmlEncoded = extractHtmlFromPayload(payload as GmailPart);
        
        if (htmlEncoded) {
          htmlContent = Buffer.from(htmlEncoded, "base64").toString("utf8");

        } else {
          console.warn("⚠️ No HTML content found");
        }
      } catch (error) {
        console.error("❌ Error extracting HTML:", error);
      }

      return {
        id: msg.id,
        subject,
        from,
        html: htmlContent,
      };
    })
  );

  return emails;
}

export async function fetchSingleEmailById(
  gmailMessageId: string,
  accessToken: string,
  refreshToken: string
) {
  const gmail = getGmailClient(accessToken, refreshToken);

  try {
    // First try to get the message directly
    const full = await gmail.users.messages.get({
      userId: "me",
      id: gmailMessageId,
      format: "full",
    });

    if (!full.data.id) {
      console.error("❌ Invalid message format: missing ID");
      throw new Error("Invalid message format: missing ID");
    }

    // Extract HTML content
    const payload = full.data.payload;
    let htmlContent = "";
    try {
      const htmlEncoded = extractHtmlFromPayload(payload as GmailPart);
      if (htmlEncoded) {
        htmlContent = Buffer.from(htmlEncoded, "base64").toString("utf8");
      } else {
        console.warn("⚠️ No HTML content found");
      }
    } catch (error) {
      console.error("❌ Error extracting HTML:", error);
    }

    // Get headers
    const headers = payload?.headers || [];
    const subject = headers.find((h) => h.name === "Subject")?.value || "";
    const from = headers.find((h) => h.name === "From")?.value || "";
    const to = headers.find((h) => h.name === "To")?.value || "";
    const date = headers.find((h) => h.name === "Date")?.value || "";

    // Extract attachments
    const attachments = payload?.parts ? findAttachmentsInParts(payload.parts) : [];

    // Log the attachments for debugging
    console.log("📎 Found attachments:", attachments);

    return {
      id: full.data.id,
      subject,
      from,
      to,
      date,
      html: htmlContent,
      attachments,
    };
  } catch (error) {
    if (error instanceof GaxiosError && error.response?.status === 404) {
      // Try to find the message in any label using a broader search
      try {
        // Try searching in all possible locations
        const searchQueries = [
          "in:all",           // All mail
          "in:anywhere",      // Anywhere including trash
          "in:trash",         // Trash
          "in:spam",          // Spam
          "in:sent",          // Sent
          "in:draft",         // Drafts
          "in:archive",       // Archive
          "label:important",  // Important
          "label:starred",    // Starred
        ];

        for (const query of searchQueries) {
          const search = await gmail.users.messages.list({
            userId: "me",
            q: query,
            maxResults: 100,
          });

          const foundMessage = search.data.messages?.find(msg => msg.id === gmailMessageId);
          
          if (foundMessage) {
            const full = await gmail.users.messages.get({
              userId: "me",
              id: gmailMessageId,
              format: "full",
            });

            if (!full.data.id) {
              console.error("❌ Invalid message format: missing ID");
              throw new Error("Invalid message format: missing ID");
            }

            // Extract HTML content
            const payload = full.data.payload;
            let htmlContent = "";
            
            try {
              const htmlEncoded = extractHtmlFromPayload(payload as GmailPart);
              if (htmlEncoded) {
                htmlContent = Buffer.from(htmlEncoded, "base64").toString("utf8");
              } else {
                console.warn("⚠️ No HTML content found");
              }
            } catch (error) {
              console.error("❌ Error extracting HTML:", error);
            }

            // Get headers
            const headers = payload?.headers || [];
            const subject = headers.find((h) => h.name === "Subject")?.value || "";
            const from = headers.find((h) => h.name === "From")?.value || "";

            // Extract attachments
            const attachments = payload?.parts ? findAttachmentsInParts(payload.parts) : [];

            return {
              id: full.data.id,
              subject,
              from,
              html: htmlContent,
              snippet: full.data.snippet,
              threadId: full.data.threadId,
              labelIds: full.data.labelIds,
              attachments,
            };
          }
        }

        console.error("❌ Message not found in any location:", gmailMessageId);
      } catch (retryError) {
        console.error("❌ Search failed:", retryError);
      }
    }
    throw error;
  }
}