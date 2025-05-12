import { redirect, type ActionFunctionArgs } from "@remix-run/node";
import { db } from "~/db/client";
import { categories } from "~/db/schema";
import { getSession } from "~/utils/session.server";
import { eq } from "drizzle-orm";

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const user = session.get("user");
  if (!user) return redirect("/");

  const formData = await request.formData();
  const categoryId = formData.get("categoryId")?.toString();
  const description = formData.get("description")?.toString().trim();

  if (!categoryId || !description) {
    return redirect("/dashboard");
  }

  // Update the category description
  await db
    .update(categories)
    .set({ description })
    .where(eq(categories.id, parseInt(categoryId)));

  return redirect("/dashboard");
} 