import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const PLATFORM_KEY = `${process.platform}-${process.arch}`
const EXECUTABLE_EXT = process.platform === 'win32' ? '.exe' : ''

let cachedResolution = null

function dedupe(values) {
  return [...new Set(values.filter(Boolean))]
}

function getBundledCandidates(packageName, binaryName, options) {
  const resourcesPath = options.resourcesPath ?? process.resourcesPath
  if (!resourcesPath) return []

  const platformKey = options.platformKey ?? PLATFORM_KEY
  const executable = `${binaryName}${options.executableExt ?? EXECUTABLE_EXT}`

  const nodeModuleRoots = [
    path.join(resourcesPath, 'server', 'node_modules'),
    path.join(resourcesPath, 'app.asar.unpacked', 'node_modules'),
    path.join(resourcesPath, 'node_modules'),
  ]

  return nodeModuleRoots.map((root) => path.join(root, packageName, platformKey, executable))
}

function getInstallerCandidate(moduleName, options) {
  if (moduleName === '@ffmpeg-installer/ffmpeg' && options.installerFfmpegPath !== undefined) {
    return options.installerFfmpegPath
  }
  if (moduleName === '@ffprobe-installer/ffprobe' && options.installerFfprobePath !== undefined) {
    return options.installerFfprobePath
  }

  try {
    return require(moduleName).path
  } catch {
    return null
  }
}

function getPathCandidate(binaryName, options) {
  const pathValue = options.pathEnv ?? process.env.PATH
  if (!pathValue) return null

  const executable = `${binaryName}${options.executableExt ?? EXECUTABLE_EXT}`
  for (const segment of pathValue.split(path.delimiter)) {
    if (!segment) continue
    const candidate = path.join(segment, executable)
    if (fs.existsSync(candidate)) return candidate
  }

  return binaryName
}

function validateBinary(candidate, binaryLabel, options) {
  if (!candidate) {
    return { ok: false, reason: 'missing candidate' }
  }

  if (typeof candidate !== 'string') {
    return { ok: false, reason: 'candidate is not a string' }
  }

  const isLikelyPath = candidate.includes(path.sep) || path.isAbsolute(candidate)
  if (isLikelyPath) {
    try {
      const stats = fs.statSync(candidate)
      if (!stats.isFile()) {
        return { ok: false, reason: 'path is not a file' }
      }
    } catch (error) {
      return { ok: false, reason: `path check failed: ${error.code || error.message}` }
    }

    if ((options.platform ?? process.platform) !== 'win32') {
      try {
        fs.accessSync(candidate, fs.constants.X_OK)
      } catch (error) {
        return { ok: false, reason: `path is not executable: ${error.code || error.message}` }
      }
    }
  }

  try {
    execFileSync(candidate, ['-version'], {
      stdio: 'pipe',
      timeout: options.versionTimeoutMs ?? 15000,
      env: options.execEnv ?? process.env,
    })
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      reason: `version check failed: ${error.code || error.message}`,
    }
  }
}

function resolveBinary(binaryLabel, packageName, installerModuleName, options) {
  const envVarName = `${binaryLabel.toUpperCase()}_PATH`
  const envPath = options.env?.[envVarName] ?? process.env[envVarName]

  const sources = [
    { source: 'env', candidates: [envPath] },
    { source: 'bundled', candidates: getBundledCandidates(packageName, binaryLabel, options) },
    { source: 'installer', candidates: [getInstallerCandidate(installerModuleName, options)] },
    { source: 'system', candidates: [getPathCandidate(binaryLabel, options)] },
  ]

  const attempts = []

  for (const entry of sources) {
    for (const candidate of dedupe(entry.candidates)) {
      const result = validateBinary(candidate, binaryLabel, options)
      attempts.push({
        source: entry.source,
        candidate,
        reason: result.ok ? 'ok' : result.reason,
      })
      if (result.ok) {
        return {
          path: candidate,
          source: entry.source,
          attempts,
        }
      }
    }
  }

  const details = attempts.length
    ? attempts.map((attempt) => `- ${attempt.source}: ${attempt.candidate || '(empty)'} -> ${attempt.reason}`).join('\n')
    : '- no candidates were generated'

  throw new Error(
    `No valid ${binaryLabel} binary found.\nCandidates checked:\n${details}`
  )
}

export function resolveMediaBinaries(options = {}) {
  const hasOverrides = Boolean(
    options.env ||
    options.resourcesPath ||
    options.pathEnv !== undefined ||
    options.installerFfmpegPath !== undefined ||
    options.installerFfprobePath !== undefined
  )

  if (!options.forceRefresh && !hasOverrides && cachedResolution) {
    return cachedResolution
  }

  const ffmpeg = resolveBinary('ffmpeg', '@ffmpeg-installer', '@ffmpeg-installer/ffmpeg', options)
  const ffprobe = resolveBinary('ffprobe', '@ffprobe-installer', '@ffprobe-installer/ffprobe', options)

  const resolution = {
    ffmpegPath: ffmpeg.path,
    ffprobePath: ffprobe.path,
    source: ffmpeg.source,
    sources: {
      ffmpeg: ffmpeg.source,
      ffprobe: ffprobe.source,
    },
    details: {
      ffmpeg: ffmpeg.attempts,
      ffprobe: ffprobe.attempts,
    },
  }

  if (!options.forceRefresh && !hasOverrides) {
    cachedResolution = resolution
  }

  return resolution
}

export function assertMediaBinariesAvailable(options = {}) {
  return resolveMediaBinaries(options)
}
