// ✅ app/routes/api.fetch-full-email.ts
import { json, LoaderFunctionArgs } from "@remix-run/node";
import { fetchSingleEmailById } from "~/lib/fetch-emails";
import { GaxiosError } from "gaxios";

export async function loader({ request }: LoaderFunctionArgs) {

  const url = new URL(request.url);
  const gmailId = url.searchParams.get("gmailId");
  const accessToken = url.searchParams.get("accessToken");
  const refreshToken = url.searchParams.get("refreshToken");

  if (!gmailId || !accessToken || !refreshToken) {
    console.error("❌ Missing required parameters");
    return json({ error: "Missing params" }, { status: 400 });
  }

  try {
    const fullEmail = await fetchSingleEmailById(gmailId, accessToken, refreshToken);
    return json({ fullEmail });
  } catch (error) {
    console.error("Error fetching email:", error);
    
    if (error instanceof GaxiosError) {
      if (error.response?.status === 404) {
        return json({ error: "Email not found. It may have been deleted or moved." }, { status: 404 });
      }
      if (error.response?.status === 401) {
        return json({ error: "Authentication failed. Please reconnect your Gmail account." }, { status: 401 });
      }
    }
    
    return json({ error: "Failed to fetch email. Please try again." }, { status: 500 });
  }
}
