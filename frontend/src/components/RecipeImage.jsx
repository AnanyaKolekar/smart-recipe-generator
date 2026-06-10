import { useState } from 'react'
import { useLanguage } from '../context/LanguageContext'

export default function RecipeImage({ imageUrl, recipeName }) {
  const { t } = useLanguage()
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  if (!imageUrl) return null

  return (
    <div className="rounded-2xl overflow-hidden border border-stone-200 shadow-sm bg-stone-100 relative min-h-[14rem]">
      {!loaded && !failed && (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-100 z-10">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-500 rounded-full animate-spin-slow" />
            <span className="text-xs text-muted">{t('imageLoading')}</span>
          </div>
        </div>
      )}

      {!failed ? (
        <img
          src={imageUrl}
          alt={recipeName || t('recipeImage')}
          className={`w-full h-56 sm:h-72 object-cover transition-opacity duration-500 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex items-center justify-center h-56 sm:h-72 bg-gradient-to-br from-brand-400 to-brand-600 text-white">
          <div className="text-center px-4">
            <div className="text-5xl mb-2">🍽️</div>
            <p className="font-display font-bold text-lg">{recipeName}</p>
          </div>
        </div>
      )}
    </div>
  )
}
