import { startResize } from '~/utils/resizeHandlers';

describe('Resize Handlers', () => {
  let mockRef: React.RefObject<HTMLDivElement>;
  let mockLocalStorage: { [key: string]: string };
  let mockMouseEvent: React.MouseEvent;
  let mockMoveEvent: MouseEvent;

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

    // Mock ref
    const div = document.createElement('div');
    Object.defineProperty(div, 'offsetWidth', {
      value: 250,
      writable: true,
    });
    mockRef = {
      current: div,
    };

    // Mock events
    mockMouseEvent = {
      preventDefault: jest.fn(),
      clientX: 100,
    } as unknown as React.MouseEvent;

    mockMoveEvent = {
      clientX: 150,
    } as MouseEvent;

    // Mock document event listeners
    document.addEventListener = jest.fn();
    document.removeEventListener = jest.fn();
  });

  describe('startResize', () => {
    it('should handle left panel resize within bounds', () => {
      const resizeHandler = startResize(mockRef, 'leftWidth');
      resizeHandler(mockMouseEvent);

      // Simulate mousemove
      const doDrag = (document.addEventListener as jest.Mock).mock.calls[0][1];
      doDrag(mockMoveEvent);

      // Verify width was updated correctly
      expect(mockRef.current?.style.width).toBe('300px'); // Max width for left panel
    });

    it('should handle middle panel resize within bounds', () => {
      const resizeHandler = startResize(mockRef, 'middleWidth');
      resizeHandler(mockMouseEvent);

      // Simulate mousemove
      const doDrag = (document.addEventListener as jest.Mock).mock.calls[0][1];
      doDrag(mockMoveEvent);

      // Verify width was updated correctly
      expect(mockRef.current?.style.width).toBe('350px');
    });

    it('should enforce minimum width for left panel', () => {
      const resizeHandler = startResize(mockRef, 'leftWidth');
      resizeHandler(mockMouseEvent);

      // Simulate mousemove with large negative offset
      const doDrag = (document.addEventListener as jest.Mock).mock.calls[0][1];
      Object.defineProperty(mockMoveEvent, 'clientX', { value: 0 }); // Move far left
      doDrag(mockMoveEvent);

      // Verify minimum width was enforced
      expect(mockRef.current?.style.width).toBe('200px');
    });

    it('should enforce maximum width for middle panel', () => {
      const resizeHandler = startResize(mockRef, 'middleWidth');
      resizeHandler(mockMouseEvent);

      // Simulate mousemove with large positive offset
      const doDrag = (document.addEventListener as jest.Mock).mock.calls[0][1];
      Object.defineProperty(mockMoveEvent, 'clientX', { value: 1000 }); // Move far right
      doDrag(mockMoveEvent);

      // Verify maximum width was enforced
      expect(mockRef.current?.style.width).toBe('600px');
    });

    it('should save width to localStorage on mouseup', () => {
      const resizeHandler = startResize(mockRef, 'leftWidth');
      resizeHandler(mockMouseEvent);

      // Simulate mouseup
      const stopDrag = (document.addEventListener as jest.Mock).mock.calls[1][1];
      stopDrag();

      // Verify width was saved to localStorage
      expect(localStorage.setItem).toHaveBeenCalledWith('leftWidth', '250');
    });

    it('should handle null ref', () => {
      const nullRef = { current: null };
      const resizeHandler = startResize(nullRef, 'leftWidth');
      
      // Should not throw error
      expect(() => resizeHandler(mockMouseEvent)).not.toThrow();

      // Simulate mousemove
      const doDrag = (document.addEventListener as jest.Mock).mock.calls[0][1];
      expect(() => doDrag(mockMoveEvent)).not.toThrow();
    });

    it('should add and remove event listeners', () => {
      const resizeHandler = startResize(mockRef, 'leftWidth');
      resizeHandler(mockMouseEvent);

      // Verify event listeners were added
      expect(document.addEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(document.addEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));

      // Simulate mouseup
      const stopDrag = (document.addEventListener as jest.Mock).mock.calls[1][1];
      stopDrag();

      // Verify event listeners were removed
      expect(document.removeEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(document.removeEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
    });
  });
});
