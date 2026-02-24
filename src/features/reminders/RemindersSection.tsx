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
    <section aria-labelledby="reminders-section-heading">
      <h2
        id="reminders-section-heading"
        style={{
          margin: '0 0 0.75rem',
          fontSize: '1rem',
          fontWeight: 700,
          color: '#111827',
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
            gap: '0.5rem',
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
                  gap: '0.375rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#ffffff',
                }}
              >
                {/* Reminder text — sanitised before insertion */}
                <p
                  /* eslint-disable-next-line react/no-danger */
                  dangerouslySetInnerHTML={{ __html: safeText }}
                  style={{
                    margin: 0,
                    fontSize: '0.9375rem',
                    lineHeight: 1.6,
                    color: '#111827',
                  }}
                />

                {/* Due date — only shown when present */}
                {dueDateLabel && (
                  <time
                    dateTime={reminder.dueAt ?? undefined}
                    style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      fontWeight: 500,
                    }}
                  >
                    Due: {dueDateLabel}
                  </time>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
