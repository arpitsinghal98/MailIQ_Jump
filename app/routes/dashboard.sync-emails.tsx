import { json, type ActionFunctionArgs } from "@remix-run/node";
import { getSession } from "~/utils/session.server";
import { startCategorySyncJob } from "~/utils/backgroundJobs";

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const user = session.get("user");
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  // Start background sync for all categories
  const jobId = await startCategorySyncJob(user.id);

  return json({ jobId });
} 