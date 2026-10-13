'use client';
import { useEffect } from 'react';

const CLOSE_RATIO    = 0.35;  // dismiss when dragged past 35% of sheet height
const CLOSE_VELOCITY = 0.5;   // or on a fast flick (px/ms)
const DRAG_SLOP      = 6;     // px dead-zone so taps don't start a drag
const HANDLE_ZONE    = 52;    // px from top of panel that counts as the drag handle

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
      if (touchY - rect.top > HANDLE_ZONE) return;

      panel     = p;
      startY    = touchY;
      currentY  = 0;
      startTime = Date.now();
      dragging  = false;

      // Stop the CSS animation so JS owns the transform property
      p.style.animation  = 'none';
      p.style.transition = 'none';
    }

    function onTouchMove(e: TouchEvent) {
      if (!panel) return;
      const dy = e.touches[0].clientY - startY;

      if (dy <= 0) { currentY = 0; return; }
      if (dy < DRAG_SLOP && !dragging) return;

      dragging = true;
      currentY = dy;
      e.preventDefault();

      panel.style.transform = `translateY(${dy}px)`;
    }

    function onTouchEnd() {
      if (!panel) return;
      const p  = panel;
      panel    = null;

      if (!dragging) {
        p.style.transition = '';
        p.style.transform  = '';
        return;
      }

      const elapsed   = Math.max(1, Date.now() - startTime);
      const velocity  = currentY / elapsed;
      const threshold = p.offsetHeight * CLOSE_RATIO;

      if (currentY > threshold || velocity > CLOSE_VELOCITY) {
        p.style.transition = 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)';
        p.style.transform  = `translateY(${p.offsetHeight}px)`;
        setTimeout(() => {
          (p.closest('.modal-backdrop') as HTMLElement | null)?.click();
          p.style.cssText = '';
        }, 240);
      } else {
        p.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
        p.style.transform  = 'translateY(0)';
        setTimeout(() => {
          p.style.transition = '';
        }, 300);
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true });
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
