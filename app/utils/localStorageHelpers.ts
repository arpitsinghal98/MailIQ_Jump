export const restoreWidths = (
  leftRef: React.RefObject<HTMLDivElement>,
  middleRef: React.RefObject<HTMLDivElement>
) => {
  const storedLeft = localStorage.getItem("leftWidth");
  const storedMiddle = localStorage.getItem("middleWidth");
  if (leftRef.current && storedLeft) leftRef.current.style.width = `${storedLeft}px`;
  if (middleRef.current && storedMiddle) middleRef.current.style.width = `${storedMiddle}px`;
};