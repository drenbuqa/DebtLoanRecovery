'use client';
import { useEffect } from 'react';

const CLOSE_RATIO    = 0.38;  // dismiss past 38% of sheet height
const CLOSE_VELOCITY = 0.45;  // or on a fast flick (px/ms)
const DRAG_SLOP      = 8;     // px dead-zone — taps won't accidentally start a drag
const HANDLE_ZONE    = 48;    // px from top of panel that counts as the drag handle

export function SheetDragProvider() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(min-width: 768px)').matches) return;

    let panel: HTMLElement | null = null;
    let startY    = 0;
    let currentY  = 0;
    let startTime = 0;
    let dragging  = false;

    function onTouchStart(e: TouchEvent) {
      const target = e.target as HTMLElement;
      const p = target.closest('.modal-panel') as HTMLElement | null;
      if (!p) return;

      const rect   = p.getBoundingClientRect();
      const touchY = e.touches[0].clientY;

      // Only start drag from the handle zone at the very top
      if (touchY - rect.top > HANDLE_ZONE) return;

      panel     = p;
      startY    = touchY;
      currentY  = 0;
      startTime = Date.now();
      dragging  = false;

      p.style.transition = 'none';
      p.style.willChange = 'transform';
    }

    function onTouchMove(e: TouchEvent) {
      if (!panel) return;
      const dy = e.touches[0].clientY - startY;

      // Upward swipe — let the panel stay put (don't scroll it up)
      if (dy <= 0) { currentY = 0; return; }

      // Dead-zone: tiny movement during a tap — don't start drag yet
      if (dy < DRAG_SLOP && !dragging) return;

      dragging = true;
      currentY = dy;
      // Prevent page scroll while dragging
      e.preventDefault();

      // Apply resistance: full movement up to 80px, then dampen
      const travel = dy < 80 ? dy : 80 + (dy - 80) * 0.45;
      panel.style.transform = `translateY(${travel}px)`;
    }

    function onTouchEnd() {
      if (!panel) return;
      const p  = panel;
      panel    = null;

      if (!dragging) {
        p.style.transition = '';
        p.style.willChange = '';
        return;
      }

      const elapsed   = Math.max(1, Date.now() - startTime);
      const velocity  = currentY / elapsed;
      const threshold = p.offsetHeight * CLOSE_RATIO;

      if (currentY > threshold || velocity > CLOSE_VELOCITY) {
        // Slide off-screen, then fire the backdrop click to call React's onClose
        p.style.transition = 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)';
        p.style.transform  = 'translateY(110%)';
        setTimeout(() => {
          (p.closest('.modal-backdrop') as HTMLElement | null)?.click();
          p.style.cssText = '';
        }, 270);
      } else {
        // Snap back with a springy overshoot
        p.style.transition = 'transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)';
        p.style.transform  = 'translateY(0)';
        setTimeout(() => {
          p.style.transition = '';
          p.style.willChange = '';
        }, 450);
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    // Non-passive so we can call preventDefault during a downward drag
    document.addEventListener('touchmove',  onTouchMove,  { passive: false });
    document.addEventListener('touchend',   onTouchEnd,   { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove',  onTouchMove);
      document.removeEventListener('touchend',   onTouchEnd);
    };
  }, []);

  return null;
}
