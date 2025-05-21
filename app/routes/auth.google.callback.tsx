import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { oauth2Client } from "~/lib/google";
import { google } from "googleapis";
import { db } from "~/db/client";
import { users, linkedAccounts } from "~/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession, commitSession } from "~/utils/session.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code) throw new Response("No code", { status: 400 });

    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.refresh_token) {
      throw new Response("No refresh token received", { status: 400 });
    }
    
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email!;
    const gmailId = userInfo.data.id!;
    const name = userInfo.data.name || "Unknown";

    const session = await getSession(request.headers.get("Cookie"));
    const sessionUser = session.get("user");

    // --------------------------
    // Case 1: User is logged in and linking a new Gmail account
    // --------------------------
    if (sessionUser) {
      const alreadyLinked = await db.query.linkedAccounts.findFirst({
        where: and(
          eq(linkedAccounts.userId, sessionUser.id),
          eq(linkedAccounts.gmailId, gmailId)
        ),
      });

      if (alreadyLinked) {
        // Update existing tokens
        await db.update(linkedAccounts)
          .set({
            accessToken: tokens.access_token!,
            refreshToken: tokens.refresh_token!,
          })
          .where(eq(linkedAccounts.id, alreadyLinked.id));
      } else {
        await db.insert(linkedAccounts).values({
          userId: sessionUser.id,
          gmailId,
          email,
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token!,
        });
      }

      // Update user tokens as well
      await db.update(users)
        .set({
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token!,
        })
        .where(eq(users.id, sessionUser.id));

      if (state === "popup") {
        return new Response(`
          <html><body>
          <script>
            window.opener.postMessage("account-linked", window.origin);
            window.close();
          </script>
          </body></html>
        `, {
          headers: { "Content-Type": "text/html" },
        });
      }

      return redirect("/dashboard");
    }

    // --------------------------
    // Case 2: Logging in with an already-linked Gmail
    // --------------------------
    const linked = await db.query.linkedAccounts.findFirst({
      where: eq(linkedAccounts.gmailId, gmailId),
    });

    if (linked) {
      // Update the linked account tokens
      await db.update(linkedAccounts)
        .set({
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token!,
        })
        .where(eq(linkedAccounts.id, linked.id));

      // Try to load the user the linked account points to
      let user = await db.query.users.findFirst({
        where: eq(users.id, linked.userId),
      });

      // If that user doesn't exist anymore (edge case), create them again
      if (!user) {
        const [createdUser] = await db
          .insert(users)
          .values({
            name,
            googleId: gmailId,
            email,
            accessToken: tokens.access_token!,
            refreshToken: tokens.refresh_token!,
          })
          .returning();

        if (!createdUser) throw new Response("User creation failed", { status: 500 });
        user = createdUser;
      } else {
        // Update existing user tokens
        await db.update(users)
          .set({
            accessToken: tokens.access_token!,
            refreshToken: tokens.refresh_token!,
          })
          .where(eq(users.id, user.id));
      }

      session.set("user", {
        id: user.id,
        name: user.name,
        googleId: user.googleId,
        email: user.email,
      });

      if (state === "popup") {
        return new Response(`
          <html><body>
          <script>
            window.opener.postMessage("account-linked", window.origin);
            window.close();
          </script>
          </body></html>
        `, {
          headers: {
            "Content-Type": "text/html",
            "Set-Cookie": await commitSession(session),
          },
        });
      }

      return redirect("/dashboard", {
        headers: {
          "Set-Cookie": await commitSession(session),
        },
      });
    }

    // --------------------------
    // Case 3: Completely new user (not in users, not in linked accounts)
    // --------------------------
    const [createdUser] = await db
      .insert(users)
      .values({
        name,
        googleId: gmailId,
        email,
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token!,
      })
      .returning();

    if (!createdUser) throw new Response("User creation failed", { status: 500 });

    await db.insert(linkedAccounts).values({
      userId: createdUser.id,
      gmailId,
      email,
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token!,
    });

    session.set("user", {
      id: createdUser.id,
      name: createdUser.name,
      googleId: createdUser.googleId,
      email: createdUser.email,
    });

    if (state === "popup") {
      return new Response(`
        <html><body>
        <script>
          window.opener.postMessage("account-linked", window.origin);
          window.close();
        </script>
        </body></html>
      `, {
        headers: {
          "Content-Type": "text/html",
          "Set-Cookie": await commitSession(session),
        },
      });
    }

    return redirect("/dashboard", {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  } catch (error) {
    console.error("Error in Google callback:", error);
    throw new Response("Authentication failed", { status: 500 });
  }
};