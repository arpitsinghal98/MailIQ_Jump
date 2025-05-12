import React from "react";

export default function AddCategoryModal({
  showAddCategoryModal,
  setShowAddCategoryModal,
}: {
  showAddCategoryModal: boolean;
  setShowAddCategoryModal: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  if (!showAddCategoryModal) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md border border-gray-300">
        <h3 className="text-lg font-semibold mb-4">Add Category</h3>
        <form method="post" action="/dashboard/add-category" className="space-y-4">
          <input
            name="name"
            placeholder="Category name"
            required
            className="w-full px-4 py-2 border rounded"
          />
          <textarea
            name="description"
            placeholder="Description"
            required
            className="w-full px-4 py-2 border rounded"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddCategoryModal(false)}
              className="text-sm px-4 py-2 text-gray-600 border rounded hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              onSubmit={(e) => e.preventDefault()}
              className="text-sm px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}