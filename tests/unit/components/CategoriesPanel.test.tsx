import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFetcher } from '@remix-run/react';
import CategoriesPanel from '~/components/CategoriesPanel';

// Mock the useFetcher hook
jest.mock('@remix-run/react', () => ({
  useFetcher: jest.fn()
}));

describe('CategoriesPanel', () => {
  const mockCategories = [
    { id: 1, name: 'Work', emailCount: 10 },
    { id: 2, name: 'Personal', emailCount: 5 },
    { id: 3, name: 'Newsletters', emailCount: 15 }
  ];

  const defaultProps = {
    categories: mockCategories,
    selectedCategoryId: null,
    setSelectedCategoryId: jest.fn(),
    leftRef: { current: null },
    startResize: jest.fn(),
    syncJobId: '123'
  };

  const mockFetcher = {
    load: jest.fn(),
    data: null
  };

  beforeEach(() => {
    jest.useFakeTimers();
    (useFetcher as jest.Mock).mockReturnValue(mockFetcher);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders the panel title', () => {
      render(<CategoriesPanel {...defaultProps} />);
      expect(screen.getByText('Categories')).toBeInTheDocument();
    });

    it('renders the Inbox category', () => {
      render(<CategoriesPanel {...defaultProps} />);
      expect(screen.getByText('📥 Inbox')).toBeInTheDocument();
    });

    it('renders all categories with email counts', () => {
      render(<CategoriesPanel {...defaultProps} />);
      
      mockCategories.forEach(category => {
        expect(screen.getByText(category.name)).toBeInTheDocument();
        expect(screen.getByText(`${category.emailCount} emails`)).toBeInTheDocument();
      });
    });
  });

  describe('Category Selection', () => {
    it('handles Inbox selection', () => {
      render(<CategoriesPanel {...defaultProps} />);
      
      const inboxButton = screen.getByText('📥 Inbox').closest('button');
      fireEvent.click(inboxButton!);
      
      expect(defaultProps.setSelectedCategoryId).toHaveBeenCalledWith(null);
    });

    it('handles category selection', () => {
      render(<CategoriesPanel {...defaultProps} />);
      
      const categoryButton = screen.getByText('Work').closest('button');
      fireEvent.click(categoryButton!);
      
      expect(defaultProps.setSelectedCategoryId).toHaveBeenCalledWith(1);
    });

    it('shows selected state for Inbox', () => {
      render(<CategoriesPanel {...defaultProps} selectedCategoryId={null} />);
      
      const inboxButton = screen.getByText('📥 Inbox').closest('button');
      expect(inboxButton).toHaveClass('bg-blue-100', 'text-blue-800');
    });

    it('shows selected state for category', () => {
      render(<CategoriesPanel {...defaultProps} selectedCategoryId={1} />);
      
      const categoryButton = screen.getByText('Work').closest('button');
      expect(categoryButton).toHaveClass('bg-blue-100', 'text-blue-800');
    });
  });

  describe('Sync Status', () => {
    it('shows syncing indicator when processing', () => {
      mockFetcher.data = {
        status: {
          status: 'processing',
          progress: 5,
          total: 10
        }
      };

      render(<CategoriesPanel {...defaultProps} />);
      
      expect(screen.getByText('Syncing')).toBeInTheDocument();
    });

    it('polls for status updates', () => {
      render(<CategoriesPanel {...defaultProps} />);
      
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      expect(mockFetcher.load).toHaveBeenCalledWith('/api/job-status?jobId=123');
    });

    it('stops polling when no syncJobId is provided', () => {
      render(<CategoriesPanel {...defaultProps} syncJobId={undefined} />);
      
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      expect(mockFetcher.load).not.toHaveBeenCalled();
    });
  });

  describe('Resize Handling', () => {
    it('sets up resize handler', () => {
      render(<CategoriesPanel {...defaultProps} />);
      
      const resizeButton = screen.getByRole('button', { name: 'Resize left panel' });
      fireEvent.mouseDown(resizeButton);
      
      expect(defaultProps.startResize).toHaveBeenCalledWith(
        defaultProps.leftRef,
        'leftWidth'
      );
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA roles and labels', () => {
      render(<CategoriesPanel {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: 'Resize left panel' })).toBeInTheDocument();
      expect(screen.getByRole('list')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(mockCategories.length + 1); // +1 for Inbox
    });

    it('has proper button labels', () => {
      render(<CategoriesPanel {...defaultProps} />);
      
      mockCategories.forEach(category => {
        const button = screen.getByText(category.name).closest('button');
        expect(button).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles empty categories list', () => {
      render(<CategoriesPanel {...defaultProps} categories={[]} />);
      
      expect(screen.getByText('📥 Inbox')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(1); // Only Inbox
    });

    it('handles categories without email counts', () => {
      const categoriesWithoutCounts = mockCategories.map(({ id, name }) => ({ id, name }));
      render(<CategoriesPanel {...defaultProps} categories={categoriesWithoutCounts} />);
      
      categoriesWithoutCounts.forEach(category => {
        expect(screen.getByText(category.name)).toBeInTheDocument();
        expect(screen.getAllByText('0 emails')).toHaveLength(categoriesWithoutCounts.length);
      });
    });
  });
}); 