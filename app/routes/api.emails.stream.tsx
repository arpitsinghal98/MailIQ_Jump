import { json } from "@remix-run/node";
import type { LoaderFunction } from "@remix-run/node";
import { getSession } from "~/utils/session.server";
import { db } from "~/db/client";
import { emails } from "~/db/schema";
import { eq, gt, and } from "drizzle-orm";

export const loader: LoaderFunction = async ({ request }) => {
  const session = await getSession(request.headers.get("Cookie"));
  const user = session.get("user");
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  // Get the last email ID from the request
  const url = new URL(request.url);
  const lastEmailId = url.searchParams.get("lastEmailId");

  // Set up SSE headers
  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });

  const stream = new ReadableStream({
    async start(controller) {
      let isConnected = true;

      const sendError = (error: string) => {
        controller.enqueue(`event: error\ndata: ${JSON.stringify({ error })}\n\n`);
      };

      const sendHeartbeat = () => {
        if (isConnected) {
          controller.enqueue(": heartbeat\n\n");
        }
      };

      const checkNewEmails = async () => {
        try {
          const newEmails = await db.query.emails.findMany({
            where: lastEmailId 
              ? and(
                  eq(emails.userId, user.id),
                  gt(emails.id, parseInt(lastEmailId))
                )
              : eq(emails.userId, user.id),
            orderBy: (emails, { desc }) => [desc(emails.receivedAt)],
          });

          if (newEmails.length > 0) {
            controller.enqueue(`data: ${JSON.stringify({ emails: newEmails })}\n\n`);
          }
        } catch (error) {
          console.error("Error checking for new emails:", error);
          sendError("Failed to fetch new emails");
        }
      };

      // Send initial connection success
      controller.enqueue(`event: connected\ndata: ${JSON.stringify({ status: "connected" })}\n\n`);

      await checkNewEmails();
      
      // Set up intervals
      const emailInterval = setInterval(checkNewEmails, 2000);
      const heartbeatInterval = setInterval(sendHeartbeat, 30000); // Send heartbeat every 30 seconds

      // Clean up on close
      request.signal.addEventListener("abort", () => {
        isConnected = false;
        clearInterval(emailInterval);
        clearInterval(heartbeatInterval);
        controller.close();
      });
    },
  });

  return new Response(stream, { headers });
}; 