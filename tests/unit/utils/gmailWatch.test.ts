import { setupGmailWatch } from '~/utils/gmailWatch';
import { getGmailClient } from '~/lib/gmail.server';

// Mock the Gmail client
jest.mock('~/lib/gmail.server', () => ({
  getGmailClient: jest.fn(),
}));

describe('Gmail Watch', () => {
  const mockAccessToken = 'access-token';
  const mockRefreshToken = 'refresh-token';
  const mockWatchResponse = {
    data: {
      historyId: '12345',
      expiration: '1234567890',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getGmailClient as jest.Mock).mockReturnValue({
      users: {
        watch: jest.fn().mockResolvedValue(mockWatchResponse),
      },
    });
  });

  describe('setupGmailWatch', () => {
    it('should set up Gmail watch successfully', async () => {
      const result = await setupGmailWatch(mockAccessToken, mockRefreshToken);

      // Verify Gmail client was called with correct tokens
      expect(getGmailClient).toHaveBeenCalledWith(mockAccessToken, mockRefreshToken);

      // Verify watch was called with correct parameters
      const gmailClient = getGmailClient(mockAccessToken, mockRefreshToken);
      expect(gmailClient.users.watch).toHaveBeenCalledWith({
        userId: 'me',
        requestBody: {
          labelIds: ['INBOX'],
          topicName: 'projects/psychic-bedrock-457106-m4/topics/gmail-push',
        },
      });

      // Verify response
      expect(result).toEqual(mockWatchResponse.data);
    });

    it('should handle Gmail API errors', async () => {
      const mockError = new Error('Gmail API Error');
      (getGmailClient as jest.Mock).mockReturnValue({
        users: {
          watch: jest.fn().mockRejectedValue(mockError),
        },
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Verify error is thrown
      await expect(setupGmailWatch(mockAccessToken, mockRefreshToken)).rejects.toThrow(mockError);

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Failed to set up Gmail watch:', mockError);

      consoleErrorSpy.mockRestore();
    });

    it('should handle missing tokens', async () => {
      // Verify error is thrown with missing access token
      await expect(setupGmailWatch('', mockRefreshToken)).rejects.toThrow();

      // Verify error is thrown with missing refresh token
      await expect(setupGmailWatch(mockAccessToken, '')).rejects.toThrow();

      // Verify Gmail client was not called
      expect(getGmailClient).not.toHaveBeenCalled();
    });
  });
});
