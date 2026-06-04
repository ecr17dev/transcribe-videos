import ffmpeg from 'fluent-ffmpeg'
import { execSync } from 'node:child_process'

export function getAudioDurationSeconds(filepath) {
  try {
    const stdout = execSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${filepath}"`,
      { encoding: 'utf8', timeout: 15000 }
    )
    return parseFloat(stdout.trim()) || 0
  } catch {
    return 0
  }
}

export function extractAudio(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .noVideo()
      .audioCodec('libmp3lame')
      .audioBitrate('32k')
      .audioChannels(1)
      .audioFrequency(16000)
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(new Error(`ffmpeg extraction failed: ${err.message}`)))
      .run()
  })
}
