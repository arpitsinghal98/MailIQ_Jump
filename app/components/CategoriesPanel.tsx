import React from "react";
import { useFetcher } from "@remix-run/react";
import { JobStatus } from "~/types/backgroundJobs";
import EditCategoryModal from "./EditCategoryModal";
import DeleteCategoryModal from "./DeleteCategoryModal";

export default function CategoriesPanel({
  categories,
  selectedCategoryId,
  setSelectedCategoryId,
  leftRef,
  startResize,
  syncJobId,
}: {
  categories: { id: number; name: string; description: string; emailCount?: number }[];
  selectedCategoryId: number | null;
  setSelectedCategoryId: React.Dispatch<React.SetStateAction<number | any>>;
  leftRef: React.RefObject<HTMLDivElement>;
  startResize: (ref: React.RefObject<HTMLDivElement>, key: string) => (e: React.MouseEvent) => void;
  syncJobId?: string;
}) {
  const fetcher = useFetcher<{ status: JobStatus }>();
  const [showEditCategoryModal, setShowEditCategoryModal] = React.useState(false);
  const [showDeleteCategoryModal, setShowDeleteCategoryModal] = React.useState(false);
  const [selectedCategory, setSelectedCategory] = React.useState<typeof categories[0] | null>(null);

  React.useEffect(() => {
    if (syncJobId) {
      const interval = setInterval(() => {
        fetcher.load(`/api/job-status?jobId=${syncJobId}`);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [syncJobId, fetcher]);

  const handleEditClick = (e: React.MouseEvent, category: typeof categories[0]) => {
    e.stopPropagation();
    setSelectedCategory(category);
    setShowEditCategoryModal(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, category: typeof categories[0]) => {
    e.stopPropagation();
    setSelectedCategory(category);
    setShowDeleteCategoryModal(true);
  };

  return (
    <>
      <aside
        ref={leftRef}
        className="min-w-[250px] max-w-[300px] border-r border-gray-200 bg-gray-50 h-full flex flex-col overflow-hidden"
      >
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Categories</h2>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-custom">
          <ul className="p-4 space-y-2">
            {/* Inbox category */}
            <li className="flex items-center justify-between">
              <button
                onClick={() => setSelectedCategoryId(null)}
                className={`flex-1 text-left p-2 rounded ${
                  selectedCategoryId === null ? "bg-blue-100 text-blue-800" : "hover:bg-gray-100"
                }`}
              >
                <span className="flex items-center justify-between w-full">
                  <span>📥 Uncategorised</span>
                  {fetcher.data?.status?.status === 'processing' && (
                    <span className="text-sm text-gray-500 flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Syncing
                    </span>
                  )}
                </span>
              </button>
            </li>
            {/* Other categories */}
            {categories.map((cat) => (
              <li key={cat.id} className="flex items-center justify-between">
                <button
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`flex-1 text-left p-2 rounded ${
                    selectedCategoryId === cat.id ? "bg-blue-100 text-blue-800" : "hover:bg-gray-100"
                  }`}
                >
                  <span className="flex items-center justify-between w-full">
                    <span>{cat.name}</span>
                    <span className="text-sm text-gray-500">
                      {cat.emailCount || 0} emails
                    </span>
                  </span>
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => handleEditClick(e, cat)}
                    className="p-1 text-gray-500 hover:text-gray-700"
                    title="Edit category"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => handleDeleteClick(e, cat)}
                    className="p-1 text-gray-500 hover:text-red-600"
                    title="Delete category"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <button
        onMouseDown={startResize(leftRef, "leftWidth")}
        className="w-2 bg-gray-300 cursor-col-resize"
        aria-label="Resize left panel"
      />

      {selectedCategory && (
        <>
          <EditCategoryModal
            showEditCategoryModal={showEditCategoryModal}
            setShowEditCategoryModal={setShowEditCategoryModal}
            category={selectedCategory}
          />
          <DeleteCategoryModal
            showDeleteCategoryModal={showDeleteCategoryModal}
            setShowDeleteCategoryModal={setShowDeleteCategoryModal}
            category={selectedCategory}
          />
        </>
      )}
    </>
  );
}
