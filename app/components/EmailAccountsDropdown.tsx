import React from "react";

export default function EmailAccountsDropdown({
  connectedEmailIds,
}: {
  connectedEmailIds: { id: number; email: string }[];
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        <span>Connect Email</span>
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white shadow-lg rounded-lg border border-gray-200 z-50">
          <div className="p-2">
            {connectedEmailIds.length > 0 ? (
              <div>
                <div className="px-2 py-1 text-sm font-medium text-gray-500">Connected Accounts</div>
                {connectedEmailIds.map((account) => (
                  <div
                    key={account.id}
                    className="px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    {account.email}
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-2 py-1.5 text-sm text-gray-500">No connected accounts</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 