import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import VoiceInput from './VoiceInput'

const CUISINES = ['Indian', 'Italian', 'Chinese', 'Mexican', 'Continental']
const DIETS = ['Vegetarian', 'Vegan', 'Non Vegetarian', 'Keto']
const COOKING_TIMES = [
  { label: '15 min', value: '15' },
  { label: '30 min', value: '30' },
  { label: '45 min', value: '45' },
  { label: '60 min', value: '60' },
]

export default function RecipeForm({ formData, onChange, onSubmit, loading }) {
  const { t, language, setLanguage } = useLanguage()
  const { memory, isAuthenticated } = useAuth()

  const handleChange = (field) => (e) => {
    onChange({ ...formData, [field]: e.target.value })
  }

  const handleVoice = (transcript) => {
    const current = formData.ingredients.trim()
    const combined = current ? `${current}, ${transcript}` : transcript
    onChange({ ...formData, ingredients: combined })
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-sm"
    >
      <h2 className="font-display text-xl font-semibold text-ink mb-6">
        {t('formTitle')}
      </h2>

      {isAuthenticated && memory && (
        <div className="mb-5 p-4 rounded-xl bg-brand-50 border border-brand-100 text-sm">
          <p className="font-medium text-brand-800 mb-1">{t('memoryTitle')}</p>
          <p className="text-brand-700">
            {t('memoryCuisine')}: {memory.preferred_cuisine} · {t('memoryDiet')}:{' '}
            {memory.preferred_diet} · {t('memoryRecipes')}: {memory.generation_count}
          </p>
        </div>
      )}

      <div className="space-y-5">
        <div>
          <label htmlFor="ingredients" className="block text-sm font-medium text-ink mb-2">
            {t('ingredients')}
          </label>
          <textarea
            id="ingredients"
            rows={4}
            value={formData.ingredients}
            onChange={handleChange('ingredients')}
            placeholder={t('ingredientsPlaceholder')}
            className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent resize-none transition"
            required
          />
          <VoiceInput onTranscript={handleVoice} />
          <p className="text-xs text-muted mt-1">{t('ingredientsHint')}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="language" className="block text-sm font-medium text-ink mb-2">
              {t('language')}
            </label>
            <select
              id="language"
              value={language}
              onChange={(e) => {
                setLanguage(e.target.value)
                onChange({ ...formData, language: e.target.value })
              }}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition"
            >
              <option value="en">English</option>
              <option value="kn">ಕನ್ನಡ (Kannada)</option>
            </select>
          </div>

          <div>
            <label htmlFor="cuisine" className="block text-sm font-medium text-ink mb-2">
              {t('cuisine')}
            </label>
            <select
              id="cuisine"
              value={formData.cuisine}
              onChange={handleChange('cuisine')}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition"
            >
              {CUISINES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="diet" className="block text-sm font-medium text-ink mb-2">
              {t('diet')}
            </label>
            <select
              id="diet"
              value={formData.diet}
              onChange={handleChange('diet')}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition"
            >
              {DIETS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="cooking_time" className="block text-sm font-medium text-ink mb-2">
              {t('cookingTime')}
            </label>
            <select
              id="cooking_time"
              value={formData.cooking_time}
              onChange={handleChange('cooking_time')}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition"
            >
              {COOKING_TIMES.map((time) => (
                <option key={time.value} value={time.value}>{time.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !formData.ingredients.trim()}
        className="mt-8 w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-brand-500 to-brand-600 text-white font-semibold rounded-xl shadow-lg shadow-brand-200 hover:from-brand-600 hover:to-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
      >
        {loading ? t('generating') : `✨ ${t('generateBtn')}`}
      </button>
    </form>
  )
}
