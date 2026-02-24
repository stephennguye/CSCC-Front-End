# Feature Specification: Real-Time Voice Call Frontend

**Feature Branch**: `001-voice-call-frontend`
**Created**: 2026-02-24
**Status**: Draft

## Clarifications

### Session 2026-02-24

- Q: What real-time protocol connects the frontend to the backend? → A: WebSocket
- Q: What audio encoding format should the frontend use when streaming microphone audio upstream? → A: Raw PCM, 16-bit, 16kHz, mono, binary WebSocket frames
- Q: How does the frontend receive and render TTS audio from the backend? → A: Binary PCM/WAV chunks over WebSocket binary frames (Coqui TTS / edge-tts)
- Q: How does the frontend authenticate on the WebSocket upgrade handshake? → A: Session token obtained via REST pre-call, passed on WebSocket upgrade
- Q: What file format should the post-call export use? → A: JSON

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Live Voice Call (Priority: P1)

A user navigates to the call screen, starts a voice call with the AI agent, speaks naturally, hears the AI respond in audio, and ends the call when finished. Throughout the call, the user sees the current connection state, a microphone status indicator, and an indicator showing when the AI is speaking.

**Why this priority**: This is the core value of the entire product. Without a working voice call, nothing else is relevant. It directly enables the primary user goal: conversing with an AI by voice.

**Independent Test**: Can be fully tested by starting a call, speaking a phrase, hearing an AI audio response, and ending the call — delivering the essential conversational AI experience.

**Acceptance Scenarios**:

1. **Given** the call screen is loaded and idle, **When** the user clicks Start Call, **Then** the system connects and transitions to the Listening state within 5 seconds.
2. **Given** the call is in the Listening state, **When** the user speaks, **Then** the AI Thinking indicator appears while the system processes the audio.
3. **Given** the AI Thinking state is active, **When** the AI begins responding, **Then** the AI Speaking indicator activates and the AI voice plays through the user's speakers.
4. **Given** the AI is speaking, **When** the user clicks End Call, **Then** the call terminates and the system transitions to the Call Ended state.
5. **Given** the call is active, **When** the user clicks End Call, **Then** the microphone capture stops and any in-progress AI audio stops.

---

### User Story 2 - Live Transcript During Call (Priority: P2)

While a voice call is in progress, the user can read a running transcript of the conversation. Each spoken turn — both the user's and the AI's — appears in the transcript panel as it is recognised, so the user can follow along or catch anything they missed audibly.

**Why this priority**: The transcript provides a critical accessibility and comprehension layer during the call. Users who mishear the AI, or who have hearing difficulties, rely on this to follow the conversation.

**Independent Test**: Can be tested independently by verifying that each recognised phrase from either the user or the AI appears in the transcript panel within an acceptable delay of the audio, without needing to view the post-call dashboard.

**Acceptance Scenarios**:

1. **Given** the call is in the Listening state, **When** the user finishes a spoken phrase, **Then** the user's words appear in the transcript panel labelled with the speaker and a timestamp.
2. **Given** the AI is speaking, **When** the AI produces text tokens, **Then** the tokens progressively appear in the transcript panel attributed to the AI.
3. **Given** the transcript is longer than the visible panel, **When** new content arrives, **Then** the panel automatically scrolls to show the latest entry.
4. **Given** the call is active, **When** the transcript is displayed, **Then** both the user's and AI's contributions are visually distinguished from each other.

---

### User Story 3 - Call State Visibility (Priority: P3)

At every moment during a call, the user can see a clear visual indicator showing the current system state: Idle, Connecting, Listening, AI Thinking, AI Speaking, Call Ended, or Error. This removes uncertainty and builds trust in the system's behaviour.

**Why this priority**: Transparent state feedback is essential for user confidence. Without it, users cannot tell if the system heard them, is thinking, or has encountered a problem.

**Independent Test**: Can be tested independently by triggering each state transition and verifying the UI updates to reflect the correct label and any associated visual cue (e.g., animated waveform for AI Speaking, spinner for Connecting).

**Acceptance Scenarios**:

1. **Given** no call is active, **When** the page loads, **Then** the state indicator shows "Idle".
2. **Given** the user starts a call, **When** the connection is being established, **Then** the indicator shows "Connecting".
3. **Given** the connection succeeds and the AI is not speaking, **When** the user is expected to speak, **Then** the indicator shows "Listening".
4. **Given** the user has finished speaking, **When** the AI is processing, **Then** the indicator shows "AI Thinking".
5. **Given** the AI is producing audio output, **When** it is playing, **Then** the indicator shows "AI Speaking".
6. **Given** the call ends normally, **When** the final state is reached, **Then** the indicator shows "Call Ended".
7. **Given** an unrecoverable error occurs, **When** it is detected, **Then** the indicator shows "Error" with a user-friendly explanation and a suggested action (e.g., retry).

---

### User Story 4 - Post-Call Review Dashboard (Priority: P4)

