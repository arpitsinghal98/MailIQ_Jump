export const startResize = (
  ref: React.RefObject<HTMLDivElement>,
  key: string
) => (e: React.MouseEvent) => {
  e.preventDefault();
  const startX = e.clientX;
  const startWidth = ref.current?.offsetWidth || 0;

  const doDrag = (moveEvent: MouseEvent) => {
    if (ref.current) {
      let newWidth = startWidth + moveEvent.clientX - startX;
      
      // Enforce minimum and maximum widths based on the panel
      if (key === "leftWidth") {
        newWidth = Math.max(200, Math.min(300, newWidth));
      } else if (key === "middleWidth") {
        newWidth = Math.max(300, Math.min(600, newWidth));
      }
      
      ref.current.style.width = `${newWidth}px`;
    }
  };

  const stopDrag = () => {
    if (ref.current) {
      localStorage.setItem(key, ref.current.offsetWidth.toString());
    }
    document.removeEventListener("mousemove", doDrag);
    document.removeEventListener("mouseup", stopDrag);
  };

  document.addEventListener("mousemove", doDrag);
  document.addEventListener("mouseup", stopDrag);
};