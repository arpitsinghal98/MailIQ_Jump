// app/routes/dashboard/delete-emails.ts
import { json, type ActionFunctionArgs } from "@remix-run/node";
import { getSession } from "~/utils/session.server";
import { deleteEmailsByIds } from "~/utils/emailActions";

export const action = async ({ request }: ActionFunctionArgs) => {

  const session = await getSession(request.headers.get("Cookie"));
  const user = session.get("user");

  if (!user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const rawIds = formData.get("emailIds");

  let emailIds: number[] = [];

  try {
    emailIds = JSON.parse(rawIds as string);
    if (!Array.isArray(emailIds) || !emailIds.every((id) => typeof id === "number")) {
      throw new Error();
    }
  } catch {
    return json({ error: "Invalid email ID format" }, { status: 400 });
  }

  const result = await deleteEmailsByIds(user.id, emailIds);

  return json({ success: true, deletedIds: result.deletedIds });
};