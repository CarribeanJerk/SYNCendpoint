import { voiceGeneration } from './voiceGeneration';
import { videoGeneration } from './videoGeneration';
import { submitSyncJob, pollJobStatus } from './syncai';  // Importing Sync API functions

async function main() {
  const text = `Well so you know, Brainrot jay ess, you fuckers really thought that was dead didn't ya?
  And it's like i don't blame you right? Noah solomon had totally abandoned the project to work on
  saving the world or whatever, you know. And that's all great but, the divine hand of providence had
  another plan. And so brainrot is coming back bitches. This isn't just a shitpost, no no. This is an expression
  of what is to come, so prepare your damnn bollocks and keep notifications on, for gods sake man.`;
  
  const voiceId = 'K1zEUenwO6XnzLVQdgEp'; // Replace with the desired voice ID

  try {
    // Generate the voice (audio)
    const audioFilePath = await voiceGeneration(text, voiceId);
    console.log(`Audio file saved at: ${audioFilePath}`);
    
    // Generate the video based on the audio
    const videoFilePath = await videoGeneration(audioFilePath);
    console.log(`🎬 Final video generated: ${videoFilePath}`);

    // Now, submit the sync job to Sync API
    const jobId = await submitSyncJob();
    const finalVideoPath = await pollJobStatus(jobId);
    console.log(`🎬 Final synced video saved at: ${finalVideoPath}`);

  } catch (error) {
    console.error('An error occurred:', error);
  }
}

main();