After a call ends, the user can open a review dashboard to see the full conversation transcript, any factual claims extracted from the call, and any reminders that were created. The user can also export this data for their own records.

**Why this priority**: The post-call dashboard closes the loop on any conversation, allowing users to review, verify, and act on what was discussed. It supports follow-through and accountability after every call.

**Independent Test**: Can be tested independently by navigating to a completed call session and verifying that transcript, claims, and reminders are all visible, and that exporting produces a downloadable file.

**Acceptance Scenarios**:

1. **Given** a call has ended, **When** the user opens the post-call dashboard, **Then** the complete call transcript is displayed in chronological order.
2. **Given** the transcript is displayed, **When** the user views the Claims section, **Then** all claims extracted during the call are listed with their source speaker and relevant text.
3. **Given** the transcript is displayed, **When** the user views the Reminders section, **Then** all reminders generated during or after the call are listed.
4. **Given** the user is on the post-call dashboard, **When** they click Export, **Then** a file containing the transcript, claims, and reminders is made available for download.
5. **Given** a call produced no transcript entries, **When** the user visits the dashboard, **Then** a friendly empty state is shown for each section rather than an error.

---

### User Story 5 - Connection Recovery (Priority: P5)

If the real-time connection drops during a call due to a network interruption, the system automatically attempts to reconnect without requiring user action. The user is informed of the disruption and sees the system recover when the connection is restored.

**Why this priority**: Network reliability cannot be guaranteed. Without automatic recovery, a brief interruption would permanently end the call, which significantly degrades the experience.

**Independent Test**: Can be tested independently by simulating a network drop during an active call and verifying that the system shows a reconnecting state, then resumes the call on reconnect, without user intervention.

**Acceptance Scenarios**:

1. **Given** a call is active, **When** the connection is lost, **Then** the state indicator immediately shows a "Reconnecting" or "Error" state.
2. **Given** the connection drops, **When** the network becomes available again, **Then** the system automatically restores the connection within 10 seconds and resumes the call state.
3. **Given** reconnection fails after exhausting retries, **When** the system gives up, **Then** the user is shown a clear error and offered a way to start a new call.

---

### Edge Cases

- What happens when the user denies microphone permission before starting a call?
- What happens when the user's device has no audio output device available?
- How does the system handle the user speaking while the AI is already speaking (interruption)?
- What happens when the AI audio stream is delayed or arrives out of order?
- What happens if the call drops immediately after the user clicks Start Call (during connection)?
- How does the system behave when the post-call export is triggered on a session with an empty transcript?
- What happens when the AI sends a message schema that does not conform to the agreed contract?
- What happens when the session token has expired or is rejected by the backend during a WebSocket upgrade attempt?

## Requirements *(mandatory)*

### Functional Requirements

**Call Screen**

- **FR-001**: Users MUST be able to start a voice call by activating a clearly labelled control.
- **FR-002**: Users MUST be able to end a voice call at any time by activating a clearly labelled control.
- **FR-003**: The system MUST display the current call state (Idle, Connecting, Listening, AI Thinking, AI Speaking, Reconnecting, Call Ended, Error) at all times on the call screen.
- **FR-004**: The system MUST show the microphone capture status (active or inactive) as a visible indicator.
- **FR-005**: The system MUST show an AI speaking indicator that is active only when the AI is producing audio output.

**Audio**

- **FR-006**: The system MUST capture the user's microphone audio when a call is active and the user has granted permission.
- **FR-007**: The system MUST stream captured microphone audio to the backend as raw PCM (16-bit, 16kHz, mono) binary frames over the WebSocket connection in real time during a call.
- **FR-008**: The system MUST play AI-generated audio received from the backend as binary PCM/WAV chunks over the WebSocket connection, decoding and queuing each chunk for output as it arrives without waiting for the complete response. If no audio output device is available, the system MUST display a non-blocking warning; call state and transcript MUST remain operational.
- **FR-009**: The system MUST support the user interrupting the AI mid-response by detecting new user speech while AI audio is playing. On barge-in, any in-progress AI partial transcript entry MUST be discarded (not committed), and AI audio playback MUST stop within 200 milliseconds of barge-in detection (see SC-009).
- **FR-010**: When the call ends, the system MUST stop microphone capture and stop any in-progress AI audio playback.

**Live Transcript**

- **FR-011**: The system MUST display a live transcript panel on the call screen that updates in real time during a call.
- **FR-012**: Each transcript entry MUST be attributed to either the user or the AI and include a timestamp.
- **FR-013**: The transcript panel MUST automatically scroll to the most recent entry as new content arrives.

**Real-Time Communication**

