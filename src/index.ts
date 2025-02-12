import { voiceGeneration } from './voiceGeneration';
import { videoGeneration } from './videoGeneration';
import { submitSyncJob, pollJobStatus } from './syncai';  // Importing Sync API functions

async function main() {
  const text = `This faggot noah solomon man, god the jeets hate this guys guts, 
  and i really cant fucking stand this fellow either as a matter of fact, so its not as
  if this is just some jeetian archetypical trait you know its like... and fuck the
  jeets man who gives a fuck ya know? it's like god these fucking jeet faggots man.
  and that's the worst part about being in my position is that, you have to deal with jeet
  rice niggers who fuck with your shit, but anyways im rambling, we were talking about
  noah solomon`;
  
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