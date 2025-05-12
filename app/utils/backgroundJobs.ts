import { db } from "~/db/client";
import { categories, emails, linkedAccounts } from "~/db/schema";
import { eq } from "drizzle-orm";
import { fetchRecentEmails } from "~/lib/fetch-emails";
import { analyzeEmail } from "~/utils/ai";
import { getGmailClient } from "~/lib/gmail.server";

// Store active jobs
const activeJobs = new Map<string, {
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  total: number;
  error?: string;
}>();

export function getJobStatus(jobId: string) {
  return activeJobs.get(jobId);
}

export function startJob(jobId: string) {
  activeJobs.set(jobId, {
    status: 'processing',
    progress: 0,
    total: 0
  });
}

export function updateJobProgress(jobId: string, progress: number, total: number) {
  const job = activeJobs.get(jobId);
  if (job) {
    job.progress = progress;
    job.total = total;
  }
}

export function completeJob(jobId: string) {
  const job = activeJobs.get(jobId);
  if (job) {
    job.status = 'completed';
  }
}

export function failJob(jobId: string, error: string) {
  const job = activeJobs.get(jobId);
  if (job) {
    job.status = 'failed';
    job.error = error;
  }
}

export async function startCategorySyncJob(userId: number, categoryId?: number) {
  const jobId = `category-sync-${userId}-${categoryId || 'all'}-${Date.now()}`;
  startJob(jobId);
  
  // Start processing in background
  processCategorySync(userId, categoryId, jobId).catch(error => {
    console.error('Background job failed:', error);
    failJob(jobId, error.message);
  });

  return jobId;
}

async function processCategorySync(userId: number, categoryId: number | undefined, jobId: string) {
  try {
    console.log("\n=== Starting Category Sync ===");
    console.log("User ID:", userId);
    console.log("Category ID:", categoryId || "All categories");
    
    // Fetch all Gmail accounts linked to this user
    const accounts = await db.query.linkedAccounts.findMany({
      where: eq(linkedAccounts.userId, userId),
    });

    console.log(`Found ${accounts.length} linked accounts:`, accounts.map(a => a.email).join(", "));

    // Get all categories including the new one
    const userCategories = await db.query.categories.findMany({
      where: eq(categories.userId, userId),
    });

    console.log(`Found ${userCategories.length} categories:`, userCategories.map(c => c.name).join(", "));

    let totalProcessed = 0;
    let totalEmails = 0;

    // First count total emails to process
    for (const account of accounts) {
      if (!account.accessToken || !account.refreshToken) {
        console.warn(`⚠️ Skipping ${account.email}: missing tokens`);
        continue;
      }
      console.log(`\nCounting emails for ${account.email}...`);
      const recentEmails = await fetchRecentEmails(account.accessToken, account.refreshToken, 5);
      totalEmails += recentEmails.length;
      console.log(`Found ${recentEmails.length} emails`);
    }

    console.log(`\nTotal emails to process: ${totalEmails}`);
    updateJobProgress(jobId, 0, totalEmails);

    // Process each account
    for (const account of accounts) {
      if (!account.accessToken || !account.refreshToken) {
        console.warn(`⚠️ Skipping ${account.email}: missing tokens`);
        continue;
      }

      console.log(`\n🔄 Processing account: ${account.email}`);
      const gmail = getGmailClient(account.accessToken, account.refreshToken);
      const recentEmails = await fetchRecentEmails(account.accessToken, account.refreshToken, 5);

      for (const email of recentEmails) {
        try {
          console.log(`\n📧 Processing email: ${email.subject}`);
          console.log("From:", email.from);
          console.log("HTML length:", email.html.length);
          
          // Check if email already exists
          const existingEmail = await db.query.emails.findFirst({
            where: eq(emails.gmailId, email.id!),
          });

          if (existingEmail) {
            console.log(`⏭️ Skipping existing email: ${email.subject}`);
            totalProcessed++;
            updateJobProgress(jobId, totalProcessed, totalEmails);
            continue;
          }

          let matchedCategoryName: string | null = null;
          let aisummary: string | null = null;
          let aiunsubscribeurl: string | null = null;

          try {
            console.log("🤖 Analyzing email with AI...");
            const analysis = await analyzeEmail(email.html, userCategories);
            matchedCategoryName = analysis.category;
            aisummary = analysis.summary;
            aiunsubscribeurl = analysis.unsubscribeUrl;
            console.log("Category:", matchedCategoryName);
            console.log("Summary:", aisummary);
            console.log("Unsubscribe URL:", aiunsubscribeurl);
          } catch (error) {
            console.error("⚠️ Error analyzing email:", email.subject, error);
            // Continue with null values for AI analysis
          }

          // If categoryId is specified, only process emails for that category
          if (categoryId && matchedCategoryName) {
            const matchedCategory = userCategories.find(c => c.name.toLowerCase().trim() === matchedCategoryName.toLowerCase().trim());
            if (matchedCategory?.id !== categoryId) {
              console.log(`⏭️ Skipping - category ${matchedCategoryName} doesn't match requested category`);
              totalProcessed++;
              updateJobProgress(jobId, totalProcessed, totalEmails);
              continue;
            }
          }

          // Save the email regardless of category match
          console.log("💾 Saving email to database...");
          await db.insert(emails).values({
            userId,
            linkedAccountId: account.id,
            categoryId: matchedCategoryName && matchedCategoryName !== "None" 
              ? userCategories.find(c => c.name.toLowerCase().trim() === matchedCategoryName.toLowerCase().trim())?.id 
              : null,
            gmailId: email.id!,
            subject: email.subject,
            from: email.from,
            rawHtml: aiunsubscribeurl || null,
            summary: aisummary || "Error analyzing email",
            receivedAt: new Date(),
          });
          console.log("✅ Email saved successfully");

          // Only archive if it matched a category
          if (matchedCategoryName && matchedCategoryName !== "None") {
            try {
              console.log("📦 Archiving email...");
              await gmail.users.messages.modify({
                userId: "me",
                id: email.id!,
                requestBody: { removeLabelIds: ["INBOX"] },
              });
              console.log("✅ Email archived");
            } catch (err) {
              console.error("⚠️ Failed to archive:", email.subject, err);
            }
          }
        } catch (error) {
          console.error("⚠️ Error processing email:", email.subject, error);
          // Try to save the email without AI analysis
          try {
            console.log("💾 Attempting to save email without AI analysis...");
            await db.insert(emails).values({
              userId,
              linkedAccountId: account.id,
              categoryId: null,
              gmailId: email.id!,
              subject: email.subject,
              from: email.from,
              rawHtml: email.html,
              summary: "Error analyzing email",
              receivedAt: new Date(),
            });
            console.log("✅ Email saved without AI analysis");
          } catch (dbError) {
            console.error("⚠️ Failed to save email:", email.subject, dbError);
          }
        }

        // Update progress
        totalProcessed++;
        updateJobProgress(jobId, totalProcessed, totalEmails);
      }
    }

    console.log("\n=== Category Sync Complete ===");
    console.log(`Processed ${totalProcessed} emails`);
    console.log("===========================\n");
    
    // Mark job as completed
    completeJob(jobId);

  } catch (error) {
    console.error('Error in background job:', error);
    failJob(jobId, error instanceof Error ? error.message : 'Unknown error');
  }
} 