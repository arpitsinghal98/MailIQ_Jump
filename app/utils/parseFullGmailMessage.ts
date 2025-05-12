import { GaxiosResponse } from "gaxios";
import { gmail_v1 } from "googleapis";

type GmailBody = gmail_v1.Schema$MessagePartBody;
type GmailPart = gmail_v1.Schema$MessagePart;
type GmailPayload = gmail_v1.Schema$MessagePart;

// Add a type guard to ensure the message has a valid ID
function isValidGmailMessage(message: unknown): message is GaxiosResponse<gmail_v1.Schema$Message> {
  if (typeof message !== "object" || message === null) return false;
  const msg = message as Record<string, unknown>;
  if (!("data" in msg) || typeof msg.data !== "object" || msg.data === null) return false;
  const data = msg.data as Record<string, unknown>;
  return "id" in data;
}

export function decodeBase64(data: string): string {
  try {
    // First decode the base64 to binary
    const binaryStr = atob(data.replace(/-/g, '+').replace(/_/g, '/'));
    // Convert binary string to UTF-8
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    // Decode UTF-8 bytes to string
    return new TextDecoder('utf-8').decode(bytes);
  } catch (err) {
    console.error("Base64 decode failed", err);
    return "";
  }
}

export function extractHtmlFromPayload(payload: GmailPayload): string {
  if (!payload) return "";

  // Direct HTML
  if (payload.mimeType === "text/html" && payload.body?.data) {
    return decodeBase64(payload.body.data);
  }

  // Multipart
  if (payload.parts && Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        return decodeBase64(part.body.data);
      }
    }

    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeBase64(part.body.data);
      }
    }
  }

  if (payload.body?.data) {
    return decodeBase64(payload.body.data);
  }

  return "<p>No content</p>";
}

export function parseFullGmailMessage(full: GaxiosResponse<gmail_v1.Schema$Message>) {
  if (!isValidGmailMessage(full)) {
    throw new Error("Invalid Gmail message format");
  }

  const payload = full.data.payload;
  if (!payload) {
    throw new Error("Invalid message format: missing payload");
  }

  const headers = payload.headers || [];

  const getHeader = (name: string) =>
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";

  const subject = getHeader("Subject");
  const from = getHeader("From");
  const to = getHeader("To");
  const rawDate = getHeader("Date");

  // Format the date
  const date = rawDate ? new Date(rawDate).toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  }) : '';

  const html = extractHtmlFromPayload(payload);

  const attachments =
    payload.parts
      ?.filter((part): part is GmailPart & { filename: string; body: GmailBody & { attachmentId: string } } => 
        Boolean(part.filename && part.body?.attachmentId))
      .map((part) => ({
        filename: part.filename,
        mimeType: part.mimeType || "application/octet-stream",
        attachmentId: part.body.attachmentId,
      })) ?? [];

  return {
    id: full.data.id || "",
    subject,
    from,
    to,
    date,
    html,
    attachments,
  };
}