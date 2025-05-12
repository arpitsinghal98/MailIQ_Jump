import { db } from "~/db/client";
import { emails, linkedAccounts, categories } from "~/db/schema";
import { eq, inArray } from "drizzle-orm";

import { getGmailClient } from "~/lib/gmail.server"; // Assuming this function initializes Gmail client

export async function deleteEmailsByIds(userId: number, emailIds: number[]) {
  const userEmails = await db.query.emails.findMany({
    where: inArray(emails.id, emailIds),
  });

  const linkedAccountsList = await db.query.linkedAccounts.findMany({
    where: eq(linkedAccounts.userId, userId),
  });

  const deletedEmailIds: number[] = [];

  for (const email of userEmails) {
    const acc = linkedAccountsList.find((a) => a.id === email.linkedAccountId);
    if (!acc) continue;

        // If no valid account or tokens, skip
        if (!acc || !acc.accessToken || !acc.refreshToken) {
            console.warn(`⚠️ No valid token for account ID ${email.linkedAccountId}`);
            continue;
        }

        try {
            // Initialize Gmail client using the correct accessToken for the account
            const gmail = getGmailClient(acc.accessToken, acc.refreshToken);

            // Make the API call to delete the email
            await gmail.users.messages.trash({
                userId: "me", // 'me' refers to the authenticated user's Gmail account
                id: email.gmailId, // Gmail ID of the email to delete
            } as { userId: string; id: string }); // Specify the correct type for Gmail API delete method

            deletedEmailIds.push(email.id);
        } catch (err) {
            console.error(`❌ Failed to delete Gmail message ${email.gmailId}`, err);
        }
    }
    await db.delete(emails).where(inArray(emails.id, emailIds));
    
    return { deletedIds: emailIds };
}

export async function deleteEmailsByAccount(userId: number, accountIds: number[]) {
  const userEmails = await db.query.emails.findMany({
    where: inArray(emails.linkedAccountId, accountIds),
  });

  const linkedAccountsList = await db.query.linkedAccounts.findMany({
    where: eq(linkedAccounts.userId, userId),
  });

  const deletedEmailIds: number[] = [];

  for (const email of userEmails) {
    const acc = linkedAccountsList.find((a) => a.id === email.linkedAccountId);
    if (!acc) continue;

    try {
      const gmail = getGmailClient(acc.accessToken, acc.refreshToken);
      await gmail.users.messages.delete({ userId: "me", id: email.gmailId });
    } catch (err) {
      console.warn("Failed to delete from Gmail:", err);
    }

    deletedEmailIds.push(email.id);
  }

  // Remove emails from DB
  await db.delete(emails).where(inArray(emails.id, deletedEmailIds));

  // Remove the linked account
  await db.delete(linkedAccounts).where(inArray(linkedAccounts.id, accountIds));

  // Get remaining categories used by user
  const remaining = await db.query.emails.findMany({
    where: eq(emails.userId, userId),
    columns: { categoryId: true },
  });

  const remainingCategoryIds = [...new Set(remaining.map((e) => e.categoryId).filter(Boolean))];

  return {
    deletedEmailIds,
    remainingCategories: remainingCategoryIds,
  };
}