# OpenAI Agents SDK Refactor Plan

## Overview

Refactor from manual skill routing to using `@openai/agents` library.

**Requirements**: Node.js 22+, install `@openai/agents` + `zod`

---

## Current Architecture

```
User Query → SkillRouter.detectIntent() [LLM call]
           → Execute Skill (document/database/static/llm)
           → SkillChain.forward() for cascading
           → Return response
```

**Problems**:
- Manual intent detection with custom LLM prompts
- Custom conversation history management
- SkillChain is homegrown middleware

---

## New Architecture with @openai/agents

```
User Input → Triage Agent
           ├── Handoff: rooms → Rooms Tool Agent
           ├── Handoff: dining → Dining Tool Agent
           ├── Handoff: amenities → Amenities Tool Agent
           ├── Handoff: bookings/guest_info/billing → Database Agent
           ├── Handoff: reservation → Reservation Agent
           ├── Handoff: resolution → Resolution Agent
           └── Fallback: General Agent (LLM)
```

**Key primitives used**:
- `Agent` - replaces each skill (specialized agents)
- `tool()` - replaces document_skill, database_skill
- `handoffs` - replaces skill routing / SkillChain
- `run()` / `Runner` - replaces SkillRouter.route()
- Built-in `Session` - replaces manual conversation history

---

## Implementation Plan

### Phase 1: Project Setup

1. Update `package.json`
   ```
   npm install @openai/agents zod
   ```
2. Remove old `openai` SDK (included in agents package)
3. Verify Node.js 22+ requirement

### Phase 2: Create Agent Structure

```
src/
├── agents/
│   ├── index.ts                 # Agent exports
│   ├── hotel_agent_service.ts   # Runner + MemorySession wrapper for TUI
│   ├── specialist_agents.ts     # Rooms, dining, amenities, records, reservation, static agents
│   └── triage_agent.ts          # Entry point with handoffs to all specialists
├── tools/
│   ├── document_tools.ts        # tool() wrappers for rooms, dining, amenities
│   ├── database_tool.ts         # tool() wrappers for queries and booking updates
│   └── reservation_tool.ts      # tool() wrapper for creating bookings
└── types/
    └── index.ts                 # Shared types and HotelContext
```

### Phase 3: Tool Implementations

| Tool | Current File | Replaces |
|------|-------------|----------|
| `rooms_tool` | document_skill.ts | Reads `data/rooms.md` |
| `dining_tool` | document_skill.ts | Reads `data/menus.md` |
| `amenities_tool` | document_skill.ts | Reads `data/amenities.md` |
| `database_tool` | database_skill.ts | Queries `data/bookings.json` |
| `reservation_tool` | llm_skill.ts | Writes to bookings.json |

**Tool pattern**:
```typescript
import { tool } from '@openai/agents';
import { z } from 'zod';

const roomsTool = tool({
  name: 'get_room_info',
  description: 'Get hotel room information, pricing, amenities',
  parameters: z.object({ query: z.string() }),
  async execute({ query }) {
    // Read rooms.md, search by query
  }
});
```

### Phase 4: Agent Definitions

| Agent | Instructions | Tools | Handoffs |
|-------|-------------|-------|----------|
| Triage | Route to specialists | - | rooms, dining, amenities, database, reservation, general |
| Rooms | Answer room queries | rooms_tool | - |
| Dining | Restaurant info | dining_tool | - |
| Amenities | Facilities info | amenities_tool | - |
| Database | Bookings, billing, guest info | database_tool | - |
| Reservation | Create new bookings | reservation_tool | - |
| Resolution | Modify existing bookings | database_tool | database |
| General | Anything else | - | - |

**Agent pattern**:
```typescript
const roomsAgent = new Agent({
  name: 'Rooms Agent',
  instructions: 'You provide hotel room information...',
  tools: [roomsTool],
  handoffs: []
});
```

### Phase 5: Context & Conversational Flow

**SDK handles**:
- Conversation history (built into Runner)
- Structured output (via `outputType` + Zod)

