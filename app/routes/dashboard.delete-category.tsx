import { redirect, type ActionFunctionArgs } from "@remix-run/node";
import { db } from "~/db/client";
import { categories, emails } from "~/db/schema";
import { getSession } from "~/utils/session.server";
import { eq } from "drizzle-orm";

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const user = session.get("user");
  if (!user) return redirect("/");

  const formData = await request.formData();
  const categoryId = formData.get("categoryId")?.toString();

  if (!categoryId) {
    return redirect("/dashboard");
  }

  // First update all emails in this category to have null category
  await db
    .update(emails)
    .set({ categoryId: null })
    .where(eq(emails.categoryId, parseInt(categoryId)));

  // Then delete the category
  await db
    .delete(categories)
    .where(eq(categories.id, parseInt(categoryId)));

  return redirect("/dashboard");
} 