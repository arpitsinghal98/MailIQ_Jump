// app/routes/remove-emails.tsx
import { json, redirect } from "@remix-run/node";
import { db } from "~/db/client"; // Your Drizzle DB instance
import { eq } from "drizzle-orm"; // Import the eq function from Drizzle ORM
import { linkedAccounts, emails } from "~/db/schema"; // Import linkedAccounts and emails from schema

export const action = async ({ request }: { request: Request }) => {
  const formData = new URLSearchParams(await request.text());
  const emailsToRemove = formData.get("emails")?.split(",") ?? [];

  if (emailsToRemove.length === 0) {
    return json({ error: "No emails selected" }, { status: 400 });
  }

  try {
    // Start the transaction using Drizzle ORM's db.transaction
    await db.transaction(async (trx) => {
      for (const emailId of emailsToRemove) {
        await trx.delete(linkedAccounts).where(eq(linkedAccounts.id, Number(emailId)));
        // await trx.delete(linkedAccounts).where(eq(linkedAccounts.id, Number(emailId)));

        // Delete related emails where `linkedAccountId` matches the `emailId`
        await trx.delete(emails).where(eq(emails.linkedAccountId, Number(emailId)));
        

        
      }
    });

    return redirect("/"); // Redirect after successful removal
  } catch (error) {
    console.error("Error removing emails:", error);
    return json({ error: "Failed to remove emails" }, { status: 500 });
  }
};