**What we manage**:
- Booking context (booking_id, guest_id) - pass via `context` parameter
- Pending actions for multi-step flows - use SDK's interruptions or `input` guardrails

**Context injection**:
```typescript
interface HotelContext {
  bookingId?: string;
  guestId?: string;
  pendingAction?: string;
}

const runner = new Runner<HotelContext>();
// Pass context on each run()
```

### Phase 6: TUI Integration

**Before**:
```typescript
const router = new SkillRouter('data/skills.yaml', openai);
const response = await router.route(userInput);
```

**After**:
```typescript
import { run } from '@openai/agents';

const result = await run(triageAgent, userInput, {
  context: { bookingId, guestId }
});
```

### Phase 7: Static Skills

Static responses (wifi, checkout, emergency, acknowledgment, goodbye) become agents with `instructions` containing the response text. No tools needed.

### Phase 8: Remove Old Files

| File | Status |
|------|--------|
| `src/router/skill_router.ts` | Delete |
| `src/router/types.ts` | Delete |
| `src/skills/document_skill.ts` | Delete |
| `src/skills/database_skill.ts` | Delete |
| `src/skills/static_skill.ts` | Delete |
| `src/skills/llm_skill.ts` | Delete |
| `src/skills/skill_chain.ts` | Delete |
| `src/skills/reservation_handler.ts` | Delete |
| `src/services/openai_client.ts` | Delete (SDK handles it) |
| `data/skills.yaml` | No longer needed |

---

## File Structure After Refactor

```
src/
├── index.ts                    # Entry point, TUI setup
├── agents/
│   ├── index.ts               # Main runner + exports
│   ├── triage_agent.ts        # Entry agent
│   ├── hotel_agent_service.ts # Runner + session wrapper
│   ├── specialist_agents.ts   # Specialist and static agents
│   └── triage_agent.ts        # Entry agent
├── tools/
│   ├── document_tools.ts      # tool() for rooms.md, menus.md, amenities.md
│   ├── database_tool.ts       # tool() for bookings.json
│   └── reservation_tool.ts    # tool() for creating bookings
├── tui/
│   └── app.ts                 # Blessed TUI (minor updates)
└── types/
    └── index.ts               # HotelContext, shared types
```

---

## Key Differences

| Aspect | Before | After |
|--------|--------|-------|
| Intent routing | Custom LLM prompt | SDK handoffs |
| Conversation history | Manual array | Built-in Runner |
| Skill chaining | Custom SkillChain | Agent handoffs |
| LLM calls | Manual openai.chat() | SDK handles |
| Structured output | Regex parsing | Zod + `outputType` |
| Context | Manual extraction | Typed `context` injection |

---

## Testing Strategy

### Current Test Files (7 total)

| File | Tests | What it tests |
|------|-------|---------------|
| `router.test.ts` | 8 | Full routing via SkillRouter |
| `conversation.test.ts` | 17 | Multi-turn flows, context |
| `reservation.test.ts` | 2 | Booking flow |
| `document_skill.test.ts` | 5 | DocumentSkill class |
| `database_skill.test.ts` | 6 | DatabaseSkill class |
| `static_skill.test.ts` | 4 | StaticSkill class |
| `llm_client.test.ts` | 3 | LLMClient chat() |

### After Refactor: New Test Files (3 total)

| File | Tests | What it tests |
|------|-------|---------------|
| `tools/document_tools.test.ts` | 3 | document tools read markdown data |
| `tools/database_tool.test.ts` | 4 | database tool queries bookings.json |
| `agents/hotel_agent_service.test.ts` | 2 | empty input and optional live Agents SDK smoke test |

### Test Mapping

**router.test.ts** → **triage_agent.test.ts**
```typescript
// Before
router.route('what rooms do you have?')
  .then(r => expect(r.response).toContain('Standard Room'))

// After
const result = await run(triageAgent, 'what rooms do you have?');
expect(result.finalOutput).toContain('Standard Room');
```

