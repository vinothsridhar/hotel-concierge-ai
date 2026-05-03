# Hotel AI Assistant - Agent Implementation Guide

## Project Overview

- **Project Name**: Hotel Concierge AI
- **Type**: Terminal-based Text User Interface (TUI) Demo
- **Purpose**: AI-powered hotel assistant for guest queries via interactive CLI
- **Language**: TypeScript (Node.js)
- **Status**: Implementation in progress (see progress.md)

---

## Progress Tracking

See [progress.md](./progress.md) for implementation status, completed features, and remaining tasks.
update [progress.md](./progress.md) file whenever making code changes or requirement changes.

---

## What Is Done

### 1. Requirements Document
- File: `REQ.md`
- Defines UI/UX, functional specs, tech stack, acceptance criteria

### 2. Data Files Created
| File | Purpose |
|------|---------|
| `data/rooms.md` | Room types, pricing, amenities (5 room types) |
| `data/menus.md` | Restaurant menus, hours, prices (5 venues) |
| `data/amenities.md` | Pool, gym, spa, kids club, activities, rules |
| `data/bookings.json` | Mock database: guests, bookings, invoices tables |
| `data/skills.yaml` | Skill definitions and router config |

### 3. Skill System Design

**Skill Types:**
- `document` - Reads from .md files (rooms, dining, amenities)
- `database` - Queries JSON data (bookings, billing, guest_info)
- `static` - Hardcoded responses (wifi, emergency, checkout)
- `llm` - General fallback (general)

**Intent Detection Flow:**
```
User Query → LLM Intent Classification → Select Skill → Execute Skill → Return Response
```

**LLM-based Intent Detection:**
- Uses skill `description` (not keywords) for matching
- LLM returns: `{ skill, confidence, reasoning }`
- Falls back to `general` LLM skill if confidence < threshold

---

## Pending Implementation

### 1. Project Setup
- [ ] Initialize Node.js project with package.json
- [ ] Install dependencies: TypeScript, Blessed, OpenAI SDK, yaml
- [ ] Create tsconfig.json

### 2. Core Files to Create
```
src/
├── index.ts                    # Entry point, CLI setup
├── router/
│   ├── types.ts               # Skill, SkillResponse interfaces
│   └── skill_router.ts        # Intent detection + routing logic
├── skills/
│   ├── document_skill.ts      # Read .md files, search by query
│   ├── database_skill.ts      # Query JSON by guest ID/query
│   ├── static_skill.ts        # Return predefined response
│   └── llm_skill.ts           # OpenAI for general queries
├── tui/
│   ├── app.ts                 # Main TUI application
│   ├── widgets.ts             # Chat display, input, quick buttons
│   └── screens.ts             # Screen definitions
└── services/
    └── openai_client.ts       # OpenAI API wrapper
```

### 3. Configuration
- [ ] Create `.env.example` with OPENAI_API_KEY
- [ ] Load skills.yaml at startup

---

## Technical Decisions

### TUI Framework: Blessed
- Mature, well-documented
- Good TypeScript support
- Alternative: Ink (React-based) - more complex

### AI: OpenAI GPT-4
- Use `gpt-4o` model (latest, cheaper than gpt-4)
- Two calls per user message:
  1. Intent detection (small system prompt)
  2. LLM fallback or skill data enrichment (if needed)

### Skill Router Logic
1. Build system prompt with skill names + descriptions
2. Ask LLM to classify intent
3. If confidence >= threshold, execute matching skill
4. If skill is document/database: search data file for relevant info
5. If skill is static: return predefined response
6. If skill is llm: call OpenAI directly
7. If no match or low confidence: fall back to general LLM

---

## How to Run

```bash
# Install dependencies
npm install

# Copy env and add your OpenAI key
cp .env.example .env
# Edit .env with your OPENAI_API_KEY

# Build
npm run build

# Run
npm start
```

---

## Key Files Reference

### skills.yaml Structure
```yaml
skills:
  - name: string        # Unique identifier
    type: string        # document | database | static | llm
    description: string # Used for LLM intent matching
    data_source?: string # File path for document/database
    response?: string    # For static skills
    fallback?: boolean  # True for general LLM skill

router:
  use_llm_fallback: boolean
  confidence_threshold: number (0-1)
  intent_timeout: number (ms)
  response_timeout: number (ms)
```

### Data File: bookings.json
```json
{
  "tables": {
    "guests": [...],    // guest_id, name, email, phone, loyalty_tier
    "bookings": [...],  // booking_id, guest_id, room_type, check_in, check_out, status
    "invoices": [...]   // booking_id, items, paid, method
  }
}
```

---

## Dependencies to Install

```json
{
  "dependencies": {
    "blessed": "^0.1.81",
    "openai": "^4.0.0",
    "yaml": "^2.3.0",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "@types/blessed": "^0.1.0",
    "ts-node": "^10.0.0"
  }
}
```

---

## Implementation Order (Recommended)

1. **Setup**: package.json, tsconfig.json, .env
2. **Types**: Define Skill, SkillResponse, IntentRequest interfaces in `src/router/types.ts`
3. **Skills**: Implement document_skill, database_skill, static_skill, llm_skill
4. **Router**: Create skill_router.ts with LLM intent detection
5. **TUI**: Build app.ts with chat interface and user input
6. **Integration**: Wire TUI → Router → Skills → Data

---

## Notes

- Demo uses mock data (JSON files). In production, database skill would query real DB.
- LLM fallback skill handles any query not matched to specific skills.
- The TUI should show typing indicator while waiting for responses.
- Quick action buttons in TUI for common queries (Rooms, Dining, WiFi, etc.).

---

## Change Logging

- All code changes must be logged in [progress.md](./progress.md) with a brief description, date, and any relevant details for future reference.