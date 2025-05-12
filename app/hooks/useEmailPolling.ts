import { useEffect, useRef } from "react";
import { useFetcher } from "@remix-run/react";
import { emails } from "~/db/schema";
import type { SerializeFrom } from "@remix-run/node";

type EmailType = SerializeFrom<typeof emails.$inferSelect> & {
  receivedAt: string | null;
};

// Increase polling interval to 1 minute to avoid rate limits
const POLL_INTERVAL = 60000; // 1 minute
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

type FetcherData = {
  emails: EmailType[];
  error?: string;
};

export function useEmailPolling(
  onNewEmails: (newEmails: EmailType[]) => void
) {
  const fetcher = useFetcher<FetcherData>();
  const lastEmailIds = useRef<Set<string>>(new Set());
  const retryCount = useRef<number>(0);
  const isPolling = useRef<boolean>(true);
  const lastPollTime = useRef<number>(0);

  const poll = async () => {
    // Check if enough time has passed since last poll
    const now = Date.now();
    if (now - lastPollTime.current < POLL_INTERVAL) {
      return;
    }

    try {
      fetcher.load("/api/emails/sync");
      lastPollTime.current = now;
      retryCount.current = 0; // Reset retry count on successful poll
    } catch (error) {
      console.error("Error polling for emails:", error);
      if (retryCount.current < MAX_RETRIES) {
        retryCount.current++;
        // Exponential backoff: 5s, 10s, 20s
        const backoffDelay = RETRY_DELAY * Math.pow(2, retryCount.current - 1);
        setTimeout(poll, backoffDelay);
      } else {
        console.error("Max retries reached, stopping polling");
        isPolling.current = false;
      }
    }
  };

  useEffect(() => {
    // Initial poll
    poll();

    // Set up polling interval
    const intervalId = setInterval(poll, POLL_INTERVAL);

    return () => {
      clearInterval(intervalId);
      isPolling.current = false;
    };
  }, []);

  useEffect(() => {
    if (fetcher.data?.emails) {
      const newEmails = fetcher.data.emails.filter(
        (email) => !lastEmailIds.current.has(email.gmailId)
      );

      if (newEmails.length > 0) {
        onNewEmails(newEmails);
        newEmails.forEach((email) => {
          lastEmailIds.current.add(email.gmailId);
        });
      }
    }
  }, [fetcher.data, onNewEmails]);

  // Expose a way to manually trigger a poll
  return {
    poll,
    isPolling: isPolling.current
  };
} 