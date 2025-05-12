import { render, screen, act } from '@testing-library/react';
import { useFetcher } from '@remix-run/react';
import SyncProgress from '~/components/SyncProgress';

type JobStatus = {
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  total: number;
  error?: string;
};

// Mock the useFetcher hook
jest.mock('@remix-run/react', () => ({
  useFetcher: jest.fn()
}));

describe('SyncProgress', () => {
  const mockFetcher = {
    load: jest.fn(),
    data: null as { status: JobStatus } | null
  };

  beforeEach(() => {
    jest.useFakeTimers();
    (useFetcher as jest.Mock).mockReturnValue(mockFetcher);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('renders nothing when no jobId is provided', () => {
    const { container } = render(<SyncProgress jobId="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when no status data is available', () => {
    const { container } = render(<SyncProgress jobId="123" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders processing state correctly', () => {
    mockFetcher.data = {
      status: {
        status: 'processing',
        progress: 5,
        total: 10,
        error: undefined
      }
    };

    render(<SyncProgress jobId="123" />);
    
    expect(screen.getByText('Processing Emails...')).toBeInTheDocument();
    expect(screen.getByText('5 of 10 emails processed')).toBeInTheDocument();
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveStyle({ width: '50%' });
  });

  it('renders completed state correctly', () => {
    mockFetcher.data = {
      status: {
        status: 'completed',
        progress: 10,
        total: 10,
        error: undefined
      }
    };

    render(<SyncProgress jobId="123" />);
    
    expect(screen.getByText('Sync Complete')).toBeInTheDocument();
  });

  it('renders failed state correctly', () => {
    mockFetcher.data = {
      status: {
        status: 'failed',
        progress: 5,
        total: 10,
        error: 'Failed to process emails'
      }
    };

    render(<SyncProgress jobId="123" />);
    
    expect(screen.getByText('Sync Failed')).toBeInTheDocument();
    expect(screen.getByText('Failed to process emails')).toBeInTheDocument();
  });

  it('polls for status updates', () => {
    render(<SyncProgress jobId="123" />);
    
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    expect(mockFetcher.load).toHaveBeenCalledWith('/api/job-status?jobId=123');
  });

  it('stops polling when job is completed', () => {
    mockFetcher.data = {
      status: {
        status: 'completed',
        progress: 10,
        total: 10,
        error: undefined
      }
    };

    render(<SyncProgress jobId="123" />);
    
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    expect(mockFetcher.load).toHaveBeenCalledTimes(1);
  });

  it('stops polling when job is failed', () => {
    mockFetcher.data = {
      status: {
        status: 'failed',
        progress: 5,
        total: 10,
        error: 'Failed to process emails'
      }
    };

    render(<SyncProgress jobId="123" />);
    
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    expect(mockFetcher.load).toHaveBeenCalledTimes(1);
  });

  it('hides the progress bar after completion', () => {
    mockFetcher.data = {
      status: {
        status: 'completed',
        progress: 10,
        total: 10,
        error: undefined
      }
    };

    const { container } = render(<SyncProgress jobId="123" />);
    
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    
    expect(container).toBeEmptyDOMElement();
  });

  it('hides the progress bar after failure', () => {
    mockFetcher.data = {
      status: {
        status: 'failed',
        progress: 5,
        total: 10,
        error: 'Failed to process emails'
      }
    };

    const { container } = render(<SyncProgress jobId="123" />);
    
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    
    expect(container).toBeEmptyDOMElement();
  });

  it('allows manual dismissal of the progress bar', () => {
    mockFetcher.data = {
      status: {
        status: 'processing',
        progress: 5,
        total: 10,
        error: undefined
      }
    };

    const { container } = render(<SyncProgress jobId="123" />);
    
    act(() => {
      screen.getByRole('button').click();
    });
    
    expect(container).toBeEmptyDOMElement();
  });

  describe('Accessibility', () => {
    it('provides proper ARIA roles and labels', () => {
      mockFetcher.data = {
        status: {
          status: 'processing',
          progress: 5,
          total: 10,
          error: undefined
        }
      };

      render(<SyncProgress jobId="123" />);
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Close');
    });
  });
}); 