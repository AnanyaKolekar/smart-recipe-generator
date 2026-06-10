import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '../context/LanguageContext'

export default function VoiceInput({ onTranscript }) {
  const { language, t } = useLanguage()
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(true)
  const recognitionRef = useRef(null)

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSupported(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = language === 'kn' ? 'kn-IN' : 'en-IN'

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join(', ')
      onTranscript(transcript)
    }

    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)

    recognitionRef.current = recognition
    return () => recognition.abort()
  }, [language, onTranscript])

  const toggle = () => {
    if (!recognitionRef.current) return
    if (listening) {
      recognitionRef.current.stop()
      setListening(false)
    } else {
      recognitionRef.current.lang = language === 'kn' ? 'kn-IN' : 'en-IN'
      recognitionRef.current.start()
      setListening(true)
    }
  }

  if (!supported) {
    return (
      <p className="text-xs text-muted">{t('voiceUnsupported')}</p>
    )
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      <button
        type="button"
        onClick={toggle}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
          listening
            ? 'bg-red-100 text-red-700 animate-pulse'
            : 'bg-brand-100 text-brand-700 hover:bg-brand-200'
        }`}
      >
        <span>{listening ? '🔴' : '🎤'}</span>
        {listening ? t('voiceStop') : t('voiceStart')}
      </button>
      {listening && (
        <span className="text-xs text-brand-600">{t('voiceListening')}</span>
      )}
    </div>
  )
}
