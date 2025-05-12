import { restoreWidths } from '~/utils/localStorageHelpers';

describe('LocalStorage Helpers', () => {
  let mockLocalStorage: { [key: string]: string };
  let mockLeftRef: React.RefObject<HTMLDivElement>;
  let mockMiddleRef: React.RefObject<HTMLDivElement>;

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key: string) => mockLocalStorage[key]),
        setItem: jest.fn((key: string, value: string) => {
          mockLocalStorage[key] = value;
        }),
      },
      writable: true,
    });

    // Mock refs
    mockLeftRef = {
      current: document.createElement('div'),
    };
    mockMiddleRef = {
      current: document.createElement('div'),
    };
  });

  describe('restoreWidths', () => {
    it('should restore widths from localStorage', () => {
      // Set up localStorage values
      mockLocalStorage['leftWidth'] = '200';
      mockLocalStorage['middleWidth'] = '300';

      // Call the function
      restoreWidths(mockLeftRef, mockMiddleRef);

      // Verify widths were restored
      expect(mockLeftRef.current?.style.width).toBe('200px');
      expect(mockMiddleRef.current?.style.width).toBe('300px');
    });

    it('should not modify widths if localStorage values are not present', () => {
      // Call the function with empty localStorage
      restoreWidths(mockLeftRef, mockMiddleRef);

      // Verify widths were not modified
      expect(mockLeftRef.current?.style.width).toBe('');
      expect(mockMiddleRef.current?.style.width).toBe('');
    });

    it('should handle null refs', () => {
      // Set up localStorage values
      mockLocalStorage['leftWidth'] = '200';
      mockLocalStorage['middleWidth'] = '300';

      // Create null refs
      const nullLeftRef = { current: null };
      const nullMiddleRef = { current: null };

      // Call the function with null refs
      restoreWidths(nullLeftRef, nullMiddleRef);

      // Verify no errors occurred
      expect(mockLocalStorage['leftWidth']).toBe('200');
      expect(mockLocalStorage['middleWidth']).toBe('300');
    });

    it('should handle invalid width values', () => {
      // Set up invalid localStorage values
      mockLocalStorage['leftWidth'] = 'invalid';
      mockLocalStorage['middleWidth'] = 'also-invalid';

      // Call the function
      restoreWidths(mockLeftRef, mockMiddleRef);

      // Verify widths were set with invalid values
      expect(mockLeftRef.current?.style.width).toBe('invalidpx');
      expect(mockMiddleRef.current?.style.width).toBe('also-invalidpx');
    });
  });
});
