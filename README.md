# Hotel Concierge AI

An AI-powered hotel concierge assistant with a terminal-based text user interface (TUI). Uses the OpenAI Agents SDK for specialist handoffs and tool-backed answers about rooms, dining, amenities, bookings, and hotel policies.

## Features

- **Interactive CLI Interface**: Terminal-based chat UI built with Blessed
- **Agents SDK Workflow**: Triage agent hands off to specialist agents
- **Conversational Context**: Uses an Agents SDK in-memory session across conversation turns
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

## Agents And Tools

| Agent/Tool | Type | Description |
|-------|------|-------------|
| Triage Agent | agent | Routes requests to specialists |
| Rooms Agent | agent + tool | Room info from `data/rooms.md` |
| Dining Agent | agent + tool | Restaurant menus from `data/menus.md` |
| Amenities Agent | agent + tool | Hotel facilities from `data/amenities.md` |
| Guest Records Agent | agent + tool | Existing bookings, guest profile, invoices |
| Reservation Agent | agent + tool | Creates new reservations |
| Booking Resolution Agent | agent + tool | Booking modifications |
| WiFi/Checkout/Emergency Agents | static agents | Hotel policy responses |

## Project Structure

```
hotel-concierge-ai/
├── src/
│   ├── agents/         # Agents SDK workflow
│   ├── tools/          # Tool-backed data access
│   ├── types/          # Shared types
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
