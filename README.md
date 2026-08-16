# Voice Checklist - Tech POC

# TASK

Build a small production-ready checklist web app.

## Goal

Users speak a progress update into the browser.

Example:

> "I finished the logo and set up the homepage."

The application transcribes the speech, sends it to an LLM, detects completed checklist items, and suggests checklist updates for user confirmation.

---

# Success Criteria

The MVP is complete when:

- checklist CRUD works

- drag & drop reordering works

- speech recognition works (with fallback)

- LLM suggestions work (mock mode included)

- user reviews suggestions before applying

- undo last auto-apply

- local persistence survives refresh

- responsive UI

- no runtime errors

---

# Features

## Checklist

Each item contains:

- id

- title

- description

- done

- doneAt

- confidence

- source

- order

Support:

- create

- edit

- delete

- reorder

- manual completion

- undo

---

## Voice Input

Use Web Speech API.

If unavailable:

- manual text input fallback

Display:

- listening state

- transcript

- microphone errors

---

## LLM

Create a single abstraction layer.

```

Speech

    ↓

Speech Service

    ↓

LLM Service

    ↓

Suggestion Engine

```

Support:

- mock mode

- real API mode

Never expose secrets in frontend code.

---

## Suggestions

The LLM returns:

- completed

- partially completed

- not mentioned

- confidence

Show:

- transcript

- reasoning

- suggested checklist mapping

Require confirmation before applying unless Auto Apply is enabled.

Low confidence must require confirmation.

Never silently modify checklist items.

Never delete items.

---

## Activity Log

Store:

- transcript

- interpreted items

- applied actions

- timestamps

---

## Settings

Support:

- language

- theme

- autoApply

- apiMode

- voiceEnabled

Persist locally.

---

# Persistence

Store locally using:

- localStorage

Architecture should allow replacing this later with a backend.

---

# UI

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

# Architecture

Use a modern lightweight frontend stack.

Preferred:

- React

- TypeScript

- Vite

Organize code by feature.

Example:

```

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

# Behavior

Prefer semantic matching over keyword matching.

When uncertain:

- ask user

Never:

- silently apply changes

- remove checklist items

- expose secrets

All state changes must be reversible.

---

# Error Handling

Handle:

- microphone denied

- browser unsupported

- empty transcript

- LLM failure

- malformed responses

- storage failures

The application must remain usable.

---

# Empty States

Provide sensible UI when:

- no checklist items

- no speech history

- mock mode enabled

- speech unavailable

- API unavailable

---

# Constraints

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

# Completion Rules

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

**Live app**: https://codeconut-gamified-voice-checklist.lovable.app

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
