import { useState, useEffect, useRef } from "react";
import { useFetcher } from "@remix-run/react";
import toast from "react-hot-toast";

export default function EmailManagementDropdown({
  connectedEmailIds = [],
}: {
  connectedEmailIds?: { id: number; email: string }[];
}) {
  const [showEmailDropdown, setShowEmailDropdown] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inlineToast, setInlineToast] = useState<string | null>(null);
  const fetcher = useFetcher();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => setShowEmailDropdown((prev) => !prev);

  const toggleSelection = (emailId: number) => {
    const updated = new Set(selectedEmails);

    if (updated.has(emailId)) {
      updated.delete(emailId);
    } else {
      if (updated.size >= connectedEmailIds.length - 1) {
        // Show inline toast instead of top-right
        setInlineToast("At least 1 email must remain connected.");
        setTimeout(() => setInlineToast(null), 3000);
        return;
      }
      updated.add(emailId);
    }

    setSelectedEmails(updated);
  };

  const handleRemoveEmails = async () => {
    if (selectedEmails.size === 0) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("emailIds", JSON.stringify(Array.from(selectedEmails)));
      formData.append("accountIds", JSON.stringify(Array.from(selectedEmails)));

      fetcher.submit(formData, {
        method: "POST",
        action: "/dashboard/delete-linked-account",
      });

      toast.success("Emails deleted successfully");
      window.location.href = "/dashboard";
    } catch (err) {
      toast.error("Failed to delete selected emails.");
      setError("Failed to remove selected emails.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowEmailDropdown(false);
        setInlineToast(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={toggleDropdown}
        className="text-black hover:bg-gray-100 rounded-full p-2 transition duration-200"
        aria-label="Manage connected emails"
      >
        &#x22EE;
      </button>

      {showEmailDropdown && (
        <div className="absolute right-0 mt-2 w-64 bg-black shadow-lg rounded-xl border border-gray-700 z-50">
          <div className="p-4 space-y-3 text-white">
            <h2 className="font-semibold text-sm">Manage Emails</h2>

            {connectedEmailIds.length === 0 ? (
              <p className="text-sm text-gray-400">No connected emails</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {connectedEmailIds.map((email) => (
                  <label
                    key={email.id}
                    className="flex items-center gap-2 text-sm hover:bg-gray-800 p-1 rounded-md cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEmails.has(email.id)}
                      onChange={() => toggleSelection(email.id)}
                      className="accent-red-500"
                    />
                    <span className="break-all">{email.email}</span>
                  </label>
                ))}
              </div>
            )}

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              onClick={handleRemoveEmails}
              disabled={selectedEmails.size === 0 || loading}
              className={`w-full rounded-lg px-4 py-2 text-sm font-medium text-white transition ${
                selectedEmails.size === 0 || loading
                  ? "bg-red-300 cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {loading ? "Removing..." : "Remove Selected"}
            </button>

            {/* Inline toast below button */}
            {inlineToast && (
              <div className="mt-2 bg-black text-white text-xs font-bold px-4 py-2 rounded shadow-md">
                At least <span className="text-red-500">1</span> email must remain connected.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
