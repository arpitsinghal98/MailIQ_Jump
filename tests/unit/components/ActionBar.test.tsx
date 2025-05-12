import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ActionBar from '~/components/ActionBar';

describe('ActionBar', () => {
  const defaultProps = {
    selectedEmailIds: [],
    setShowAddCategoryModal: jest.fn(),
    onDelete: jest.fn(),
    onUnsubscribe: jest.fn(),
    connectedEmailIds: [
      { id: 1, email: 'test1@example.com' },
      { id: 2, email: 'test2@example.com' },
    ],
    onSync: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Basic Rendering Tests
  describe('Basic Rendering', () => {
    it('renders all action buttons', () => {
      render(<ActionBar {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: '+ Category' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sync Emails' })).toBeInTheDocument();
    });

    it('displays correct button text', () => {
      render(<ActionBar {...defaultProps} />);
      
      expect(screen.getByText('+ Category')).toBeInTheDocument();
      expect(screen.getByText('Sync Emails')).toBeInTheDocument();
    });
  });

  // Interaction Tests
  describe('User Interactions', () => {
    it('calls setShowAddCategoryModal when add category button is clicked', () => {
      render(<ActionBar {...defaultProps} />);
      
      const addButton = screen.getByRole('button', { name: '+ Category' });
      fireEvent.click(addButton);
      
      expect(defaultProps.setShowAddCategoryModal).toHaveBeenCalledWith(true);
    });

    it('calls onSync when sync button is clicked', () => {
      render(<ActionBar {...defaultProps} />);
      
      const syncButton = screen.getByRole('button', { name: 'Sync Emails' });
      fireEvent.click(syncButton);
      
      expect(defaultProps.onSync).toHaveBeenCalled();
    });

    it('calls onDelete and onUnsubscribe when secondary buttons are clicked', () => {
      // Mock window.confirm to always return true
      const confirmSpy = jest.spyOn(window, 'confirm').mockImplementation(() => true);
      const props = {
        ...defaultProps,
        selectedEmailIds: [1, 2]
      };
      render(<ActionBar {...props} />);
      // Secondary Delete
      const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
      fireEvent.click(deleteButtons[1]);
      expect(props.onDelete).toHaveBeenCalled();
      // Secondary Unsubscribe
      const unsubscribeButtons = screen.getAllByRole('button', { name: 'Unsubscribe' });
      fireEvent.click(unsubscribeButtons[1]);
      expect(props.onUnsubscribe).toHaveBeenCalled();
      confirmSpy.mockRestore();
    });
  });

  // State Tests
  describe('State Handling', () => {
    it('shows connected email accounts count', () => {
      render(<ActionBar {...defaultProps} />);
      expect(screen.getByText('2 email accounts connected')).toBeInTheDocument();
    });

    it('shows correct count for single connected email', () => {
      render(<ActionBar {...defaultProps} connectedEmailIds={[{ id: 1, email: 'test1@example.com' }]} />);
      expect(screen.getByText('1 email accounts connected')).toBeInTheDocument();
    });

    it('shows correct count for no connected emails', () => {
      render(<ActionBar {...defaultProps} connectedEmailIds={[]} />);
      expect(screen.getByText('0 email accounts connected')).toBeInTheDocument();
    });
  });

  // UI Tests
  describe('UI Elements', () => {
    it('applies correct styling to buttons', () => {
      render(<ActionBar {...defaultProps} />);
      
      const addButton = screen.getByRole('button', { name: '+ Category' });
      const syncButton = screen.getByRole('button', { name: 'Sync Emails' });
      
      expect(addButton).toHaveClass('bg-blue-500', 'text-white', 'rounded');
      expect(syncButton).toHaveClass('bg-green-500', 'text-white', 'rounded');
    });

    it('applies correct styling to container', () => {
      render(<ActionBar {...defaultProps} />);
      
      const container = screen.getByText('+ Category').closest('div')?.parentElement;
      expect(container).toHaveClass('bg-white', 'border-b', 'border-gray-200', 'p-4', 'flex', 'items-center', 'justify-between');
    });
  });

  describe('Delete and Unsubscribe Buttons', () => {
    it('are disabled when no emails are selected', () => {
      render(<ActionBar {...defaultProps} />);
      
      const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
      const unsubscribeButtons = screen.getAllByRole('button', { name: 'Unsubscribe' });
      
      // Only one delete and unsubscribe button should be present when no emails are selected
      expect(deleteButtons[0]).toBeDisabled();
      expect(unsubscribeButtons[0]).toBeDisabled();
    });

    it('are enabled when emails are selected', () => {
      const props = {
        ...defaultProps,
        selectedEmailIds: [1, 2]
      };
      
      render(<ActionBar {...props} />);
      
      const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
      const unsubscribeButtons = screen.getAllByRole('button', { name: 'Unsubscribe' });
      
      // Both buttons should be enabled when emails are selected
      expect(deleteButtons[0]).not.toBeDisabled();
      expect(unsubscribeButtons[0]).not.toBeDisabled();
    });
  });

  describe('Advanced Action Interactions', () => {
    it('handles keyboard navigation between buttons', async () => {
      render(<ActionBar {...defaultProps} />);
      const addButton = screen.getByRole('button', { name: '+ Category' });
      const syncButton = screen.getByRole('button', { name: 'Sync Emails' });
      // Focus the add button
      addButton.focus();
      // Tab to the sync button (skipping disabled buttons)
      await userEvent.tab();
      expect(document.activeElement).toBe(syncButton);
      // Shift+Tab back to the add button
      await userEvent.tab({ shift: true });
      expect(document.activeElement).toBe(addButton);
    });

    it('handles keyboard activation of buttons', async () => {
      render(<ActionBar {...defaultProps} />);
      const addButton = screen.getByRole('button', { name: '+ Category' });
      const syncButton = screen.getByRole('button', { name: 'Sync Emails' });
      // Use userEvent.click to simulate activation (browser handles Enter/Space for buttons)
      await userEvent.click(addButton);
      expect(defaultProps.setShowAddCategoryModal).toHaveBeenCalledWith(true);
      await userEvent.click(syncButton);
      expect(defaultProps.onSync).toHaveBeenCalled();
    });

    it('handles confirmation dialog for delete action', () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockImplementation(() => true);
      const props = {
        ...defaultProps,
        selectedEmailIds: [1, 2]
      };
      render(<ActionBar {...props} />);
      // There are two delete buttons when emails are selected; the first is the main, the second is the secondary
      const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
      // Click the first (main) delete button
      fireEvent.click(deleteButtons[0]);
      expect(confirmSpy).toHaveBeenCalledWith('Delete 2 email(s)?');
      expect(props.onDelete).toHaveBeenCalled();
      confirmSpy.mockRestore();
    });

    it('handles confirmation dialog for unsubscribe action', () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockImplementation(() => true);
      const props = {
        ...defaultProps,
        selectedEmailIds: [1, 2]
      };
      render(<ActionBar {...props} />);
      // There are two unsubscribe buttons when emails are selected; the first is the main, the second is the secondary
      const unsubscribeButtons = screen.getAllByRole('button', { name: 'Unsubscribe' });
      // Click the first (main) unsubscribe button
      fireEvent.click(unsubscribeButtons[0]);
      expect(confirmSpy).toHaveBeenCalledWith('Unsubscribing 2 email(s)?');
      expect(props.onUnsubscribe).toHaveBeenCalled();
      confirmSpy.mockRestore();
    });

    it('handles window resize during operations', () => {
      const props = {
        ...defaultProps,
        selectedEmailIds: [1, 2]
      };
      
      render(<ActionBar {...props} />);
      
      // Trigger a window resize
      window.dispatchEvent(new Event('resize'));
      
      // Verify the component still renders correctly
      expect(screen.getByRole('button', { name: '+ Category' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sync Emails' })).toBeInTheDocument();
    });
  });
}); 