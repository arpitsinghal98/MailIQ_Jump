// import { json } from "@remix-run/node";
// import { getSession } from "~/utils/session.server";
// import { db } from "~/db/client";
// import { emails } from "~/db/schema";
// import { inArray } from "drizzle-orm";
// import { extractUnsubscribeLink } from "~/utils/unsubscribe/extractLink";
// import { performUnsubscribe } from "~/utils/unsubscribe/performUnsubscribe";

// export const action = async ({ request }: { request: Request }) => {
//     console.log("Unsubscribe action triggered");

//     // Check for session and user
//     const session = await getSession(request.headers.get("Cookie"));
//     const user = session.get("user");

//     if (!user) {
//         console.log("No user found in session. Unauthorized request.");
//         return json({ error: "Unauthorized" }, { status: 401 });
//     }

//     // Get form data (emailIds)
//     const formData = await request.formData();
//     const rawIds = formData.get("emailIds");
//     const emailIds = rawIds ? JSON.parse(rawIds as string) : [];
//     console.log("Received emailIds:", emailIds);

//     // Check if the emailIds array is valid
//     if (!Array.isArray(emailIds) || !emailIds.length) {
//         console.log("No email IDs provided or empty array.");
//         return json({ error: "No email IDs provided" }, { status: 400 });
//     }

//     // Fetch selected emails from the database
//     console.log("Fetching emails from DB...");
//     const selectedEmails = await db.query.emails.findMany({
//         where: inArray(emails.id, emailIds),
//     });

//     if (!selectedEmails.length) {
//         console.log("No emails found in the database matching the provided IDs.");
//     }

//     // Process each email for unsubscribe
//     const results: { id: number; success: boolean; reason?: string }[] = [];

//     for (const email of selectedEmails) {
//         console.log("⏳ Processing email:", email.subject);
//         const link = email.rawHtml ? extractUnsubscribeLink(email.rawHtml) : null;
//         console.log("🔗 Unsubscribe link found:", link);

//         if (!link) {
//             results.push({ id: email.id, success: false, reason: "No unsubscribe link found" });
//             continue;
//         }

//         const unsubscribed = await performUnsubscribe(link);
//         console.log("✅ Unsubscribed:", unsubscribed);

//         results.push({
//             id: email.id,
//             success: unsubscribed,
//             reason: unsubscribed ? undefined : "Failed to unsubscribe",
//         });
//     }


//     // Returning the results of unsubscribe process
//     console.log("Returning unsubscribe results:", results);
//     return json({ results });
// };
import { json } from "@remix-run/node";
import { getSession } from "~/utils/session.server";
import { db } from "~/db/client";
import { emails } from "~/db/schema";
import { inArray } from "drizzle-orm";

import { performUnsubscribe } from "~/utils/unsubscribe/performUnsubscribe";

export const action = async ({ request }: { request: Request }) => {
  console.log("📨 Unsubscribe action triggered");

  // 1. Check session
  const session = await getSession(request.headers.get("Cookie"));
  const user = session.get("user");

  if (!user) {
    console.warn("Unauthorized request");
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse email IDs
  const formData = await request.formData();
  const rawIds = formData.get("emailIds");
  const emailIds = rawIds ? JSON.parse(rawIds as string) : [];

  if (!Array.isArray(emailIds) || emailIds.length === 0) {
    return json({ error: "No email IDs provided" }, { status: 400 });
  }

  // 3. Query selected emails
  const selectedEmails = await db.query.emails.findMany({
    where: inArray(emails.id, emailIds),
  });

  if (!selectedEmails.length) {
    console.warn("No matching emails found in DB.");
  }

  // 4. Loop through and attempt unsubscribe
  const results: { id: number; success: boolean; reason?: string }[] = [];

  for (const email of selectedEmails) {
    const link = email.rawHtml;

    console.log("🔗 Email:", email.subject);
    console.log("➡️ Unsubscribe Link:", link);

    if (!link) {
      results.push({ id: email.id, success: false, reason: "No unsubscribe link found" });
      continue;
    }

    try {
      const unsubscribed = await performUnsubscribe(link);
      results.push({
        id: email.id,
        success: !!unsubscribed,
        reason: unsubscribed ? undefined : "Unsubscribe failed (form/captcha/AI issue)",
      });
    } catch (error) {
      console.error(`❌ Error unsubscribing ${email.subject}:`, error);
      results.push({
        id: email.id,
        success: false,
        reason: "Unexpected error during unsubscribe",
      });
    }
  }

  // 5. Return results to front-end
  console.log("📤 Returning results:", results);
  return json({ results });
};
