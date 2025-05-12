import { json } from '@remix-run/node'
import type { ActionFunctionArgs } from '@remix-run/node'
import { fetchNewEmails } from '~/utils/gmail.server' // custom logic
import { db } from '~/db/client'
import { fetchRecentEmails } from '~/lib/fetch-emails'
import { categories, emails } from '~/db/schema'
import { analyzeEmail } from '~/utils/ai'
import { eq } from 'drizzle-orm'
import { getGmailClient } from '~/lib/gmail.server'

export async function action({ request }: ActionFunctionArgs) {
  try {
    const body = await request.json()

    const message = JSON.parse(
      Buffer.from(body.message.data, 'base64').toString()
    )

    const historyId = message.historyId
    console.log(`✅ Received new email(s): historyId`, historyId)


    // 1️⃣ Use historyId to fetch new emails
    //const newEmails = await fetchNewEmails(historyId)

    // 2️⃣ Save emails to your DB
    // Example: await db.email.createMany({ data: newEmails })

    // Fetch all Gmail accounts (or filter based on the email if you store it)
    // const accounts = await db.query.linkedAccounts.findMany({})

    // for (const account of accounts) {
    //   if (!account.accessToken || !account.refreshToken) {
    //     console.warn(`⚠️ Skipping ${account.email} due to missing tokens`)
    //     continue
    //   }

    //         const gmail = getGmailClient(account.accessToken, account.refreshToken);
    //         console.log('Fetching recent emails for account:', account.email);
    //         const recentEmails = await fetchRecentEmails(account.accessToken, account.refreshToken, 5);
    //         console.log('Fetched recent emails:', recentEmails);
    //         console.log('Fetching categories for user:', account.userId);
    //         const userCategories = await db.query.categories.findMany({
    //             where: eq(categories.userId, account.userId),
    //         });
    //         console.log('Fetched categories:', userCategories);

    //         for (const email of recentEmails) {
    //             try {
    //                 // Check if email already exists
    //                 const existingEmail = await db.query.emails.findFirst({
    //                     where: eq(emails.gmailId, email.id!)
    //                 });

    //                 if (existingEmail) {
    //                     console.log(`⏭️ Skipping existing email: ${email.subject}`);
    //                     continue;
    //                 }

    //                 // Analyze email with AI
    //                 const { category: matchedCategoryName, summary } = await analyzeEmail(email.html, userCategories);

    //                 // Base email data
    //                 const emailData = {
    //                     userId: account.userId,
    //                     linkedAccountId: account.id,
    //                     gmailId: email.id!,
    //                     subject: email.subject,
    //                     from: email.from,
    //                     rawHtml: email.html,
    //                     summary,
    //                     receivedAt: new Date()
    //                 };

    //                 // Handle no category match
    //                 if (!matchedCategoryName || matchedCategoryName === "None") {
    //                     console.log("❌ No category matched for:", email.subject);
    //                     await db.insert(emails).values(emailData);
    //                     continue;
    //                 }

    //                 // Find matching category
    //                 const matchedCategory = userCategories.find(
    //                     (c) => c.name.toLowerCase().trim() === matchedCategoryName.toLowerCase().trim()
    //                 );

    //                 if (!matchedCategory) {
    //                     console.warn("⚠️ Unknown category:", matchedCategoryName);
    //                     await db.insert(emails).values(emailData);
    //                     continue;
    //                 }

    //                 // Insert email with category
    //                 await db.insert(emails).values({
    //                     ...emailData,
    //                     categoryId: matchedCategory.id
    //                 });

    //                 // Archive the email
    //                 // await gmail.users.messages.modify({
    //                 //     userId: "me",
    //                 //     id: email.id!,
    //                 //     requestBody: { removeLabelIds: ["INBOX"] }
    //                 // });
    //                 // console.log("✅ Archived:", email.subject);

    //             } catch (err) {
    //                 console.error("❌ Error processing email:", email.subject, err);
    //                 continue;
    //             }
    //         }
    //         console.log(`📨 Fetched ${recentEmails.length} emails for ${account.email}`)
    //     }

    return json({ update: true })
  } catch (err) {
    console.error('❌ Error processing Gmail push notification:', err)
    return json({ error: 'Bad request' }, { status: 400 })
  }
}
