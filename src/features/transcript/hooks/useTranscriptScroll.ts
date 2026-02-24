// src/features/transcript/hooks/useTranscriptScroll.ts
// T036 – Auto-scroll hook: scrolls the transcript container to the bottom on each new entry.
// Source: spec.md FR-013 AC3

import { useRef, useEffect } from 'react'

/**
 * Returns a `containerRef` to attach to the scrollable transcript container.
 *
 * Whenever `entryCount` increases (new entry committed) the container is
 * scrolled to its bottom so the latest entry is visible.
 *
 * @param entryCount - Current number of committed transcript entries.
 *                     Changing this value triggers a scroll.
 */
export function useTranscriptScroll(
  entryCount: number,
): React.RefObject<HTMLDivElement | null> {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [entryCount])

  return containerRef
}