- **FR-014**: The system MUST send call lifecycle events (start, end, interruption) to the backend over a persistent WebSocket connection.
- **FR-015**: The system MUST receive and render AI text tokens in the transcript as they arrive over the WebSocket connection, without waiting for the full response. In-progress AI tokens MUST be rendered as a mutable partial entry updated in place; only on receipt of a `transcript_commit` message MUST the partial be promoted to a committed transcript entry.
- **FR-016**: The system MUST forward each incoming binary WebSocket frame containing audio data to the audio playback queue immediately on receipt, without buffering or re-ordering frames; decoding and output scheduling are the responsibility of the audio playback subsystem (see FR-008).
- **FR-017**: The system MUST follow the backend-defined WebSocket message schema strictly; no ad-hoc or undocumented message formats are permitted.
- **FR-018**: The system MUST automatically attempt to reconnect when the WebSocket connection is lost, with a visible reconnecting state shown to the user.
- **FR-027**: Before opening a WebSocket connection, the system MUST obtain a short-lived session token from the backend REST auth endpoint and present it on the WebSocket upgrade request; the system MUST NOT attempt a connection without a valid token.
- **FR-028**: If the session token is rejected by the backend during the WebSocket upgrade (HTTP 401 or 403 response), the system MUST transition to the Error state, display a plain-language authentication failure message, and NOT attempt automatic reconnection; the user MUST be offered a control to retry the full session establishment flow.

**Post-Call Dashboard**

- **FR-019**: After a call ends, the system MUST display the full conversation transcript in the post-call dashboard.
- **FR-020**: The post-call dashboard MUST display all claims extracted from the call.
- **FR-021**: The post-call dashboard MUST display all reminders produced from the call.
- **FR-022**: Users MUST be able to export call data (transcript, claims, reminders) as a downloadable JSON file structured to match the backend's response models for transcript entries, claims, and reminders.

**Accessibility & Error Handling**

- **FR-023**: All call controls (start, end) MUST be operable by keyboard without requiring a pointer device.
- **FR-024**: All call states MUST be communicated visually, and each state MUST use a visually distinct combination of colour, icon, and/or label such that no two states are visually identical; all text and iconography MUST meet WCAG 2.1 AA minimum contrast ratio of 4.5:1.
- **FR-025**: The transcript panel MUST be readable at standard body text sizes and support standard browser text scaling.
- **FR-026**: When an error occurs (connection loss, permission denied, stream failure, or missing audio output device), the system MUST display a plain-language description of the failure cause and at least one labelled interactive recovery control (e.g., a retry button or an instruction to reload the page).

### Key Entities

- **Call Session**: Represents one complete interaction between the user and the AI agent. Has a unique identifier, start time, end time, outcome state (normal end, error, abandoned), and a connection log.
- **Transcript Entry**: A single conversational turn. Belongs to a Call Session. Has a speaker identity (User or AI), spoken text, and a timestamp.
- **Claim**: A factual statement extracted from a call. Belongs to a Call Session. Has the extracted text, the speaker it was attributed to, and a confidence indicator.
- **Reminder**: A follow-up task or note identified during a call. Belongs to a Call Session. Has descriptive text and an optional due date/time.

### Assumptions

- A single user interacts with a single AI agent per call session.
- The backend exposes a WebSocket endpoint and a documented message schema covering call events, transcript tokens, audio chunks, claims, and reminders.
- The post-call dashboard is accessible immediately after a call ends within the same session — no persistent account or login is required for this feature scope.
- Export format is JSON; the exported file mirrors the backend's Pydantic response shape for transcript entries, claims, and reminders associated with the session.
- The backend issues a short-lived session token via a REST control-plane endpoint before the WebSocket connection is opened; the frontend passes this token on the WebSocket upgrade handshake. No persistent login or user account is required for this feature scope.
- Microphone access requires explicit user permission per platform standards; the system handles both granted and denied states.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001** *(Manual QA)*: Users can initiate a voice call and reach the Listening state in under 5 seconds on a standard broadband connection.
- **SC-002** *(Manual QA)*: Live transcript entries appear within 1 second of the corresponding audio being produced (user or AI).
- **SC-003** *(Manual QA)*: The AI Speaking indicator activates within 500 milliseconds of the first AI audio chunk being received.
- **SC-004** *(Manual QA)*: When the call state changes, the UI reflects the new state within 300 milliseconds.
- **SC-005**: The system recovers from a dropped connection and resumes call state within 10 seconds without user intervention, on at least 3 consecutive simulated drops.
- **SC-006**: The post-call dashboard loads and displays transcript, claims, and reminders within 3 seconds of navigating to it after a call ends.
- **SC-007**: All call screen controls (start, end call) are fully operable via keyboard only, verified by completing an end-to-end call flow without using a pointer device.
- **SC-008**: Zod `safeParse` is used for every inbound WebSocket JSON frame; parse failures are observable (logged to the connection log) and the count of parse failures MUST equal zero for all conforming backend frames across integration tests.
- **SC-009** *(Manual QA)*: When barge-in is triggered (user speaks while AI audio is playing), AI audio playback stops and the AI partial transcript entry is discarded within 200 milliseconds of VAD detection.
