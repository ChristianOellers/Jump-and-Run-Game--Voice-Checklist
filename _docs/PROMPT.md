# Voice Checklist — Tech POC

## Task

Build a small, production-ready checklist web app.

## Goal

Users speak a progress update into the browser.

Example:

> "I finished the logo and set up the homepage."

The application transcribes the speech, sends it to an LLM, detects
completed checklist items, and suggests checklist updates for user confirmation.

---

## Success Criteria

The MVP is complete when:

- Checklist CRUD works.
- Drag-and-drop reordering works.
- Speech recognition works with a fallback.
- LLM suggestions work, including mock mode.
- Users review suggestions before applying them.
- Users can undo the last auto-apply.
- Local persistence survives refreshes.
- The UI is responsive.
- There are no runtime errors.

---

## Features

### Checklist

Each item contains:

- `id`
- `title`
- `description`
- `done`
- `doneAt`
- `confidence`
- `source`
- `order`

Support:

- Create
- Edit
- Delete
- Reorder
- Manual completion
- Undo

---

### Voice Input

Use Web Speech API.

If unavailable:

- Manual text input fallback

Display:

- Listening state
- Transcript
- Microphone errors

---

### LLM

Create a single abstraction layer.

```text
Speech
    ↓
Speech Service
    ↓
LLM Service
    ↓
Suggestion Engine
```

Support:

- Mock mode
- Real API mode

Never expose secrets in frontend code.

---

### Suggestions

The LLM returns:

- Completed
- Partially completed
- Not mentioned
- Confidence

Show:

- Transcript
- Reasoning
- Suggested checklist mapping

Require confirmation before applying unless Auto Apply is enabled.

Low confidence must require confirmation.

Never silently modify checklist items.

Never delete items.

---

### Activity Log

Store:

- Transcript
- Interpreted items
- Applied actions
- Timestamps

---

### Settings

Support:

- `language`
- `theme`
- `autoApply`
- `apiMode`
- `voiceEnabled`

Persist locally.

---

## Persistence

Store locally using:

- localStorage

Architecture should allow replacing this later with a backend.

---

## UI

Sections:

- Checklist
- Voice Capture
- Suggestions
- Activity Log
- Settings

Show:

- completion %
- completed count
- loading states
- empty states
- error states

Responsive.

Keyboard accessible.

Semantic HTML.

Good contrast.

---

## Architecture

Use a modern lightweight frontend stack.

Preferred:

- React
- TypeScript
- Vite

Organize code by feature.

Example:

```text
components/
services/
hooks/
types/
storage/
utils/
```

Requirements:

- small reusable components
- small functions
- clear naming
- minimal dependencies
- lightweight state management
- easy backend replacement

Avoid unnecessary abstractions.

---

## Behavior

Prefer semantic matching over keyword matching.

When uncertain:

- ask user

Never:

- silently apply changes
- remove checklist items
- expose secrets

All state changes must be reversible.

---

## Error Handling

Handle:

- microphone denied
- browser unsupported
- empty transcript
- LLM failure
- malformed responses
- storage failures

The application must remain usable.

---

## Empty States

Provide sensible UI when:

- no checklist items
- no speech history
- mock mode enabled
- speech unavailable
- API unavailable

---

## Constraints

- production-quality code
- pragmatic MVP
- no over-engineering
- clean architecture
- strongly typed
- mobile-first
- responsive
- extensible
- readable
- maintainable

---

## Completion Rules

Continue implementing until every acceptance criterion is complete.

If blocked:

- explain why
- propose the smallest solution
- continue remaining work

Do not stop early.

Do not invent APIs.

Use mock implementations where required.

Deliver a working application.

This project was built with [Lovable](https://lovable.dev).

**Live app**: [codeconut-gamified-voice-checklist.lovable.app](https://codeconut-gamified-voice-checklist.lovable.app)

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/684e9502-2ffb-43c5-a1c1-d33b2aa41c87).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
