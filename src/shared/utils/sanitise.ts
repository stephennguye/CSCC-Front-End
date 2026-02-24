// src/shared/utils/sanitise.ts
// T011 – DOMPurify wrapper
// Per plan.md §Principle VII: ALL untrusted text MUST pass through this
// function before DOM insertion (transcript tokens, claim text, reminder text,
// error messages, agent-generated content).

import DOMPurify from 'dompurify'

/**
 * Sanitise an untrusted string using DOMPurify before inserting it into the DOM.
 *
 * @param raw - The raw, potentially unsafe string from external sources.
 * @returns A sanitised string safe for DOM insertion.
 */
export function sanitise(raw: string): string {
  return DOMPurify.sanitize(raw)
}
