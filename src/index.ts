import { voiceGeneration } from './voiceGeneration';
import { videoGeneration } from './videoGeneration';
import { submitSyncJob, pollJobStatus } from './syncai';  // Importing Sync API functions
import fs from 'fs';
import path from 'path';
import { uploadToS3 } from './s3';  // Re-add this import

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

export async function generateVideo(text: string) {
  const outputDir = path.join(__dirname, '../output');
  
  // Randomly select an env folder
  const envFolders = ['env1', 'env2', 'env3', 'env4'];
  const selectedEnv = envFolders[Math.floor(Math.random() * envFolders.length)];
  const envFolder = path.join(__dirname, `../public/JP/${selectedEnv}`);
  
  try {
    const voiceId = 'K1zEUenwO6XnzLVQdgEp';

    // Generate the voice (audio)
    const audioFilePath = await voiceGeneration(text, voiceId);
    console.log(`Audio file saved at: ${audioFilePath}`);
    
    // Pass the envFolder to videoGeneration
    const videoFilePath = await videoGeneration(audioFilePath, envFolder);
    console.log(`🎬 Video generated: ${videoFilePath}`);

    // Submit sync job only once here
    const jobId = await submitSyncJob(outputDir);
    const finalVideoPath = await pollJobStatus(jobId, outputDir);
    console.log(`🎬 Final synced video saved at: ${finalVideoPath}`);

    // Upload to S3 and get URL
    const s3Key = `videos/${Date.now()}_final.mp4`;
    const s3Url = await uploadToS3(finalVideoPath, s3Key);
    
    return s3Url;  // Return the S3 URL
  } catch (error) {
    console.error('An error occurred:', error);
    throw error;
  }
}

// Only run main() once
generateVideo('Example');