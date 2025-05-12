import { deleteEmailsByIds } from '~/utils/emailActions';
import { db } from '~/db/client';
import { getGmailClient } from '~/lib/gmail.server';

// Mock the database and Gmail client
jest.mock('~/db/client', () => ({
  db: {
    query: {
      emails: {
        findMany: jest.fn(),
      },
      linkedAccounts: {
        findMany: jest.fn(),
      },
    },
    delete: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
  },
}));

jest.mock('~/lib/gmail.server', () => ({
  getGmailClient: jest.fn(),
}));

describe('Email Actions', () => {
  const mockUserId = 1;
  const mockEmailIds = [1, 2, 3];
  const mockEmails = [
    {
      id: 1,
      gmailId: 'gmail1',
      linkedAccountId: 1,
    },
    {
      id: 2,
      gmailId: 'gmail2',
      linkedAccountId: 1,
    },
    {
      id: 3,
      gmailId: 'gmail3',
      linkedAccountId: 2,
    },
  ];
  const mockLinkedAccounts = [
    {
      id: 1,
      userId: 1,
      accessToken: 'access1',
      refreshToken: 'refresh1',
    },
    {
      id: 2,
      userId: 1,
      accessToken: 'access2',
      refreshToken: 'refresh2',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (db.query.emails.findMany as jest.Mock).mockResolvedValue(mockEmails);
    (db.query.linkedAccounts.findMany as jest.Mock).mockResolvedValue(mockLinkedAccounts);
    (getGmailClient as jest.Mock).mockReturnValue({
      users: {
        messages: {
          trash: jest.fn().mockResolvedValue({}),
        },
      },
    });
  });

  describe('deleteEmailsByIds', () => {
    it('should delete emails from Gmail and database', async () => {
      await deleteEmailsByIds(mockUserId, mockEmailIds);

      // Verify Gmail client was called for each email
      expect(getGmailClient).toHaveBeenCalledTimes(3);
      expect(getGmailClient).toHaveBeenCalledWith('access1', 'refresh1');
      expect(getGmailClient).toHaveBeenCalledWith('access2', 'refresh2');

      // Verify Gmail delete was called for each email
      const gmailClient = getGmailClient('access1', 'refresh1');
      expect(gmailClient.users.messages.trash).toHaveBeenCalledTimes(3);
      expect(gmailClient.users.messages.trash).toHaveBeenCalledWith({
        userId: 'me',
        id: 'gmail1',
      });
      expect(gmailClient.users.messages.trash).toHaveBeenCalledWith({
        userId: 'me',
        id: 'gmail2',
      });
      expect(gmailClient.users.messages.trash).toHaveBeenCalledWith({
        userId: 'me',
        id: 'gmail3',
      });

      // Verify database delete was called
      expect(db.delete).toHaveBeenCalled();
    });

    it('should handle missing access tokens', async () => {
      const mockLinkedAccountsWithoutTokens = [
        {
          id: 1,
          userId: 1,
          accessToken: null,
          refreshToken: null,
        },
      ];
      (db.query.linkedAccounts.findMany as jest.Mock).mockResolvedValue(mockLinkedAccountsWithoutTokens);

      await deleteEmailsByIds(mockUserId, mockEmailIds);

      // Verify Gmail client was not called
      expect(getGmailClient).not.toHaveBeenCalled();

      // Verify database delete was still called
      expect(db.delete).toHaveBeenCalled();
    });

    it('should handle Gmail API errors', async () => {
      const mockGmailError = new Error('Gmail API Error');
      (getGmailClient as jest.Mock).mockReturnValue({
        users: {
          messages: {
            trash: jest.fn().mockRejectedValue(mockGmailError),
          },
        },
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await deleteEmailsByIds(mockUserId, mockEmailIds);

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalled();

      // Verify database delete was still called
      expect(db.delete).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle empty email IDs array', async () => {
      await deleteEmailsByIds(mockUserId, []);

      // Verify no Gmail client calls
      expect(getGmailClient).not.toHaveBeenCalled();

      // Verify database delete was still called
      expect(db.delete).toHaveBeenCalled();
    });
  });
});
