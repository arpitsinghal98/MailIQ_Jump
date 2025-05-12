import { extractUnsubscribeLink } from '~/utils/unsubscribe/extractLink';

describe('Unsubscribe Link Extractor', () => {
  it('should return null for empty HTML', () => {
    expect(extractUnsubscribeLink('')).toBeNull();
  });

  it('should extract link from anchor text', () => {
    const html = '<a href="https://example.com/unsubscribe">Unsubscribe</a>';
    expect(extractUnsubscribeLink(html)).toBe('https://example.com/unsubscribe');
  });

  it('should extract link from href attribute', () => {
    const html = '<a href="https://example.com/unsubscribe">Click here</a>';
    expect(extractUnsubscribeLink(html)).toBe('https://example.com/unsubscribe');
  });

  it('should extract link from surrounding text', () => {
    const html = '<p>To unsubscribe from our newsletter <a href="https://example.com/unsubscribe">click here</a></p>';
    expect(extractUnsubscribeLink(html)).toBe('https://example.com/unsubscribe');
  });

  it('should handle relative URLs with base URL', () => {
    const html = '<a href="/unsubscribe">Unsubscribe</a>';
    const baseUrl = 'https://example.com';
    expect(extractUnsubscribeLink(html, baseUrl)).toBe('https://example.com/unsubscribe');
  });

  it('should handle HTML entities in URLs', () => {
    const html = '<a href="https://example.com/unsubscribe&amp;id=123">Unsubscribe</a>';
    expect(extractUnsubscribeLink(html)).toBe('https://example.com/unsubscribe&id=123');
  });

  it('should extract link from List-Unsubscribe header', () => {
    const html = 'List-Unsubscribe: <https://example.com/unsubscribe>';
    expect(extractUnsubscribeLink(html)).toBe('https://example.com/unsubscribe');
  });

  it('should return null when no unsubscribe link is found', () => {
    const html = '<a href="https://example.com">Regular link</a>';
    expect(extractUnsubscribeLink(html)).toBeNull();
  });

  it('should handle invalid URLs', () => {
    const html = '<a href="invalid-url">Unsubscribe</a>';
    const baseUrl = 'https://example.com';
    expect(extractUnsubscribeLink(html, baseUrl)).toBeNull();
  });

  it('should handle multiple unsubscribe links and return the first valid one', () => {
    const html = `
      <a href="invalid-url">Unsubscribe</a>
      <a href="https://example.com/unsubscribe">Unsubscribe</a>
      <a href="https://example.com/other-unsubscribe">Unsubscribe</a>
    `;
    expect(extractUnsubscribeLink(html)).toBe('https://example.com/unsubscribe');
  });

  it('should handle case-insensitive matching', () => {
    const html = '<a href="https://example.com/UNSUBSCRIBE">Click here</a>';
    expect(extractUnsubscribeLink(html)).toBe('https://example.com/UNSUBSCRIBE');
  });
});
