import { parseFullGmailMessage, decodeBase64, extractHtmlFromPayload } from '~/utils/parseFullGmailMessage';
import { GaxiosResponse } from 'gaxios';
import { gmail_v1 } from 'googleapis';

describe('Gmail Message Parser', () => {
  describe('decodeBase64', () => {
    it('should decode valid base64 string', () => {
      const encoded = btoa('Hello, World!');
      expect(decodeBase64(encoded)).toBe('Hello, World!');
    });

    it('should handle URL-safe base64', () => {
      const encoded = btoa('Hello, World!').replace(/\+/g, '-').replace(/\//g, '_');
      expect(decodeBase64(encoded)).toBe('Hello, World!');
    });

    it('should return empty string for invalid base64', () => {
      expect(decodeBase64('invalid-base64!@#')).toBe('');
    });
  });

  describe('extractHtmlFromPayload', () => {
    it('should extract HTML from direct HTML payload', () => {
      const payload = {
        mimeType: 'text/html',
        body: {
          data: btoa('<p>Hello</p>'),
        },
      } as gmail_v1.Schema$MessagePart;

      expect(extractHtmlFromPayload(payload)).toBe('<p>Hello</p>');
    });

    it('should extract HTML from multipart payload', () => {
      const payload = {
        mimeType: 'multipart/alternative',
        parts: [
          {
            mimeType: 'text/plain',
            body: {
              data: btoa('Plain text'),
            },
          },
          {
            mimeType: 'text/html',
            body: {
              data: btoa('<p>HTML content</p>'),
            },
          },
        ],
      } as gmail_v1.Schema$MessagePart;

      expect(extractHtmlFromPayload(payload)).toBe('<p>HTML content</p>');
    });

    it('should fallback to plain text if no HTML', () => {
      const payload = {
        mimeType: 'multipart/alternative',
        parts: [
          {
            mimeType: 'text/plain',
            body: {
              data: btoa('Plain text content'),
            },
          },
        ],
      } as gmail_v1.Schema$MessagePart;

      expect(extractHtmlFromPayload(payload)).toBe('Plain text content');
    });

    it('should return default message for empty payload', () => {
      expect(extractHtmlFromPayload(null as any)).toBe('');
    });
  });

  describe('parseFullGmailMessage', () => {
    const mockGmailMessage: GaxiosResponse<gmail_v1.Schema$Message> = {
      data: {
        id: 'msg123',
        payload: {
          headers: [
            { name: 'Subject', value: 'Test Subject' },
            { name: 'From', value: 'sender@example.com' },
            { name: 'To', value: 'recipient@example.com' },
            { name: 'Date', value: 'Wed, 1 Jan 2024 12:00:00 GMT' },
          ],
          mimeType: 'multipart/mixed',
          parts: [
            {
              mimeType: 'text/html',
              body: {
                data: btoa('<p>Email content</p>'),
              },
            },
            {
              filename: 'test.pdf',
              mimeType: 'application/pdf',
              body: {
                attachmentId: 'att123',
              },
            },
          ],
        },
      },
    } as GaxiosResponse<gmail_v1.Schema$Message>;

    it('should parse valid Gmail message', () => {
      const result = parseFullGmailMessage(mockGmailMessage);

      expect(result).toEqual({
        id: 'msg123',
        subject: 'Test Subject',
        from: 'sender@example.com',
        to: 'recipient@example.com',
        date: expect.stringMatching(/Wed, Jan 1, 2024, 12:00 .* [AP]M/),
        html: '<p>Email content</p>',
        attachments: [
          {
            filename: 'test.pdf',
            mimeType: 'application/pdf',
            attachmentId: 'att123',
          },
        ],
      });
    });

    it('should throw error for invalid message format', () => {
      const invalidMessage = {
        data: {},
      } as GaxiosResponse<gmail_v1.Schema$Message>;

      expect(() => parseFullGmailMessage(invalidMessage)).toThrow('Invalid Gmail message format');
    });

    it('should throw error for missing payload', () => {
      const messageWithoutPayload = {
        data: {
          id: 'msg123',
        },
      } as GaxiosResponse<gmail_v1.Schema$Message>;

      expect(() => parseFullGmailMessage(messageWithoutPayload)).toThrow('Invalid message format: missing payload');
    });

    it('should handle message without attachments', () => {
      const messageWithoutAttachments = {
        ...mockGmailMessage,
        data: {
          ...mockGmailMessage.data,
          payload: {
            ...mockGmailMessage.data.payload,
            parts: [
              {
                mimeType: 'text/html',
                body: {
                  data: btoa('<p>Email content</p>'),
                },
              },
            ],
          },
        },
      };

      const result = parseFullGmailMessage(messageWithoutAttachments);
      expect(result.attachments).toEqual([]);
    });

    it('should handle message without date', () => {
      const messageWithoutDate = {
        ...mockGmailMessage,
        data: {
          ...mockGmailMessage.data,
          payload: {
            ...mockGmailMessage.data.payload!,
            headers: mockGmailMessage.data.payload!.headers?.filter(h => h.name !== 'Date'),
          },
        },
      };

      const result = parseFullGmailMessage(messageWithoutDate);
      expect(result.date).toBe('');
    });
  });
});
