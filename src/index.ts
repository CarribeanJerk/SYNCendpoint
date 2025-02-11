import { voiceGeneration } from './voiceGeneration';

async function main() {
  const text = 'This faggot noah solomon man, god the jeets hate this guys guts';
  const voiceId = 'K1zEUenwO6XnzLVQdgEp'; // Replace with the desired voice ID

  try {
    const audioFilePath = await voiceGeneration(text, voiceId);
    console.log(`Audio file saved at: ${audioFilePath}`);
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

main();