**conversation.test.ts** → **conversation_flows.test.ts**
```typescript
// Before (manual history via SkillRouter)
router.route('show my booking');  // Turn 1
router.route('B1001');            // Turn 2

// After (built-in Runner history)
const result = await run(triageAgent, 'show my booking B1001');
// Or multi-turn with context
const result = await run(triageAgent, 'I need my booking');
// (SDK handles pending context internally)
```

**document_skill.test.ts** → **tools/rooms_tool.test.ts**
```typescript
// Before
const skill = new DocumentSkill();
await skill.execute({ skill: { data_source: 'data/rooms.md' } });

// After
const result = await roomsTool.execute({ query: 'standard room' });
expect(result).toContain('Standard Room');
```

**database_skill.test.ts** → **tools/database_tool.test.ts**
```typescript
// Before
const skill = new DatabaseSkill();
await skill.execute({ context_data: { booking_id: 'B1001' } });

// After
const result = await databaseTool.execute({ query: 'B1001', table: 'bookings' });
expect(result).toContain('B1001');
```

**llm_client.test.ts** → **REMOVED** (SDK handles LLM internally)

### Key Testing Changes

1. **No more mocking SkillRouter** - Test agents directly via `run()`
2. **No manual conversation history** - SDK's Runner handles it
3. **Tool tests** - Test each tool() function in isolation
4. **End-to-end agent tests** - Test full routing + handoffs

### Example: Triage Agent Routing Test

```typescript
import { describe, it, expect } from 'vitest';
import { run } from '@openai/agents';
import { triageAgent, roomsAgent, wifiAgent } from '../src/agents';

describe('Triage Agent Handoffs', () => {
  it('routes room queries to rooms agent', async () => {
    const result = await run(triageAgent, 'what rooms do you have?');
    expect(result.finalOutput).toContain('Standard');
  });

  it('routes wifi queries to wifi agent', async () => {
    const result = await run(triageAgent, 'wifi password');
    expect(result.finalOutput).toContain('GrandHorizon');
  });

  it('routes booking queries with context', async () => {
    const result = await run(triageAgent, 'check booking B1001');
    expect(result.finalOutput).toContain('B1001');
  });
});
```

### Example: Tool Unit Test

```typescript
import { describe, it, expect } from 'vitest';
import { roomsTool } from '../src/tools/rooms_tool';

describe('roomsTool', () => {
  it('reads rooms.md and returns matching content', async () => {
    const result = await roomsTool.execute({ query: 'standard room' });
    expect(result).toContain('Standard Room');
    expect(result).toContain('$150');
  });

  it('handles query about room amenities', async () => {
    const result = await roomsTool.execute({ query: 'balcony' });
    expect(result).toContain('balcony');
  });

  it('returns general room info for vague queries', async () => {
    const result = await roomsTool.execute({ query: 'room' });
    expect(result).toContain('Room');
  });
});
```

### What to Keep / Remove

| Old File | Action |
|----------|--------|
| `router.test.ts` | Delete - tests SkillRouter |
| `conversation.test.ts` | Delete - tests SkillRouter |
| `reservation.test.ts` | Delete - tests SkillRouter |
| `document_skill.test.ts` | Delete - tests DocumentSkill class |
| `database_skill.test.ts` | Delete - tests DatabaseSkill class |
| `static_skill.test.ts` | Delete - tests StaticSkill class |
| `llm_client.test.ts` | Delete - tests old LLMClient |

| New File | Action |
|----------|--------|
| `tools/*.test.ts` | Create - test tool() functions |
| `agents/triage.test.ts` | Create - test agent handoffs |
| `agents/flows.test.ts` | Create - test conversation flows |

---

## Timeline

1. **Phase 1**: Setup + tools + tool tests (1-2 hours)
2. **Phase 2-3**: Agents + handoffs + agent tests (2-3 hours)
3. **Phase 4**: Context management (1 hour)
4. **Phase 5**: TUI integration (1 hour)
5. **Phase 6**: Cleanup + delete old tests (30 min)

**Total**: ~6-8 hours
