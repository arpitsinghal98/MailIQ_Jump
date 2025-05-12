import { json, type ActionFunctionArgs } from "@remix-run/node";
import { getSession } from "~/utils/session.server";
import { db } from "~/db/client";
import { emails } from "~/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const user = session.get("user");
  if (!user) {
    return json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const formData = await request.formData();
  const emailIds = JSON.parse(formData.get("emailIds") as string) as number[];
  const categoryId = formData.get("categoryId") as string | null;

  try {
    // Update the category for all selected emails
    await db
      .update(emails)
      .set({ categoryId: categoryId ? parseInt(categoryId) : null })
      .where(inArray(emails.id, emailIds));

    return json({ success: true });
  } catch (error) {
    console.error("Error moving emails:", error);
    return json(
      { success: false, error: "Failed to move emails" },
      { status: 500 }
    );
  }
} 