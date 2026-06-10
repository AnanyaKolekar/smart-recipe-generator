import { useCallback, useEffect, useRef, useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { configureUtterance, loadVoices, pickIndianVoice } from '../services/voiceUtils'

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
  const [supported, setSupported] = useState(true)
  const [activeVoiceName, setActiveVoiceName] = useState('')
  const voicesRef = useRef([])
  const instructionsRef = useRef(instructions)

  useEffect(() => {
    instructionsRef.current = instructions
  }, [instructions])

  useEffect(() => {
    if (!window.speechSynthesis) {
      setSupported(false)
      return
    }

    loadVoices().then((voices) => {
      voicesRef.current = voices
    })

    return () => window.speechSynthesis?.cancel()
  }, [])

  const getVoice = useCallback((lang) => {
    const voices = voicesRef.current.length
      ? voicesRef.current
      : window.speechSynthesis.getVoices()
    const voice = pickIndianVoice(voices, lang)
    if (voice) setActiveVoiceName(voice.name)
    return voice
  }, [])

  const speakStep = useCallback(
    (index, lang) => {
      const steps = instructionsRef.current
      if (!steps?.length || index >= steps.length) {
        setSpeaking(false)
        setPaused(false)
        setCurrentStep(-1)
        onStepChange?.(-1)
        return
      }

      const utterance = new SpeechSynthesisUtterance()
      const intro = lang === 'kn' ? `ಹಂತ ${index + 1}. ` : `Step ${index + 1}. `
      utterance.text = intro + steps[index]
      configureUtterance(utterance, lang, getVoice(lang))

      utterance.onstart = () => {
        setCurrentStep(index)
        onStepChange?.(index)
      }
      utterance.onend = () => speakStep(index + 1, lang)
      utterance.onerror = () => {
        setSpeaking(false)
        setPaused(false)
        setCurrentStep(-1)
        onStepChange?.(-1)
      }

      window.speechSynthesis.speak(utterance)
    },
    [getVoice, onStepChange],
  )

  const start = async (lang) => {
    if (!instructions?.length || translating) return
    window.speechSynthesis.cancel()
    setSpeaking(true)
    setPaused(false)

    voicesRef.current = await loadVoices()
    const voice = getVoice(lang)

    const introText =
      lang === 'kn'
        ? `${recipeName || 'ಪಾಕವಿಧಾನ'}. ಅಡುಗೆ ಸೂಚನೆಗಳನ್ನು ಆಲಿಸಲು ಪ್ರಾರಂಭಿಸಲಾಗುತ್ತಿದೆ.`
        : `${recipeName || 'Recipe'}. Starting cooking instructions.`

    const intro = new SpeechSynthesisUtterance(introText)
    configureUtterance(intro, lang, voice)
    intro.onend = () => speakStep(0, lang)
    window.speechSynthesis.speak(intro)
  }

  const handleLangChange = (lang) => {
    stop()
    onVoiceLangChange?.(lang)
    // Preview which Indian voice will be used
    loadVoices().then((voices) => {
      voicesRef.current = voices
      const voice = pickIndianVoice(voices, lang)
      setActiveVoiceName(voice?.name || '')
    })
  }

  useEffect(() => {
    loadVoices().then((voices) => {
      voicesRef.current = voices
      const voice = pickIndianVoice(voices, voiceLang)
      setActiveVoiceName(voice?.name || '')
    })
  }, [voiceLang])

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
  }

  if (!instructions?.length && !translating) return null

  if (!supported) {
    return <p className="text-sm text-muted">{t('voiceAgentUnsupported')}</p>
  }

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
        {activeVoiceName && (
          <p className="text-xs text-violet-600 mt-2">
            🎙️ {t('voiceAccent')}: {activeVoiceName}
          </p>
        )}
      </div>

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
