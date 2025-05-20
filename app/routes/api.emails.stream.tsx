import { json } from "@remix-run/node";
import type { LoaderFunction } from "@remix-run/node";
import { getSession } from "~/utils/session.server";
import { db } from "~/db/client";
import { emails, linkedAccounts, categories } from "~/db/schema";
import { eq, gt, and } from "drizzle-orm";
import { fetchRecentEmails } from "~/lib/fetch-emails";
import { analyzeEmail } from "~/utils/ai";
import { getGmailClient } from "~/lib/gmail.server";

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
        console.log("Arpit Stream Checking for new emails");
        try {
          // Get all linked Gmail accounts for the user
          const accounts = await db.query.linkedAccounts.findMany({
            where: eq(linkedAccounts.userId, user.id),
          });

          const userCategories = await db.query.categories.findMany({
            where: eq(categories.userId, user.id),
          });

          for (const account of accounts) {
            if (!account.accessToken || !account.refreshToken) {
              console.warn(`⚠️ Skipping ${account.email}: missing tokens`);
              continue;
            }

            try {
              const gmail = getGmailClient(account.accessToken, account.refreshToken);
              const recentEmails = await fetchRecentEmails(account.accessToken, account.refreshToken, 5);

              for (const email of recentEmails) {
                // Check if email already exists
                const existingEmail = await db.query.emails.findFirst({
                  where: and(
                    eq(emails.subject, email.subject),
                    eq(emails.from, email.from),
                    eq(emails.gmailId, email.id!)
                  ),
                });

                if (existingEmail) {
                  console.log(`📧 Skipping duplicate email: ${email.subject}`);
                  continue;
                }

                // Analyze email with AI
                const { category: matchedCategoryName, summary, unsubscribeUrl } = await analyzeEmail(
                  email.html,
                  userCategories
                );

                // Save to database
                const savedEmail = await db.insert(emails).values({
                  userId: user.id,
                  linkedAccountId: account.id,
                  gmailId: email.id!,
                  subject: email.subject,
                  from: email.from,
                  rawHtml: unsubscribeUrl,
                  summary,
                  receivedAt: new Date(),
                  categoryId: matchedCategoryName && matchedCategoryName !== "None" 
                    ? userCategories.find(c => c.name.toLowerCase().trim() === matchedCategoryName.toLowerCase().trim())?.id 
                    : null,
                }).returning();

                // Send the new email to the client
                controller.enqueue(`event: message\ndata: ${JSON.stringify({ emails: savedEmail })}\n\n`);

                // Only archive if it matched a category
                console.log("🔍 Analyzed email:", email.subject, "with category:", matchedCategoryName);
                if (matchedCategoryName && matchedCategoryName !== "None") {
                  try {
                    await gmail.users.messages.modify({
                      userId: 'me',
                      id: email.id!,
                      requestBody: {
                        removeLabelIds: ['INBOX']
                      }
                    });
                    console.log(`✅ Archived email: ${email.id}`);
                  } catch (archiveError) {
                    console.error(`❌ Failed to archive email ${email.id}:`, archiveError);
                  }
                } else {
                  console.log(`📥 Saved to Inbox: ${email.subject}`);
                }
              }
            } catch (error) {
              console.error(`❌ Error fetching emails for ${account.email}:`, error);
            }
          }
        } catch (error) {
          console.error("Error checking for new emails:", error);
          sendError("Failed to fetch new emails");
        }
      };

      // Send initial connection success
      controller.enqueue(`event: connected\ndata: ${JSON.stringify({ status: "connected" })}\n\n`);

      // Initial check for new emails
      await checkNewEmails();
      
      // Set up intervals
      const emailInterval = setInterval(checkNewEmails, 30000); // Check every 30 seconds
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
