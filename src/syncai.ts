import fs from 'fs';
import fetch from 'node-fetch'; // Importing fetch for Node.js
import dotenv from 'dotenv';
import AWS from 'aws-sdk';

// Load environment variables from .env file
dotenv.config();

// Get API key from .env
const API_KEY = process.env.SYNC_API_KEY;
if (!API_KEY) {
  console.error('❌ Missing SYNC_API_KEY in .env file');
  process.exit(1);
}

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'us-east-1',  // Replace with your bucket's region if needed
});

// Path to your local video and audio files
const VIDEO_PATH = 'output/video/final.mp4';  // Modify this path if needed
const AUDIO_PATH = 'output/audio/output.mp3';  // Modify this path if needed

// S3 configuration
const BUCKET_NAME = 'syncbucketai'; // Replace with your bucket name

// Output directory
const OUTPUT_DIR = './output/final';
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Sync API endpoint
const SYNC_API_URL = 'https://api.sync.so/v2/generate';

console.log('API URL:', SYNC_API_URL);

/**
 * Upload a file to S3 and return the URL.
 */
async function uploadToS3(filePath: string, key: string): Promise<string> {
  const fileStream = fs.createReadStream(filePath);  // Use stream for efficiency
  
  const params = {
    Bucket: BUCKET_NAME, // The bucket name
    Key: key, // The S3 object key
    Body: fileStream, // The file content as a stream
    ContentType: 'application/octet-stream', // Set the content type accordingly
    ACL: 'public-read', // Set ACL (access control list) if needed (make it publicly accessible)
  };

  try {
    const uploadResult = await s3.upload(params).promise();
    console.log(`✅ File uploaded to S3: ${uploadResult.Location}`);  // Log the URL to verify
    return uploadResult.Location; // Return the S3 URL
  } catch (error) {
    console.error('❌ Error uploading file to S3:', error);
    throw error;
  }
}

/**
 * Submits a job to the Sync API for lip-syncing.
 */
export async function submitSyncJob() {
  // Check if video and audio files exist before uploading
  if (!fs.existsSync(VIDEO_PATH)) {
    console.error(`❌ Video file not found: ${VIDEO_PATH}`);
    throw new Error(`❌ Video file not found: ${VIDEO_PATH}`);
  }
  if (!fs.existsSync(AUDIO_PATH)) {
    console.error(`❌ Audio file not found: ${AUDIO_PATH}`);
    throw new Error(`❌ Audio file not found: ${AUDIO_PATH}`);
  }

  console.log(`✅ Video file and audio file exist. Proceeding with upload...`);

  // Upload video and audio to S3 and get their URLs
  const videoUrl = await uploadToS3(VIDEO_PATH, 'video/final.mp4');
  const audioUrl = await uploadToS3(AUDIO_PATH, 'audio/output.mp3');

  console.log(`✅ Video URL: ${videoUrl}`);
  console.log(`✅ Audio URL: ${audioUrl}`);

  try {
    console.log(`🛠️ Submitting sync job to Sync API...`);
    
    const requestBody = {
        model: 'lipsync-1.8.0',
        input: [
            {
                type: 'video',
                url: videoUrl
            },
            {
                type: 'audio',
                url: audioUrl
            }
        ],
        options: {
            output_format: 'mp4',
            sync_mode: 'bounce',
            fps: 30
        }
    };

    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(SYNC_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY!
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.log('Full response:', {
            status: response.status,
            headers: Object.fromEntries(response.headers.entries()),
            body: errorText
        });
        throw new Error(`❌ Error submitting sync job: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json() as { id: string };  // Changed from job_id to id
    console.log(`✅ Sync job submitted. Job ID: ${responseData.id}`);
    return responseData.id;  // Return id instead of job_id
  } catch (error) {
    console.error('❌ Error submitting sync job:', error);
    throw error;
  }
}

/**
 * Polls the Sync API for job status until completion.
 */
export async function pollJobStatus(jobId: string) {
    const JOB_STATUS_URL = `https://api.sync.so/v2/generate/${jobId}`;

    let retries = 300;  // Increased from 10 to 60 (5 minutes total)
    while (retries > 0) {
        try {
            const response = await fetch(JOB_STATUS_URL, {
                method: 'GET',
                headers: { 'x-api-key': API_KEY! },
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Error response:`, errorText);
                throw new Error(`Failed to get job status: ${response.status}`);
            }

            const data = await response.json() as {
                status: string;
                outputUrl?: string;
                error?: string;
            };

            if (data.status === 'PROCESSING') {
                console.log(`🔄 Job status: ${data.status} (${retries} retries left)`);
            } else {
                console.log(`🔄 Job status: ${data.status}`);
            }

            if (data.error) {
                throw new Error(`Job failed: ${data.error}`);
            }

            if (data.status === 'COMPLETED' && data.outputUrl) {
                console.log(`✅ Lip-synced video ready: ${data.outputUrl}`);
                const outputFilePath = `${OUTPUT_DIR}/final_video.mp4`;

                // Download the final video
                const file = await fetch(data.outputUrl);
                const fileStream = fs.createWriteStream(outputFilePath);

                if (!file.body) {
                  throw new Error('❌ Failed to download video: Response body is null');
                }
                file.body.pipe(fileStream);
                return new Promise((resolve, reject) => {
                  fileStream.on('finish', () => resolve(outputFilePath));
                  fileStream.on('error', reject);
                });
            }
        } catch (error) {
            console.error('❌ Error checking job status:', error);
        }

        retries--;
        await new Promise((resolve) => setTimeout(resolve, 10000));  // Still checking every 5 seconds
    }

    throw new Error('❌ Sync job did not complete within 5 minutes. You can check the status manually at https://sync.so/dashboard');
}

/**
 * Main function to handle the sync process.
 */
async function processSync() {
  try {
    const jobId = await submitSyncJob();
    const outputFilePath = await pollJobStatus(jobId);
    console.log(`🎬 Final synced video saved to: ${outputFilePath}`);
  } catch (error) {
    console.error('❌ Sync process failed:', error);
  }
}

// Run the process
processSync();