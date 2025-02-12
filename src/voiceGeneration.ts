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
          stability: 0.4,
          similarity_boost: 0.75,
          style: .2
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
    const outputDir = path.join(__dirname, '../output/audio');
    const outputFilePath = path.join(outputDir, 'output.mp3');

    // Ensure the output directory exists
    fs.mkdirSync(outputDir, { recursive: true });

    // Save the audio file
    fs.writeFileSync(outputFilePath, audioBuffer);

    console.log(`✅ Audio file saved at: ${outputFilePath}`);
    return outputFilePath;
  } catch (error) {
    console.error('❌ Error generating voice:', error);
    throw error;
  }
}
