import { json } from "@remix-run/node";
import type { LoaderFunction } from "@remix-run/node";
import { getSession } from "~/utils/session.server";
import { db } from "~/db/client";
import { linkedAccounts, emails, syncJobs, categories } from "~/db/schema";
import { eq } from "drizzle-orm";
import { fetchRecentEmails } from "~/lib/fetch-emails";
import { analyzeEmail } from "~/utils/ai";
import { getGmailClient } from "~/lib/gmail.server";

// Rate limiting map to track last sync time per account
const accountSyncTimes = new Map<string, number>();
const MIN_SYNC_INTERVAL = 60000; // 1 minute minimum between syncs per account

export const loader: LoaderFunction = async ({ request }) => {
  const session = await getSession(request.headers.get("Cookie"));
  const user = session.get("user");
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  // Get all linked Gmail accounts for the user
  const accounts = await db.query.linkedAccounts.findMany({
    where: eq(linkedAccounts.userId, user.id),
  });

  const userCategories = await db.query.categories.findMany({
    where: eq(categories.userId, user.id),
  });

  const newEmails = [];

  // Fetch new emails from each account
  for (const account of accounts) {
    if (!account.accessToken || !account.refreshToken) {
      console.warn(`⚠️ Skipping ${account.email}: missing tokens`);
      continue;
    }

    // Check rate limit for this account
    const lastSync = accountSyncTimes.get(account.email);
    const now = Date.now();
    if (lastSync && now - lastSync < MIN_SYNC_INTERVAL) {
      console.log(`⏳ Rate limiting ${account.email}, skipping sync`);
      continue;
    }

    try {
      const gmail = getGmailClient(account.accessToken, account.refreshToken);
      console.log('Fetching recent emails for account:', account.email);
      
      // Fetch recent emails using fetchRecentEmails
      const recentEmails = await fetchRecentEmails(account.accessToken, account.refreshToken, 10);
      console.log('Recent emails fetched:', recentEmails.length);

      for (const email of recentEmails) {
        console.log(`\n📧 Processing email: ${email.subject}`);
        console.log("From:", email.from);
        console.log("HTML length:", email.html.length);

        // Check if email already exists
        const existingEmail = await db.query.emails.findFirst({
          where: eq(emails.gmailId, email.id!),
        });

        if (existingEmail) {
          console.log(`⏭️ Skipping existing email: ${email.subject}`);
          continue;
        }

        // Analyze email with AI
        console.log("🤖 Analyzing email with AI...");
        const { category: matchedCategoryName, summary, unsubscribeUrl } = await analyzeEmail(
          email.html,
          userCategories
        );
        console.log("Category:", matchedCategoryName);
        console.log("Summary:", summary);

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

        newEmails.push(savedEmail[0]);
        console.log(`✅ Saved email to database: ${email.subject}`);

        // Only archive if it matched a category
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

      // Create sync job
      await db.insert(syncJobs).values({
        userId: user.id,
        linkedAccountId: account.id,
        lastSyncAt: new Date(),
        status: 'completed',
      });

      // Update rate limit timestamp
      accountSyncTimes.set(account.email, now);
    } catch (error) {
      console.error(`❌ Error fetching emails for ${account.email}:`, error);
      // Record failed sync
      await db.insert(syncJobs).values({
        userId: user.id,
        linkedAccountId: account.id,
        lastSyncAt: new Date(),
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // If it's a rate limit error, add a longer delay
      if (error instanceof Error && error.message.includes('rateLimitExceeded')) {
        accountSyncTimes.set(account.email, now + 300000); // Add 5 minutes to the rate limit
      }
    }
  }

  return json({ emails: newEmails });
}; 
