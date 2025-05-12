import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddCategoryModal from '~/components/AddCategoryModal';

describe('AddCategoryModal', () => {
  const defaultProps = {
    showAddCategoryModal: true,
    setShowAddCategoryModal: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Basic Rendering Tests
  describe('Basic Rendering', () => {
    it('renders modal when showAddCategoryModal is true', () => {
      render(<AddCategoryModal {...defaultProps} />);
      expect(screen.getByText('Add Category')).toBeInTheDocument();
    });

    it('does not render when showAddCategoryModal is false', () => {
      render(<AddCategoryModal {...defaultProps} showAddCategoryModal={false} />);
      expect(screen.queryByText('Add Category')).not.toBeInTheDocument();
    });

    it('renders all form fields', () => {
      render(<AddCategoryModal {...defaultProps} />);
      expect(screen.getByPlaceholderText('Category name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Description')).toBeInTheDocument();
    });
  });

  // Form Submission Tests
  describe('Form Submission', () => {
    it('submits form with correct action', () => {
      const { container } = render(<AddCategoryModal {...defaultProps} />);
      const form = container.querySelector('form');
      expect(form).toHaveAttribute('action', '/dashboard/add-category');
      expect(form).toHaveAttribute('method', 'post');
    });

    it('submits form with correct data', async () => {
      const { container } = render(<AddCategoryModal {...defaultProps} />);
      const nameInput = screen.getByPlaceholderText('Category name');
      const descriptionInput = screen.getByPlaceholderText('Description');
      await userEvent.type(nameInput, 'Test Category');
      await userEvent.type(descriptionInput, 'Test Description');
      const form = container.querySelector('form');
      const formData = new FormData(form!);
      expect(formData.get('name')).toBe('Test Category');
      expect(formData.get('description')).toBe('Test Description');
    });
  });

  // Interaction Tests
  describe('User Interactions', () => {
    it('calls setShowAddCategoryModal when cancel button is clicked', () => {
      render(<AddCategoryModal {...defaultProps} />);
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);
      expect(defaultProps.setShowAddCategoryModal).toHaveBeenCalledWith(false);
    });
  });

  // Accessibility Tests
  describe('Accessibility', () => {
    it('renders the form', () => {
      const { container } = render(<AddCategoryModal {...defaultProps} />);
      const form = container.querySelector('form');
      expect(form).toBeInTheDocument();
    });
  });

  // UI Tests
  describe('UI Elements', () => {
    it('applies correct styling to modal elements', () => {
      render(<AddCategoryModal {...defaultProps} />);
      const modal = screen.getByText('Add Category').closest('div');
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      const addButton = screen.getByRole('button', { name: /add/i });
      expect(modal).toHaveClass('bg-white', 'p-6', 'rounded-xl', 'shadow-xl');
      expect(cancelButton).toHaveClass('text-gray-600', 'border', 'rounded');
      expect(addButton).toHaveClass('bg-blue-600', 'text-white', 'rounded');
    });

    it('applies correct styling to form fields', () => {
      render(<AddCategoryModal {...defaultProps} />);
      const nameInput = screen.getByPlaceholderText('Category name');
      const descriptionInput = screen.getByPlaceholderText('Description');
      expect(nameInput).toHaveClass('w-full', 'px-4', 'py-2', 'border', 'rounded');
      expect(descriptionInput).toHaveClass('w-full', 'px-4', 'py-2', 'border', 'rounded');
    });
  });
}); 