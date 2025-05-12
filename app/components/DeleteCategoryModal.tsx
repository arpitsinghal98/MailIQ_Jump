import React from "react";

export default function DeleteCategoryModal({
  showDeleteCategoryModal,
  setShowDeleteCategoryModal,
  category,
}: {
  showDeleteCategoryModal: boolean;
  setShowDeleteCategoryModal: React.Dispatch<React.SetStateAction<boolean>>;
  category: { id: number; name: string };
}) {
  if (!showDeleteCategoryModal) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md border border-gray-300">
        <h3 className="text-lg font-semibold mb-4">Delete Category</h3>
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete the category "{category.name}"? All emails in this category will be moved to Uncategorised.
        </p>
        <form method="post" action="/dashboard/delete-category" className="space-y-4">
          <input type="hidden" name="categoryId" value={category.id} />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowDeleteCategoryModal(false)}
              className="text-sm px-4 py-2 text-gray-600 border rounded hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="text-sm px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Delete Category
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 