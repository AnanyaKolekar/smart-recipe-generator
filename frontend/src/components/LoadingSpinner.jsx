import { useLanguage } from '../context/LanguageContext'

export default function LoadingSpinner() {
  const { t } = useLanguage()

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="relative w-20 h-20 mb-6">
        <div className="absolute inset-0 rounded-full border-4 border-brand-200" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-500 animate-spin-slow" />
        <div className="absolute inset-3 rounded-full bg-brand-100 animate-pulse-ring flex items-center justify-center text-2xl">
          🍳
        </div>
      </div>
      <p className="text-lg font-medium text-ink">{t('loading')}</p>
      <p className="text-sm text-muted mt-2 text-center max-w-md">{t('loadingHint')}</p>
      <div className="flex flex-wrap justify-center gap-2 mt-6">
        {['Analyzer', 'Finder', 'Nutrition ∥ Chef ∥ Image'].map((agent) => (
          <span
            key={agent}
            className="px-3 py-1 text-xs rounded-full bg-brand-100 text-brand-700 font-medium"
          >
            {agent}
          </span>
        ))}
      </div>
    </div>
  )
}
