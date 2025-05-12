import { json } from "@remix-run/node";
import type { LoaderFunction } from "@remix-run/node";
import { getSession } from "~/utils/session.server";
import { db } from "~/db/client";
import { emails } from "~/db/schema";
import { eq } from "drizzle-orm";

export const loader: LoaderFunction = async ({ request }) => {
  const session = await getSession(request.headers.get("Cookie"));
  const user = session.get("user");
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const userEmails = await db.query.emails.findMany({
    where: eq(emails.userId, user.id),
    orderBy: (emails, { desc }) => [desc(emails.receivedAt)],
  });

  return json({ emails: userEmails });
}; 