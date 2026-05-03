# Hotel AI Assistant - Requirements Document

## 1. Project Overview

- **Project Name**: Hotel Concierge AI
- **Project Type**: Terminal-based Text User Interface (TUI) Demo
- **Core Functionality**: An AI-powered hotel assistant that responds to guest queries through an interactive CLI interface
- **Target Users**: Hotel guests and staff demo purposes

## 2. Technical Stack

- **Language**: TypeScript (Node.js)
- **TUI Framework**: Blessed
- **AI Integration**: OpenAI API (GPT-4) or compatible LLM
- **Configuration**: YAML-based config file
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

2. **Skill Router System**
   Each user query is routed to appropriate skill(s) based on intent detection.

**Skill Types:**
    | Type | Description | Data Source | Conversational |
    |------|-------------|-------------|---------------|
    | Document | Reads from markdown/JSON files | .md files | No |
    | Database | Queries structured data | JSON/SQL | Yes (needs ID/name) |
    | Static | Hardcoded responses | N/A | No |
    | LLM | AI-powered fallback | OpenAI API | No |

**Skill Definition:**
    ```typescript
    interface Skill {
      name: string;
      type: 'document' | 'database' | 'static' | 'llm';
      description: string;
      data_source?: string;        // File path or table name
      response?: string;           // Static response text
      requires_context?: boolean; // Needs guest identification
      context_fields?: string[];    // Required fields: 'name', 'booking_id', 'email', 'phone'
    }
    ```

3. **Skill Pipeline**
   - User query → Intent detection (LLM)
   - LLM classifies intent and extracts relevant skill
   - Execute skill handler via SkillChain
   - Return formatted response
   - Fall back to LLM if skill execution fails

   **SkillChain (Middleware-like Architecture):**
   - Central execution hub for all skills (like Express.js middleware)
   - Each skill registered by type (document, database, static, llm)
   - Skills can forward to other skills via `skillChain.forward(type, context)`
   - Separation of concerns: LLM analyzes → Database writes → Router responds

**Intent Detection (LLM-based):**
    ```typescript
    interface IntentRequest {
      query: string;
      available_skills: SkillMeta[];  // name, description, intents
    }

    interface IntentResult {
      skill_name: string;
      confidence: number;
      reasoning: string;
      extracted_data?: Record<string, string>;
      needs_context?: boolean;
      pending_actions?: { action: string; needs: string; prompt: string }[];  // For multi-action requests
    }
    ```

    **Multi-Action Support:**
    - Single query can contain multiple actions (e.g., "upgrade room and add guest")
    - LLM returns pending_actions array for actions needing additional input
    - pendingActions tracked in array for sequential processing
    - Example: User says "3" → applies to all pending actions

   **Intent Detection Prompt:**
   ```
   Given the user query and available skills, select the best matching skill.
   
   Available skills:
   - rooms: Hotel room information, pricing, amenities
   - dining: Restaurant menus, hours, reservations
   - bookings: Guest reservations, booking details
   - wifi: WiFi and internet information
   - general: General assistance and recommendations
   
   User query: "{query}"
   
   Return JSON with: skill, confidence (0-1), reasoning
   ```

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

**Skill Configuration:**
     | Skill | Type | Data Source | Requires Context | Context Fields |
     |-------|------|-------------|-----------------|---------------|
     | rooms | document | data/rooms.md | No | - |
     | dining | document | data/menus.md | No | - |
     | amenities | document | data/amenities.md | No | - |
     | bookings | database | bookings.json | Yes | name, booking_id |
     | discrepancy | llm | - | Yes | name, booking_id |
     | resolution | llm | - | Yes | name, booking_id |
     | billing | database | bookings.json | Yes | name, booking_id, email |
     | guest_info | database | bookings.json | Yes | name, email, phone |
     | wifi | static | - | No | - |
     | emergency | static | - | No | - |
     | checkout | static | - | No | - |
     | acknowledgment | static | - | No | - |
     | goodbye | static | - | No | - |
     | general | llm | - | No | - |

     **Skills:**
     - **discrepancy** (LLM): Identifies booking issues and offers resolution options
     - **resolution** (LLM): Handles modification requests via SkillChain
       - Actions: upgrade, downgrade, date_change, extend_stay, early_checkout, guest_count_change
       - LLM outputs structured JSON, forwards to database skill for updates
       - Supports multiple changes in single request
     - **acknowledgment** (static): Handles simple responses like "yes", "no", "thanks"
     - **goodbye** (static): Handles farewell messages

     **Chain of Skills:**
     - Resolution skill uses skillChain.forward() to call database skill
     - Database skill has updateBooking() method for writes
     - Data changes flow through SkillChain, not direct modification

