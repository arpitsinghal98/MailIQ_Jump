import { render, screen } from '@testing-library/react';
import EmailDetailsPanel from '~/components/EmailDetailsPanel';

describe('EmailDetailsPanel', () => {
  const mockEmail = {
    id: '123',
    subject: 'Test Subject',
    from: 'sender@example.com',
    to: 'recipient@example.com',
    date: '2024-03-20',
    html: '<p>Test email content</p>',
    attachments: [
      {
        filename: 'test.pdf',
        mimeType: 'application/pdf',
        attachmentId: 'att1'
      },
      {
        filename: 'image.jpg',
        mimeType: 'image/jpeg',
        attachmentId: 'att2'
      }
    ]
  };

  it('renders email details correctly', () => {
    render(<EmailDetailsPanel loading={false} error={null} selectedEmail={mockEmail} />);
    
    expect(screen.getByText('Test Subject')).toBeInTheDocument();
    expect(screen.getByText(/From: sender@example.com/)).toBeInTheDocument();
    expect(screen.getByText(/To: recipient@example.com/)).toBeInTheDocument();
    expect(screen.getByText(/Date: 2024-03-20/)).toBeInTheDocument();
    
    // Test iframe content
    const iframe = screen.getByTitle('Email content');
    expect(iframe).toHaveAttribute('sandbox', 'allow-same-origin');
    expect(iframe).toHaveAttribute('srcDoc', expect.stringContaining('Test email content'));
  });

  it('renders attachments correctly', () => {
    render(<EmailDetailsPanel loading={false} error={null} selectedEmail={mockEmail} />);
    
    expect(screen.getByText('test.pdf')).toBeInTheDocument();
    expect(screen.getByText('image.jpg')).toBeInTheDocument();
    
    const downloadLinks = screen.getAllByRole('link', { name: 'Download' });
    expect(downloadLinks).toHaveLength(2);
    expect(downloadLinks[0]).toHaveAttribute('href', '/dashboard/download-attachment?messageId=123&attachmentId=att1');
    expect(downloadLinks[1]).toHaveAttribute('href', '/dashboard/download-attachment?messageId=123&attachmentId=att2');
  });

  it('handles missing email fields gracefully', () => {
    const incompleteEmail = {
      ...mockEmail,
      subject: '',
      from: '',
      to: '',
      html: ''
    };
    
    render(<EmailDetailsPanel loading={false} error={null} selectedEmail={incompleteEmail} />);
    
    const iframe = screen.getByTitle('Email content');
    expect(iframe).toHaveAttribute('srcDoc', expect.stringContaining('No content'));
  });

  it('handles whitespace in email fields', () => {
    const emailWithWhitespace = {
      ...mockEmail,
      subject: '   ',
      from: '   ',
      to: '   ',
      html: '   '
    };
    
    render(<EmailDetailsPanel loading={false} error={null} selectedEmail={emailWithWhitespace} />);
    
    const iframe = screen.getByTitle('Email content');
    expect(iframe).toHaveAttribute('srcDoc', expect.stringContaining('No content'));
  });

  it('renders email with complex HTML content', () => {
    const emailWithComplexHtml = {
      ...mockEmail,
      html: `
        <div>
          <h1>Title</h1>
          <p>Paragraph with <strong>bold</strong> and <em>italic</em> text</p>
          <ul>
            <li>List item 1</li>
            <li>List item 2</li>
          </ul>
        </div>
      `
    };
    
    render(<EmailDetailsPanel loading={false} error={null} selectedEmail={emailWithComplexHtml} />);
    
    const iframe = screen.getByTitle('Email content');
    expect(iframe).toHaveAttribute('srcDoc', expect.stringContaining('<h1>Title</h1>'));
    expect(iframe).toHaveAttribute('srcDoc', expect.stringContaining('<li>List item 1</li>'));
    expect(iframe).toHaveAttribute('srcDoc', expect.stringContaining('<li>List item 2</li>'));
  });

  it('shows loading state', () => {
    render(<EmailDetailsPanel loading={true} error={null} selectedEmail={null} />);
    expect(screen.getByText('Loading email...')).toBeInTheDocument();
  });

  it('shows error state', () => {
    render(<EmailDetailsPanel loading={false} error="Failed to load email" selectedEmail={null} />);
    expect(screen.getByText('Failed to load email')).toBeInTheDocument();
  });

  describe('Accessibility', () => {
    it('provides proper ARIA roles and labels', () => {
      render(<EmailDetailsPanel loading={false} error={null} selectedEmail={mockEmail} />);
      
      expect(screen.getByRole('article')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Test Subject' })).toBeInTheDocument();
      expect(screen.getByRole('list')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(2);
      expect(screen.getAllByRole('link')).toHaveLength(2);
    });
  });
}); 