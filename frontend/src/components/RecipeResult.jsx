import { useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import NutritionCard from './NutritionCard'
import RecipeImage from './RecipeImage'
import VoiceCookingAgent from './VoiceCookingAgent'

function ListSection({ title, items, icon, variant = 'default' }) {
  if (!items?.length) return null

  const styles = {
    default: 'bg-stone-50 border-stone-200',
    warning: 'bg-amber-50 border-amber-200',
    info: 'bg-blue-50 border-blue-200',
  }

  return (
    <div className={`rounded-xl border p-5 ${styles[variant]}`}>
      <h3 className="font-semibold text-ink mb-3 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-stone-700 flex items-start gap-2">
            <span className="text-brand-500 mt-0.5">•</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function RecipeResult({ recipe, onSave, onDownload, isSaved }) {
  const { t, language } = useLanguage()
  const [activeStep, setActiveStep] = useState(-1)
  if (!recipe) return null

  return (
    <div className="space-y-6 animate-in fade-in">
      <RecipeImage imageUrl={recipe.image_url} recipeName={recipe.recipe_name} />

      <div className="bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl p-6 sm:p-8 text-white shadow-xl shadow-brand-200">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <p className="text-brand-100 text-sm font-medium mb-1">
              {t('yourRecipe')}
              {recipe.personalized && (
                <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  ✨ {t('personalized')}
                </span>
              )}
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold">
              {recipe.recipe_name}
            </h2>
            <p className="text-brand-50 mt-3 leading-relaxed max-w-2xl">
              {recipe.description}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={onSave}
              disabled={isSaved}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium backdrop-blur transition disabled:opacity-60"
            >
              {isSaved ? `❤️ ${t('savedLabel')}` : `🤍 ${t('save')}`}
            </button>
            <button
              type="button"
              onClick={onDownload}
              className="px-4 py-2 bg-white text-brand-700 hover:bg-brand-50 rounded-lg text-sm font-medium transition"
            >
              📄 {t('pdf')}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ListSection title={t('ingredientsList')} items={recipe.ingredients} icon="🥗" />
        <ListSection
          title={t('missingIngredients')}
          items={recipe.missing_ingredients}
          icon="⚠️"
          variant="warning"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ListSection
          title={t('suggestions')}
          items={recipe.missing_ingredient_suggestions}
          icon="💡"
          variant="info"
        />
        <ListSection title={t('shoppingList')} items={recipe.shopping_list} icon="🛒" />
      </div>

      <NutritionCard nutrition={recipe.nutrition} />

      {recipe.instructions?.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
          <h3 className="font-display text-lg font-semibold text-ink mb-4 flex items-center gap-2">
            <span>👨‍🍳</span> {t('instructions')}
          </h3>

          <VoiceCookingAgent
            recipeName={recipe.recipe_name}
            instructions={recipe.instructions}
            language={recipe.language || language}
            onStepChange={setActiveStep}
          />

          <ol className="space-y-4 mt-4">
            {recipe.instructions.map((step, i) => (
              <li
                key={i}
                className={`flex gap-4 rounded-xl p-2 transition-colors ${
                  activeStep === i ? 'bg-violet-50 ring-2 ring-violet-200' : ''
                }`}
              >
                <span
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    activeStep === i
                      ? 'bg-violet-500 text-white'
                      : 'bg-brand-100 text-brand-700'
                  }`}
                >
                  {i + 1}
                </span>
                <p className="text-stone-700 pt-1 leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ListSection title={t('tips')} items={recipe.tips} icon="💡" variant="info" />
        <ListSection title={t('serving')} items={recipe.serving_suggestions} icon="🍽️" />
      </div>
    </div>
  )
}
