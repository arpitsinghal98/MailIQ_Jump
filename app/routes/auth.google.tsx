// app/routes/auth.google.tsx
import { redirect } from "@remix-run/node";
import { getAuthUrl } from "~/lib/google";

export const loader = async ({ request }: { request: Request }) => {
  const url = new URL(request.url);
  const isPopup = url.searchParams.get("popup") === "true";

  const authUrl = getAuthUrl(isPopup); // pass flag to build auth URL
  return redirect(authUrl);
};