**Conversation Context:**
     - LLM-based intent detection with full conversation history
     - pending_actions: array to track multi-step flows
     - User input (like "3") can apply to all pending actions
     - Resolution skill handles multiple actions in single request

     **Database Updates (via SkillChain):**
     - Resolution skill calls database skill via skillChain.forward()
     - Database skill updateBooking() handles: room_type, guests, check_in, check_out
     - Prices loaded from data/prices.json (not hardcoded)
     - Changes written to bookings.json

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
├── .gitignore               # Git ignore rules
├── README.md                # Project documentation
├── REQ.md                  # Requirements (this file)
├── AGENTS.md                # Agent definitions
├── progress.md             # Implementation progress
├── package.json            # Dependencies
├── package-lock.json        # Lock file
├── tsconfig.json          # TypeScript config
├── vitest.config.ts        # Test config
├── data/
│   ├── rooms.md           # Room details (document skill)
│   ├── menus.md           # Restaurant menus (document skill)
│   ├── amenities.md      # Amenities info (document skill)
│   ├── bookings.json    # Mock database (database skill)
│   ├── prices.json     # Room pricing
│   └── skills.yaml     # Skill configuration
├── src/
│   ├── index.ts           # Entry point
│   ├── router/
│   │   ├── skill_router.ts   # Intent detection & routing
│   │   └── types.ts      # Skill interfaces
│   ├── skills/
│   │   ├── document_skill.ts  # Reads from .md files
│   │   ├── database_skill.ts  # Queries/updates JSON data
│   │   ├── static_skill.ts   # Hardcoded responses
│   │   ├── llm_skill.ts      # OpenAI integration
│   │   ├── skill_chain.ts   # Middleware-like execution hub
│   │   └── types.ts
│   ├── services/
│   │   └── openai_client.ts  # OpenAI API wrapper
│   └── tui/
│       └── app.ts         # Blessed-based terminal UI
└── tests/                 # Vitest test files
    ├── document_skill.test.ts
    ├── database_skill.test.ts
    ├── static_skill.test.ts
    ├── llm_client.test.ts
    ├── router.test.ts
    └── conversation.test.ts
```

## 6. Configuration

### Environment Variables (.env)
```
OPENAI_API_KEY=your_api_key_here
HOTEL_NAME=Grand Horizon Hotel
DEFAULT_GUEST_ID=G001  # For demo purposes
LOG_LEVEL=info
```

### Skills Config (skills.yaml)
- Defines all skills with type, description, data_source
- Skills need description (not just keywords) for LLM to understand
- Router settings: fallback, timeout, confidence_threshold
- Loaded at startup, immutable during runtime

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
- [x] Configuration loads from skills.yaml
- [x] resolution skill handles multiple changes in single request
- [x] date_change support (check_in, check_out)
- [x] Chain of skills (SkillChain architecture)

**Error Handling:**
- [x] API errors show user-friendly messages
- [x] Missing data files handled gracefully
- [x] Empty input validation

**Testing:**
- [x] Vitest test suite
- [x] 45 tests passing

## 8. Future Enhancements (Out of Scope for Demo)

- Voice input support
- Multi-language support
- Integration with hotel PMS system
- Room service ordering
- Booking capabilities
- Push notifications