import { render, screen, fireEvent } from '@testing-library/react';
import { useFetcher } from '@remix-run/react';
import EmailManagementDropdown from '~/components/EmailManagementDropdown';

// Mock the useFetcher hook
jest.mock('@remix-run/react', () => ({
  useFetcher: jest.fn()
}));

describe('EmailManagementDropdown', () => {
  const mockConnectedEmails = [
    { id: 1, email: 'test1@example.com' },
    { id: 2, email: 'test2@example.com' },
    { id: 3, email: 'test3@example.com' }
  ];

  const mockFetcher = {
    submit: jest.fn(),
    data: null
  };

  let originalLocation: Location;
  beforeAll(() => {
    originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { href: '', assign: jest.fn() }
    });
  });
  afterAll(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (useFetcher as jest.Mock).mockReturnValue(mockFetcher);
    window.location.href = '';
    if (typeof window.location.assign === 'function' && (window.location.assign as any).mockClear) {
      (window.location.assign as any).mockClear();
    }
  });

  describe('Basic Rendering', () => {
    it('renders the dropdown button', () => {
      render(<EmailManagementDropdown connectedEmailIds={mockConnectedEmails} />);
      expect(screen.getByRole('button', { name: 'Manage connected emails' })).toBeInTheDocument();
    });

    it('renders empty state when no emails are connected', () => {
      render(<EmailManagementDropdown connectedEmailIds={[]} />);
      const button = screen.getByRole('button', { name: 'Manage connected emails' });
      fireEvent.click(button);
      expect(screen.getByText('No connected emails')).toBeInTheDocument();
    });
  });

  describe('Dropdown Functionality', () => {
    it('toggles dropdown visibility on button click', () => {
      render(<EmailManagementDropdown connectedEmailIds={mockConnectedEmails} />);
      
      const button = screen.getByRole('button', { name: 'Manage connected emails' });
      fireEvent.click(button);
      
      expect(screen.getByText('Manage Emails')).toBeInTheDocument();
    });

    it('renders all connected emails in dropdown', () => {
      render(<EmailManagementDropdown connectedEmailIds={mockConnectedEmails} />);
      
      const button = screen.getByRole('button', { name: 'Manage connected emails' });
      fireEvent.click(button);
      
      mockConnectedEmails.forEach(email => {
        expect(screen.getByText(email.email)).toBeInTheDocument();
      });
    });

    it('shows empty state when no emails are connected', () => {
      render(<EmailManagementDropdown connectedEmailIds={[]} />);
      
      const button = screen.getByRole('button', { name: 'Manage connected emails' });
      fireEvent.click(button);
      
      expect(screen.getByText('No connected emails')).toBeInTheDocument();
    });

    it('closes dropdown when clicking outside', () => {
      render(<EmailManagementDropdown connectedEmailIds={mockConnectedEmails} />);
      const button = screen.getByRole('button', { name: 'Manage connected emails' });
      fireEvent.click(button);
      expect(screen.getByText('Manage Emails')).toBeInTheDocument();
      // Simulate outside click
      fireEvent.mouseDown(document.body);
      expect(screen.queryByText('Manage Emails')).not.toBeInTheDocument();
    });
  });

  describe('Email Selection', () => {
    it('toggles email selection on checkbox click', () => {
      render(<EmailManagementDropdown connectedEmailIds={mockConnectedEmails} />);
      
      const button = screen.getByRole('button', { name: 'Manage connected emails' });
      fireEvent.click(button);
      
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      
      expect(checkboxes[0]).toBeChecked();
    });

    it('shows inline toast when trying to deselect the last email', () => {
      render(<EmailManagementDropdown connectedEmailIds={mockConnectedEmails.slice(0, 1)} />);
      const button = screen.getByRole('button', { name: 'Manage connected emails' });
      fireEvent.click(button);
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox); // Try to select the only email (should show toast)
      expect(screen.getByText(/at least/i)).toBeInTheDocument();
    });

    it('enables remove button when emails are selected', () => {
      render(<EmailManagementDropdown connectedEmailIds={mockConnectedEmails} />);
      
      const button = screen.getByRole('button', { name: 'Manage connected emails' });
      fireEvent.click(button);
      
      const removeButton = screen.getByText('Remove Selected');
      expect(removeButton).toBeDisabled();
      
      const checkbox = screen.getAllByRole('checkbox')[0];
      fireEvent.click(checkbox);
      
      expect(removeButton).not.toBeDisabled();
    });
  });

  describe('Email Removal', () => {
    it('navigates to the correct URL when removing selected emails', () => {
      render(<EmailManagementDropdown connectedEmailIds={mockConnectedEmails} />);
      
      const button = screen.getByRole('button', { name: 'Manage connected emails' });
      fireEvent.click(button);
      
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[1]);
      
      const removeButton = screen.getByText('Remove Selected');
      fireEvent.click(removeButton);
      // The component uses window.location.href for navigation
      expect(window.location.href).toContain('/dashboard');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA roles and labels', () => {
      render(<EmailManagementDropdown connectedEmailIds={mockConnectedEmails} />);
      
      const button = screen.getByRole('button', { name: 'Manage connected emails' });
      expect(button).toHaveAttribute('aria-label', 'Manage connected emails');
      
      fireEvent.click(button);
      
      expect(screen.getByRole('heading', { name: 'Manage Emails' })).toBeInTheDocument();
    });
  });
}); 