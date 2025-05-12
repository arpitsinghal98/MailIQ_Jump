import { analyzeEmail } from '~/utils/ai';
import { GoogleGenAI } from '@google/genai';

// Mock the GoogleGenAI class
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: jest.fn(),
    },
  })),
}));

describe('AI Utils', () => {
  const mockCategories = [
    { name: 'Newsletter', description: 'Regular email newsletters and updates' },
    { name: 'Promotion', description: 'Marketing and promotional emails' },
    { name: 'Notification', description: 'System notifications and alerts' },
  ];

  let mockGenerateContent: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateContent = jest.fn();
    (GoogleGenAI as jest.Mock).mockImplementation(() => ({
      models: { generateContent: mockGenerateContent },
    }));
  });

  describe('analyzeEmail', () => {
    it('handles empty email content', async () => {
      const result = await analyzeEmail('', mockCategories);
      expect(result).toEqual({
        category: 'None',
        summary: 'Empty email content',
        unsubscribeUrl: null,
      });
    });

    it('handles valid email content with category and unsubscribe link', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                category: 'Newsletter',
                summary: 'Weekly tech news digest',
                unsubscribeUrl: 'https://example.com/unsubscribe',
              }),
            }],
          },
        }],
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await analyzeEmail('<html>Test email</html>', mockCategories);
      expect(result).toEqual({
        category: 'Newsletter',
        summary: 'Weekly tech news digest',
        unsubscribeUrl: 'https://example.com/unsubscribe',
      });
    });

    it('handles AI response parsing error', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: 'Invalid JSON',
            }],
          },
        }],
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await analyzeEmail('<html>Test email</html>', mockCategories);
      expect(result).toEqual({
        category: 'None',
        summary: 'Failed to parse AI response',
        unsubscribeUrl: null,
      });
    });

    it('handles AI API error', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API Error'));

      const result = await analyzeEmail('<html>Test email</html>', mockCategories);
      expect(result).toEqual({
        category: 'None',
        summary: 'AI analysis failed',
        unsubscribeUrl: null,
      });
    });

    it('handles empty AI response', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: '',
            }],
          },
        }],
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await analyzeEmail('<html>Test email</html>', mockCategories);
      expect(result).toEqual({
        category: 'None',
        summary: 'Failed to analyze email',
        unsubscribeUrl: null,
      });
    });

    it('validates category name against provided categories', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                category: 'InvalidCategory',
                summary: 'Test summary',
                unsubscribeUrl: null,
              }),
            }],
          },
        }],
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await analyzeEmail('<html>Test email</html>', mockCategories);
      expect(result.category).toBe('None');
    });
  });
});
