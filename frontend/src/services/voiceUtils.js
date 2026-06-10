/** Indian-locale voice selection for Web Speech API. */

export const VOICE_LOCALE = {
  en: 'en-IN',
  kn: 'kn-IN',
}

const INDIAN_ENGLISH_HINTS = [
  'india',
  'indian',
  'ravi',
  'lekha',
  'neerja',
  'prabhat',
  'google english india',
  'microsoft ravi',
]

const KANNADA_HINTS = [
  'kannada',
  'kannda',
  'karnataka',
  'sapna',
  'gagan',
]

const AVOID_HINTS = [
  'united states',
  'us english',
  'en-us',
  'british',
  'en-gb',
  'uk english',
  'australia',
  'en-au',
  'irish',
  'south africa',
]

function scoreVoice(voice, lang) {
  const name = (voice.name || '').toLowerCase()
  const locale = (voice.lang || '').toLowerCase()
  let score = 0

  if (AVOID_HINTS.some((h) => name.includes(h) || locale === h)) {
    score -= 80
  }

  if (lang === 'en') {
    if (locale === 'en-in') score += 120
    else if (locale.startsWith('en-in')) score += 110
    else if (INDIAN_ENGLISH_HINTS.some((h) => name.includes(h))) score += 90
    else if (name.includes('india')) score += 85
    else if (locale.startsWith('en') && !locale.startsWith('en-us') && !locale.startsWith('en-gb')) {
      score += 40
    }
    if (locale === 'en-us' || locale === 'en-gb') score -= 100
  }

  if (lang === 'kn') {
    if (locale === 'kn-in') score += 120
    else if (locale.startsWith('kn')) score += 100
    else if (KANNADA_HINTS.some((h) => name.includes(h))) score += 90
    else if (name.includes('india') && name.includes('kannada')) score += 95
    // Prefer hi-IN only as last resort — better than US English for Indian users
    else if (locale === 'hi-in') score += 20
  }

  if (voice.localService) score += 5
  if (name.includes('google')) score += 10

  return score
}

/**
 * Pick the best Indian-accent voice for the given language code.
 * @param {SpeechSynthesisVoice[]} voices
 * @param {'en'|'kn'} lang
 * @returns {SpeechSynthesisVoice | null}
 */
export function pickIndianVoice(voices, lang) {
  if (!voices?.length) return null

  const ranked = voices
    .map((voice) => ({ voice, score: scoreVoice(voice, lang) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)

  if (ranked.length > 0) return ranked[0].voice

  // Hard fallback: exact locale match even if scored low
  const locale = VOICE_LOCALE[lang]
  return (
    voices.find((v) => v.lang === locale) ||
    voices.find((v) => v.lang?.toLowerCase().startsWith(lang)) ||
    null
  )
}

/**
 * Load all available system voices (may resolve async on first call).
 * @returns {Promise<SpeechSynthesisVoice[]>}
 */
export function loadVoices() {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      resolve([])
      return
    }

    const existing = window.speechSynthesis.getVoices()
    if (existing.length > 0) {
      resolve(existing)
      return
    }

    const onVoicesChanged = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged)
      resolve(window.speechSynthesis.getVoices())
    }

    window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged)
    window.speechSynthesis.getVoices()

    setTimeout(() => {
      window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged)
      resolve(window.speechSynthesis.getVoices())
    }, 500)
  })
}

/**
 * Apply Indian voice settings to a SpeechSynthesisUtterance.
 */
export function configureUtterance(utterance, lang, voice) {
  utterance.lang = VOICE_LOCALE[lang] || 'en-IN'
  utterance.rate = 0.88
  utterance.pitch = 1.0
  utterance.volume = 1.0
  if (voice) utterance.voice = voice
}
