'use client';
import { useEffect } from 'react';

// Threshold above which we snap the sheet closed
const CLOSE_DISTANCE_RATIO = 0.38; // 38% of panel height
const CLOSE_VELOCITY = 0.45;       // px/ms

export function SheetDragProvider() {
  useEffect(() => {
    // Only active on mobile (touch devices w/ narrow viewport)
    if (window.matchMedia('(min-width: 768px)').matches) return;

    let panel: HTMLElement | null = null;
    let startY = 0;
    let currentY = 0;
    let startTime = 0;
    let dragging = false;

    function findPanel(target: EventTarget | null): HTMLElement | null {
      if (!target || !(target instanceof Element)) return null;
      return target.closest('.modal-panel') as HTMLElement | null;
    }

    function onTouchStart(e: TouchEvent) {
      const p = findPanel(e.target);
      if (!p) return;

      const rect = p.getBoundingClientRect();
      const touchY = e.touches[0].clientY;
      // Only initiate drag from top 64px (drag handle + header area)
      if (touchY - rect.top > 64) return;

      panel = p;
      startY = touchY;
      currentY = 0;
      startTime = Date.now();
      dragging = false;
      panel.style.transition = 'none';
      panel.style.willChange = 'transform';
    }

    function onTouchMove(e: TouchEvent) {
      if (!panel) return;
      const dy = e.touches[0].clientY - startY;
      if (dy <= 0) {
        currentY = 0;
        return;
      }
      // Require a meaningful movement before committing to drag.
      // Below this threshold we do nothing — the touch can still resolve as a click.
      if (dy < 10 && !dragging) return;
      dragging = true;
      currentY = dy;
      e.preventDefault();
      panel.style.transform = `translateY(${dy}px)`;
    }

    function onTouchEnd() {
      if (!panel) return;
      const p = panel;
      panel = null;

      if (!dragging) {
        // Tiny movement — just clean up
        p.style.transition = '';
        p.style.willChange = '';
        return;
      }

      const elapsed = Math.max(1, Date.now() - startTime);
      const velocity = currentY / elapsed;
      const threshold = p.offsetHeight * CLOSE_DISTANCE_RATIO;

      if (currentY > threshold || velocity > CLOSE_VELOCITY) {
        // Animate out, then click backdrop to trigger React onClose handler
        p.style.transition = 'transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)';
        p.style.transform = `translateY(110%)`;
        setTimeout(() => {
          const backdrop = p.closest('.modal-backdrop') as HTMLElement | null;
          backdrop?.click();
          // Reset in case React keeps the element mounted briefly
          p.style.transform = '';
          p.style.transition = '';
          p.style.willChange = '';
        }, 310);
      } else {
        // Snap back with spring
        p.style.transition = 'transform 0.42s cubic-bezier(0.32, 0.72, 0, 1)';
        p.style.transform = 'translateY(0)';
        setTimeout(() => {
          p.style.transition = '';
          p.style.willChange = '';
        }, 420);
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    // Non-passive so we can preventDefault while dragging (prevents page scroll)
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  return null;
}
