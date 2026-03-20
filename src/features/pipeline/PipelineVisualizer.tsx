// src/features/pipeline/PipelineVisualizer.tsx
// Real-time TOD pipeline state visualizer sidebar component

import React, { useState } from 'react'
import { useAppStore } from '../../store/store'
import { sanitise } from '../../shared/utils/sanitise'

/* ── SVG icon helpers (inline, no deps) ─────────────────────────── */

const IconMic = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
)

const IconBrain = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
    <line x1="10" y1="22" x2="14" y2="22" />
  </svg>
)

const IconDatabase = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4.03 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
  </svg>
)

const IconTarget = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
)

const IconChat = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)

const IconChevron = ({ open }: { open: boolean }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      transition: 'transform 0.2s ease',
      transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
    }}
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

/* ── Collapsible section wrapper ────────────────────────────────── */

interface StepProps {
  icon: React.ReactNode
  label: string
  isLast?: boolean
  children: React.ReactNode
  defaultOpen?: boolean
  accentColor?: string
}

function PipelineStep({ icon, label, isLast, children, defaultOpen = true, accentColor = 'var(--color-accent)' }: StepProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div style={{ display: 'flex', gap: '0.75rem' }}>
      {/* Vertical connector */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: '1.5rem' }}>
        <div
          style={{
            width: '1.5rem',
            height: '1.5rem',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: accentColor,
            color: '#fff',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        {!isLast && (
          <div style={{ width: '2px', flexGrow: 1, background: 'var(--color-border)', marginTop: '4px', marginBottom: '4px' }} />
        )}
      </div>

      {/* Content */}
      <div style={{ flexGrow: 1, paddingBottom: isLast ? 0 : '0.75rem', minWidth: 0 }}>
        <button
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: 'var(--color-text-secondary)',
            fontSize: '0.6875rem',
            fontWeight: 600,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.06em',
            marginBottom: open ? '0.5rem' : 0,
          }}
        >
          <IconChevron open={open} />
          {label}
        </button>
        {open && children}
      </div>
    </div>
  )
}

/* ── Circular progress ring ─────────────────────────────────────── */

function ProgressRing({ filled, total, size = 48 }: { filled: number; total: number; size?: number }) {
  const strokeWidth = 4
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const pct = total > 0 ? filled / total : 0
  const offset = circumference * (1 - pct)

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-success)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.6875rem',
          fontWeight: 600,
          color: 'var(--color-text)',
        }}
      >
        {filled}/{total}
      </div>
    </div>
  )
}

/* ── Main component ─────────────────────────────────────────────── */

