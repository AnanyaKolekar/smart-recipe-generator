import { useCallback, useEffect, useRef, useState } from 'react'
import { useLanguage } from '../context/LanguageContext'

const VOICE_LOCALE = {
  en: 'en-IN',
  kn: 'kn-IN',
}

export default function VoiceCookingAgent({
  recipeName,
  instructions = [],
  language: langOverride,
  onStepChange,
}) {
  const { language: ctxLang, t } = useLanguage()
  const language = langOverride || ctxLang
  const [speaking, setSpeaking] = useState(false)
  const [paused, setPaused] = useState(false)
  const [currentStep, setCurrentStep] = useState(-1)
  const [supported, setSupported] = useState(true)
  const stepIndexRef = useRef(0)
  const instructionsRef = useRef(instructions)

  useEffect(() => {
    instructionsRef.current = instructions
  }, [instructions])

  useEffect(() => {
    if (!window.speechSynthesis) {
      setSupported(false)
    }
    return () => {
      window.speechSynthesis?.cancel()
    }
  }, [])

  const pickVoice = useCallback(() => {
    const voices = window.speechSynthesis.getVoices()
    const locale = VOICE_LOCALE[language] || 'en-IN'

    return (
      voices.find((v) => v.lang === locale) ||
      voices.find((v) => v.lang.startsWith(language)) ||
      voices.find((v) => v.lang.startsWith('en')) ||
      voices[0]
    )
  }, [language])

  const speakStep = useCallback(
    (index) => {
      const steps = instructionsRef.current
      if (!steps?.length || index >= steps.length) {
        setSpeaking(false)
        setPaused(false)
        setCurrentStep(-1)
        onStepChange?.(-1)
        return
      }

      const utterance = new SpeechSynthesisUtterance()
      const intro =
        language === 'kn'
          ? `ಹಂತ ${index + 1}. `
          : `Step ${index + 1}. `
      utterance.text = intro + steps[index]
      utterance.lang = VOICE_LOCALE[language] || 'en-IN'
      utterance.rate = 0.92
      utterance.pitch = 1

      const voice = pickVoice()
      if (voice) utterance.voice = voice

      utterance.onstart = () => {
        setCurrentStep(index)
        onStepChange?.(index)
      }
      utterance.onend = () => {
        stepIndexRef.current = index + 1
        speakStep(index + 1)
      }
      utterance.onerror = () => {
        setSpeaking(false)
        setPaused(false)
        setCurrentStep(-1)
        onStepChange?.(-1)
      }

      window.speechSynthesis.speak(utterance)
    },
    [language, pickVoice, onStepChange],
  )

  const start = () => {
    if (!instructions?.length) return
    window.speechSynthesis.cancel()
    stepIndexRef.current = 0
    setSpeaking(true)
    setPaused(false)

    // Voices load asynchronously in some browsers
    const voices = window.speechSynthesis.getVoices()
    if (!voices.length) {
      window.speechSynthesis.onvoiceschanged = () => speakStep(0)
    } else {
      const intro = new SpeechSynthesisUtterance(
        language === 'kn'
          ? `${recipeName || 'ಪಾಕವಿಧಾನ'}. ಅಡುಗೆ ಸೂಚನೆಗಳು ಪ್ರಾರಂಭವಾಗುತ್ತವೆ.`
          : `${recipeName || 'Recipe'}. Starting cooking instructions.`,
      )
      intro.lang = VOICE_LOCALE[language] || 'en-IN'
      const voice = pickVoice()
      if (voice) intro.voice = voice
      intro.onend = () => speakStep(0)
      window.speechSynthesis.speak(intro)
    }
  }

  const pause = () => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause()
      setPaused(true)
    }
  }

  const resume = () => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume()
      setPaused(false)
    }
  }

  const stop = () => {
    window.speechSynthesis.cancel()
    setSpeaking(false)
    setPaused(false)
    setCurrentStep(-1)
    onStepChange?.(-1)
    stepIndexRef.current = 0
  }

  if (!instructions?.length) return null

  if (!supported) {
    return (
      <p className="text-xs text-muted mt-2">{t('voiceAgentUnsupported')}</p>
    )
  }

  return (
    <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-violet-50 to-brand-50 border border-violet-100">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink flex items-center gap-2">
            <span>🔊</span> {t('voiceAgentTitle')}
          </p>
          <p className="text-xs text-muted mt-0.5">{t('voiceAgentHint')}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {!speaking ? (
            <button
              type="button"
              onClick={start}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition"
            >
              ▶️ {t('voiceAgentPlay')}
            </button>
          ) : (
            <>
              {!paused ? (
                <button
                  type="button"
                  onClick={pause}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition"
                >
                  ⏸️ {t('voiceAgentPause')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={resume}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition"
                >
                  ▶️ {t('voiceAgentResume')}
                </button>
              )}
              <button
                type="button"
                onClick={stop}
                className="px-4 py-2 bg-stone-600 hover:bg-stone-700 text-white text-sm font-medium rounded-lg transition"
              >
                ⏹️ {t('voiceAgentStop')}
              </button>
            </>
          )}
        </div>
      </div>

      {speaking && currentStep >= 0 && (
        <div className="mt-3 flex items-center gap-2 text-sm text-violet-700">
          <span className="inline-block w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
          {t('voiceAgentReading')} {currentStep + 1} / {instructions.length}
        </div>
      )}
    </div>
  )
}
