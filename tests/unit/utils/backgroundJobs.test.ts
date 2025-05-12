import { getJobStatus, startJob, updateJobProgress, completeJob, failJob, startCategorySyncJob } from '~/utils/backgroundJobs';
import { db } from '~/db/client';
import { fetchRecentEmails } from '~/lib/fetch-emails';
import { analyzeEmail } from '~/utils/ai';
import { getGmailClient } from '~/lib/gmail.server';

// Mock dependencies
jest.mock('~/db/client', () => ({
  db: {
    query: {
      linkedAccounts: {
        findMany: jest.fn(),
      },
      categories: {
        findMany: jest.fn(),
      },
      emails: {
        findFirst: jest.fn(),
      },
    },
    insert: jest.fn(),
  },
}));

jest.mock('~/lib/fetch-emails.server', () => ({
  fetchRecentEmails: jest.fn(),
}));

jest.mock('~/utils/ai', () => ({
  analyzeEmail: jest.fn(),
}));

jest.mock('~/lib/gmail.server', () => ({
  getGmailClient: jest.fn(),
}));

describe('Background Jobs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Job Status Management', () => {
    it('should start a new job', () => {
      const jobId = 'test-job';
      startJob(jobId);
      expect(getJobStatus(jobId)).toEqual({
        status: 'processing',
        progress: 0,
        total: 0,
      });
    });

    it('should update job progress', () => {
      const jobId = 'test-job';
      startJob(jobId);
      updateJobProgress(jobId, 5, 10);
      expect(getJobStatus(jobId)).toEqual({
        status: 'processing',
        progress: 5,
        total: 10,
      });
    });

    it('should complete a job', () => {
      const jobId = 'test-job';
      startJob(jobId);
      completeJob(jobId);
      expect(getJobStatus(jobId)).toEqual({
        status: 'completed',
        progress: 0,
        total: 0,
      });
    });

    it('should fail a job with error message', () => {
      const jobId = 'test-job';
      const error = 'Test error';
      startJob(jobId);
      failJob(jobId, error);
      expect(getJobStatus(jobId)).toEqual({
        status: 'failed',
        progress: 0,
        total: 0,
        error,
      });
    });

    it('should return undefined for non-existent job', () => {
      expect(getJobStatus('non-existent')).toBeUndefined();
    });
  });

  describe('Category Sync Job', () => {
    const mockUserId = 1;
    const mockCategoryId = 1;
    const mockJobId = 'category-sync-1-1-1234567890';

    const mockLinkedAccounts = [
      {
        id: 1,
        userId: 1,
        email: 'test@example.com',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      },
    ];

    const mockCategories = [
      {
        id: 1,
        userId: 1,
        name: 'Newsletter',
        description: 'Newsletters',
      },
    ];

    const mockEmails = [
      {
        id: 'email1',
        subject: 'Test Email',
        from: 'sender@example.com',
        html: '<p>Test content</p>',
      },
    ];

    const mockGmailClient = {
      users: {
        messages: {
          modify: jest.fn(),
        },
      },
    };

    beforeEach(() => {
      // Setup mocks
      (db.query.linkedAccounts.findMany as jest.Mock).mockResolvedValue(mockLinkedAccounts);
      (db.query.categories.findMany as jest.Mock).mockResolvedValue(mockCategories);
      (db.query.emails.findFirst as jest.Mock).mockResolvedValue(null);
      (fetchRecentEmails as jest.Mock).mockResolvedValue(mockEmails);
      (getGmailClient as jest.Mock).mockReturnValue(mockGmailClient);
      (analyzeEmail as jest.Mock).mockResolvedValue({
        category: 'Newsletter',
        summary: 'Test summary',
        unsubscribeUrl: 'https://example.com/unsubscribe',
      });
    });

    it('should start a category sync job', async () => {
      const jobId = await startCategorySyncJob(mockUserId, mockCategoryId);
      expect(jobId).toMatch(/^category-sync-\d+-\d+-\d+$/);
      expect(getJobStatus(jobId)).toBeDefined();
    });

    it('should process emails for a specific category', async () => {
      await startCategorySyncJob(mockUserId, mockCategoryId);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(db.query.linkedAccounts.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
      });
      expect(db.query.categories.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
      });
      expect(fetchRecentEmails).toHaveBeenCalled();
      expect(analyzeEmail).toHaveBeenCalled();
      expect(db.insert).toHaveBeenCalled();
    });

    it('should handle missing access tokens', async () => {
      const accountsWithoutTokens = [{
        ...mockLinkedAccounts[0],
        accessToken: null,
        refreshToken: null,
      }];
      (db.query.linkedAccounts.findMany as jest.Mock).mockResolvedValue(accountsWithoutTokens);

      await startCategorySyncJob(mockUserId, mockCategoryId);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(fetchRecentEmails).not.toHaveBeenCalled();
    });

    it('should handle existing emails', async () => {
      (db.query.emails.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        gmailId: 'email1',
      });

      await startCategorySyncJob(mockUserId, mockCategoryId);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(db.insert).not.toHaveBeenCalled();
    });

    it('should handle AI analysis errors', async () => {
      (analyzeEmail as jest.Mock).mockRejectedValue(new Error('AI analysis failed'));

      await startCategorySyncJob(mockUserId, mockCategoryId);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(db.insert).toHaveBeenCalledWith(expect.objectContaining({
        summary: 'Error analyzing email',
      }));
    });

    it('should handle Gmail API errors', async () => {
      (mockGmailClient.users.messages.modify as jest.Mock).mockRejectedValue(new Error('Gmail API error'));

      await startCategorySyncJob(mockUserId, mockCategoryId);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(db.insert).toHaveBeenCalled();
    });
  });
});
