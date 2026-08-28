import { useState, useCallback } from "react";

/**
 * Returns [isSpinning, triggerRefresh].
 * Guarantees the spin animation lasts at least `minMs` (default 600ms)
 * so users always see it even when data loads instantly.
 */
export function useRefreshing(minMs = 350) {
  const [spinning, setSpinning] = useState(false);

  const trigger = useCallback(
    async (fn: () => Promise<void> | void) => {
      setSpinning(true);
      const start = Date.now();
      try {
        await fn();
      } finally {
        const elapsed = Date.now() - start;
        const remaining = minMs - elapsed;
        if (remaining > 0) {
          await new Promise((r) => setTimeout(r, remaining));
        }
        setSpinning(false);
      }
    },
    [minMs]
  );

  return [spinning, trigger] as const;
}
