// import React from "react";
// import EmailManagementDropdown from "~/components/EmailManagementDropdown";

// export default function ActionBar({
//   selectedEmailIds,
//   setShowAddCategoryModal,
//   onDelete,
//   onUnsubscribe,
//   connectedEmailIds,
// }: {
//   selectedEmailIds: number[];
//   setShowAddCategoryModal: React.Dispatch<React.SetStateAction<boolean>>;
//   onDelete: () => void;
//   onUnsubscribe: () => void;
//   connectedEmailIds: { id: number; email: string }[];
// }) {
//   const hasSelected = selectedEmailIds.length > 0;

//   return (
//     <div className="border-b border-gray-200 px-6 py-0.4 bg-white flex justify-between items-center">
//       <h1 className="text-base font-semibold text-gray-800"></h1>
//       <div className="flex flex-wrap gap-5 items-center text-sm font-medium">
//         <button
//           onClick={() => setShowAddCategoryModal(true)}
//           className="text-black hover:text-yellow-500 transition"
//         >
//           + Category
//         </button>

//         <button
//           onClick={() => {
//             if (!hasSelected) return;
//             const confirmed = window.confirm(`Delete ${selectedEmailIds.length} email(s)?`);
//             if (confirmed) onDelete();
//           }}
//           disabled={!hasSelected}
//           className={`transition ${
//             hasSelected
//               ? "text-black hover:text-yellow-500"
//               : "text-gray-400 cursor-not-allowed"
//           }`}
//         >
//           Delete
//         </button>

//         <button
//           onClick={() => {
//             if (!hasSelected) return;
//             const confirmed = window.confirm(`Unsubscribe ${selectedEmailIds.length} email(s)?`);
//             if (confirmed) onUnsubscribe();
//           }}
//           disabled={!hasSelected}
//           className={`transition ${
//             hasSelected
//               ? "text-black hover:text-red-500"
//               : "text-gray-400 cursor-not-allowed"
//           }`}
//         >
//           Unsubscribe
//         </button>

//         <EmailManagementDropdown connectedEmailIds={connectedEmailIds} />
//       </div>
//     </div>
//   );
// }

import EmailAccountsDropdown from "~/components/EmailAccountsDropdown";
import { useState } from "react";

export default function ActionBar({
  selectedEmailIds,
  setShowAddCategoryModal,
  onDelete,
  onUnsubscribe,
  connectedEmailIds,
  onSync,
  categories,
  onMoveToCategory,
  emails,
}: {
  selectedEmailIds: number[];
  setShowAddCategoryModal: (show: boolean) => void;
  onDelete: () => void;
  onUnsubscribe: () => void;
  connectedEmailIds: { id: number; email: string }[];
  onSync: () => void;
  categories: { id: number; name: string }[];
  onMoveToCategory: (emailIds: number[], categoryId: number | null) => void;
  emails: { id: number; categoryId: number | null }[];
}) {
  const hasSelected = selectedEmailIds.length > 0;
  const [isMoving, setIsMoving] = useState(false);

  const handleAddAccountPopup = () => {
    window.open(
      "/auth/google?popup=true",
      "_blank",
      "width=500,height=600"
    );

    const listener = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data === "account-linked") {
        window.removeEventListener("message", listener);
        window.location.reload();
      }
    };

    window.addEventListener("message", listener);
  };

  return (
    <div className="bg-white border-b border-gray-200 p-3 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <button
          onClick={() => setShowAddCategoryModal(true)}
          className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          + Category
        </button>

        <button
          onClick={onSync}
          className="px-3 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600"
        >
          Sync Emails
        </button>
      </div>
      <div className="flex items-center space-x-3">
        {selectedEmailIds.length > 0 && (
          <>
            <div className="relative">
              <select
                disabled={isMoving}
                onChange={async (e) => {
                  const categoryId = parseInt(e.target.value);
                  const targetCategory = categories.find(cat => cat.id === categoryId)?.name;
                  
                  const confirmed = window.confirm(`Are you sure you want to move ${selectedEmailIds.length} email${selectedEmailIds.length > 1 ? 's' : ''} to ${targetCategory}?`);
                  
                  if (confirmed) {
                    setIsMoving(true);
                    try {
                      await onMoveToCategory(selectedEmailIds, categoryId);
                      // Reset the select value after successful move
                      e.target.value = "";
                    } catch (error) {
                      console.error('Error moving emails:', error);
                      // Don't show error toast here as it might be a false negative
                    } finally {
                      setIsMoving(false);
                    }
                  } else {
                    // Reset the select value if user cancels
                    e.target.value = "";
                  }
                }}
                className={`px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-colors duration-200 ${isMoving ? 'opacity-50 cursor-not-allowed' : ''}`}
                defaultValue=""
              >
                <option value="" disabled>Move to...</option>
                {categories
                  .filter(category => {
                    // Get the first selected email to check its current category
                    const firstSelectedEmail = selectedEmailIds[0];
                    const email = emails.find(e => e.id === firstSelectedEmail);
                    return email?.categoryId !== category.id;
                  })
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
              </select>
            </div>

            <button
              onClick={() => {
                if (!hasSelected) return;
                const confirmed = window.confirm(
                  `Delete ${selectedEmailIds.length} email(s)?`
                );
                if (confirmed) onDelete();
              }}
              className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-red-50 hover:text-red-600 hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-colors duration-200"
            >
              Delete
            </button>
            <button
              onClick={() => {
                if (!hasSelected) return;
                const confirmed = window.confirm(
                  `Unsubscribe ${selectedEmailIds.length} email(s)?`
                );
                if (confirmed) onUnsubscribe();
              }}
              className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-yellow-50 hover:text-yellow-600 hover:border-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-colors duration-200"
            >
              Unsubscribe
            </button>
          </>
        )}
        <button
          onClick={handleAddAccountPopup}
          className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-yellow-50 hover:text-yellow-600 hover:border-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-colors duration-200"
        >
          + Add Account
        </button>
        <EmailAccountsDropdown connectedEmailIds={connectedEmailIds} />
      </div>
    </div>
  );
}
