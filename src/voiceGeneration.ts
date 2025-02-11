import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

if (!ELEVENLABS_API_KEY) {
  throw new Error('ELEVENLABS_API_KEY is not defined in the environment variables.');
}

export async function voiceGeneration(text: string, voiceId: string): Promise<string> {
  try {
    const response = await axios.post(
      `${ELEVENLABS_API_URL}/${voiceId}`,
      {
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        responseType: 'arraybuffer',
      }
    );

    const audioBuffer = Buffer.from(response.data, 'binary');
    const outputFilePath = path.join(__dirname, 'output', 'output.mp3');

    fs.mkdirSync(path.dirname(outputFilePath), { recursive: true });
    fs.writeFileSync(outputFilePath, audioBuffer);

    return outputFilePath;
  } catch (error) {
    console.error('Error generating voice:', error);
    throw error;
  }
}