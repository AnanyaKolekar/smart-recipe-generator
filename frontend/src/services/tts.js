import { synthesizeSpeech } from './api'

let currentAudio = null

function stopCurrentAudio() {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
  }
}

/**
 * Speak text using backend neural Indian voices (en-IN / kn-IN).
 * @returns {Promise<void>}
 */
export async function speakWithIndianTTS(text, language = 'en') {
  const cleaned = (text || '').trim()
  if (!cleaned) return

  const { audio_base64 } = await synthesizeSpeech({
    text: cleaned,
    language,
  })

  stopCurrentAudio()

  return new Promise((resolve, reject) => {
    const audio = new Audio(`data:audio/mpeg;base64,${audio_base64}`)
    currentAudio = audio
    audio.onended = () => {
      if (currentAudio === audio) currentAudio = null
      resolve()
    }
    audio.onerror = () => {
      if (currentAudio === audio) currentAudio = null
      reject(new Error('Audio playback failed'))
    }
    audio.play().catch(reject)
  })
}

export function stopIndianTTS() {
  stopCurrentAudio()
}

export function pauseIndianTTS() {
  currentAudio?.pause()
}

export function resumeIndianTTS() {
  currentAudio?.play()
}

export function isIndianTTSPlaying() {
  return Boolean(currentAudio && !currentAudio.paused)
}

export function isIndianTTSPaused() {
  return Boolean(currentAudio && currentAudio.paused)
}
