import React from "react";

export default function EditCategoryModal({
  showEditCategoryModal,
  setShowEditCategoryModal,
  category,
}: {
  showEditCategoryModal: boolean;
  setShowEditCategoryModal: React.Dispatch<React.SetStateAction<boolean>>;
  category: { id: number; name: string; description: string };
}) {
  if (!showEditCategoryModal) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md border border-gray-300">
        <h3 className="text-lg font-semibold mb-4">Edit Category</h3>
        <form method="post" action="/dashboard/update-category" className="space-y-4">
          <input type="hidden" name="categoryId" value={category.id} />
          <div>
            <label htmlFor="categoryName" className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
            <input
              id="categoryName"
              type="text"
              value={category.name}
              disabled
              className="w-full px-4 py-2 border rounded bg-gray-50"
            />
          </div>
          <div>
            <label htmlFor="categoryDescription" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              id="categoryDescription"
              name="description"
              defaultValue={category.description}
              required
              className="w-full px-4 py-2 border rounded"
              rows={4}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowEditCategoryModal(false)}
              className="text-sm px-4 py-2 text-gray-600 border rounded hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="text-sm px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 