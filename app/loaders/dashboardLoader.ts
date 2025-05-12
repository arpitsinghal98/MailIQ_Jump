import type { LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { db } from "~/db/client";
import { categories, emails, linkedAccounts } from "~/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "~/utils/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const user = session.get("user");
  if (!user) return redirect("/");

  const userCategories = await db.query.categories.findMany({
    where: eq(categories.userId, user.id),
  });
  const userEmails = await db.query.emails.findMany({
    where: eq(emails.userId, user.id),
  });
  const accounts = await db.query.linkedAccounts.findMany({
    where: eq(linkedAccounts.userId, user.id),
  });

  return json({ categories: userCategories, emails: userEmails, accounts, user });
}