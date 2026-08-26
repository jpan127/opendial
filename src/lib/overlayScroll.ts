// Overlay scrollbar: hidden until the pane is hovered or actively scrolling.
import { useRef, useState } from 'react';

export function useOverlayScroll() {
  const [scrolling, setScrolling] = useState(false);
  const timer = useRef(0);

  const onScroll = () => {
    setScrolling(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setScrolling(false), 700);
  };

  return { scrolling, onScroll };
}
