# Voice Chat Implementation Plan

## Status: Implemented

---

## Goal

Convert the text-based chat app into a voice-based interactive chat app. Users speak their queries, and the AI concierge responds with spoken audio, creating a hands-free, natural conversational experience.

---

## High-Level Flow (In-Memory Pipeline)

```
User speaks → Microphone (mic) → WAV stream in memory (Buffer)
    → OpenAI Whisper (STT) → transcribed text
    → HotelAgentService.route() → agent text response
    → OpenAI TTS API → MP3 in memory (Buffer)
    → Audio playback (sox play via stdin) → User hears response
```

**No disk I/O** — all audio stays in memory throughout the pipeline.

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `mic` | Microphone capture via sox (cross-platform: macOS/Linux/Windows) |
| `openai` | REST client for Whisper STT + TTS endpoints |

**System requirement**: `sox` must be installed (`brew install sox` on macOS, `apt-get install sox` on Linux). Sox provides `rec` (recording) and `play` (playback).

---

## New Files Created

### `src/voice/stt.ts` — Speech-to-Text

Accepts a WAV `Buffer`, sends to OpenAI Whisper, returns transcribed text.

```typescript
transcribeAudio(audioBuffer: Buffer): Promise<string>
```

### `src/voice/tts.ts` — Text-to-Speech

Accepts text, calls OpenAI TTS, returns MP3 `Buffer`.

```typescript
synthesizeSpeech(text: string): Promise<Buffer>
```

### `src/voice/recorder.ts` — Microphone Recording

Uses `mic` with `fileType: 'wav'` — sox outputs valid WAV stream directly. Collected into a Buffer in memory.

```typescript
startRecording(timeoutMs?: number): Promise<Buffer>
stopRecording(): void
```

### `src/voice/player.ts` — Audio Playback

Accepts MP3 `Buffer`, pipes to sox `play` via stdin.

```typescript
playAudio(audioBuffer: Buffer): Promise<void>
```

### `src/voice/app.ts` — Voice Chat Orchestrator

Manages stdin keypresses (SPACE to start/stop, Q to quit), orchestrates the full pipeline per utterance.

---

## Files Modified

- **`src/index.ts`** — Added `voice` mode
- **`src/types/voice.d.ts`** — Type declarations for `mic`
- **`.env.example`** — Added TTS_VOICE, TTS_SPEED, RECORD_TIMEOUT
- **`package.json`** — Added `mic`, `openai` dependencies

---

## Agent/Service Impact

**No changes needed to `HotelAgentService` or any agent/tool modules.**

The voice layer is purely an I/O wrapper. `MemorySession` conversation context is preserved across voice exchanges.

---

## Recording UX

| Action | Trigger | Feedback |
|--------|---------|----------|
| Start recording | Press SPACE | "Recording... Speak now." |
| Stop recording | Press SPACE again | "Recording complete." |
| Timeout | 10 seconds | Auto-stop |
| Transcribe done | API response | "You said: {text}" |
| Agent response ready | Agent returns | "Concierge: {text}" |
| TTS synthesis | After agent response | "Synthesizing speech..." |
| Playback done | Audio finishes | "Press SPACE to speak again" |
| Quit | Press Q or Esc | Exit |

---

## Environment Variables

```bash
TTS_VOICE=alloy          # alloy, echo, fable, onyx, nova, shimmer
TTS_SPEED=1.0            # Playback speed (0.25 to 4.0)
RECORD_TIMEOUT=10000     # Max recording duration in ms
```

---

## Testing

### Tests (`tests/voice/`)

| Test | What it covers |
|------|---------------|
| `stt.test.ts` | Mocked Whisper transcription from Buffer |
| `tts.test.ts` | Mocked TTS synthesis returning Buffer |
| `recorder.test.ts` | WAV header byte validation, function exports |
| `player.test.ts` | Mocked `play` subprocess via stdin |

All 19 tests pass (1 skipped — live agent smoke test).

---

## Implementation Checklist

- [x] 1. Install voice npm dependencies
- [x] 2. Create `src/voice/` directory structure
- [x] 3. Implement `src/voice/stt.ts` (Whisper transcription)
- [x] 4. Implement `src/voice/tts.ts` (TTS synthesis)
- [x] 5. Implement `src/voice/recorder.ts` (mic capture with fileType wav)
- [x] 6. Implement `src/voice/player.ts` (sox play via stdin)
- [x] 7. Implement `src/voice/app.ts` (voice chat orchestrator)
- [x] 8. Add `voice` mode to `src/index.ts`
- [x] 9. Update `.env.example` with voice env vars
- [x] 10. Update `AGENTS.md` with voice architecture
- [x] 11. Update `progress.md` with voice changes
- [x] 12. Write voice tests
- [x] 13. Build and verify
