import ffmpeg from 'fluent-ffmpeg'
import { execFileSync } from 'node:child_process'
import { resolveMediaBinaries } from './media-binaries.js'

const { ffmpegPath: FFMPEG_BIN, ffprobePath: FFPROBE_BIN } = resolveMediaBinaries()

ffmpeg.setFfmpegPath(FFMPEG_BIN)
ffmpeg.setFfprobePath(FFPROBE_BIN)

export function getAudioDurationSeconds(filepath) {
  try {
    const stdout = execFileSync(
      FFPROBE_BIN,
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', filepath],
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
