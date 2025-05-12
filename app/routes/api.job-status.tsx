import { json } from "@remix-run/node";
import type { LoaderFunction } from "@remix-run/node";
import { getJobStatus } from "~/utils/backgroundJobs";

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const jobId = url.searchParams.get("jobId");

  if (!jobId) {
    return json({ error: "Job ID is required" }, { status: 400 });
  }

  const status = await getJobStatus(jobId);
  return json({ status });
}; 