import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const { resolveMediaBinaries } = await import('./media-binaries.js')

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'media-binaries-'))
}

function writeExecutable(filePath, body = '#!/bin/sh\nexit 0\n') {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, body, { mode: 0o755 })
}

function makeVersionScript(filePath) {
  writeExecutable(
    filePath,
    '#!/bin/sh\nif [ "$1" = "-version" ]; then\n  echo "ok"\n  exit 0\nfi\nexit 1\n'
  )
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true })
}

test('prefers valid env binaries', () => {
  const dir = makeTempDir()
  try {
    const ffmpegPath = path.join(dir, 'ffmpeg')
    const ffprobePath = path.join(dir, 'ffprobe')
    makeVersionScript(ffmpegPath)
    makeVersionScript(ffprobePath)

    const result = resolveMediaBinaries({
      env: { FFMPEG_PATH: ffmpegPath, FFPROBE_PATH: ffprobePath },
      pathEnv: '',
      installerFfmpegPath: null,
      installerFfprobePath: null,
      forceRefresh: true,
    })

    assert.equal(result.ffmpegPath, ffmpegPath)
    assert.equal(result.ffprobePath, ffprobePath)
    assert.equal(result.source, 'env')
  } finally {
    cleanup(dir)
  }
})

test('rejects env directories and falls back to bundled binaries', () => {
  const dir = makeTempDir()
  try {
    const resourcesPath = path.join(dir, 'resources')
    const platformKey = `${process.platform}-${process.arch}`
    const invalidFfmpegDir = path.join(dir, 'not-a-binary')
    const invalidFfprobeDir = path.join(dir, 'also-not-a-binary')
    const ffmpegPath = path.join(resourcesPath, 'server', 'node_modules', '@ffmpeg-installer', platformKey, process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg')
    const ffprobePath = path.join(resourcesPath, 'server', 'node_modules', '@ffprobe-installer', platformKey, process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe')

    fs.mkdirSync(invalidFfmpegDir, { recursive: true })
    fs.mkdirSync(invalidFfprobeDir, { recursive: true })
    makeVersionScript(ffmpegPath)
    makeVersionScript(ffprobePath)

    const result = resolveMediaBinaries({
      env: {
        FFMPEG_PATH: invalidFfmpegDir,
        FFPROBE_PATH: invalidFfprobeDir,
      },
      resourcesPath,
      pathEnv: '',
      installerFfmpegPath: null,
      installerFfprobePath: null,
      forceRefresh: true,
    })

    assert.equal(result.ffmpegPath, ffmpegPath)
    assert.equal(result.ffprobePath, ffprobePath)
    assert.equal(result.source, 'bundled')
    assert.match(result.details.ffmpeg[0].reason, /not a file/)
    assert.match(result.details.ffprobe[0].reason, /not a file/)
  } finally {
    cleanup(dir)
  }
})

test('rejects invalid installer path and falls back to PATH', () => {
  const dir = makeTempDir()
  try {
    const pathDir = path.join(dir, 'bin')
    const ffmpegPath = path.join(pathDir, process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg')
    const ffprobePath = path.join(pathDir, process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe')

    makeVersionScript(ffmpegPath)
    makeVersionScript(ffprobePath)

    const result = resolveMediaBinaries({
      env: {},
      pathEnv: pathDir,
      installerFfmpegPath: path.join(dir, 'missing-ffmpeg'),
      installerFfprobePath: path.join(dir, 'missing-ffprobe'),
      forceRefresh: true,
    })

    assert.equal(result.ffmpegPath, ffmpegPath)
    assert.equal(result.ffprobePath, ffprobePath)
    assert.equal(result.source, 'system')
  } finally {
    cleanup(dir)
  }
})

test('throws actionable error when no candidates are valid', () => {
  const dir = makeTempDir()
  try {
    assert.throws(
      () => resolveMediaBinaries({
        env: {
          FFMPEG_PATH: path.join(dir, 'missing-env-ffmpeg'),
          FFPROBE_PATH: path.join(dir, 'missing-env-ffprobe'),
        },
        resourcesPath: path.join(dir, 'resources'),
        pathEnv: '',
        installerFfmpegPath: path.join(dir, 'missing-installer-ffmpeg'),
        installerFfprobePath: path.join(dir, 'missing-installer-ffprobe'),
        forceRefresh: true,
      }),
      /No valid ffmpeg binary found/
    )
  } finally {
    cleanup(dir)
  }
})

test('extractAudio and getAudioDurationSeconds work with resolved binaries', async () => {
  const dir = makeTempDir()
  try {
    const { ffmpegPath, ffprobePath } = resolveMediaBinaries({ forceRefresh: true })
    process.env.FFMPEG_PATH = ffmpegPath
    process.env.FFPROBE_PATH = ffprobePath

    const inputPath = path.join(dir, 'input.wav')
    const outputPath = path.join(dir, 'output.mp3')
    const { execFileSync } = await import('node:child_process')
    const { extractAudio, getAudioDurationSeconds } = await import('./extractAudio.js')

    execFileSync(ffmpegPath, [
      '-y',
      '-f', 'lavfi',
      '-i', 'anullsrc=r=16000:cl=mono',
      '-t', '1',
      inputPath,
    ], { stdio: ['ignore', 'ignore', 'ignore'], timeout: 30000 })

    const duration = getAudioDurationSeconds(inputPath)
    assert.ok(duration > 0.5 && duration < 1.5)

    await extractAudio(inputPath, outputPath)
    assert.ok(fs.existsSync(outputPath))
    assert.ok(getAudioDurationSeconds(outputPath) > 0.5)
  } finally {
    cleanup(dir)
  }
})
