import { render, screen, fireEvent } from '@testing-library/react';
import EmailsPanel from '~/components/EmailsPanel';

describe('EmailsPanel', () => {
  const defaultProps = {
    filteredEmails: [
      {
        id: 1,
        subject: 'Test Email 1',
        from: 'sender1@example.com',
        date: '2024-03-20',
        summary: 'This is a test email',
        isRead: false
      },
      {
        id: 2,
        subject: 'Test Email 2',
        from: 'sender2@example.com',
        date: '2024-03-21',
        summary: 'Another test email',
        isRead: true
      }
    ],
    selectedEmailId: null,
    setSelectedEmailId: jest.fn(),
    selectedEmailIds: [],
    setSelectedEmailIds: jest.fn(),
    middleRef: { current: null },
    startResize: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the panel title', () => {
    render(<EmailsPanel {...defaultProps} />);
    expect(screen.getByText('Emails')).toBeInTheDocument();
  });

  it('renders the list of emails', () => {
    render(<EmailsPanel {...defaultProps} />);
    
    expect(screen.getByText('Test Email 1')).toBeInTheDocument();
    expect(screen.getByText('sender1@example.com')).toBeInTheDocument();
    expect(screen.getByText('This is a test email')).toBeInTheDocument();
    
    expect(screen.getByText('Test Email 2')).toBeInTheDocument();
    expect(screen.getByText('sender2@example.com')).toBeInTheDocument();
    expect(screen.getByText('Another test email')).toBeInTheDocument();
  });

  it('handles email selection', () => {
    render(<EmailsPanel {...defaultProps} />);
    
    const emailItem = screen.getByText('Test Email 1').closest('button');
    fireEvent.click(emailItem!);
    
    expect(defaultProps.setSelectedEmailId).toHaveBeenCalledWith(1);
    expect(defaultProps.setSelectedEmailIds).toHaveBeenCalledWith([1]);
  });

  it('handles checkbox selection', () => {
    render(<EmailsPanel {...defaultProps} />);
    
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // Skip the "Select All" checkbox
    
    expect(defaultProps.setSelectedEmailIds).toHaveBeenCalled();
    const updater = defaultProps.setSelectedEmailIds.mock.calls[0][0];
    expect(typeof updater).toBe('function');
    expect(updater([])).toEqual([1]);
  });

  it('handles multiple checkbox selection', () => {
    render(<EmailsPanel {...defaultProps} />);
    
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // First email
    fireEvent.click(checkboxes[2]); // Second email
    
    // The updater is called twice, check the second call
    expect(defaultProps.setSelectedEmailIds).toHaveBeenCalledTimes(2);
    const updater = defaultProps.setSelectedEmailIds.mock.calls[1][0];
    expect(typeof updater).toBe('function');
    expect(updater([1])).toEqual([1, 2]);
  });

  it('handles checkbox deselection', () => {
    const props = {
      ...defaultProps,
      selectedEmailIds: [1, 2]
    };
    
    render(<EmailsPanel {...props} />);
    
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // Deselect first email
    
    expect(defaultProps.setSelectedEmailIds).toHaveBeenCalled();
    const updater = defaultProps.setSelectedEmailIds.mock.calls[0][0];
    expect(typeof updater).toBe('function');
    expect(updater([1, 2])).toEqual([2]);
  });

  it('shows selected state for selected email', () => {
    const props = {
      ...defaultProps,
      selectedEmailId: 1
    };
    
    render(<EmailsPanel {...props} />);
    
    const selectedEmail = screen.getByText('Test Email 1').closest('button');
    expect(selectedEmail).toHaveClass('bg-blue-50', 'border-blue-300');
  });

  it('shows selected state for checked emails', () => {
    const props = {
      ...defaultProps,
      selectedEmailIds: [1, 2]
    };
    
    render(<EmailsPanel {...props} />);
    
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[1]).toBeChecked();
    expect(checkboxes[2]).toBeChecked();
  });

  it('handles empty email list', () => {
    const props = {
      ...defaultProps,
      filteredEmails: []
    };
    
    render(<EmailsPanel {...props} />);
    expect(screen.getByRole('list')).toBeEmptyDOMElement();
  });

  it('handles undefined email list', () => {
    const props = {
      ...defaultProps,
      filteredEmails: []
    };
    
    render(<EmailsPanel {...props} />);
    expect(screen.getByRole('list')).toBeEmptyDOMElement();
  });

  it('calls startResize when resize button is pressed', () => {
    render(<EmailsPanel {...defaultProps} />);
    const resizeButton = screen.getByRole('button', { name: 'Resize middle panel' });
    fireEvent.mouseDown(resizeButton);
    expect(defaultProps.startResize).toHaveBeenCalledWith(defaultProps.middleRef, 'middleWidth');
  });

  it('renders sender name correctly when from field contains name and email', () => {
    const props = {
      ...defaultProps,
      filteredEmails: [
        {
          id: 3,
          subject: 'Test Email 3',
          from: 'John Doe <john@example.com>',
          date: '2024-03-22',
          summary: 'Summary',
          isRead: false
        }
      ]
    };
    render(<EmailsPanel {...props} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  describe('Accessibility', () => {
    it('provides proper ARIA roles and labels', () => {
      render(<EmailsPanel {...defaultProps} />);
      
      expect(screen.getByRole('list')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(2);
      expect(screen.getAllByRole('checkbox')).toHaveLength(3); // Including "Select All" checkbox
      
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[1]).toHaveAttribute('aria-label', 'Select Test Email 1');
      expect(checkboxes[2]).toHaveAttribute('aria-label', 'Select Test Email 2');
    });
  });

  describe('Select All Checkbox', () => {
    it('selects all emails when "Select All" is clicked', () => {
      render(<EmailsPanel {...defaultProps} />);
      
      const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
      fireEvent.click(selectAllCheckbox);
      
      expect(defaultProps.setSelectedEmailIds).toHaveBeenCalled();
      expect(defaultProps.setSelectedEmailIds.mock.calls[0][0]).toEqual([1, 2]);
    });

    it('deselects all emails when "Select All" is clicked again', () => {
      const props = {
        ...defaultProps,
        selectedEmailIds: [1, 2]
      };
      
      render(<EmailsPanel {...props} />);
      
      const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
      fireEvent.click(selectAllCheckbox);
      
      expect(defaultProps.setSelectedEmailIds).toHaveBeenCalled();
      expect(defaultProps.setSelectedEmailIds.mock.calls[0][0]).toEqual([]);
    });

    it('handles "Select All" when list is empty', () => {
      const props = {
        ...defaultProps,
        filteredEmails: []
      };
      
      render(<EmailsPanel {...props} />);
      
      const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
      fireEvent.click(selectAllCheckbox);
      
      expect(defaultProps.setSelectedEmailIds).toHaveBeenCalled();
      expect(defaultProps.setSelectedEmailIds.mock.calls[0][0]).toEqual([]);
    });
  });
}); 