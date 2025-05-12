// app/routes/dashboard.delete-linked-account.tsx
import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { getSession } from "~/utils/session.server";
import { deleteEmailsByAccount } from "~/utils/emailActions";

// This is added to prevent 404 on GET request
export async function loader({ request }: LoaderFunctionArgs) {
  return json({ message: "POST only. This route deletes linked account emails." });
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const session = await getSession(request.headers.get("Cookie"));
  const user = session.get("user");

  if (!user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const raw = formData.get("accountIds");

  let accountIds: number[] = [];

  try {
    accountIds = JSON.parse(raw as string);

    if (!Array.isArray(accountIds) || !accountIds.every((id) => typeof id === "number")) {
      throw new Error("Invalid format");
    }
  } catch {
    return json({ error: "Invalid format: expected JSON array of numbers" }, { status: 400 });
  }

  if (accountIds.length === 0) {
    return json({ error: "No accounts selected" }, { status: 400 });
  }

  const result = await deleteEmailsByAccount(user.id, accountIds);

  return json({
    success: true,
    deletedEmailIds: result.deletedEmailIds,
    remainingCategories: result.remainingCategories,
    removedAccountIds: accountIds,
  });
};

// Prevent UI crash if user visits route directly
export default function DeleteLinkedAccountFallback() {
  return <p>This route handles only POST requests to remove linked Gmail accounts.</p>;
}
