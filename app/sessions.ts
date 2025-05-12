import { createCookieSessionStorage } from "@remix-run/node";

// Create a session storage
export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [process.env.SESSION_SECRET || "default-secret"],
    secure: process.env.NODE_ENV === "production",
  },
});

// Helper to get the session
export async function getSession(cookieHeader: string | null) {
  return sessionStorage.getSession(cookieHeader);
}

// Helper to commit the session
export async function commitSession(session: any) {
  return sessionStorage.commitSession(session);
}

// Helper to destroy the session
export async function destroySession(session: any) {
  return sessionStorage.destroySession(session);
} 