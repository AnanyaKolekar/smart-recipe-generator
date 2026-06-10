import { createContext, useContext, useState } from 'react'
import { t as translate } from '../i18n/translations'

const LanguageContext = createContext(null)

const LANG_KEY = 'recipegenai_language'

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(
    () => localStorage.getItem(LANG_KEY) || 'en',
  )

  const setLang = (lang) => {
    localStorage.setItem(LANG_KEY, lang)
    setLanguage(lang)
  }

  const t = (key) => translate(language, key)

  return (
    <LanguageContext.Provider value={{ language, setLanguage: setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
