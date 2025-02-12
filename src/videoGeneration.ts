import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';

// Define clip folders
const ENV_FOLDERS = ['env1', 'env2', 'env3', 'env4']; // Add your environment folders here
const FOLDERS = ENV_FOLDERS.flatMap(env => [
  path.join(__dirname, `../public/JP/${env}/angle1`),
  path.join(__dirname, `../public/JP/${env}/angle2`)
]);

const OUTPUT_DIR = path.join(__dirname, '../output/video');
const OUTPUT_VIDEO_PATH = path.join(OUTPUT_DIR, 'final.mp4');

// Ensure output directory exists
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Track used videos to prevent reuse
let usedVideos = new Set<string>();
let currentAngle = 1; // Track current angle (1 or 2)

/**
 * Gets the duration of a video file.
 */
function getVideoDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(`Error reading video duration: ${err.message}`);
      const duration = metadata.format.duration;
      if (typeof duration === 'number') {
        resolve(duration);
      } else {
        reject(`Invalid duration for file: ${filePath}`);
      }
    });
  });
}

/**
 * Selects a random video from the given folder, alternating angles and preventing reuse.
 */
function getRandomVideo(): string | null {
  // Reset usedVideos if we've used all videos
  if (usedVideos.size >= ENV_FOLDERS.length * 2 * 10) { // assuming max 10 videos per angle folder
    usedVideos.clear();
  }

  // Randomly select an environment folder
  const envFolder = ENV_FOLDERS[Math.floor(Math.random() * ENV_FOLDERS.length)];
  const folder = path.join(__dirname, `../public/JP/${envFolder}`);

  // Alternate between angle1 and angle2
  const angleFolder = path.join(folder, `angle${currentAngle}`);
  currentAngle = currentAngle === 1 ? 2 : 1; // Switch angle for next time
  
  // Get all available videos in this folder that haven't been used
  const files = fs.readdirSync(angleFolder)
    .filter(file => file.endsWith('.mp4'))
    .map(file => path.join(angleFolder, file))
    .filter(filePath => !usedVideos.has(filePath));

  if (files.length === 0) {
    console.warn(`⚠️ No unused videos found in ${angleFolder}, skipping.`);
    return null;
  }

  // Select a random unused video
  const selectedVideo = files[Math.floor(Math.random() * files.length)];
  usedVideos.add(selectedVideo);
  return selectedVideo;
}

/**
 * Generates a video matching the length of the audio.
 */
export async function videoGeneration(audioFilePath: string): Promise<string> {
  // Reset tracking variables
  usedVideos.clear();
  currentAngle = 1;
  
  return new Promise(async (resolve, reject) => {
    // Get audio duration
    ffmpeg.ffprobe(audioFilePath, async (err, metadata) => {
      if (err) return reject('❌ Error reading audio file duration.');
      const audioDuration = metadata.format.duration || 0;

      if (audioDuration === 0) {
        return reject('❌ Audio file has zero duration.');
      }

      let selectedVideos: string[] = [];
      let totalDuration = 0;
      let index = 0;

      // Keep selecting random clips in sequence (1 → 2 → repeat) until the total length matches audio
      while (totalDuration < audioDuration) {
        const folder = FOLDERS[index % FOLDERS.length]; // Cycle between 2 folders
        const videoPath = getRandomVideo();

        if (!videoPath) {
          console.warn(`⚠️ No videos found in ${folder}, skipping.`);
          index++;
          continue;
        }

        try {
          const videoDuration = await getVideoDuration(videoPath);
          selectedVideos.push(videoPath);
          totalDuration += videoDuration;
        } catch (e) {
          console.warn(`⚠️ Skipping video due to error: ${videoPath}`);
        }

        index++;
      }

      if (selectedVideos.length === 0) {
        return reject('❌ No valid videos selected.');
      }

      // Generate FFmpeg concat file
      const concatFilePath = path.join(OUTPUT_DIR, 'filelist.txt');
      let concatFileContent = selectedVideos.map(v => `file '${v}'`).join('\n');
      fs.writeFileSync(concatFilePath, concatFileContent);

      // Trim the last video if necessary
      let excessDuration = totalDuration - audioDuration;
      let ffmpegCommand = ffmpeg()
        .input(concatFilePath)
        .inputOptions(['-f concat', '-safe 0'])
        .output(OUTPUT_VIDEO_PATH)
        .on('end', () => {
          console.log(`✅ Final video created: ${OUTPUT_VIDEO_PATH}`);
          resolve(OUTPUT_VIDEO_PATH);
        })
        .on('error', err => reject(`❌ FFmpeg error: ${err.message}`));

      if (excessDuration > 0) {
        ffmpegCommand.outputOptions(`-t ${audioDuration}`);
      }

      ffmpegCommand.run();
    });
  });
}
