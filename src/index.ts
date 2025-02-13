import { voiceGeneration } from './voiceGeneration';
import { videoGeneration } from './videoGeneration';
import { submitSyncJob, pollJobStatus } from './syncai';  // Importing Sync API functions
import fs from 'fs';
import path from 'path';

// Function to clear specified output folders
function clearOutputFolders() {
  const outputFolders = [
    path.join(__dirname, '../output/final'),
    path.join(__dirname, '../output/audio'),
    path.join(__dirname, '../output/video')
  ];

  outputFolders.forEach(folder => {
    if (fs.existsSync(folder)) {
      fs.readdirSync(folder).forEach(file => {
        const filePath = path.join(folder, file);
        fs.unlinkSync(filePath); // Remove file
      });
    }
  });
}

// Call the clearOutputFolders function before the main function
clearOutputFolders();

async function main() {
  try {
    const text = `well so, I'm not really sure about this Noah solomon fellow... I mean you never know man...
    he could just fuckin rug pull our dumb asses again like he did with the pillzoomie projec, and you know...
    it's like that's not ideal in the slightest, but whatever man we'll see what happens `; // your text
    const voiceId = 'K1zEUenwO6XnzLVQdgEp';

    // Generate the voice (audio)
    const audioFilePath = await voiceGeneration(text, voiceId);
    console.log(`Audio file saved at: ${audioFilePath}`);
    
    // Generate the video based on the audio
    const videoFilePath = await videoGeneration(audioFilePath);
    console.log(`🎬 Video generated: ${videoFilePath}`);

    // Submit sync job only once here
    const jobId = await submitSyncJob();
    const finalVideoPath = await pollJobStatus(jobId);
    console.log(`🎬 Final synced video saved at: ${finalVideoPath}`);

  } catch (error) {
    console.error('An error occurred:', error);
  }
}

// Only run main() once
main();