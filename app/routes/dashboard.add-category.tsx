import { redirect, type ActionFunctionArgs } from "@remix-run/node";
import { db } from "~/db/client";
import { categories } from "~/db/schema";
import { getSession } from "~/utils/session.server";

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const user = session.get("user");
  if (!user) return redirect("/");

  const formData = await request.formData();
  const name = formData.get("name")?.toString().trim();
  const description = formData.get("description")?.toString().trim();

  if (!name || !description) {
    return redirect("/dashboard"); // could add error handling
  }

  // Create the new category
  await db.insert(categories).values({
    name,
    description,
    userId: user.id,
  });

  // Redirect back to dashboard without starting sync
  return redirect("/dashboard");
}
