import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';

// Define clip folders
const FOLDERS = [
  path.join(__dirname, '../public/JP/angle_1'),
  path.join(__dirname, '../public/JP/angle_2')
];

const OUTPUT_DIR = path.join(__dirname, '../output/video');
const OUTPUT_VIDEO_PATH = path.join(OUTPUT_DIR, 'final.mp4');

// Ensure output directory exists
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

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
 * Selects a random video from the given folder.
 */
function getRandomVideo(folder: string): string | null {
  const files = fs.readdirSync(folder).filter(file => file.endsWith('.mp4'));
  return files.length > 0 ? path.join(folder, files[Math.floor(Math.random() * files.length)]) : null;
}

/**
 * Generates a video matching the length of the audio.
 */
export async function videoGeneration(audioFilePath: string): Promise<string> {
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
        const videoPath = getRandomVideo(folder);

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
