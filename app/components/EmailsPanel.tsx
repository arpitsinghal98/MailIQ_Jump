import React from "react";
import { UserIcon, EnvelopeIcon, SparklesIcon } from "@heroicons/react/24/solid";

type Email = {
  id: number;
  from: string;
  subject: string;
  summary: string;
};

export default function EmailsPanel({
  filteredEmails,
  selectedEmailId,
  setSelectedEmailId,
  selectedEmailIds,
  setSelectedEmailIds,
  middleRef,
  startResize,
  selectedCategory,
}: {
  filteredEmails: Email[];
  selectedEmailId: number | null;
  setSelectedEmailId: React.Dispatch<React.SetStateAction<number | null>>;
  selectedEmailIds: number[];
  setSelectedEmailIds: React.Dispatch<React.SetStateAction<number[]>>;
  middleRef: React.RefObject<HTMLDivElement>;
  startResize: (ref: React.RefObject<HTMLDivElement>, key: string) => (e: React.MouseEvent) => void;
  selectedCategory: { name: string; description: string };
}) {
  const allSelected =
    filteredEmails.length > 0 &&
    filteredEmails.every((email) => selectedEmailIds.includes(email.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedEmailIds([]);
    } else {
      setSelectedEmailIds(filteredEmails.map((email) => email.id));
    }
  };

  const handleEmailClick = (id: number) => {
    setSelectedEmailId(id);
    setSelectedEmailIds([id]);
  };

  const toggleSelect = (id: number) => {
    setSelectedEmailIds((prev) =>
      prev.includes(id)
        ? prev.filter((eid) => eid !== id)
        : [...prev, id]
    );
  };

  function getSenderName(from: string): string {
    const match = from.match(/^(.*?)\s*<(.+?)>$/);
    if (match) {
      const name = match[1].trim();
      return name || match[2];
    }
    return from;
  }

  return (
    <>
      <section
        ref={middleRef}
        className="min-w-[400px] max-w-[450px] border-r border-gray-200 bg-gray-100 h-[calc(100vh-4rem)] w-full flex flex-col overflow-hidden"
      >
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Emails</h2>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="w-5 h-5"
              />
              Select All
            </label>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-custom">
          <div className="h-full">
            {filteredEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-500">
                <h3 className="text-xl font-semibold mb-2">Your {selectedCategory.name} tab is empty.</h3>
                <p className="text-base text-gray-500 max-w-md">{selectedCategory.description}</p>
              </div>
            ) : (
              <ul className="p-4 space-y-3 pb-24">
                {filteredEmails.map((email) => (
                  <li key={email.id} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={selectedEmailIds.includes(email.id)}
                      onChange={() => toggleSelect(email.id)}
                      className="mt-2 w-6 h-6"
                      aria-label={`Select ${email.subject}`}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        handleEmailClick(email.id);
                      }}
                      className={`flex-1 text-left p-3 border rounded  ${
                        selectedEmailId === email.id
                          ? "bg-blue-50 border-blue-300"
                          : "bg-gray-200 hover:bg-blue-50 border-blue-300"
                      }`}
                    >
                      <div className="flex items-center text-sm text-gray-500 mb-1">
                        <UserIcon className="w-4 h-4 min-w-4 mr-1" />
                        {getSenderName(email.from)}
                      </div>
                      <div className="flex items-center text-[0.8rem] font-medium text-black mb-1">
                        <EnvelopeIcon className="w-4 h-4 min-w-4 mr-1" />
                        {email.subject}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <SparklesIcon className="w-4 h-4 min-w-4 mr-1 text-yellow-500" />
                        <span className="font-semibold mr-1"></span> {email.summary}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <button
        onMouseDown={startResize(middleRef, "middleWidth")}
        className="w-2 bg-gray-300 cursor-col-resize"
        aria-label="Resize middle panel"
      />
    </>
  );
}
