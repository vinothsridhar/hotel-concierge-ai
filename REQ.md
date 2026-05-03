# Hotel AI Assistant - Requirements Document

## 1. Project Overview

- **Project Name**: Hotel Concierge AI
- **Project Type**: Terminal-based Text User Interface (TUI) Demo
- **Core Functionality**: An AI-powered hotel assistant that responds to guest queries through an interactive CLI interface
- **Target Users**: Hotel guests and staff demo purposes

## 2. Technical Stack

- **Language**: TypeScript (Node.js)
- **TUI Framework**: Blessed (recommended) or Ink
- **AI Integration**: OpenAI API (GPT-4) or local LLM
- **Configuration**: YAML or JSON-based config file

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
    interface ConversationContext {
      sessionId: string;
      pendingSkill?: string;        // Skill waiting for more info
      requiredFields?: string[];    // Fields needed (e.g., ['name', 'bookingId'])
      extractedData?: Record<string, string>;  // User provided data
      lastTopic?: string;           // Current topic (rooms, bookings, dining)
      lastBookingId?: string;       // Last referenced booking ID
      lastGuestId?: string;         // Last identified guest
      history: ChatMessage[];
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
   - Execute skill handler with query
   - Return formatted response
   - Fall back to LLM if skill execution fails

   **Intent Detection (LLM-based):**
   ```typescript
   interface IntentRequest {
     query: string;
     available_skills: SkillMeta[];  // name, description, intents
   }

   interface IntentResponse {
     skill: string;           // Selected skill name
     confidence: number;      // 0-1
     reasoning: string;       // Why this skill was selected
   }
   ```

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

    **New Skills:**
    - **discrepancy** (LLM): Identifies booking issues (room mismatches, pricing issues) and offers resolution options
    - **resolution** (LLM): Handles modification requests (upgrade, downgrade, date_change, extend_stay, guest_count_change). LLM outputs structured JSON, code executes the action
    - **acknowledgment** (static): Handles simple responses like "yes", "no", "thanks"
    - **goodbye** (static): Handles farewell messages

    **Conversation Context:**
    - LLM-based intent detection passes full conversation history to LLM
    - Router maintains pendingAction for multi-step flows (e.g., guest count change)
    - User can continue pending action with simple input (e.g., "3" after being asked for guest count)

    **Database Updates:**
    - Resolution skill writes changes back to bookings.json (room_type, guest count)
    - Prices loaded from data/prices.json (not hardcoded)

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
hotel-assistant/
├── config.yaml              # Configuration file
├── data/
│   ├── rooms.md             # Room details (document skill)
│   ├── menus.md             # Restaurant menus (document skill)
│   ├── amenities.md         # Amenities info (document skill)
│   ├── bookings.json        # Mock database (database skill)
│   └── skills.yaml          # Skill configuration
├── src/
│   ├── index.ts             # Entry point
│   ├── router/
│   │   ├── skill_router.ts  # Intent detection & routing
│   │   └── types.ts         # Skill interfaces
│   ├── skills/              # Skill implementations
│   │   ├── document_skill.ts    # Reads from .md files
│   │   ├── database_skill.ts    # Queries JSON data
│   │   ├── static_skill.ts      # Hardcoded responses
│   │   └── llm_skill.ts         # OpenAI fallback
│   ├── tui/                 # TUI components
│   │   ├── app.ts           # Main application
│   │   ├── widgets.ts       # Custom widgets
│   │   └── screens.ts       # Screen definitions
│   └── services/
│       └── ai_service.ts    # OpenAI client
├── package.json             # Dependencies
├── tsconfig.json           # TypeScript config
└── .env.example            # Environment variables template
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
- [ ] Application launches without errors in terminal
- [ ] User can type and receive responses
- [ ] Quick action buttons work correctly
- [ ] Chat history scrolls properly
- [ ] Typing indicator shows during AI processing
- [ ] Session can be cleared
- [ ] Clean exit with Ctrl+C

**Skills:**
- [ ] rooms skill returns room info from rooms.md
- [ ] dining skill returns menu/hours from menus.md
- [ ] amenities skill returns facilities from amenities.md
- [ ] bookings skill queries from bookings.json
- [ ] wifi/static skill returns hardcoded response
- [ ] Unknown query falls back to LLM
- [ ] Configuration loads from skills.yaml

**Error Handling:**
- [ ] API errors show user-friendly messages
- [ ] Missing data files handled gracefully
- [ ] Empty input validation

## 8. Future Enhancements (Out of Scope for Demo)

- Voice input support
- Multi-language support
- Integration with hotel PMS system
- Room service ordering
- Booking capabilities
- Push notifications