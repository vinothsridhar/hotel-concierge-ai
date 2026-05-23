import OpenAI from 'openai';

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return client;
}

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  const blob = new Blob([audioBuffer], { type: 'audio/wav' });
  const file = new File([blob], 'audio.wav', { type: 'audio/wav' });

  const transcription = await getClient().audio.transcriptions.create({
    file,
    model: 'whisper-1',
    response_format: 'text'
  });

  return transcription as unknown as string;
}
