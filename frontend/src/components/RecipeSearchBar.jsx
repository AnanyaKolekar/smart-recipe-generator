import { useState } from 'react'
import { useLanguage } from '../context/LanguageContext'

export default function RecipeSearchBar({ onSearch, loading, preferences }) {
  const { t } = useLanguage()
  const [query, setQuery] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed || loading) return
    onSearch(trimmed, preferences)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-sm"
    >
      <h2 className="font-display text-xl font-semibold text-ink mb-2">
        {t('searchRecipeTitle')}
      </h2>
      <p className="text-sm text-muted mb-5">{t('searchRecipeHint')}</p>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-lg">
            🔍
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchRecipePlaceholder')}
            className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition"
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-8 py-3.5 bg-gradient-to-r from-violet-500 to-violet-600 text-white font-semibold rounded-xl shadow-lg shadow-violet-200 hover:from-violet-600 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] shrink-0"
        >
          {loading ? t('searchingRecipe') : t('searchRecipeBtn')}
        </button>
      </div>
    </form>
  )
}
