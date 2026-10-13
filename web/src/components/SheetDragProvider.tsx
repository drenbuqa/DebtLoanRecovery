'use client';
import { useEffect } from 'react';

const CLOSE_RATIO    = 0.38;  // dismiss if dragged past 38% of sheet height
const CLOSE_VELOCITY = 0.45;  // or if flicked fast enough (px/ms)
const DRAG_SLOP      = 8;     // px dead-zone so taps don't accidentally start a drag

export function SheetDragProvider() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(min-width: 768px)').matches) return;

    const handled = new WeakSet<Element>();

    function injectHandle(panel: HTMLElement) {
      if (handled.has(panel)) return;
      handled.add(panel);

      const handle = document.createElement('div');
      handle.className = 'sheet-drag-handle';
      // touch-action:none gives our JS full ownership of touches on this element
      handle.style.cssText = [
        'width:100%', 'height:36px', 'display:flex', 'align-items:center',
        'justify-content:center', 'flex-shrink:0', 'touch-action:none',
        'cursor:grab', 'user-select:none', '-webkit-user-select:none',
      ].join(';');

      const pill = document.createElement('div');
      pill.style.cssText = 'width:40px;height:4px;border-radius:2px;background:#cbd5e1;pointer-events:none;';
      handle.appendChild(pill);

      panel.insertBefore(handle, panel.firstChild);
    }

    // Watch for modals added to the DOM (they're portalled into <body>)
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of Array.from(m.addedNodes)) {
          if (!(node instanceof HTMLElement)) continue;
          if (node.classList.contains('modal-panel')) injectHandle(node);
          node.querySelectorAll<HTMLElement>('.modal-panel').forEach(injectHandle);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Handle any panels already mounted
    document.querySelectorAll<HTMLElement>('.modal-panel').forEach(injectHandle);

    // ── Drag state ────────────────────────────────────────────
    let panel: HTMLElement | null = null;
    let startY    = 0;
    let currentY  = 0;
    let startTime = 0;
    let dragging  = false;

    function onTouchStart(e: TouchEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('.sheet-drag-handle')) return;
      const p = target.closest('.modal-panel') as HTMLElement | null;
      if (!p) return;

      panel     = p;
      startY    = e.touches[0].clientY;
      currentY  = 0;
      startTime = Date.now();
      dragging  = false;

      p.style.transition = 'none';
      p.style.willChange = 'transform';
    }

    function onTouchMove(e: TouchEvent) {
      if (!panel) return;
      const dy = e.touches[0].clientY - startY;
      if (dy <= 0) { currentY = 0; return; }
      // Small dead-zone so an accidental nudge during a tap doesn't start a drag
      if (dy < DRAG_SLOP && !dragging) return;
      dragging = true;
      currentY = dy;
      e.preventDefault();
      // Slight resistance as the sheet moves so it feels weighted
      const resistance = dy < 80 ? dy : 80 + (dy - 80) * 0.5;
      panel.style.transform = `translateY(${resistance}px)`;
    }

    function onTouchEnd() {
      if (!panel) return;
      const p = panel;
      panel = null;

      if (!dragging) {
        p.style.transition = '';
        p.style.willChange = '';
        return;
      }

      const elapsed  = Math.max(1, Date.now() - startTime);
      const velocity = currentY / elapsed;
      const threshold = p.offsetHeight * CLOSE_RATIO;

      if (currentY > threshold || velocity > CLOSE_VELOCITY) {
        // Dismiss: animate off-screen, then click backdrop to fire React onClose
        p.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
        p.style.transform  = 'translateY(110%)';
        setTimeout(() => {
          (p.closest('.modal-backdrop') as HTMLElement | null)?.click();
          p.style.cssText = '';
        }, 295);
      } else {
        // Snap back with a spring
        p.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
        p.style.transform  = 'translateY(0)';
        setTimeout(() => {
          p.style.transition = '';
          p.style.willChange = '';
        }, 400);
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove',  onTouchMove,  { passive: false });
    document.addEventListener('touchend',   onTouchEnd,   { passive: true });

    return () => {
      observer.disconnect();
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove',  onTouchMove);
      document.removeEventListener('touchend',   onTouchEnd);
    };
  }, []);

  return null;
}
