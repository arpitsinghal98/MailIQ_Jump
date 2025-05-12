import { useEffect, useRef, useCallback } from "react";
import { useFetcher } from "@remix-run/react";
import { emails } from "~/db/schema";
import type { SerializeFrom } from "@remix-run/node";

type EmailType = SerializeFrom<typeof emails.$inferSelect> & {
  receivedAt: string | null;
};

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds
const POLL_INTERVAL = 30000; // 30 seconds

type FetcherData = {
  emails: EmailType[];
  error?: string;
};

export function useEmailPolling(
  onNewEmails: (newEmails: EmailType[]) => void,
  interval = POLL_INTERVAL
) {
  const fetcher = useFetcher<FetcherData>();
  const lastEmailIds = useRef<Set<string>>(new Set());
  const retryCount = useRef(0);
  const isPolling = useRef(true);

  const poll = useCallback(() => {
    fetcher.load("/api/emails");
  }, [fetcher]);

  // Handle polling errors and retries
  useEffect(() => {
    if (fetcher.data?.error) {
      if (retryCount.current < MAX_RETRIES) {
        retryCount.current += 1;
        setTimeout(poll, RETRY_DELAY);
      } else {
        isPolling.current = false;
      }
    } else {
      retryCount.current = 0;
    }
  }, [fetcher.data?.error, poll]);

  // Setup polling interval
  useEffect(() => {
    poll(); // Initial poll
    const id = setInterval(poll, interval);
    
    return () => {
      isPolling.current = false;
      clearInterval(id);
    };
  }, [interval, poll]);

  // Handle new emails
  useEffect(() => {
    if (fetcher.data?.emails) {
      const newEmails = fetcher.data.emails.filter(
        email => !lastEmailIds.current.has(email.gmailId)
      );
      
      if (newEmails.length > 0) {
        onNewEmails(fetcher.data.emails);
        fetcher.data.emails.forEach(email => {
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