export function PipelineVisualizer(): React.ReactElement {
  const latest = useAppStore((s) => s.pipeline.latest)
  const outputs = useAppStore((s) => s.pipeline.outputs)

  if (!latest) {
    return (
      <aside
        aria-label="Pipeline visualization"
        style={{
          padding: '1.5rem',
          color: 'var(--color-text-muted)',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-card)',
          borderLeft: '3px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '6rem',
        }}
      >
        <p style={{ margin: 0, fontSize: '0.875rem', textAlign: 'center' }}>
          Pipeline data will appear here during the conversation.
        </p>
      </aside>
    )
  }

  const filledSlots = Object.entries(latest.state.slots).filter(([, v]) => v !== null)
  const emptySlots = Object.entries(latest.state.slots).filter(([, v]) => v === null)
  const totalSlots = Object.keys(latest.state.slots).length
  const filledCount = filledSlots.length
  const confidencePct = (latest.nlu.confidence * 100).toFixed(0)

  return (
    <aside
      aria-label="Pipeline visualization"
      style={{
        padding: '1rem',
        fontSize: '0.875rem',
        overflowY: 'auto',
        maxHeight: '100%',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-card)',
        borderLeft: '3px solid var(--color-accent)',
      }}
    >
      {/* STT Output */}
      <PipelineStep key="STT" icon={<IconMic />} label="STT" accentColor="var(--color-accent)">
        {latest.sttText ? (
          <code style={codeBlockStyle}>{latest.sttText}</code>
        ) : (
          <span style={mutedStyle}>No transcription yet</span>
        )}
      </PipelineStep>

      {/* NLU Output */}
      <PipelineStep key="NLU" icon={<IconBrain />} label="NLU" accentColor="#8b5cf6">
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={intentBadgeStyle}>{latest.nlu.intent}</span>
            {/* Confidence bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexGrow: 1, minWidth: '4rem' }}>
              <div style={{ flexGrow: 1, height: '4px', borderRadius: '2px', background: 'var(--color-border)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${confidencePct}%`,
                  background: Number(confidencePct) >= 70 ? 'var(--color-success)' : 'var(--color-warning)',
                  borderRadius: '2px',
                  transition: 'width 0.3s ease',
                }} />
              </div>
              <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{confidencePct}%</span>
            </div>
          </div>
          {Object.keys(latest.nlu.slots).length > 0 && (
            <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
              {Object.entries(latest.nlu.slots).map(([name, value]) => (
                <span key={name} style={slotChipStyle}>
                  {name}: {value}
                </span>
              ))}
            </div>
          )}
        </div>
      </PipelineStep>

      {/* DST: Belief State */}
      <PipelineStep key="DST" icon={<IconDatabase />} label="DST" accentColor="#06b6d4">
        <div style={cardStyle}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
            <tbody>
              {filledSlots.map(([name, value]) => (
                <tr key={name}>
                  <td style={{ padding: '3px 8px 3px 0', color: 'var(--color-success)', fontWeight: 500, whiteSpace: 'nowrap' }}>{name}</td>
                  <td style={{ padding: '3px 0', color: 'var(--color-text)' }}>{value}</td>
                </tr>
              ))}
              {emptySlots.map(([name]) => (
                <tr key={name} style={{ opacity: 0.35 }}>
                  <td style={{ padding: '3px 8px 3px 0', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{name}</td>
                  <td style={{ padding: '3px 0', color: 'var(--color-text-muted)' }}>---</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PipelineStep>

      {/* Policy Decision */}
      <PipelineStep key="Policy" icon={<IconTarget />} label="Policy" accentColor="var(--color-warning)">
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={actionBadgeStyle}>{latest.action}</span>
            {latest.targetSlot && (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                target: <code style={{ color: 'var(--color-text-secondary)' }}>{latest.targetSlot}</code>
              </span>
            )}
          </div>
        </div>
      </PipelineStep>

      {/* NLG Response */}
      <PipelineStep key="NLG" icon={<IconChat />} label="NLG" accentColor="var(--color-success)" isLast>
        <div style={quoteBlockStyle}>
          <span
            /* eslint-disable-next-line react/no-danger */
            dangerouslySetInnerHTML={{ __html: sanitise(latest.nlgResponse) }}
          />
        </div>
      </PipelineStep>

      {/* ── Stats section ──────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--color-border)', marginTop: '0.75rem', paddingTop: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {/* Turns counter */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)' }}>{latest.state.turnCount}</div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Turns</div>
          </div>

          {/* Slots progress ring */}
          <div
            role="progressbar"
            aria-valuenow={filledCount}
            aria-valuemin={0}
            aria-valuemax={totalSlots}
            aria-label="Slot filling progress"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}
          >
            <ProgressRing filled={filledCount} total={totalSlots} />
            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Slots</div>
          </div>

          {latest.state.confirmed && (
            <div style={{
              padding: '0.25rem 0.75rem',
              borderRadius: 'var(--radius-pill)',
              background: 'rgba(16, 185, 129, 0.15)',
              color: 'var(--color-success)',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}>
              Confirmed
            </div>
          )}
        </div>
      </div>

      {/* History count */}
      {outputs.length > 1 && (
        <div style={{ marginTop: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.6875rem' }}>
          {outputs.length} pipeline outputs recorded
        </div>
      )}
    </aside>
  )
}

/* ── Shared styles ──────────────────────────────────────────────── */

const cardStyle: React.CSSProperties = {
  padding: '0.5rem 0.625rem',
  backgroundColor: 'var(--color-surface-glass)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-input)',
}

const codeBlockStyle: React.CSSProperties = {
  display: 'block',
  padding: '0.5rem 0.625rem',
  backgroundColor: 'var(--color-surface-glass)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-input)',
  fontFamily: 'monospace',
  fontSize: '0.8125rem',
  color: 'var(--color-text)',
  wordBreak: 'break-word' as const,
}

const mutedStyle: React.CSSProperties = {
  fontSize: '0.8125rem',
  color: 'var(--color-text-muted)',
  fontStyle: 'italic',
}

const intentBadgeStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.125rem 0.5rem',
  borderRadius: 'var(--radius-pill)',
  background: 'rgba(139, 92, 246, 0.2)',
  color: '#a78bfa',
  fontSize: '0.75rem',
  fontWeight: 600,
}

const slotChipStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.125rem 0.5rem',
  borderRadius: 'var(--radius-pill)',
  background: 'rgba(59, 130, 246, 0.15)',
  color: 'var(--color-accent)',
  fontSize: '0.6875rem',
  fontWeight: 500,
}

const actionBadgeStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.125rem 0.5rem',
  borderRadius: 'var(--radius-pill)',
  background: 'rgba(245, 158, 11, 0.2)',
  color: 'var(--color-warning)',
  fontSize: '0.75rem',
  fontWeight: 600,
}

const quoteBlockStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  borderLeft: '3px solid var(--color-success)',
  backgroundColor: 'rgba(16, 185, 129, 0.08)',
  borderRadius: '0 var(--radius-input) var(--radius-input) 0',
  fontSize: '0.8125rem',
  color: 'var(--color-text)',
  lineHeight: 1.6,
  wordBreak: 'break-word' as const,
}
