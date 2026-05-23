# Hotel Concierge AI - Agent Implementation Guide

## Project Overview

- **Project Name**: Hotel Concierge AI
- **Type**: Terminal-based Text User Interface (TUI) demo
- **Purpose**: AI-powered hotel assistant for guest queries via interactive CLI
- **Language**: TypeScript (Node.js)
- **Agent Framework**: OpenAI Agents SDK for JavaScript/TypeScript (`@openai/agents`)
- **Status**: Agents SDK refactor implemented (see `progress.md`)

---

## Progress Tracking

See [progress.md](./progress.md) for implementation status, completed features, and remaining tasks.
Update [progress.md](./progress.md) whenever making code changes, documentation changes, or requirement changes.

---

## Current Architecture

The app now uses OpenAI Agents SDK primitives instead of the old custom `SkillRouter` system.

### Text Mode (TUI)
```
User Input → TUIApp
           → HotelAgentService
           → Runner + MemorySession
           → Triage Agent
           → Specialist Agent Handoff
           → Tool-backed data access or static policy response
           → TUI text response
```

### Voice Mode
```
User speaks → Microphone (mic) → WAV stream (in memory)
           → OpenAI Whisper (STT) → transcribed text
           → HotelAgentService
           → Runner + MemorySession
           → Triage Agent
           → Specialist Agent Handoff
           → Tool-backed data access or static policy response
           → Agent text response
           → OpenAI TTS → MP3 (in memory)
           → Audio playback (sox play via stdin) → User hears response
```

### Agents

| Agent | Purpose |
|-------|---------|
| `triageAgent` | Entry agent that routes requests to the best specialist |
| `roomsAgent` | Room types, pricing, beds, occupancy, room amenities |
| `diningAgent` | Restaurants, menus, dining hours, cuisine, food prices |
| `amenitiesAgent` | Pool, spa, gym, beach, kids club, activities |
| `databaseAgent` | Existing bookings, guest profiles, invoices, billing |
| `reservationAgent` | New room reservations |
| `resolutionAgent` | Booking changes such as room type, dates, and guest count |
| `wifiAgent` | WiFi network and access information |
| `checkoutAgent` | Checkout and late checkout policies |
| `emergencyAgent` | Emergency, medical, front desk, and security contacts |
| `generalAgent` | General concierge help, greetings, recommendations, directions |

### Tools

| Tool Module | Purpose |
|-------------|---------|
| `src/tools/document_tools.ts` | Reads/searches `rooms.md`, `menus.md`, and `amenities.md` |
| `src/tools/database_tool.ts` | Queries and updates `bookings.json` |
| `src/tools/reservation_tool.ts` | Creates new bookings in `bookings.json` using `prices.json` |

---

## Key Files

```
src/
├── index.ts                    # Entry point, env checks, mode setup
├── agents/
│   ├── index.ts                # Agent exports
│   ├── hotel_agent_service.ts  # Runner + MemorySession wrapper used by TUI/Voice
│   ├── specialist_agents.ts    # Specialist and static agent definitions
│   └── triage_agent.ts         # Entry agent with handoffs
├── voice/
│   ├── app.ts                  # Voice chat orchestrator (STT → Agent → TTS → Play)
│   ├── stt.ts                  # OpenAI Whisper speech-to-text
│   ├── tts.ts                  # OpenAI TTS text-to-speech
│   ├── recorder.ts             # Microphone capture + WAV encoding
│   └── player.ts               # Audio playback
├── tools/
│   ├── document_tools.ts       # Tool-backed markdown search
│   ├── database_tool.ts        # Tool-backed booking/profile/invoice access
│   └── reservation_tool.ts     # Tool-backed reservation creation
├── tui/
│   └── app.ts                  # Blessed-based terminal UI
├── api/
│   ├── server.ts               # Express server setup
│   └── routes/
│       └── chat.ts             # POST /api/chat endpoint
└── types/
    └── index.ts                # Shared app/domain types
```

### Data Files

| File | Purpose |
|------|---------|
| `data/rooms.md` | Room types, pricing, amenities |
| `data/menus.md` | Restaurant menus, hours, prices |
| `data/amenities.md` | Facilities, pool, gym, spa, activities |
| `data/bookings.json` | Mock database: guests, bookings, invoices |
| `data/prices.json` | Room pricing for reservations |

`data/skills.yaml` was removed because routing is now encoded through Agents SDK handoffs.

---

## Runtime Flow

1. `src/index.ts` loads `.env` and checks `OPENAI_API_KEY`.
2. `TUIApp` accepts user input and calls `HotelAgentService.route()`.
3. `HotelAgentService` runs `triageAgent` with a reusable `Runner` and `MemorySession`.
4. `triageAgent` hands off to a specialist agent based on the guest request.
5. Specialist agents either call tools or return static policy responses.
6. Tool results and agent responses return to the TUI as text.

### Voice Flow

1. `VoiceChatApp` waits for SPACE key to start recording from microphone.
2. Audio captured as WAV stream via `mic` with `fileType: 'wav'`, buffered in memory.
3. `stt.ts` sends WAV buffer to OpenAI Whisper for transcription.
4. Transcribed text is routed through `HotelAgentService.route()`.
5. `tts.ts` synthesizes agent response into MP3 buffer via OpenAI TTS.
6. `player.ts` pipes the MP3 buffer to `play` (sox) via stdin for playback.
7. Loop back to step 1 for next utterance.

---

## Environment

`.env.example` contains:

```bash
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# Voice Mode (optional)
# TTS_VOICE=alloy
# TTS_SPEED=1.0
# RECORD_TIMEOUT=10000
```

The Agents SDK requires Node.js 22+.

---

## How to Run

```bash
npm install
cp .env.example .env
# Edit .env with OPENAI_API_KEY
npm run build
npm start
```

For development:

```bash
npm run dev
```

---

## Testing

```bash
npm test
npm run build
```

Current tests cover:

- Document tool helpers
- Database tool helpers
- `HotelAgentService` empty-input behavior
- Optional live Agents SDK smoke test when `OPENAI_API_KEY` is configured

---

## Dependencies

```json
{
  "dependencies": {
    "@openai/agents": "^0.11.0",
    "blessed": "^0.1.81",
    "dotenv": "^16.0.0",
    "express": "^4.21.0",
    "mic": "^2.1.2",
    "openai": "^6.0.0",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@types/blessed": "^0.1.0",
    "@types/express": "^4.17.21",
    "@types/node": "^20.0.0",
    "@types/supertest": "^6.0.2",
    "supertest": "^7.0.0",
    "ts-node": "^10.0.0",
    "typescript": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

---

## Implementation Notes

- Do not reintroduce the old `SkillRouter`, `SkillChain`, `skills.yaml`, or custom `openai_client` unless explicitly requested.
- Prefer adding new capabilities as an agent, a tool, or a handoff.
- Keep pure data lookup/update logic exported separately from SDK `tool()` wrappers so tests can run without live model calls.
- Use Zod schemas for tool parameters.
- Keep `HotelAgentService.route()` as the TUI-facing adapter unless there is a concrete need to change the UI contract.
- The demo uses JSON files as mock persistence; production would replace tool internals with database calls.

---

## Change Logging

All code, documentation, and requirement changes must be logged in [progress.md](./progress.md) with date and a brief description.
