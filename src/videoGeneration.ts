import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';

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
 * Generates a video matching the length of the audio.
 */
export async function videoGeneration(audioFilePath: string, envFolder: string): Promise<string> {
  // Reset tracking variables
  usedVideos.clear();
  currentAngle = 1;

  // Create angle folders for the specific environment
  const ANGLE_FOLDERS = [
    path.join(envFolder, 'angle1'),
    path.join(envFolder, 'angle2')
  ];
  
  function getRandomVideo(): string | null {
    // Reset usedVideos if we've used all videos
    if (usedVideos.size >= 20) { // assuming max 10 videos per angle folder
      usedVideos.clear();
    }

    // Use currentAngle to get the correct angle folder
    const angleFolder = ANGLE_FOLDERS[currentAngle - 1];
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
        const videoPath = getRandomVideo();

        if (!videoPath) {
          console.warn(`⚠️ No videos found in ${ANGLE_FOLDERS[index % ANGLE_FOLDERS.length]}, skipping.`);
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
      const concatFilePath = path.join(__dirname, '../output/video/filelist.txt');
      let concatFileContent = selectedVideos.map(v => `file '${v}'`).join('\n');
      fs.writeFileSync(concatFilePath, concatFileContent);

      // Trim the last video if necessary
      let excessDuration = totalDuration - audioDuration;
      let ffmpegCommand = ffmpeg()
        .input(concatFilePath)
        .inputOptions(['-f concat', '-safe 0'])
        .output(path.join(__dirname, '../output/video/final.mp4'))
        .on('end', () => {
          console.log(`✅ Final video created: ${path.join(__dirname, '../output/video/final.mp4')}`);
          resolve(path.join(__dirname, '../output/video/final.mp4'));
        })
        .on('error', err => reject(`❌ FFmpeg error: ${err.message}`));

      if (excessDuration > 0) {
        ffmpegCommand.outputOptions(`-t ${audioDuration}`);
      }

      ffmpegCommand.run();
    });
  });
}