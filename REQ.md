# Hotel AI Assistant - Requirements Document

## 1. Project Overview

- **Project Name**: Hotel Concierge AI
- **Project Type**: Terminal-based Text User Interface (TUI) Demo
- **Core Functionality**: An AI-powered hotel assistant that responds to guest queries through an interactive CLI interface
- **Target Users**: Hotel guests and staff demo purposes

## 2. Technical Stack

- **Language**: TypeScript (Node.js)
- **TUI Framework**: Blessed
- **AI Integration**: OpenAI Agents SDK for JavaScript/TypeScript (`@openai/agents`)
- **Configuration**: Environment variables via `.env`
- **Testing**: Vitest

## 3. UI/UX Specification

### Layout Structure
- Single-pane terminal interface
- Header: Hotel name and current date/time
- Main area: Chat history (scrollable)
- Input area: Text input at bottom
- Status bar: Connection status, session info

### Visual Design
- **Color Scheme**: 
  - Primary: Deep blue (#1E3A5F) - hotel elegance
  - Accent: Gold (#D4AF37) - premium feel
  - Background: Dark charcoal (#1A1A2E)
  - Text: Off-white (#E8E8E8)
- **Typography**: Monospace terminal font
- **Spacing**: 2-line padding between messages

### Components
1. **Message Bubble**: AI responses and user queries distinguished by alignment and color
2. **Input Prompt**: "Guest > " prefix
3. **Typing Indicator**: Animated dots during AI response
4. **Quick Reply Buttons**: Common hotel queries (Room Service, WiFi, Checkout, etc.)

## 4. Functional Specification

### Core Features
1. **Conversational Interface**
   - Accept user text input
   - Display AI responses with proper formatting
   - Show typing indicator while waiting for response

2. **Conversational Context Flow**
   - For personalized queries (bookings, billing, guest info), AI should ask for identification
   - Store context between turns to maintain conversation state
   - Extract guest identifier (name, email, booking ID, phone) from user response
   - Query database with provided identifier
   - Return personalized results

   **Conversation Flow Example:**
   ```
   User: "I need to know about my bookings"
   AI: "I'd be happy to help with your booking. Could you please provide your name or booking reference number?"
   
   User: "My name is John Smith" (or "booking B1001")
   AI: "Found your booking! Booking #B1001..."
   ```

**Context Management:**
     ```typescript
     interface PendingAction {
       action: string;
       skill: string;
       context_data?: Record<string, string>;
     }

     interface ConversationContext {
       pending_actions: PendingAction[];  // Array for multi-step flows
       pending_fields?: string[];
       extracted_data: Record<string, string>;
       last_topic?: string;
       last_booking_id?: string;
       last_guest_id?: string;
     }
     ```

    **Conversation Reference Handling:**
    - Detect pronouns and references: "it", "that", "my booking", "the room", "my bill"
    - If context exists from previous turn, use it instead of re-prompting
    - Maintain context across multiple turns for same topic

    **Example - Follow-up Handling:**
    ```
    User: "my booking details" → asks for ID
    User: "B1001" → returns booking, stores B1001 in context
    User: "I booked standard but shows deluxe" → uses B1001 context, handles discrepancy
    ```

2. **OpenAI Agents SDK Workflow**
   Each user query is handled by an Agents SDK triage agent and delegated through handoffs to the best specialist agent.

**Agent Types:**
    | Agent | Description | Data Source | Conversational |
    |-------|-------------|-------------|---------------|
    | Triage Agent | Routes requests to specialist agents | N/A | Yes |
    | Rooms Agent | Room types, pricing, beds, room amenities | `data/rooms.md` via tool | No |
    | Dining Agent | Restaurants, menus, hours, prices | `data/menus.md` via tool | No |
    | Amenities Agent | Facilities, pool, spa, gym, activities | `data/amenities.md` via tool | No |
    | Guest Records Agent | Existing bookings, profiles, invoices | `data/bookings.json` via tool | Yes |
    | Reservation Agent | Creates new room reservations | `data/bookings.json`, `data/prices.json` via tool | Yes |
    | Booking Resolution Agent | Updates room type, dates, and guest count | `data/bookings.json` via tool | Yes |
    | Static Policy Agents | WiFi, checkout, emergency contacts | Agent instructions | No |
    | General Concierge Agent | General fallback help | OpenAI model | Yes |

**Agent Definition Pattern:**
    ```typescript
    const roomsAgent = new Agent({
      name: 'Rooms Agent',
      handoffDescription: 'Answers room type and price questions.',
      instructions: 'Use get_room_info before answering room questions.',
      tools: [roomsTool]
    });
    ```

3. **Agent Pipeline**
   - User query → `HotelAgentService.route()`
   - `Runner` runs `triageAgent` with `MemorySession`
   - `triageAgent` selects a specialist through Agents SDK handoffs
   - Specialist agent calls a tool or returns static policy guidance
   - Final output returns to the TUI

   **Agents SDK Primitives:**
   - `Agent` defines triage and specialist behavior
   - `tool()` exposes local data access and update functions
   - `handoffs` replace custom intent routing
   - `Runner` executes agent workflows
   - `MemorySession` preserves conversation history across turns

   **Multi-Action Support:**
   - Single query can contain multiple actions, such as "upgrade room and add guest"
   - Booking Resolution Agent interprets the request and uses `update_booking`
   - If required details are missing, specialist agents ask follow-up questions

4. **Data Files**
   
   **Document Skills:**
   | File | Description | Skills |
   |------|-------------|--------|
   | data/rooms.md | Room types, pricing, amenities | rooms |
   | data/menus.md | Restaurant menus, hours, prices | dining |
   | data/amenities.md | Pool, gym, spa, activities | amenities |

**Database Skills:**
     | File | Tables | Skills | Context Required |
     |------|--------|--------|-------------------|
     | data/bookings.json | guests, bookings, invoices | bookings, change_booking, billing, guest_info | Yes |

   **Database Skill - Context Requirement:**
   - When user asks about their bookings/billing/guest_info without providing ID, AI asks for identification
   - Extract guest name, email, phone, or booking ID from natural language
   - Query the database with matched identifier
   - Return personalized data

**Agent and Tool Configuration:**
      | Capability | Implementation | Data Source | Requires Context |
      |------------|----------------|-------------|-----------------|
      | Rooms | `roomsAgent` + `roomsTool` | `data/rooms.md` | No |
      | Dining | `diningAgent` + `diningTool` | `data/menus.md` | No |
      | Amenities | `amenitiesAgent` + `amenitiesTool` | `data/amenities.md` | No |
      | Bookings | `databaseAgent` + `databaseTool` | `data/bookings.json` | Yes |
      | Billing | `databaseAgent` + `databaseTool` | `data/bookings.json` | Yes |
      | Guest Info | `databaseAgent` + `databaseTool` | `data/bookings.json` | Yes |
      | Reservation | `reservationAgent` + `reservationTool` | `data/bookings.json`, `data/prices.json` | Yes |
      | Resolution | `resolutionAgent` + `updateBookingTool` | `data/bookings.json` | Yes |
      | WiFi | `wifiAgent` | Agent instructions | No |
      | Emergency | `emergencyAgent` | Agent instructions | No |
      | Checkout | `checkoutAgent` | Agent instructions | No |
      | General | `generalAgent` | OpenAI model | No |

      **Specialist Agents:**
      - **databaseAgent**: Looks up bookings, guest profiles, and invoices.
      - **reservationAgent**: Collects missing reservation details and creates bookings.
      - **resolutionAgent**: Handles room, date, and guest count changes.
      - **static policy agents**: Handle WiFi, emergency, and checkout responses.

**Conversation Context:**
      - Agents SDK `MemorySession` maintains conversation history across turns.
      - Specialist agents ask for missing booking identifiers or reservation details.
      - Follow-up requests are interpreted using the active session history.

      **Database Updates (via Tools):**
      - `updateBookingTool` handles: `room_type`, `guests`, `check_in`, `check_out`.
      - `reservationTool` uses `data/prices.json` for room pricing.
      - Changes are written to `data/bookings.json`.

5. **Session Management**
   - Clear conversation history
   - Export conversation to file
   - Show conversation statistics

### User Interactions
- Type message and press Enter to send
- Use arrow keys to navigate history
- Press Tab for quick suggestions
- Ctrl+C to exit

### Edge Cases
- Handle API errors gracefully with user-friendly messages
- Timeout handling for slow responses
- Empty input validation

## 5. File Structure

```
hotel-concierge-ai/
├── .env                      # Environment variables
├── .env.example              # Template
├── .gitignore                # Git ignore rules
├── README.md                 # Project documentation
├── REQ.md                    # Requirements
├── AGENTS.md                 # Agent implementation guide
├── progress.md               # Implementation progress
├── package.json              # Dependencies
├── package-lock.json         # Lock file
├── tsconfig.json             # TypeScript config
├── vitest.config.ts          # Test config
├── data/
│   ├── rooms.md              # Room details
│   ├── menus.md              # Restaurant menus
│   ├── amenities.md          # Amenities info
│   ├── bookings.json         # Mock database
│   └── prices.json           # Room pricing
├── src/
│   ├── index.ts              # Entry point
│   ├── agents/
│   │   ├── index.ts
│   │   ├── hotel_agent_service.ts
│   │   ├── specialist_agents.ts
│   │   └── triage_agent.ts
│   ├── tools/
│   │   ├── document_tools.ts
│   │   ├── database_tool.ts
│   │   └── reservation_tool.ts
│   ├── types/
│   │   └── index.ts
│   └── tui/
│       └── app.ts            # Blessed-based terminal UI
└── tests/
    ├── tools/
    │   ├── document_tools.test.ts
    │   └── database_tool.test.ts
    └── agents/
        └── hotel_agent_service.test.ts
```

## 6. Configuration

### Environment Variables (.env)
```
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4o-mini
```

### Agent Configuration
- Agent routing is encoded in `triageAgent` handoffs.
- Specialist prompts are defined in `src/agents/specialist_agents.ts`.
- Tool parameter schemas are defined with Zod in `src/tools/*`.
- `data/skills.yaml` is no longer used.

## 7. Acceptance Criteria

**Application:**
- [x] Application launches without errors in terminal
- [x] User can type and receive responses
- [x] Quick action buttons work correctly
- [x] Chat history scrolls properly
- [x] Typing indicator shows during AI processing
- [x] Session can be cleared
- [x] Clean exit with Ctrl+C

**Skills:**
- [x] rooms skill returns room info from rooms.md
- [x] dining skill returns menu/hours from menus.md
- [x] amenities skill returns facilities from amenities.md
- [x] bookings skill queries from bookings.json
- [x] wifi/static skill returns hardcoded response
- [x] Unknown query falls back to LLM
- [x] Routing works through Agents SDK handoffs
- [x] resolution skill handles multiple changes in single request
- [x] date_change support (check_in, check_out)
- [x] Booking updates flow through Agents SDK tools

**Error Handling:**
- [x] API errors show user-friendly messages
- [x] Missing data files handled gracefully
- [x] Empty input validation

**Testing:**
- [x] Vitest test suite
- [x] Tool helper and agent service wrapper tests passing

## 8. Future Enhancements (Out of Scope for Demo)

- Voice input support
- Multi-language support
- Integration with hotel PMS system
- Room service ordering
- Booking capabilities
- Push notifications

## 9. Scaling Requirements

The current implementation is a terminal demo using OpenAI Agents SDK, local markdown files, and JSON mock persistence. To scale toward a production app, the architecture should evolve in phases.

### Phase 1: Add API Layer

Create a backend API so clients do not call `HotelAgentService` directly from the TUI.

**Target Architecture:**
```
TUI / Web / Mobile Client
        ↓
HTTP API / WebSocket API
        ↓
HotelAgentService
        ↓
Agents SDK Runner + Specialist Agents + Tools
        ↓
Database / PMS / CMS integrations
```

**Requirements:**
- Add an API server using a lightweight Node.js framework such as Fastify, Express, Hono, or NestJS.
- Expose a chat endpoint, for example `POST /api/chat`, that accepts a user message and returns the concierge response.
- Keep `HotelAgentService.route()` as the service boundary used by both the TUI and API.
- Add request validation for incoming messages.
- Add structured error responses for model/API/tool failures.
- Keep the TUI functional by either calling the service directly or optionally calling the local API.
- Add API tests for empty messages, normal chat requests, and error handling.

**Initial API Contract:**
```json
POST /api/chat
{
  "message": "what rooms do you have?",
  "sessionId": "optional-session-id"
}
```

```json
200 OK
{
  "response": "...",
  "skill": "Rooms Agent",
  "sessionId": "..."
}
```

### Phase 2: Replace JSON Persistence

- Replace `data/bookings.json` with a database such as PostgreSQL.
- Move booking, guest, and invoice logic behind repository/service classes.
- Keep tool modules thin: tools should call services instead of reading/writing files directly.
- Use Redis or database-backed session storage instead of `MemorySession` for multi-instance deployments.

### Phase 3: Authentication and Guest Verification

- Require verification before returning guest-specific booking, billing, or profile data.
- Supported verification options may include booking reference + last name, email OTP, hotel app login, or PMS-authenticated guest token.
- Prevent disclosure of another guest's data based only on a name.

### Phase 4: Hotel System Integrations

- Integrate with PMS systems such as Opera, Mews, Cloudbeds, or StayNTouch.
- Integrate with POS/room-service, CRM/loyalty, payment/invoice, and maintenance/ticketing systems.
- Replace mock tools with production service clients.

### Phase 5: Safety, Guardrails, and Auditability

- Require explicit confirmation before write tools modify bookings.
- Validate room availability, date ranges, guest counts, and pricing before reservation or modification.
- Log every tool call and booking mutation with user/session context.
- Add escalation to staff for unsafe, ambiguous, or high-impact requests.

### Phase 6: Observability and Operations

- Track agent handoffs, tool calls, latency, failures, and booking mutations.
- Enable OpenAI tracing or equivalent tracing for agent workflows.
- Add structured application logs and metrics dashboards.
- Monitor hallucination/error reports and guest satisfaction signals.

### Phase 7: Additional Specialist Agents

- Add `EscalationAgent` for staff handoff.
- Add `RoomServiceAgent` for food and amenity ordering.
- Add `HousekeepingAgent` for cleaning, towels, maintenance, and room requests.
- Add `TransportationAgent` for taxis, shuttles, airport transfers, and local directions.
- Add `ComplaintResolutionAgent` for guest issues and service recovery.

### Phase 8: Multi-Property Support

- Add hotel/property ID to request context.
- Partition room, dining, amenities, booking, and policy data by property.
- Ensure agents and tools always operate within the active property context.
