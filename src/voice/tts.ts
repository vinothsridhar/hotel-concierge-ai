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

export async function synthesizeSpeech(text: string): Promise<Buffer> {
  const response = await getClient().audio.speech.create({
    model: 'tts-1',
    voice: (process.env.TTS_VOICE as any) || 'alloy',
    speed: parseFloat(process.env.TTS_SPEED || '1.0'),
    input: text,
    response_format: 'mp3'
  });

  return Buffer.from(await response.arrayBuffer());
}
