// app/routes/sync.tsx
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { getSession } from "~/utils/session.server";
import { db } from "~/db/client";
import { categories, emails, linkedAccounts } from "~/db/schema";
import { eq } from "drizzle-orm";
import { fetchRecentEmails } from "~/lib/fetch-emails";
import { analyzeEmail } from "~/utils/ai";
import { getGmailClient } from "~/lib/gmail.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const user = session.get("user");
  if (!user) return redirect("/");

  // Fetch all Gmail accounts linked to this user
  const accounts = await db.query.linkedAccounts.findMany({
    where: eq(linkedAccounts.userId, user.id),
  });

  if (!accounts.length) {
    return json({ error: "No Gmail accounts linked" }, { status: 400 });
  }

  const userCategories = await db.query.categories.findMany({
    where: eq(categories.userId, user.id),
  });

  let totalProcessed = 0;

  for (const account of accounts) {
    if (!account.accessToken || !account.refreshToken) {
      console.warn(`Skipping ${account.email}: missing tokens`);
      continue;
    }

    const gmail = getGmailClient(account.accessToken, account.refreshToken);
    const recentEmails = await fetchRecentEmails(account.accessToken, account.refreshToken);

    for (const email of recentEmails) {
      const { category: matchedCategoryName, summary: aisummary, unsubscribeUrl: aiunsubscribeurl } = await analyzeEmail(email.html, userCategories);

      // Save the email regardless of category match
      await db.insert(emails).values({
        userId: user.id,
        linkedAccountId: account.id,
        categoryId: matchedCategoryName && matchedCategoryName !== "None" 
          ? userCategories.find(c => c.name.toLowerCase().trim() === matchedCategoryName.toLowerCase().trim())?.id 
          : null,  // Set to null for Inbox
        gmailId: email.id!,
        subject: email.subject,
        from: email.from,
        rawHtml: aiunsubscribeurl,
        summary: aisummary,
        receivedAt: new Date(),
      });

      // Only archive if it matched a category
      if (matchedCategoryName && matchedCategoryName !== "None") {
        try {
          await gmail.users.messages.modify({
            userId: "me",
            id: email.id!,
            requestBody: { removeLabelIds: ["INBOX"] },
          });
          totalProcessed++;
        } catch (err) {
          console.error("⚠️ Failed to archive:", email.subject, err);
        }
      } else {
        console.log("📥 Saved to Inbox:", email.subject);
      }
    }
  }

  return json({ success: true, processed: totalProcessed });
}