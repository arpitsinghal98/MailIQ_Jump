import { useLoaderData, useFetcher, useSearchParams } from "@remix-run/react";
import { useState, useRef, useEffect, useMemo } from "react";
import { loader } from "~/loaders/dashboardLoader";
import ActionBar from "~/components/ActionBar";
import CategoriesPanel from "~/components/CategoriesPanel";
import EmailsPanel from "~/components/EmailsPanel";
import EmailDetailsPanel from "~/components/EmailDetailsPanel";
import AddCategoryModal from "~/components/AddCategoryModal";
import { restoreWidths } from "~/utils/localStorageHelpers";
import { startResize } from "~/utils/resizeHandlers";
import toast from "react-hot-toast";
import "~/styles/customScrollbar.css";
export { loader };

export default function Dashboard() {
  const { categories: initialCategories, emails: initialEmails, accounts } = useLoaderData<typeof loader>();
  const deleteFetcher = useFetcher<{ deletedIds?: number[] }>();
  const unsubscribeFetcher = useFetcher<{ unsubscribedIds?: number[] }>();
  const moveEmailFetcher = useFetcher<{ success: boolean; error?: string }>();
  const [searchParams] = useSearchParams();
  const urlSyncJobId = searchParams.get("syncJobId");

  const [categories, setCategories] = useState(initialCategories);
  const [emails, setEmails] = useState(initialEmails);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedEmailId, setSelectedEmailId] = useState<number | null>(null);
  const [selectedEmailIds, setSelectedEmailIds] = useState<number[]>([]);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [targetCategoryId, setTargetCategoryId] = useState<number | null>(null);
  const [isMovingEmails, setIsMovingEmails] = useState(false);
  type FullEmail = {
    id: string;
    subject: string;
    from: string;
    to: string;
    date: string;
    html: string;
    attachments: {
      filename: string;
      mimeType: string;
      attachmentId: string;
    }[];
  };

  const [fullEmail, setFullEmail] = useState<FullEmail | undefined>(undefined);
  const [emailError, setEmailError] = useState<string | null>(null);

  const leftRef = useRef<HTMLDivElement>(null);
  const middleRef = useRef<HTMLDivElement>(null);
  const fetcher = useFetcher<{ fullEmail?: FullEmail; error?: string }>();
  const syncFetcher = useFetcher<{ jobId: string }>();
  const [syncJobId, setSyncJobId] = useState<string | null>(urlSyncJobId);
  const emailsFetcher = useFetcher<{ emails: typeof initialEmails }>();

  const filteredEmails = useMemo(() => {
    return selectedCategoryId
      ? emails
        .filter((e) => e.categoryId === selectedCategoryId)
        .map((e) => ({
          ...e,
          from: e.from || "",
          subject: e.subject || "",
          summary: e.summary || "",
        }))
      : emails
        .filter((e) => !e.categoryId) // Show uncategorized emails in Inbox
        .map((e) => ({
          ...e,
          from: e.from || "",
          subject: e.subject || "",
          summary: e.summary || "",
        }));
  }, [emails, selectedCategoryId]);

  useEffect(() => {
    const handler = () => {
      console.warn("🔥 PAGE REFRESH TRIGGERED");
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, []);


  useEffect(() => {
    if (fetcher.data?.fullEmail) {
      setFullEmail(fetcher.data.fullEmail);
      setEmailError(null);
    } else if (fetcher.data?.error) {
      console.error("❌ Error fetching email:", fetcher.data.error);
      setFullEmail(undefined);
      setEmailError(fetcher.data.error);
    }
  }, [fetcher.data]);

  const handleEmailClick = async (emailId: number) => {
    setSelectedEmailId(emailId);
    setSelectedEmailIds([emailId]);
    setEmailError(null);

    const selectedEmail = emails.find((e) => e.id === emailId);
    if (!selectedEmail) {
      console.error("❌ Email not found:", emailId);
      setEmailError("Email not found in local database");
      return;
    }

    const account = accounts.find((a) => a.id === selectedEmail.linkedAccountId);
    if (!account) {
      console.error("❌ Account not found for email:", selectedEmail);
      setEmailError("Gmail account not found. Please reconnect your account.");
      return;
    }

    const url = `/api/fetch-full-email?gmailId=${selectedEmail.gmailId}&accessToken=${account.accessToken}&refreshToken=${account.refreshToken}`;

    fetcher.load(url);
  };


  useEffect(() => {
    if (categories.length === 0) {
      setShowAddCategoryModal(true);
    }
  }, [categories]);

  useEffect(() => {
    restoreWidths(leftRef, middleRef);
  }, []);

  useEffect(() => {
    if (deleteFetcher.state === "idle" && deleteFetcher.data?.deletedIds) {
      const deleted = deleteFetcher.data.deletedIds;
      const updatedEmails = emails.filter((e) => !deleted.includes(e.id));
      setEmails(updatedEmails);

      // Show success toast
      toast.success(`Successfully deleted ${deleted.length} email${deleted.length > 1 ? 's' : ''}`);

      // Reset selection
      setSelectedEmailIds([]);
      setSelectedEmailId(null);
      setFullEmail(undefined);

      // If there are remaining emails in the current category, select the first one
      const remainingEmailsInCategory = selectedCategoryId
        ? updatedEmails.filter((e) => e.categoryId === selectedCategoryId)
        : updatedEmails.filter((e) => !e.categoryId);

      if (remainingEmailsInCategory.length > 0) {
        const firstEmail = remainingEmailsInCategory[0];
        handleEmailClick(firstEmail.id);
      } else {
        setSelectedCategoryId(null);
      }
    }
  }, [deleteFetcher]);
  // Update categories whenever emails change
  useEffect(() => {
    // Keep all categories but update their email counts
    const updatedCategories = initialCategories.map(category => ({
      ...category,
      emailCount: emails.filter(e => e.categoryId === category.id).length
    }));
    setCategories(updatedCategories);
  }, [emails, initialCategories]);

  useEffect(() => {
    if (unsubscribeFetcher.state === "idle" && unsubscribeFetcher.data?.unsubscribedIds) {
      const done = unsubscribeFetcher.data.unsubscribedIds;
      console.log("✅ Unsubscribed:", done);
      setSelectedEmailIds([]);
    }
  }, [unsubscribeFetcher]);

  const handleSync = () => {
    syncFetcher.submit(
      {},
      { method: "post", action: "/dashboard/sync-emails" }
    );
  };

  useEffect(() => {
    if (syncFetcher.data?.jobId) {
      setSyncJobId(syncFetcher.data.jobId);
    }
  }, [syncFetcher.data]);

  // Refresh emails when sync is in progress
  useEffect(() => {
    if (syncJobId) {
      const interval = setInterval(() => {
        emailsFetcher.load("/api/emails");
      }, 2000); // Refresh every 2 seconds
      return () => clearInterval(interval);
    }
  }, [syncJobId, emailsFetcher]);

  // Update emails when new data arrives
  useEffect(() => {
    if (emailsFetcher.data?.emails) {
      // Only update if there are actual changes
      const newEmails = emailsFetcher.data.emails;
      const hasChanges = newEmails.length !== emails.length ||
        newEmails.some((newEmail, index) => newEmail.id !== emails[index]?.id);

      if (hasChanges) {
        setEmails(newEmails);

        // If we have a selected email, make sure it's still selected
        if (selectedEmailId) {
          const emailStillExists = newEmails.some(e => e.id === selectedEmailId);
          if (!emailStillExists) {
            // If the selected email no longer exists, select the first email in the current category
            const firstEmail = selectedCategoryId
              ? newEmails.find(e => e.categoryId === selectedCategoryId)
              : newEmails.find(e => !e.categoryId);

            if (firstEmail) {
              handleEmailClick(firstEmail.id);
            } else {
              setSelectedEmailId(null);
              setSelectedEmailIds([]);
              setFullEmail(undefined);
            }
          }
        }
      }
    }
  }, [emailsFetcher.data]);

  // Set up polling interval for emails
  useEffect(() => {
    const interval = setInterval(() => {
      emailsFetcher.load("/api/emails");
    }, 2000); // Refresh every 2 seconds

    return () => clearInterval(interval);
  }, []); // Empty dependency array since we want this to run once

  // Set up SSE connection for status updates
  useEffect(() => {
    const lastEmailId = Math.max(...emails.map(e => e.id), 0);
    const eventSource = new EventSource(`/api/emails/stream?lastEmailId=${lastEmailId}`);

    eventSource.addEventListener('connected', () => {
      console.log('✅ SSE Connected');
    });

    eventSource.addEventListener('error', () => {
      console.error('❌ SSE Error');
      eventSource.close();
    });

    return () => {
      eventSource.close();
    };
  }, [emails]);

  const handleMoveToCategory = (emailIds: number[], targetCategoryId: number | null) => {
    if (isMovingEmails) return; // Prevent multiple moves
    setIsMovingEmails(true);
    setTargetCategoryId(targetCategoryId);
    moveEmailFetcher.submit(
      {
        emailIds: JSON.stringify(emailIds),
        categoryId: targetCategoryId ? targetCategoryId.toString() : null
      },
      { method: "post", action: "/dashboard/move-emails" }
    );
  };

  // Handle move email response
  useEffect(() => {
    if (moveEmailFetcher.state === "idle" && moveEmailFetcher.data && !isMovingEmails) {
      if (moveEmailFetcher.data.success) {
        // Update emails in state immediately
        setEmails(prevEmails =>
          prevEmails.map(email =>
            selectedEmailIds.includes(email.id)
              ? { ...email, categoryId: targetCategoryId }
              : email
          )
        );

        // If we're currently viewing the category we moved from, update the selection
        if (selectedCategoryId === targetCategoryId) {
          // Keep the selection if we're moving within the same category
          setSelectedEmailIds([]);
          setSelectedEmailId(null);
        } else {
          // Clear selection if we're moving to a different category
          setSelectedEmailIds([]);
          setSelectedEmailId(null);
        }

        // Show success message
        toast.success(`Successfully moved ${selectedEmailIds.length} email${selectedEmailIds.length > 1 ? 's' : ''}`);

        // Clear target
        setTargetCategoryId(null);
      } else if (moveEmailFetcher.data.error) {
        toast.error(moveEmailFetcher.data.error);
        setTargetCategoryId(null);
      }
      setIsMovingEmails(false);
    }
  }, [moveEmailFetcher, selectedEmailIds, targetCategoryId, isMovingEmails, selectedCategoryId]);

  return (
    <>
      <ActionBar
        selectedEmailIds={selectedEmailIds}
        setShowAddCategoryModal={setShowAddCategoryModal}
        onDelete={() => {
          deleteFetcher.submit(
            { emailIds: JSON.stringify(selectedEmailIds) },
            { method: "post", action: "/dashboard/delete-emails" }
          );
        }}
        onUnsubscribe={() => {
          unsubscribeFetcher.submit(
            { emailIds: JSON.stringify(selectedEmailIds) },
            { method: "post", action: "/dashboard/unsubscribe-emails" }
          );
        }}
        connectedEmailIds={accounts.map((a) => ({ id: a.id, email: a.email }))}
        onSync={handleSync}
        categories={categories}
        onMoveToCategory={handleMoveToCategory}
      />

      <div className="flex flex-1 overflow-hidden h-full">
        <CategoriesPanel
           categories={categories}
          selectedCategoryId={selectedCategoryId}
          setSelectedCategoryId={setSelectedCategoryId}
          leftRef={leftRef}
          startResize={startResize}
          syncJobId={syncJobId || undefined}
        />

        <div data-debug="email-wrapper">
          <EmailsPanel
            filteredEmails={filteredEmails}
            selectedEmailId={selectedEmailId}
            setSelectedEmailId={(emailId) => {
              if (typeof emailId === "number") {
                handleEmailClick(emailId);
              }
            }}
            selectedEmailIds={selectedEmailIds}
            setSelectedEmailIds={setSelectedEmailIds}
            middleRef={middleRef}
            startResize={startResize}
            selectedCategory={selectedCategoryId == null
              ? { name: "Inbox", description: "Congratulations! You are all sorted." }
              : categories.find((cat) => cat.id === selectedCategoryId) || { name: "Category", description: "No description available." }
            }
          />
        </div>
        <EmailDetailsPanel
          selectedEmail={fullEmail}
          loading={fetcher.state !== "idle"}
          error={emailError}
        />
      </div>

      <AddCategoryModal
        showAddCategoryModal={showAddCategoryModal}
        setShowAddCategoryModal={setShowAddCategoryModal}
      />
    </>
  );
}
