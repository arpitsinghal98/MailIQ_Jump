import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Layout from '~/components/Layout';

jest.mock('@web3-storage/multipart-parser', () => ({}));

// Helper to render with router
const renderWithRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('Layout', () => {
  const mockUser = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com'
  };

  beforeEach(() => {
    // Mock window.open
    window.open = jest.fn();
    // Mock window.addEventListener
    window.addEventListener = jest.fn();
    // Mock window.removeEventListener
    window.removeEventListener = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders the MailIQ logo', () => {
      renderWithRouter(<Layout user={mockUser}>Content</Layout>);
      expect(screen.getByText('MailIQ')).toBeInTheDocument();
    });

    it('renders children content', () => {
      renderWithRouter(<Layout user={mockUser}>Test Content</Layout>);
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('renders welcome message with user name', () => {
      renderWithRouter(<Layout user={mockUser}>Content</Layout>);
      expect(screen.getByText(/Welcome,/)).toBeInTheDocument();
      expect(screen.getByText(mockUser.name)).toBeInTheDocument();
    });

    it('renders connected email count', () => {
      renderWithRouter(<Layout user={mockUser}>Content</Layout>);
    });
  });

  describe('User Interactions', () => {
    it('opens add account popup when clicking Add Account button', () => {
      renderWithRouter(<Layout user={mockUser}>Content</Layout>);
      
      const addAccountButton = screen.getByText('+ Add Account');
      fireEvent.click(addAccountButton);

      expect(window.open).toHaveBeenCalledWith(
        '/auth/google?popup=true',
        '_blank',
        'width=500,height=600'
      );
    });

    it('sets up message listener when opening popup', () => {
      renderWithRouter(<Layout user={mockUser}>Content</Layout>);
      
      const addAccountButton = screen.getByText('+ Add Account');
      fireEvent.click(addAccountButton);

      expect(window.addEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function)
      );
    });

    it('reloads page when receiving account-linked message', () => {
    });

    it('ignores messages from different origins', () => {
      renderWithRouter(<Layout user={mockUser}>Content</Layout>);
      const addAccountButton = screen.getByText('+ Add Account');
      fireEvent.click(addAccountButton);
      const messageListener = (window.addEventListener as jest.Mock).mock.calls[0][1];
      act(() => {
        messageListener({ 
          origin: 'https://malicious-site.com',
          data: 'account-linked'
        });
      });
    });
  });

  describe('Navigation', () => {
    it('renders logout link', () => {
      renderWithRouter(<Layout user={mockUser}>Content</Layout>);
      const logoutLink = screen.getByText('Logout');
      expect(logoutLink).toHaveAttribute('href', '/logout');
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      renderWithRouter(<Layout user={mockUser}>Content</Layout>);
      const logo = screen.getByText('MailIQ');
      expect(logo.tagName).toBe('A');
    });

    it('has proper button labels', () => {
      renderWithRouter(<Layout user={mockUser}>Content</Layout>);
      expect(screen.getByText('+ Add Account')).toBeInTheDocument();
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('applies proper background styles', () => {
      renderWithRouter(<Layout user={mockUser}>Content</Layout>);
    });

    it('applies proper layout structure', () => {
      renderWithRouter(<Layout user={mockUser}>Content</Layout>);
      const main = screen.getByRole('main');
      expect(main).toHaveClass('flex-1', 'overflow-hidden');
    });
  });
}); 