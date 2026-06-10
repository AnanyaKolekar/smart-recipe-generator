import { useCallback, useEffect, useRef, useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import {
  isIndianTTSPaused,
  isIndianTTSPlaying,
  pauseIndianTTS,
  resumeIndianTTS,
  speakWithIndianTTS,
  stopIndianTTS,
} from '../services/tts'

export default function VoiceCookingAgent({
  recipeName,
  instructions = [],
  voiceLang = 'en',
  onVoiceLangChange,
  translating = false,
  onStepChange,
}) {
  const { t } = useLanguage()
  const [speaking, setSpeaking] = useState(false)
  const [paused, setPaused] = useState(false)
  const [currentStep, setCurrentStep] = useState(-1)
  const [error, setError] = useState('')
  const cancelledRef = useRef(false)
  const instructionsRef = useRef(instructions)

  useEffect(() => {
    instructionsRef.current = instructions
  }, [instructions])

  useEffect(() => () => stopIndianTTS(), [])

  const speakStep = useCallback(
    async (index, lang) => {
      const steps = instructionsRef.current
      if (cancelledRef.current || !steps?.length || index >= steps.length) {
        setSpeaking(false)
        setPaused(false)
        setCurrentStep(-1)
        onStepChange?.(-1)
        return
      }

      setCurrentStep(index)
      onStepChange?.(index)

      const intro = lang === 'kn' ? `ಹಂತ ${index + 1}. ` : `Step ${index + 1}. `
      try {
        await speakWithIndianTTS(intro + steps[index], lang)
        if (!cancelledRef.current) {
          await speakStep(index + 1, lang)
        }
      } catch {
        if (!cancelledRef.current) {
          setError(t('voiceAgentUnsupported'))
          setSpeaking(false)
          setPaused(false)
          setCurrentStep(-1)
          onStepChange?.(-1)
        }
      }
    },
    [onStepChange, t],
  )

  const start = async (lang) => {
    if (!instructions?.length || translating) return
    stop()
    cancelledRef.current = false
    setError('')
    setSpeaking(true)
    setPaused(false)

    const introText =
      lang === 'kn'
        ? `${recipeName || 'ಪಾಕವಿಧಾನ'}. ಅಡುಗೆ ಸೂಚನೆಗಳನ್ನು ಆಲಿಸಲು ಪ್ರಾರಂಭಿಸಲಾಗುತ್ತಿದೆ.`
        : `${recipeName || 'Recipe'}. Starting cooking instructions.`

    try {
      await speakWithIndianTTS(introText, lang)
      if (!cancelledRef.current) {
        await speakStep(0, lang)
      }
    } catch {
      if (!cancelledRef.current) {
        setError(t('voiceAgentUnsupported'))
        setSpeaking(false)
        setPaused(false)
      }
    }
  }

  const handleLangChange = (lang) => {
    stop()
    onVoiceLangChange?.(lang)
  }

  const pause = () => {
    if (isIndianTTSPlaying()) {
      pauseIndianTTS()
      setPaused(true)
    }
  }

  const resume = () => {
    if (isIndianTTSPaused()) {
      resumeIndianTTS()
      setPaused(false)
    }
  }

  const stop = () => {
    cancelledRef.current = true
    stopIndianTTS()
    setSpeaking(false)
    setPaused(false)
    setCurrentStep(-1)
    onStepChange?.(-1)
  }

  if (!instructions?.length && !translating) return null

  return (
    <div className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 via-white to-brand-50 p-5 sm:p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-violet-600 flex items-center justify-center text-xl shadow-md">
          🔊
        </div>
        <div>
          <h4 className="font-semibold text-ink text-base">{t('voiceAgentTitle')}</h4>
          <p className="text-xs text-muted">{t('voiceAgentHint')}</p>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-xs font-medium text-stone-600 mb-2">{t('voiceLangLabel')}</p>
        <div className="inline-flex rounded-xl border border-violet-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            disabled={translating}
            onClick={() => handleLangChange('en')}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 ${
              voiceLang === 'en'
                ? 'bg-violet-600 text-white shadow-md'
                : 'text-stone-600 hover:bg-violet-50'
            }`}
          >
            🇮🇳 English (India)
          </button>
          <button
            type="button"
            disabled={translating}
            onClick={() => handleLangChange('kn')}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 ${
              voiceLang === 'kn'
                ? 'bg-violet-600 text-white shadow-md'
                : 'text-stone-600 hover:bg-violet-50'
            }`}
          >
            🇮🇳 ಕನ್ನಡ (India)
          </button>
        </div>
        <p className="text-xs text-violet-600 mt-2">
          🎙️ {t('voiceAccent')}: {t('voiceEngineGtts')}
        </p>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {!speaking ? (
          <button
            type="button"
            onClick={() => start(voiceLang)}
            disabled={translating || !instructions?.length}
            className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl shadow-md transition active:scale-95 disabled:opacity-50"
          >
            ▶️ {voiceLang === 'kn' ? t('voiceAgentPlayKn') : t('voiceAgentPlayEn')}
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

      {speaking && currentStep >= 0 && (
        <div className="mt-4 flex items-center gap-2 text-sm font-medium text-violet-700">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-violet-500 animate-pulse" />
          {voiceLang === 'kn' ? 'ಓದಲಾಗುತ್ತಿದೆ' : t('voiceAgentReading')}{' '}
          {currentStep + 1} / {instructions.length}
        </div>
      )}
    </div>
  )
}
