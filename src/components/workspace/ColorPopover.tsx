import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";

interface ColorPopoverProps {
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
}

// Escape the toolbar's scroll container so floating controls cannot be clipped.
export const ColorPopover = ({ anchorRef, children }: ColorPopoverProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });

  useLayoutEffect(() => {
    const updatePosition = () => {
      const anchor = anchorRef.current;
      const popover = ref.current;
      if (!anchor || !popover) return;
      const rect = anchor.getBoundingClientRect();
      const { width, height } = popover.getBoundingClientRect();
      const margin = 8;
      const desktop = window.matchMedia("(min-width: 768px)").matches;
      const left = desktop ? rect.right + margin : rect.left;
      const top = desktop ? rect.bottom - height : rect.top - height - margin;
      setPosition({
        left: Math.max(
          margin,
          Math.min(left, window.innerWidth - width - margin),
        ),
        top: Math.max(
          margin,
          Math.min(top, window.innerHeight - height - margin),
        ),
      });
    };
    updatePosition();
    const observer = new ResizeObserver(updatePosition);
    if (ref.current) observer.observe(ref.current);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchorRef]);

  return createPortal(
    <div
      ref={ref}
      className="fixed z-[80] max-w-[calc(100vw-16px)]"
      style={position}
    >
      {children}
    </div>,
    document.body,
  );
};
