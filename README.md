# Hotel Concierge AI

An AI-powered hotel concierge assistant with a terminal-based text user interface (TUI). Uses OpenAI GPT for natural language understanding and intent detection to answer guest queries about rooms, dining, amenities, and bookings.

## Features

- **Interactive CLI Interface**: Terminal-based chat UI built with Blessed
- **Skill Router System**: Routes queries to appropriate handlers (document, database, static, LLM)
- **Conversational Context**: Remembers guest identification across conversation turns
- **Multi-Action Support**: Handles multiple requests in a single query (e.g., "upgrade room and add guest")
- **Mock Database**: JSON-based guest, booking, and invoice data

## Quick Start

```bash
# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env
# Add your OPENAI_API_KEY to .env

# Build and run
npm run build
npm start
```

## Skills

| Skill | Type | Description |
|-------|------|-------------|
| rooms | document | Room info from data/rooms.md |
| dining | document | Restaurant menus from data/menus.md |
| amenities | document | Hotel facilities from data/amenities.md |
| bookings | database | Guest reservations (needs ID) |
| guest_info | database | Guest profile (needs ID) |
| wifi | static | WiFi information |
| checkout | static | Checkout procedures |
| emergency | static | Emergency contacts |
| resolution | llm | Booking modifications |
| general | llm | Fallback for general queries |

## Project Structure

```
hotel-concierge-ai/
├── src/
│   ├── router/          # Intent detection & routing
│   ├── skills/         # Skill implementations
│   ├── services/       # OpenAI client
│   └── tui/           # Terminal UI
├── data/               # Data files (JSON, markdown)
├── tests/              # Vitest tests
└── package.json
```

## Configuration

Edit `.env`:
```
OPENAI_API_KEY=your_key_here
HOTEL_NAME=Grand Horizon Hotel
```

## Testing

```bash
npm test           # Run tests
npm run build     # Build + test
```

## License

MIT