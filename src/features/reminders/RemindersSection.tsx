// src/features/reminders/RemindersSection.tsx
// T043 – Reminders section for the post-call dashboard (spec.md US4 AC3, AC5)
// Renders the reminders array from PostCallResponse.
// Each row shows sanitised text and optional dueAt formatted to locale date-time.

import React from 'react'
import EmptyState from '../../shared/components/EmptyState'
import { sanitise } from '../../shared/utils/sanitise'
import type { Reminder } from '../../shared/types/call-session'

export interface RemindersSectionProps {
  reminders: Reminder[]
}

/**
 * Renders post-call extracted reminders.
 * - `reminder.text` is sanitised via DOMPurify before DOM insertion (Principle VII).
 * - `reminder.dueAt` is formatted as a locale date-time string when present.
 * - Shows `<EmptyState>` when no reminders were identified.
 */
export function RemindersSection({ reminders }: RemindersSectionProps): React.ReactElement {
  return (
    <section
      aria-labelledby="reminders-section-heading"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-card)',
        padding: '1.25rem 1.5rem',
      }}
    >
      <h2
        id="reminders-section-heading"
        style={{
          margin: '0 0 1rem',
          fontSize: '0.9375rem',
          fontWeight: 700,
          color: 'var(--color-text)',
          letterSpacing: '0.01em',
        }}
      >
        Reminders
      </h2>

      {reminders.length === 0 ? (
        <EmptyState
          title="No reminders identified"
          description="No follow-up reminders were noted during this call."
        />
      ) : (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.625rem',
          }}
          aria-label="Reminders"
        >
          {reminders.map((reminder) => {
            const safeText = sanitise(reminder.text)
            const dueDateLabel = reminder.dueAt
              ? new Date(reminder.dueAt).toLocaleString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : null

            return (
              <li
                key={reminder.index}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  padding: '0.875rem 1rem',
                  borderRadius: 'var(--radius-input)',
                  backgroundColor: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {/* Reminder text — sanitised before insertion */}
                <p
                  /* eslint-disable-next-line react/no-danger */
                  dangerouslySetInnerHTML={{ __html: safeText }}
                  style={{
                    margin: 0,
                    fontSize: '0.875rem',
                    lineHeight: 1.6,
                    color: 'var(--color-text-secondary)',
                  }}
                />

                {/* Due date — only shown when present */}
                {dueDateLabel && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                    }}
                  >
                    {/* Calendar icon */}
                    <svg
                      aria-hidden="true"
                      width="12"
                      height="12"
                      viewBox="0 0 16 16"
                      fill="none"
                      style={{ flexShrink: 0 }}
                    >
                      <rect
                        x="2"
                        y="3"
                        width="12"
                        height="11"
                        rx="1.5"
                        stroke="var(--color-text-muted)"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M5 1v3M11 1v3M2 7h12"
                        stroke="var(--color-text-muted)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    <time
                      dateTime={reminder.dueAt ?? undefined}
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        color: 'var(--color-warning)',
                        letterSpacing: '0.01em',
                      }}
                    >
                      Due: {dueDateLabel}
                    </time>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
